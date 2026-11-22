"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { one, run } from "@/lib/db";
import {
  saveKiotVietConfig,
  syncInventoryFromKiotViet,
  testKiotVietConnection,
} from "@/lib/kiotviet";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import {
  addCashbookEntry,
  ensureRetailOpsSchema,
  recordInventoryMovement,
  type CashbookPaymentMethod,
} from "@/lib/retail-ops";
import { back, num, refresh, str } from "./shared";

export async function importInventoryAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  const productId = num(formData, "product_id");
  const qty = Math.max(1, num(formData, "qty"));
  const unitCost = Math.max(0, num(formData, "unit_cost"));
  const supplierName = str(formData, "supplier_name");
  const rawNote = str(formData, "note");
  const note = [supplierName ? `NCC: ${supplierName}` : "", rawNote].filter(Boolean).join(" · ") || "Nhập hàng từ nhà cung cấp";
  const recordCashOut = str(formData, "record_cash_out") === "1";
  const rawMethod = str(formData, "payment_method");
  const paymentMethod: CashbookPaymentMethod =
    rawMethod === "bank" || rawMethod === "kiotviet" ? rawMethod : "cash";
  const refCode = str(formData, "ref_code") || `PN-${Date.now().toString().slice(-6)}`;

  if (!productId) back("/admin/inventory/?tab=import", "Vui lòng chọn sản phẩm cần nhập.");
  await recordInventoryMovement({
    productId,
    changeQty: qty,
    unitCost,
    updateCostPrice: unitCost > 0,
    reason: "import",
    refCode,
    note,
    createdBy: admin.email,
  });
  if (supplierName) {
    await run("UPDATE products SET supplier = ? WHERE id = ?", supplierName, productId).catch(() => {});
  }
  if (recordCashOut && unitCost > 0) {
    await addCashbookEntry({
      entryType: "out",
      category: "Nhập hàng NCC",
      amount: qty * unitCost,
      paymentMethod,
      refCode,
      note: `${note} (SL: ${qty} × ${unitCost.toLocaleString("vi-VN")}đ)`,
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
  const rawMethod = str(formData, "payment_method");
  const paymentMethod: CashbookPaymentMethod =
    rawMethod === "bank" || rawMethod === "kiotviet" ? rawMethod : "cash";
  const refCode = str(formData, "ref_code");
  const note = str(formData, "note");
  await addCashbookEntry({
    entryType,
    category,
    amount,
    paymentMethod,
    refCode,
    note,
    createdBy: admin.email,
  });
  refresh();
  redirect("/admin/inventory/?tab=cashbook&saved=1");
}

export async function saveSupplierAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  await ensureRetailOpsSchema();
  const id = num(formData, "id");
  const name = str(formData, "name");
  if (!name) back("/admin/inventory/?tab=partners", "Vui lòng nhập tên Nhà cung cấp.");
  const code = str(formData, "code") || `NCC${Date.now().toString().slice(-4)}`;
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const address = str(formData, "address");
  const note = str(formData, "note");
  const isActive = str(formData, "is_active") === "0" ? 0 : 1;

  if (id > 0) {
    await run(
      "UPDATE suppliers SET code=?, name=?, phone=?, email=?, address=?, note=?, is_active=? WHERE id=?",
      code, name, phone, email, address, note, isActive, id,
    );
  } else {
    await run(
      "INSERT INTO suppliers (code, name, phone, email, address, note, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      code, name, phone, email, address, note, isActive,
    );
  }
  refresh();
  redirect("/admin/inventory/?tab=partners&saved=1");
}

export async function deleteSupplierAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  await ensureRetailOpsSchema();
  const id = num(formData, "id");
  if (id > 0) {
    await run("DELETE FROM suppliers WHERE id = ?", id);
  }
  refresh();
  redirect("/admin/inventory/?tab=partners&saved=1");
}

export async function saveDeliveryPartnerAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  await ensureRetailOpsSchema();
  const id = num(formData, "id");
  const name = str(formData, "name");
  if (!name) back("/admin/inventory/?tab=partners", "Vui lòng nhập tên Đối tác giao hàng.");
  const code = str(formData, "code") || `DT${Date.now().toString().slice(-4)}`;
  const phone = str(formData, "phone");
  const defaultFee = Math.max(0, num(formData, "default_fee"));
  const note = str(formData, "note");
  const isActive = str(formData, "is_active") === "0" ? 0 : 1;

  if (id > 0) {
    await run(
      "UPDATE delivery_partners SET code=?, name=?, phone=?, default_fee=?, note=?, is_active=? WHERE id=?",
      code, name, phone, defaultFee, note, isActive, id,
    );
  } else {
    await run(
      "INSERT INTO delivery_partners (code, name, phone, default_fee, note, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      code, name, phone, defaultFee, note, isActive,
    );
  }
  refresh();
  redirect("/admin/inventory/?tab=partners&saved=1");
}

export async function deleteDeliveryPartnerAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  await ensureRetailOpsSchema();
  const id = num(formData, "id");
  if (id > 0) {
    await run("DELETE FROM delivery_partners WHERE id = ?", id);
  }
  refresh();
  redirect("/admin/inventory/?tab=partners&saved=1");
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
