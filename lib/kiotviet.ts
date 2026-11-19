import "server-only";
import { all, one, run } from "./db";
import { ensureRetailOpsSchema, recordInventoryMovement } from "./retail-ops";

export type KiotVietConfig = {
  enabled: boolean;
  retailer: string;
  clientId: string;
  clientSecret: string;
  branchId: string;
  autoPush: boolean;
  webhookSecret: string;
};

const KV_KEYS = [
  "kiotviet_enabled",
  "kiotviet_retailer",
  "kiotviet_client_id",
  "kiotviet_client_secret",
  "kiotviet_branch_id",
  "kiotviet_auto_push",
  "kiotviet_webhook_secret",
] as const;

export async function getKiotVietConfig(): Promise<KiotVietConfig> {
  const rows = await all<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key IN (${KV_KEYS.map(() => "?").join(",")})`,
    ...KV_KEYS,
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    enabled: map.kiotviet_enabled === "1",
    retailer: map.kiotviet_retailer ?? "",
    clientId: map.kiotviet_client_id ?? "",
    clientSecret: map.kiotviet_client_secret ?? "",
    branchId: map.kiotviet_branch_id ?? "",
    autoPush: map.kiotviet_auto_push === "1",
    webhookSecret: map.kiotviet_webhook_secret ?? "",
  };
}

export async function saveKiotVietConfig(cfg: KiotVietConfig): Promise<void> {
  const pairs: [string, string][] = [
    ["kiotviet_enabled", cfg.enabled ? "1" : "0"],
    ["kiotviet_retailer", cfg.retailer.trim()],
    ["kiotviet_client_id", cfg.clientId.trim()],
    ["kiotviet_client_secret", cfg.clientSecret.trim()],
    ["kiotviet_branch_id", cfg.branchId.trim()],
    ["kiotviet_auto_push", cfg.autoPush ? "1" : "0"],
    ["kiotviet_webhook_secret", cfg.webhookSecret.trim()],
  ];
  for (const [k, v] of pairs) {
    await run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", k, v);
  }
}

let cachedToken: { key: string; token: string; expiresAt: number } | null = null;

export async function getKiotVietAccessToken(cfg: KiotVietConfig): Promise<string> {
  if (!cfg.retailer || !cfg.clientId || !cfg.clientSecret) {
    throw new Error("Thiếu thông tin kết nối KiotViet (Retailer, ClientId hoặc ClientSecret).");
  }
  const cacheKey = `${cfg.retailer}:${cfg.clientId}`;
  if (cachedToken && cachedToken.key === cacheKey && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }
  const body = new URLSearchParams({
    scopes: "PublicApi.Access",
    grant_type: "client_credentials",
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
  });
  const res = await fetch("https://id.kiotviet.vn/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || `KiotViet OAuth lỗi HTTP ${res.status}`);
  }
  cachedToken = {
    key: cacheKey,
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function kvFetch<T>(cfg: KiotVietConfig, path: string, init: RequestInit = {}): Promise<T> {
  const token = await getKiotVietAccessToken(cfg);
  const res = await fetch(`https://public.kiotapi.com${path}`, {
    ...init,
    headers: {
      Retailer: cfg.retailer,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    responseStatus?: { message?: string };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data?.responseStatus?.message || data?.message || `KiotViet API HTTP ${res.status}`);
  }
  return data;
}

export async function testKiotVietConnection(cfg: KiotVietConfig) {
  const res = await kvFetch<{ data?: { id: number; branchName: string; address?: string }[] }>(
    cfg,
    "/branches?pageSize=20",
  );
  return res.data ?? [];
}

export async function pushOrderToKiotViet(orderId: number): Promise<{ kvId: string; kvCode: string }> {
  await ensureRetailOpsSchema();
  const cfg = await getKiotVietConfig();
  if (!cfg.retailer || !cfg.clientId || !cfg.clientSecret) {
    throw new Error("Chưa cấu hình KiotViet API trong /admin/kiotviet/.");
  }

  const order = await one<{
    id: number;
    code: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    note: string;
    total: number;
  }>("SELECT id, code, name, phone, email, address, note, total FROM orders WHERE id = ?", orderId);
  if (!order) throw new Error("Không tìm thấy đơn hàng.");

  const items = await all<{
    product_id: number;
    name: string;
    price: number;
    qty: number;
    sku: string;
  }>(
    `SELECT oi.product_id, oi.name, oi.price, oi.qty, COALESCE(p.sku, '') AS sku
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    orderId,
  );

  let branchId = Number(cfg.branchId) || 0;
  if (!branchId) {
    const branches = await testKiotVietConnection(cfg);
    branchId = branches[0]?.id ?? 0;
  }
  if (!branchId) throw new Error("Không xác định được Chi nhánh (Branch ID) trên KiotViet.");

  const payload = {
    branchId,
    purchaseDate: new Date().toISOString(),
    description: `[Web ${order.code}] ${order.note || ""}`.trim(),
    customer: {
      name: order.name,
      contactNumber: order.phone,
      address: order.address,
      email: order.email || undefined,
    },
    orderDetails: items.map((it) => ({
      productCode: it.sku || `SP-${it.product_id}`,
      productName: it.name,
      quantity: it.qty,
      price: it.price,
    })),
    totalPayment: 0,
  };

  const created = await kvFetch<{ id?: number; code?: string }>(cfg, "/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const kvId = String(created.id ?? "");
  const kvCode = String(created.code ?? "");

  await run(
    "UPDATE orders SET kiotviet_order_id = ?, kiotviet_code = ?, kiotviet_synced_at = datetime('now') WHERE id = ?",
    kvId,
    kvCode,
    orderId,
  );
  return { kvId, kvCode };
}

export async function syncInventoryFromKiotViet(createdBy = "admin"): Promise<{ matched: number; updated: number }> {
  await ensureRetailOpsSchema();
  const cfg = await getKiotVietConfig();
  const res = await kvFetch<{
    data?: { code?: string; inventories?: { onHand?: number; cost?: number; branchId?: number }[] }[];
  }>(cfg, "/products?includeInventory=true&pageSize=100");

  const branchId = Number(cfg.branchId) || 0;
  let matched = 0;
  let updated = 0;

  for (const kp of res.data ?? []) {
    const code = (kp.code ?? "").trim();
    if (!code) continue;
    const local = await one<{ id: number; stock: number }>(
      "SELECT id, stock FROM products WHERE sku = ? LIMIT 1",
      code,
    );
    if (!local) continue;
    matched++;
    const inv = branchId
      ? kp.inventories?.find((i) => i.branchId === branchId) ?? kp.inventories?.[0]
      : kp.inventories?.[0];
    if (!inv || typeof inv.onHand !== "number") continue;
    const targetStock = Math.max(0, Math.round(inv.onHand));
    const diff = targetStock - local.stock;
    if (diff !== 0) {
      await recordInventoryMovement({
        productId: local.id,
        changeQty: diff,
        unitCost: typeof inv.cost === "number" ? Math.round(inv.cost) : undefined,
        updateCostPrice: typeof inv.cost === "number",
        reason: "kiotviet_sync",
        refCode: code,
        note: "Đồng bộ tồn kho từ KiotViet",
        createdBy,
      });
      updated++;
    }
  }
  return { matched, updated };
}
