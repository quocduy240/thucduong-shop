"use server";

import { redirect } from "next/navigation";
import { recordAuditLog } from "@/lib/audit-log";
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
  const batchCode = str(formData, "batch_code");
  const expDate = str(formData, "exp_date");
  const rawNote = str(formData, "note");
  const noteParts = [
    supplierName ? `NCC: ${supplierName}` : "",
    batchCode ? `Lô: ${batchCode}` : "",
    expDate ? `HSD: ${expDate}` : "",
    rawNote,
  ].filter(Boolean);
  const note = noteParts.join(" · ") || "Nhập hàng từ nhà cung cấp";
  const recordCashOut = str(formData, "record_cash_out") === "1";
  const rawMethod = str(formData, "payment_method");
  const paymentMethod: CashbookPaymentMethod =
    rawMethod === "bank" || rawMethod === "kiotviet" ? rawMethod : "cash";
  const refCode = str(formData, "ref_code") || `PN-${Date.now().toString().slice(-6)}`;
  const totalImportCost = qty * unitCost;
  const rawPaidAmount = str(formData, "paid_amount");
  const paidAmount =
    rawPaidAmount !== "" ? Math.min(totalImportCost, Math.max(0, num(formData, "paid_amount"))) : totalImportCost;
  const debtAdded = Math.max(0, totalImportCost - (recordCashOut ? paidAmount : 0));

  if (!productId) back("/admin/inventory/?tab=import", "Vui lòng chọn sản phẩm cần nhập.");
  await recordInventoryMovement({
    productId,
    changeQty: qty,
    unitCost,
    updateCostPrice: unitCost > 0,
    reason: "import",
    refCode,
    batchCode,
    expDate,
    note,
    createdBy: admin.email,
  });
  if (supplierName) {
    await run("UPDATE products SET supplier = ? WHERE id = ?", supplierName, productId).catch(() => {});
    if (debtAdded > 0) {
      await run(
        "UPDATE suppliers SET debt_balance = COALESCE(debt_balance, 0) + ? WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))",
        debtAdded,
        supplierName,
      ).catch(() => {});
    }
  }
  if (recordCashOut && paidAmount > 0) {
    await addCashbookEntry({
      entryType: "out",
      category: "Nhập hàng NCC",
      amount: paidAmount,
      paymentMethod,
      refCode,
      note: `${note} (SL: ${qty} × ${unitCost.toLocaleString("vi-VN")}đ${debtAdded > 0 ? ` · Còn nợ NCC: ${debtAdded.toLocaleString("vi-VN")}đ` : ""})`,
      createdBy: admin.email,
    });
  }
  await recordAuditLog({
    actor: admin,
    module: "inventory",
    action: "stock_import",
    severity: debtAdded > 0 ? "warning" : "info",
    entityType: "product",
    entityId: productId,
    entityLabel: `Phiếu nhập ${refCode} (SP #${productId})`,
    diffSummary: `📥 Nhập kho +${qty} · Giá vốn: ${unitCost.toLocaleString("vi-VN")}₫ · ${note}${debtAdded > 0 ? ` · Ghi nợ NCC: ${debtAdded.toLocaleString("vi-VN")}₫` : ""}`,
  });
  refresh();
  redirect("/admin/inventory/?tab=import&saved=1");
}

