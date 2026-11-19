import "server-only";
import { all, one, run } from "./db";

let retailOpsPromise: Promise<void> | null = null;

export async function ensureRetailOpsSchema(): Promise<void> {
  if (!retailOpsPromise) {
    retailOpsPromise = (async () => {
      const prodCols = await all<{ name: string }>("PRAGMA table_info(products)");
      const prodSet = new Set(prodCols.map((c) => c.name));
      if (!prodSet.has("cost_price")) {
        await run("ALTER TABLE products ADD COLUMN cost_price INTEGER NOT NULL DEFAULT 0");
      }

      const ordCols = await all<{ name: string }>("PRAGMA table_info(orders)");
      const ordSet = new Set(ordCols.map((c) => c.name));
      const ordAdditions: [string, string][] = [
        ["shipping_carrier", "TEXT NOT NULL DEFAULT ''"],
        ["tracking_code", "TEXT NOT NULL DEFAULT ''"],
        ["shipping_fee", "INTEGER NOT NULL DEFAULT 0"],
        ["cod_amount", "INTEGER NOT NULL DEFAULT 0"],
        ["shipping_status", "TEXT NOT NULL DEFAULT ''"],
        ["kiotviet_order_id", "TEXT NOT NULL DEFAULT ''"],
        ["kiotviet_code", "TEXT NOT NULL DEFAULT ''"],
        ["kiotviet_synced_at", "TEXT NOT NULL DEFAULT ''"],
      ];
      for (const [col, def] of ordAdditions) {
        if (!ordSet.has(col)) {
          await run(`ALTER TABLE orders ADD COLUMN ${col} ${def}`);
        }
      }

      await run(`
        CREATE TABLE IF NOT EXISTS inventory_movements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL,
          change_qty INTEGER NOT NULL,
          stock_after INTEGER NOT NULL,
          unit_cost INTEGER NOT NULL DEFAULT 0,
          reason TEXT NOT NULL,
          ref_code TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT '',
          created_by TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      await run(`
        CREATE TABLE IF NOT EXISTS cashbook_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entry_type TEXT NOT NULL,
          category TEXT NOT NULL,
          amount INTEGER NOT NULL,
          ref_code TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT '',
          created_by TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    })().catch((err) => {
      retailOpsPromise = null;
      throw err;
    });
  }
  await retailOpsPromise;
}

export async function recordInventoryMovement(opts: {
  productId: number;
  changeQty: number;
  unitCost?: number;
  updateCostPrice?: boolean;
  reason: "import" | "stocktake" | "sale" | "cancel" | "kiotviet_sync";
  refCode?: string;
  note?: string;
  createdBy?: string;
}): Promise<number> {
  await ensureRetailOpsSchema();
  const prod = await one<{ id: number; stock: number; cost_price: number }>(
    "SELECT id, stock, COALESCE(cost_price, 0) AS cost_price FROM products WHERE id = ?",
    opts.productId,
  );
  if (!prod) throw new Error("Không tìm thấy sản phẩm.");
  const nextStock = Math.max(0, prod.stock + opts.changeQty);
  if (opts.updateCostPrice && opts.unitCost !== undefined && opts.unitCost >= 0) {
    await run(
      "UPDATE products SET stock = ?, cost_price = ? WHERE id = ?",
      nextStock,
      opts.unitCost,
      opts.productId,
    );
  } else {
    await run("UPDATE products SET stock = ? WHERE id = ?", nextStock, opts.productId);
  }
  await run(
    `INSERT INTO inventory_movements (product_id, change_qty, stock_after, unit_cost, reason, ref_code, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    opts.productId,
    opts.changeQty,
    nextStock,
    opts.unitCost ?? prod.cost_price ?? 0,
    opts.reason,
    opts.refCode ?? "",
    opts.note ?? "",
    opts.createdBy ?? "",
  );
  return nextStock;
}

export type InventoryProductRow = {
  id: number;
  name: string;
  sku: string;
  price: number;
  sale_price: number | null;
  cost_price: number;
  stock: number;
  unit: string;
  category_name: string;
};

export type InventoryMovementRow = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  change_qty: number;
  stock_after: number;
  unit_cost: number;
  reason: string;
  ref_code: string;
  note: string;
  created_by: string;
  created_at: string;
};

export type CashbookRow = {
  id: number;
  entry_type: "in" | "out";
  category: string;
  amount: number;
  ref_code: string;
  note: string;
  created_by: string;
  created_at: string;
};

export async function getInventoryOverview() {
  await ensureRetailOpsSchema();
  const [prodAgg, cashAgg] = await Promise.all([
    one<{ totalProducts: number; lowStock: number; outOfStock: number; totalInventoryValue: number }>(
      `SELECT COUNT(*) AS totalProducts,
              SUM(CASE WHEN stock > 0 AND stock <= 5 THEN 1 ELSE 0 END) AS lowStock,
              SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END) AS outOfStock,
              COALESCE(SUM(stock * CASE WHEN COALESCE(cost_price, 0) > 0 THEN cost_price ELSE COALESCE(sale_price, price) END), 0) AS totalInventoryValue
       FROM products`,
    ),
    one<{ totalIn: number; totalOut: number }>(
      `SELECT COALESCE(SUM(CASE WHEN entry_type = 'in' THEN amount ELSE 0 END), 0) AS totalIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' THEN amount ELSE 0 END), 0) AS totalOut
       FROM cashbook_entries`,
    ),
  ]);
  return {
    totalProducts: prodAgg?.totalProducts ?? 0,
    lowStock: prodAgg?.lowStock ?? 0,
    outOfStock: prodAgg?.outOfStock ?? 0,
    totalInventoryValue: prodAgg?.totalInventoryValue ?? 0,
    totalIn: cashAgg?.totalIn ?? 0,
    totalOut: cashAgg?.totalOut ?? 0,
  };
}

export async function listInventoryProducts(opts: { q?: string; stockFilter?: string; limit?: number }) {
  await ensureRetailOpsSchema();
  const where: string[] = [];
  const params: unknown[] = [];
  const q = opts.q?.trim();
  if (q) {
    where.push("(p.name LIKE ? OR p.sku LIKE ?)");
    params.push(`%${q}%`, `%${q}%`);
  }
  if (opts.stockFilter === "low") where.push("p.stock > 0 AND p.stock <= 5");
  if (opts.stockFilter === "out") where.push("p.stock <= 0");
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  return all<InventoryProductRow>(
    `SELECT p.id, p.name, COALESCE(p.sku, '') AS sku, p.price, p.sale_price,
            COALESCE(p.cost_price, 0) AS cost_price, p.stock, COALESCE(p.unit, '') AS unit,
            c.name AS category_name
     FROM products p JOIN product_categories c ON c.id = p.category_id
     ${w}
     ORDER BY p.stock ASC, p.id DESC LIMIT ?`,
    ...params,
    opts.limit ?? 80,
  );
}

export async function listInventoryMovements(limit = 50) {
  await ensureRetailOpsSchema();
  return all<InventoryMovementRow>(
    `SELECT m.id, m.product_id, p.name AS product_name, COALESCE(p.sku, '') AS sku,
            m.change_qty, m.stock_after, m.unit_cost, m.reason, m.ref_code, m.note, m.created_by, m.created_at
     FROM inventory_movements m
     JOIN products p ON p.id = m.product_id
     ORDER BY m.id DESC LIMIT ?`,
    limit,
  );
}

export async function listCashbookEntries(limit = 60) {
  await ensureRetailOpsSchema();
  return all<CashbookRow>(
    `SELECT id, entry_type, category, amount, ref_code, note, created_by, created_at
     FROM cashbook_entries ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export async function addCashbookEntry(opts: {
  entryType: "in" | "out";
  category: string;
  amount: number;
  refCode?: string;
  note?: string;
  createdBy?: string;
}) {
  await ensureRetailOpsSchema();
  await run(
    `INSERT INTO cashbook_entries (entry_type, category, amount, ref_code, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    opts.entryType,
    opts.category,
    Math.max(0, Math.round(opts.amount)),
    opts.refCode ?? "",
    opts.note ?? "",
    opts.createdBy ?? "",
  );
}

export type OrderShippingInfo = {
  shipping_carrier: string;
  tracking_code: string;
  shipping_fee: number;
  cod_amount: number;
  shipping_status: string;
  kiotviet_order_id: string;
  kiotviet_code: string;
  kiotviet_synced_at: string;
};

export async function getOrderShippingInfo(orderId: number): Promise<OrderShippingInfo> {
  await ensureRetailOpsSchema();
  const row = await one<OrderShippingInfo>(
    `SELECT COALESCE(shipping_carrier, '') AS shipping_carrier,
            COALESCE(tracking_code, '') AS tracking_code,
            COALESCE(shipping_fee, 0) AS shipping_fee,
            COALESCE(cod_amount, 0) AS cod_amount,
            COALESCE(shipping_status, '') AS shipping_status,
            COALESCE(kiotviet_order_id, '') AS kiotviet_order_id,
            COALESCE(kiotviet_code, '') AS kiotviet_code,
            COALESCE(kiotviet_synced_at, '') AS kiotviet_synced_at
     FROM orders WHERE id = ?`,
    orderId,
  );
  return (
    row ?? {
      shipping_carrier: "",
      tracking_code: "",
      shipping_fee: 0,
      cod_amount: 0,
      shipping_status: "",
      kiotviet_order_id: "",
      kiotviet_code: "",
      kiotviet_synced_at: "",
    }
  );
}
