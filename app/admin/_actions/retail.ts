"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { one } from "@/lib/db";
import {
  saveKiotVietConfig,
  syncInventoryFromKiotViet,
  testKiotVietConnection,
} from "@/lib/kiotviet";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import { addCashbookEntry, recordInventoryMovement } from "@/lib/retail-ops";
import { back, num, refresh, str } from "./shared";

export async function importInventoryAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  const productId = num(formData, "product_id");
  const qty = Math.max(1, num(formData, "qty"));
  const unitCost = Math.max(0, num(formData, "unit_cost"));
  const note = str(formData, "note");
  const recordCashOut = str(formData, "record_cash_out") === "1";
  if (!productId) back("/admin/inventory/?tab=import", "Vui lòng chọn sản phẩm cần nhập.");
  await recordInventoryMovement({
    productId,
    changeQty: qty,
    unitCost,
    updateCostPrice: unitCost > 0,
    reason: "import",
    refCode: `PN-${Date.now().toString().slice(-6)}`,
    note: note || "Nhập hàng từ nhà cung cấp",
    createdBy: admin.email,
  });
  if (recordCashOut && unitCost > 0) {
    await addCashbookEntry({
      entryType: "out",
      category: "Nhập hàng NCC",
      amount: qty * unitCost,
      note: note || `Nhập ${qty} SP #${productId}`,
      createdBy: admin.email,
    });
  }
  refresh();
  redirect("/admin/inventory/?tab=import&saved=1");
}

export async function stocktakeInventoryAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  const productId = num(formData, "product_id");
  const actualStock = Math.max(0, num(formData, "actual_stock"));
  const costPrice = Math.max(0, num(formData, "cost_price"));
  const prod = await one<{ stock: number }>("SELECT stock FROM products WHERE id = ?", productId);
  if (!prod) back("/admin/inventory/", "Không tìm thấy sản phẩm.");
  const diff = actualStock - prod!.stock;
  await recordInventoryMovement({
    productId,
    changeQty: diff,
    unitCost: costPrice,
    updateCostPrice: costPrice > 0,
    reason: "stocktake",
    refCode: `KK-${Date.now().toString().slice(-6)}`,
    note: `Kiểm kho thực tế (${prod!.stock} → ${actualStock})`,
    createdBy: admin.email,
  });
  refresh();
  redirect("/admin/inventory/?tab=stock&saved=1");
}

export async function addCashbookAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  const entryType = str(formData, "entry_type") === "out" ? "out" : "in";
  const category = str(formData, "category") || (entryType === "in" ? "Thu bán hàng" : "Chi vận hành");
  const amount = Math.max(1, num(formData, "amount"));
  const note = str(formData, "note");
  await addCashbookEntry({
    entryType,
    category,
    amount,
    note,
    createdBy: admin.email,
  });
  refresh();
  redirect("/admin/inventory/?tab=cashbook&saved=1");
}

export async function saveKiotVietConfigAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.system_settings);
  await saveKiotVietConfig({
    enabled: str(formData, "enabled") === "1",
    retailer: str(formData, "retailer"),
    clientId: str(formData, "client_id"),
    clientSecret: str(formData, "client_secret"),
    branchId: str(formData, "branch_id"),
    autoPush: str(formData, "auto_push") === "1",
    webhookSecret: str(formData, "webhook_secret"),
  });
  refresh();
  redirect("/admin/kiotviet/?saved=1");
}

export async function testKiotVietAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.system_settings);
  const cfg = {
    enabled: str(formData, "enabled") === "1",
    retailer: str(formData, "retailer"),
    clientId: str(formData, "client_id"),
    clientSecret: str(formData, "client_secret"),
    branchId: str(formData, "branch_id"),
    autoPush: str(formData, "auto_push") === "1",
    webhookSecret: str(formData, "webhook_secret"),
  };
  await saveKiotVietConfig(cfg);
  try {
    const branches = await testKiotVietConnection(cfg);
    const summary = branches.map((b) => `${b.branchName} (ID: ${b.id})`).join(", ") || "Kết nối thành công";
    redirect(`/admin/kiotviet/?saved=1&msg=${encodeURIComponent(`Kết nối KiotViet OK: ${summary}`)}`);
  } catch (e) {
    redirect(`/admin/kiotviet/?error=${encodeURIComponent((e as Error).message)}`);
  }
}

export async function syncKiotVietInventoryAction() {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  try {
    const res = await syncInventoryFromKiotViet(admin.email);
    refresh();
    redirect(
      `/admin/kiotviet/?saved=1&msg=${encodeURIComponent(`Đã khớp ${res.matched} SKU, cập nhật tồn kho ${res.updated} sản phẩm.`)}`,
    );
  } catch (e) {
    redirect(`/admin/kiotviet/?error=${encodeURIComponent((e as Error).message)}`);
  }
}
