import "server-only";
import { all, one, run } from "./db";

export type CashbookPaymentMethod = "cash" | "bank" | "kiotviet";

export const CASHBOOK_PAYMENT_METHODS: Record<CashbookPaymentMethod, { label: string; short: string; badge: string }> = {
  cash: { label: "💵 Tiền mặt", short: "Tiền mặt", badge: "bg-emerald-100 text-emerald-800" },
  bank: { label: "🏦 Chuyển khoản NH", short: "Chuyển khoản NH", badge: "bg-blue-100 text-blue-800" },
  kiotviet: { label: "🔗 Theo KiotViet", short: "Theo KiotViet", badge: "bg-indigo-100 text-indigo-800" },
};

let retailOpsPromise: Promise<void> | null = null;

export async function ensureRetailOpsSchema(): Promise<void> {
  if (!retailOpsPromise) {
    retailOpsPromise = (async () => {
      const prodCols = await all<{ name: string }>("PRAGMA table_info(products)");
      const prodSet = new Set(prodCols.map((c) => c.name));
      const prodAdditions: [string, string][] = [
        ["cost_price", "INTEGER NOT NULL DEFAULT 0"],
        ["contact_only", "INTEGER NOT NULL DEFAULT 0"],
        ["kv_code", "TEXT NOT NULL DEFAULT ''"],
        ["barcode", "TEXT NOT NULL DEFAULT ''"],
        ["min_stock", "INTEGER NOT NULL DEFAULT 0"],
        ["max_stock", "INTEGER NOT NULL DEFAULT 999999999"],
        ["weight_grams", "INTEGER NOT NULL DEFAULT 0"],
        ["location", "TEXT NOT NULL DEFAULT ''"],
        ["supplier", "TEXT NOT NULL DEFAULT ''"],
        ["kv_updated_at", "TEXT NOT NULL DEFAULT ''"],
      ];
      for (const [col, def] of prodAdditions) {
        if (!prodSet.has(col)) {
          await run(`ALTER TABLE products ADD COLUMN ${col} ${def}`);
        }
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
          payment_method TEXT NOT NULL DEFAULT 'cash',
          ref_code TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT '',
          created_by TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      const cbCols = await all<{ name: string }>("PRAGMA table_info(cashbook_entries)");
      const cbSet = new Set(cbCols.map((c) => c.name));
      if (!cbSet.has("payment_method")) {
        await run("ALTER TABLE cashbook_entries ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'");
      }

      const movCols = await all<{ name: string }>("PRAGMA table_info(inventory_movements)");
      const movSet = new Set(movCols.map((c) => c.name));
      if (!movSet.has("batch_code")) {
        await run("ALTER TABLE inventory_movements ADD COLUMN batch_code TEXT NOT NULL DEFAULT ''");
      }
      if (!movSet.has("exp_date")) {
        await run("ALTER TABLE inventory_movements ADD COLUMN exp_date TEXT NOT NULL DEFAULT ''");
      }

      await run(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          email TEXT NOT NULL DEFAULT '',
          address TEXT NOT NULL DEFAULT '',
          note TEXT NOT NULL DEFAULT '',
          debt_balance INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      const supCols = await all<{ name: string }>("PRAGMA table_info(suppliers)");
      const supSet = new Set(supCols.map((c) => c.name));
      if (!supSet.has("debt_balance")) {
        await run("ALTER TABLE suppliers ADD COLUMN debt_balance INTEGER NOT NULL DEFAULT 0");
      }

      await run(`
        CREATE TABLE IF NOT EXISTS delivery_partners (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          phone TEXT NOT NULL DEFAULT '',
          default_fee INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          note TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      // Seed default suppliers from products.supplier if suppliers table is empty
      const supCount = await one<{ n: number }>("SELECT COUNT(*) AS n FROM suppliers");
      if ((supCount?.n ?? 0) === 0) {
        const distinctSuppliers = await all<{ supplier: string }>(
          "SELECT DISTINCT TRIM(supplier) AS supplier FROM products WHERE TRIM(COALESCE(supplier, '')) <> '' LIMIT 50",
        );
        const seedNames = new Set<string>(
          distinctSuppliers.map((s) => s.supplier).filter(Boolean),
        );
        for (const defName of [
          "AMAZON-VIETXPRESS",
          "Tâm Minh Foods",
          "C'Lavie Thực Dưỡng",
          "King Kung Đài Loan",
          "Thực Dưỡng Khai Minh",
        ]) {
          seedNames.add(defName);
        }
        let idx = 1;
        for (const name of seedNames) {
          const code = `NCC${String(idx++).padStart(4, "0")}`;
          await run(
            "INSERT INTO suppliers (code, name, note) VALUES (?, ?, ?)",
            code,
            name,
            "Đồng bộ từ danh mục hàng hóa KiotViet",
          );
        }
      }

      // Seed default delivery partners if delivery_partners table is empty
      const dpCount = await one<{ n: number }>("SELECT COUNT(*) AS n FROM delivery_partners");
      if ((dpCount?.n ?? 0) === 0) {
        const defaults: [string, string, string, number, string][] = [
          ["DT0001", "GHN (Giao Hàng Nhanh)", "1900 636677", 30000, "Đối tác giao hàng nhanh toàn quốc"],
          ["DT0002", "GHTK (Giao Hàng Tiết Kiệm)", "1900 6092", 28000, "Đối tác giao hàng tiết kiệm"],
          ["DT0003", "Viettel Post", "1900 8095", 32000, "Bưu chính Viettel"],
          ["DT0004", "J&T Express", "1900 1088", 28000, "Chuyển phát nhanh J&T"],
          ["DT0005", "Ahamove / GrabExpress", "1900 545411", 35000, "Giao siêu tốc nội thành 2h"],
          ["DT0006", "Giao nội bộ / Khách tự lấy", "", 0, "Nhân viên cửa hàng giao hoặc khách nhận tại quầy"],
        ];
        for (const [code, name, phone, fee, note] of defaults) {
          await run(
            "INSERT INTO delivery_partners (code, name, phone, default_fee, note) VALUES (?, ?, ?, ?, ?)",
            code,
            name,
            phone,
            fee,
            note,
          );
        }
      }
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
  reason: "import" | "stocktake" | "sale" | "cancel" | "kiotviet_sync" | "internal_use" | "damage";
  refCode?: string;
  batchCode?: string;
  expDate?: string;
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
    `INSERT INTO inventory_movements (product_id, change_qty, stock_after, unit_cost, reason, ref_code, batch_code, exp_date, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    opts.productId,
    opts.changeQty,
    nextStock,
    opts.unitCost ?? prod.cost_price ?? 0,
    opts.reason,
    opts.refCode ?? "",
    opts.batchCode ?? "",
    opts.expDate ?? "",
    opts.note ?? "",
    opts.createdBy ?? "",
  );
  return nextStock;
}

export type InventoryProductRow = {
  id: number;
  name: string;
  sku: string;
  kv_code: string;
  barcode: string;
  price: number;
  sale_price: number | null;
  cost_price: number;
  contact_only: number;
  stock: number;
  unit: string;
  supplier: string;
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
  batch_code: string;
  exp_date: string;
  note: string;
  created_by: string;
  created_at: string;
};

export type CashbookRow = {
  id: number;
  entry_type: "in" | "out";
  category: string;
  amount: number;
  payment_method: CashbookPaymentMethod;
  ref_code: string;
  note: string;
  created_by: string;
  created_at: string;
};

export type SupplierRow = {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  debt_balance: number;
  is_active: number;
  created_at: string;
  product_count: number;
};

export type DeliveryPartnerRow = {
  id: number;
  code: string;
  name: string;
  phone: string;
  default_fee: number;
  is_active: number;
  note: string;
  created_at: string;
  order_count: number;
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
    one<{
      totalIn: number;
      totalOut: number;
      cashIn: number;
      cashOut: number;
      bankIn: number;
      bankOut: number;
      kvIn: number;
      kvOut: number;
    }>(
      `SELECT COALESCE(SUM(CASE WHEN entry_type = 'in' THEN amount ELSE 0 END), 0) AS totalIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' THEN amount ELSE 0 END), 0) AS totalOut,
              COALESCE(SUM(CASE WHEN entry_type = 'in' AND COALESCE(payment_method, 'cash') = 'cash' THEN amount ELSE 0 END), 0) AS cashIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' AND COALESCE(payment_method, 'cash') = 'cash' THEN amount ELSE 0 END), 0) AS cashOut,
              COALESCE(SUM(CASE WHEN entry_type = 'in' AND payment_method = 'bank' THEN amount ELSE 0 END), 0) AS bankIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' AND payment_method = 'bank' THEN amount ELSE 0 END), 0) AS bankOut,
              COALESCE(SUM(CASE WHEN entry_type = 'in' AND payment_method = 'kiotviet' THEN amount ELSE 0 END), 0) AS kvIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' AND payment_method = 'kiotviet' THEN amount ELSE 0 END), 0) AS kvOut
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
    cashIn: cashAgg?.cashIn ?? 0,
    cashOut: cashAgg?.cashOut ?? 0,
    bankIn: cashAgg?.bankIn ?? 0,
    bankOut: cashAgg?.bankOut ?? 0,
    kvIn: cashAgg?.kvIn ?? 0,
    kvOut: cashAgg?.kvOut ?? 0,
  };
}

export async function listInventoryProducts(opts: { q?: string; stockFilter?: string; limit?: number }) {
  await ensureRetailOpsSchema();
  const where: string[] = [];
  const params: unknown[] = [];
  const q = opts.q?.trim();
  if (q) {
    where.push("(p.name LIKE ? OR p.sku LIKE ? OR COALESCE(p.kv_code, '') LIKE ? OR COALESCE(p.barcode, '') LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (opts.stockFilter === "low") where.push("p.stock > 0 AND p.stock <= 5");
  if (opts.stockFilter === "out") where.push("p.stock <= 0");
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy =
    opts.stockFilter === "low" || opts.stockFilter === "out"
      ? "p.stock ASC, p.id DESC"
      : "CASE WHEN p.stock > 0 THEN 0 ELSE 1 END, p.sku ASC, p.id DESC";
  return all<InventoryProductRow>(
    `SELECT p.id, p.name, COALESCE(p.sku, '') AS sku, COALESCE(p.kv_code, '') AS kv_code, COALESCE(p.barcode, '') AS barcode,
            p.price, p.sale_price,
            COALESCE(p.cost_price, 0) AS cost_price, COALESCE(p.contact_only, 0) AS contact_only,
            p.stock, COALESCE(p.unit, '') AS unit, COALESCE(p.supplier, '') AS supplier,
            c.name AS category_name
     FROM products p JOIN product_categories c ON c.id = p.category_id
     ${w}
     ORDER BY ${orderBy} LIMIT ?`,
    ...params,
    opts.limit ?? 2000,
  );
}

export async function listInventoryMovements(limit = 50) {
  await ensureRetailOpsSchema();
  return all<InventoryMovementRow>(
    `SELECT m.id, m.product_id, p.name AS product_name, COALESCE(p.sku, '') AS sku,
            m.change_qty, m.stock_after, m.unit_cost, m.reason, m.ref_code,
            COALESCE(m.batch_code, '') AS batch_code, COALESCE(m.exp_date, '') AS exp_date,
            m.note, m.created_by, m.created_at
     FROM inventory_movements m
     JOIN products p ON p.id = m.product_id
     ORDER BY m.id DESC LIMIT ?`,
    limit,
  );
}

export async function listCashbookEntries(opts: { limit?: number; paymentMethod?: string } = {}) {
  await ensureRetailOpsSchema();
  const limit = opts.limit ?? 80;
  const method = opts.paymentMethod?.trim();
  if (method && (method === "cash" || method === "bank" || method === "kiotviet")) {
    return all<CashbookRow>(
      `SELECT id, entry_type, category, amount, COALESCE(payment_method, 'cash') AS payment_method,
              ref_code, note, created_by, created_at
       FROM cashbook_entries
       WHERE COALESCE(payment_method, 'cash') = ?
       ORDER BY id DESC LIMIT ?`,
      method,
      limit,
    );
  }
  return all<CashbookRow>(
    `SELECT id, entry_type, category, amount, COALESCE(payment_method, 'cash') AS payment_method,
            ref_code, note, created_by, created_at
     FROM cashbook_entries ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export async function addCashbookEntry(opts: {
  entryType: "in" | "out";
  category: string;
  amount: number;
  paymentMethod?: CashbookPaymentMethod;
  refCode?: string;
  note?: string;
  createdBy?: string;
}) {
  await ensureRetailOpsSchema();
  const method: CashbookPaymentMethod =
    opts.paymentMethod === "bank" || opts.paymentMethod === "kiotviet" ? opts.paymentMethod : "cash";
  await run(
    `INSERT INTO cashbook_entries (entry_type, category, amount, payment_method, ref_code, note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    opts.entryType,
    opts.category,
    Math.max(0, Math.round(opts.amount)),
    method,
    opts.refCode ?? "",
    opts.note ?? "",
    opts.createdBy ?? "",
  );
}

export async function listSuppliers(): Promise<SupplierRow[]> {
  await ensureRetailOpsSchema();
  return all<SupplierRow>(
    `SELECT s.id, s.code, s.name, s.phone, s.email, s.address, s.note,
            COALESCE(s.debt_balance, 0) AS debt_balance, s.is_active, s.created_at,
            (SELECT COUNT(*) FROM products p WHERE LOWER(TRIM(COALESCE(p.supplier, ''))) = LOWER(TRIM(s.name))) AS product_count
     FROM suppliers s
     ORDER BY COALESCE(s.debt_balance, 0) DESC, s.is_active DESC, s.id ASC`,
  );
}

export async function listDeliveryPartners(): Promise<DeliveryPartnerRow[]> {
  await ensureRetailOpsSchema();
  return all<DeliveryPartnerRow>(
    `SELECT d.id, d.code, d.name, d.phone, d.default_fee, d.is_active, d.note, d.created_at,
            (SELECT COUNT(*) FROM orders o WHERE LOWER(TRIM(COALESCE(o.shipping_carrier, ''))) = LOWER(TRIM(d.name)) OR LOWER(TRIM(COALESCE(o.shipping_carrier, ''))) = LOWER(TRIM(d.code))) AS order_count
     FROM delivery_partners d
     ORDER BY d.is_active DESC, d.id ASC`,
  );
}

export type EndOfDayReportData = {
  date: string;
  ordersSummary: {
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    returnedOrCancelledOrders: number;
    grossRevenue: number;
    shippingFeeTotal: number;
    codRevenue: number;
    bankRevenue: number;
    posRevenue: number;
  };
  profitSummary: {
    totalItemsSold: number;
    totalCogs: number;
    grossProfit: number;
    marginPct: number;
  };
  cashbookSummary: {
    cashIn: number;
    cashOut: number;
    bankIn: number;
    bankOut: number;
    kvIn: number;
    kvOut: number;
    totalIn: number;
    totalOut: number;
  };
  topItems: {
    product_id: number;
    name: string;
    sku: string;
    qty_sold: number;
    revenue: number;
    cogs: number;
    profit: number;
  }[];
  dayOrders: {
    id: number;
    code: string;
    name: string;
    phone: string;
    payment: string;
    total: number;
    status: string;
    created_at: string;
  }[];
  dayCashbook: CashbookRow[];
};

export async function getEndOfDayReport(dateStr?: string): Promise<EndOfDayReportData> {
  await ensureRetailOpsSchema();
  // Default to today's date in Vietnam timezone (UTC+7)
  const vnToday = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const date = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : vnToday;

  const [ordAgg, cogsAgg, cbAgg, topItems, dayOrders, dayCashbook] = await Promise.all([
    one<{
      totalOrders: number;
      completedOrders: number;
      pendingOrders: number;
      returnedOrCancelledOrders: number;
      grossRevenue: number;
      shippingFeeTotal: number;
      codRevenue: number;
      bankRevenue: number;
      posRevenue: number;
    }>(
      `SELECT COUNT(*) AS totalOrders,
              COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS completedOrders,
              COALESCE(SUM(CASE WHEN status IN ('new', 'confirmed', 'shipping') THEN 1 ELSE 0 END), 0) AS pendingOrders,
              COALESCE(SUM(CASE WHEN status IN ('cancelled', 'returned') THEN 1 ELSE 0 END), 0) AS returnedOrCancelledOrders,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'returned') THEN total ELSE 0 END), 0) AS grossRevenue,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'returned') THEN COALESCE(shipping_fee, 0) ELSE 0 END), 0) AS shippingFeeTotal,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'returned') AND payment = 'cod' THEN total ELSE 0 END), 0) AS codRevenue,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'returned') AND payment = 'bank' THEN total ELSE 0 END), 0) AS bankRevenue,
              COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'returned') AND payment IN ('cash', 'kiotviet') THEN total ELSE 0 END), 0) AS posRevenue
       FROM orders
       WHERE substr(created_at, 1, 10) = ?`,
      date,
    ),
    one<{ totalItemsSold: number; totalCogs: number }>(
      `SELECT COALESCE(SUM(oi.qty), 0) AS totalItemsSold,
              COALESCE(SUM(oi.qty * COALESCE(p.cost_price, 0)), 0) AS totalCogs
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE substr(o.created_at, 1, 10) = ? AND o.status NOT IN ('cancelled', 'returned')`,
      date,
    ),
    one<{
      cashIn: number;
      cashOut: number;
      bankIn: number;
      bankOut: number;
      kvIn: number;
      kvOut: number;
      totalIn: number;
      totalOut: number;
    }>(
      `SELECT COALESCE(SUM(CASE WHEN entry_type = 'in' AND COALESCE(payment_method, 'cash') = 'cash' THEN amount ELSE 0 END), 0) AS cashIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' AND COALESCE(payment_method, 'cash') = 'cash' THEN amount ELSE 0 END), 0) AS cashOut,
              COALESCE(SUM(CASE WHEN entry_type = 'in' AND payment_method = 'bank' THEN amount ELSE 0 END), 0) AS bankIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' AND payment_method = 'bank' THEN amount ELSE 0 END), 0) AS bankOut,
              COALESCE(SUM(CASE WHEN entry_type = 'in' AND payment_method = 'kiotviet' THEN amount ELSE 0 END), 0) AS kvIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' AND payment_method = 'kiotviet' THEN amount ELSE 0 END), 0) AS kvOut,
              COALESCE(SUM(CASE WHEN entry_type = 'in' THEN amount ELSE 0 END), 0) AS totalIn,
              COALESCE(SUM(CASE WHEN entry_type = 'out' THEN amount ELSE 0 END), 0) AS totalOut
       FROM cashbook_entries
       WHERE substr(created_at, 1, 10) = ?`,
      date,
    ),
    all<{
      product_id: number;
      name: string;
      sku: string;
      qty_sold: number;
      revenue: number;
      cogs: number;
      profit: number;
    }>(
      `SELECT oi.product_id,
              oi.name,
              COALESCE(p.sku, '') AS sku,
              SUM(oi.qty) AS qty_sold,
              SUM(oi.qty * oi.price) AS revenue,
              SUM(oi.qty * COALESCE(p.cost_price, 0)) AS cogs,
              SUM(oi.qty * (oi.price - COALESCE(p.cost_price, 0))) AS profit
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE substr(o.created_at, 1, 10) = ? AND o.status NOT IN ('cancelled', 'returned')
       GROUP BY oi.product_id, oi.name
       ORDER BY qty_sold DESC, revenue DESC
       LIMIT 30`,
      date,
    ),
    all<{
      id: number;
      code: string;
      name: string;
      phone: string;
      payment: string;
      total: number;
      status: string;
      created_at: string;
    }>(
      `SELECT id, code, name, phone, payment, total, status, created_at
       FROM orders
       WHERE substr(created_at, 1, 10) = ?
       ORDER BY id DESC LIMIT 50`,
      date,
    ),
    all<CashbookRow>(
      `SELECT id, entry_type, category, amount, COALESCE(payment_method, 'cash') AS payment_method,
              ref_code, note, created_by, created_at
       FROM cashbook_entries
       WHERE substr(created_at, 1, 10) = ?
       ORDER BY id DESC LIMIT 50`,
      date,
    ),
  ]);

  const grossRevenue = ordAgg?.grossRevenue ?? 0;
  const totalCogs = cogsAgg?.totalCogs ?? 0;
  const grossProfit = grossRevenue - totalCogs;
  const marginPct = grossRevenue > 0 ? Math.round((grossProfit / grossRevenue) * 100) : 0;

  return {
    date,
    ordersSummary: {
      totalOrders: ordAgg?.totalOrders ?? 0,
      completedOrders: ordAgg?.completedOrders ?? 0,
      pendingOrders: ordAgg?.pendingOrders ?? 0,
      returnedOrCancelledOrders: ordAgg?.returnedOrCancelledOrders ?? 0,
      grossRevenue,
      shippingFeeTotal: ordAgg?.shippingFeeTotal ?? 0,
      codRevenue: ordAgg?.codRevenue ?? 0,
      bankRevenue: ordAgg?.bankRevenue ?? 0,
      posRevenue: ordAgg?.posRevenue ?? 0,
    },
    profitSummary: {
      totalItemsSold: cogsAgg?.totalItemsSold ?? 0,
      totalCogs,
      grossProfit,
      marginPct,
    },
    cashbookSummary: {
      cashIn: cbAgg?.cashIn ?? 0,
      cashOut: cbAgg?.cashOut ?? 0,
      bankIn: cbAgg?.bankIn ?? 0,
      bankOut: cbAgg?.bankOut ?? 0,
      kvIn: cbAgg?.kvIn ?? 0,
      kvOut: cbAgg?.kvOut ?? 0,
      totalIn: cbAgg?.totalIn ?? 0,
      totalOut: cbAgg?.totalOut ?? 0,
    },
    topItems,
    dayOrders,
    dayCashbook,
  };
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