export async function settleSupplierDebtAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  await ensureRetailOpsSchema();
  const supplierId = num(formData, "supplier_id");
  const payAmount = Math.max(1, num(formData, "pay_amount"));
  const rawMethod = str(formData, "payment_method");
  const paymentMethod: CashbookPaymentMethod =
    rawMethod === "bank" || rawMethod === "kiotviet" ? rawMethod : "cash";
  const note = str(formData, "note");

  const sup = await one<{ id: number; code: string; name: string; debt_balance: number }>(
    "SELECT id, code, name, COALESCE(debt_balance, 0) AS debt_balance FROM suppliers WHERE id = ?",
    supplierId,
  );
  if (!sup) back("/admin/inventory/?tab=partners", "Không tìm thấy Nhà cung cấp.");

  const nextDebt = Math.max(0, (sup?.debt_balance ?? 0) - payAmount);
  await run("UPDATE suppliers SET debt_balance = ? WHERE id = ?", nextDebt, supplierId);

  const refCode = `CN-${sup?.code || supplierId}-${Date.now().toString().slice(-4)}`;
  await addCashbookEntry({
    entryType: "out",
    category: "Thanh toán công nợ NCC",
    amount: payAmount,
    paymentMethod,
    refCode,
    note: `Trả nợ NCC ${sup?.name} (${note || "Gạch nợ công nợ phải trả"}) · Dư nợ còn: ${nextDebt.toLocaleString("vi-VN")}đ`,
    createdBy: admin.email,
  });

  refresh();
  redirect("/admin/inventory/?tab=partners&saved=1");
}

export async function exportInventoryIssueAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  const productId = num(formData, "product_id");
  const qty = Math.max(1, num(formData, "qty"));
  const issueType = str(formData, "issue_type") === "damage" ? "damage" : "internal_use";
  const rawNote = str(formData, "note");
  const prefix = issueType === "damage" ? "XH" : "XNB";
  const refCode = str(formData, "ref_code") || `${prefix}-${Date.now().toString().slice(-6)}`;
  const defaultNote =
    issueType === "damage"
      ? "Xuất hủy hàng hỏng / hết hạn (#/DamageItems)"
      : "Xuất dùng nội bộ tại cửa hàng (#/InternalUse)";

  if (!productId) back("/admin/inventory/?tab=import", "Vui lòng chọn sản phẩm cần xuất.");
  await recordInventoryMovement({
    productId,
    changeQty: -qty,
    reason: issueType,
    refCode,
    note: rawNote || defaultNote,
    createdBy: admin.email,
  });
  await recordAuditLog({
    actor: admin,
    module: "inventory",
    action: issueType,
    severity: issueType === "damage" ? "critical" : "warning",
    entityType: "product",
    entityId: productId,
    entityLabel: `Phiếu xuất ${refCode} (SP #${productId})`,
    diffSummary: `📤 ${issueType === "damage" ? "Xuất hủy hàng hỏng" : "Xuất dùng nội bộ"}: -${qty} · ${rawNote || defaultNote}`,
  });
  refresh();
  redirect("/admin/inventory/?tab=import&saved=1");
}

export async function stocktakeInventoryAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.inventory_finance);
  const productId = num(formData, "product_id");
  const actualStock = Math.max(0, num(formData, "actual_stock"));
  const costPrice = Math.max(0, num(formData, "cost_price"));
  const prod = await one<Record<string, unknown>>("SELECT id, name, sku, category_id, price, sale_price, cost_price, stock, is_published, contact_only, featured, summary FROM products WHERE id = ?", productId);
  if (!prod) back("/admin/inventory/", "Không tìm thấy sản phẩm.");
  const prevStock = Number(prod!.stock ?? 0);
  const diff = actualStock - prevStock;
  await recordInventoryMovement({
    productId,
    changeQty: diff,
    unitCost: costPrice,
    updateCostPrice: costPrice > 0,
    reason: "stocktake",
    refCode: `KK-${Date.now().toString().slice(-6)}`,
    note: `Kiểm kho thực tế (${prevStock} → ${actualStock})`,
    createdBy: admin.email,
  });
  await recordAuditLog({
    actor: admin,
    module: "inventory",
    action: "stocktake",
    severity: diff !== 0 ? "warning" : "info",
    entityType: "product",
    entityId: productId,
    entityLabel: `${prod!.sku ? `[${prod!.sku}] ` : ""}${prod!.name}`,
    beforeData: prod,
    afterData: { ...prod, stock: actualStock, cost_price: costPrice > 0 ? costPrice : prod!.cost_price },
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
