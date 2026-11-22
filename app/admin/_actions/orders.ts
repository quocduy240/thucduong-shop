"use server";

import { redirect } from "next/navigation";
import { isOrderStatus } from "@/lib/admin-data";
import { requireRole } from "@/lib/auth";
import { all, batch, one, run } from "@/lib/db";
import { pushOrderToKiotViet } from "@/lib/kiotviet";
import { logInfo } from "@/lib/logger";
import { onOrderStatusChanged } from "@/lib/loyalty-events";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import {
  addCashbookEntry,
  ensureRetailOpsSchema,
  recordInventoryMovement,
  type CashbookPaymentMethod,
} from "@/lib/retail-ops";
import { back, num, refresh, str } from "./shared";

const isRestoredStockStatus = (s: string) => s === "cancelled" || s === "returned";

export async function updateOrderStatusAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.orders_ops);
  const id = num(formData, "id");
  const status = str(formData, "status");
  if (!isOrderStatus(status)) back(`/admin/orders/${id}/`, "Trạng thái không hợp lệ.");
  const current = await one<{ status: string; code: string }>("SELECT status, code FROM orders WHERE id = ?", id);
  if (!current) return back("/admin/orders/", "Đơn hàng không tồn tại.");

  if (current.status !== status) {
    const items = await all<{ product_id: number; qty: number }>(
      "SELECT product_id, qty FROM order_items WHERE order_id = ?",
      id,
    );
    const wasRestored = isRestoredStockStatus(current.status);
    const willRestore = isRestoredStockStatus(status);
    if (!wasRestored && willRestore) {
      for (const it of items) {
        await recordInventoryMovement({
          productId: it.product_id,
          changeQty: it.qty,
          reason: "cancel",
          refCode: current.code,
          note: status === "returned" ? `Khách trả hàng hoàn kho đơn ${current.code}` : `Huỷ đơn hoàn kho ${current.code}`,
          createdBy: admin.email,
        }).catch(async () => {
          await run("UPDATE products SET stock = stock + ? WHERE id = ?", it.qty, it.product_id);
        });
      }
    } else if (wasRestored && !willRestore) {
      for (const it of items) {
        await recordInventoryMovement({
          productId: it.product_id,
          changeQty: -it.qty,
          reason: "sale",
          refCode: current.code,
          note: `Khôi phục đơn hàng ${current.code}`,
          createdBy: admin.email,
        }).catch(async () => {
          await run("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?", it.qty, it.product_id);
        });
      }
    }
  }
  await batch([{ sql: "UPDATE orders SET status = ? WHERE id = ?", params: [status, id] }]);
  if (current.status !== status) {
    await onOrderStatusChanged(id, current.status, status);
    logInfo("admin.order_status_updated", {
      orderId: id,
      from: current.status,
      to: status,
      actor: admin.email,
    });
  }
  refresh();
  redirect(`/admin/orders/${id}/?saved=1`);
}

export async function returnOrderAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.orders_ops);
  await ensureRetailOpsSchema();
  const id = num(formData, "id");
  const reasonNote = str(formData, "return_note") || "Khách trả hàng / Hoàn kho theo chuẩn KiotViet";
  const recordRefund = str(formData, "record_refund") === "1";
  const refundMethodRaw = str(formData, "refund_method");
  const refundMethod: CashbookPaymentMethod =
    refundMethodRaw === "bank" || refundMethodRaw === "kiotviet" ? refundMethodRaw : "cash";

  const order = await one<{ id: number; code: string; name: string; status: string; total: number }>(
    "SELECT id, code, name, status, total FROM orders WHERE id = ?",
    id,
  );
  if (!order) return back("/admin/orders/", "Đơn hàng không tồn tại.");

  const refundAmount = str(formData, "refund_amount") !== "" ? Math.max(0, num(formData, "refund_amount")) : order.total;

  if (!isRestoredStockStatus(order.status)) {
    const items = await all<{ product_id: number; qty: number }>(
      "SELECT product_id, qty FROM order_items WHERE order_id = ?",
      id,
    );
    for (const it of items) {
      await recordInventoryMovement({
        productId: it.product_id,
        changeQty: it.qty,
        reason: "cancel",
        refCode: `TH-${order.code}`,
        note: `${reasonNote} (Đơn ${order.code})`,
        createdBy: admin.email,
      }).catch(async () => {
        await run("UPDATE products SET stock = stock + ? WHERE id = ?", it.qty, it.product_id);
      });
    }
  }

  await run(
    "UPDATE orders SET status = 'returned', shipping_status = 'returned' WHERE id = ?",
    id,
  );

  if (recordRefund && refundAmount > 0) {
    await addCashbookEntry({
      entryType: "out",
      category: "Hoàn tiền khách trả hàng",
      amount: refundAmount,
      paymentMethod: refundMethod,
      refCode: `TH-${order.code}`,
      note: `${reasonNote} — Khách: ${order.name}`,
      createdBy: admin.email,
    });
  }

  if (order.status !== "returned") {
    await onOrderStatusChanged(id, order.status, "returned").catch(() => {});
    logInfo("admin.order_returned", {
      orderId: id,
      code: order.code,
      refundAmount: recordRefund ? refundAmount : 0,
      refundMethod,
      actor: admin.email,
    });
  }

  refresh();
  redirect(`/admin/orders/${id}/?saved=1`);
}

export async function saveOrderShippingAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.orders_ops);
  await ensureRetailOpsSchema();
  const id = num(formData, "id");
  const carrier = str(formData, "shipping_carrier");
  const tracking = str(formData, "tracking_code");
  const fee = Math.max(0, num(formData, "shipping_fee"));
  const cod = Math.max(0, num(formData, "cod_amount"));
  const shipStatus = str(formData, "shipping_status");
  await run(
    `UPDATE orders SET shipping_carrier = ?, tracking_code = ?, shipping_fee = ?, cod_amount = ?, shipping_status = ? WHERE id = ?`,
    carrier, tracking, fee, cod, shipStatus, id,
  );
  refresh();
  redirect(`/admin/orders/${id}/?saved=1`);
}

export async function pushOrderKiotVietAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.orders_ops);
  const id = num(formData, "id");
  try {
    const res = await pushOrderToKiotViet(id);
    refresh();
    redirect(`/admin/orders/${id}/?saved=1&kv=${encodeURIComponent(res.kvCode || res.kvId)}`);
  } catch (e) {
    redirect(`/admin/orders/${id}/?error=${encodeURIComponent((e as Error).message)}`);
  }
}

export async function createPosOrderAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.orders_ops);
  await ensureRetailOpsSchema();
  const name = str(formData, "name") || "Khách lẻ tại quầy";
  const phone = str(formData, "phone") || "0000000000";
  const address = str(formData, "address") || "Mua trực tiếp tại cửa hàng";
  const payment = str(formData, "payment") || "cash";
  const note = str(formData, "note");
  const discount = Math.max(0, num(formData, "discount"));
  const itemsJson = str(formData, "items_json");
  let parsed: { id: number; qty: number }[] = [];
  try {
    parsed = JSON.parse(itemsJson);
  } catch {
    back("/admin/pos/", "Danh sách sản phẩm không hợp lệ.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    back("/admin/pos/", "Vui lòng chọn ít nhất 1 sản phẩm vào đơn.");
  }

  let subtotal = 0;
  const resolved: { id: number; name: string; price: number; qty: number }[] = [];
  for (const row of parsed) {
    const qty = Math.max(1, Number(row.qty) || 1);
    const prod = await one<{ id: number; name: string; price: number; sale_price: number | null }>(
      "SELECT id, name, price, sale_price FROM products WHERE id = ?",
      Number(row.id),
    );
    if (!prod) continue;
    const unitPrice = prod.sale_price ?? prod.price;
    subtotal += unitPrice * qty;
    resolved.push({ id: prod.id, name: prod.name, price: unitPrice, qty });
  }
  if (resolved.length === 0) back("/admin/pos/", "Không tìm thấy sản phẩm hợp lệ.");

  const total = Math.max(0, subtotal - discount);
  const code = `TD-POS-${Date.now().toString().slice(-6)}`;
  const status = payment === "cod" ? "confirmed" : "done";

  const orderRes = await run(
    `INSERT INTO orders (code, name, phone, email, address, province_code, ward_code, note, payment, total, status)
     VALUES (?, ?, ?, '', ?, '', '', ?, ?, ?, ?)`,
    code, name, phone, address, note, payment, total, status,
  );
  const orderId = orderRes.lastInsertRowid;

  for (const item of resolved) {
    await run(
      "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
      orderId, item.id, item.name, item.price, item.qty,
    );
    await recordInventoryMovement({
      productId: item.id,
      changeQty: -item.qty,
      reason: "sale",
      refCode: code,
      note: `Bán hàng POS (${name})`,
      createdBy: admin.email,
    });
  }

  if (status === "done" && total > 0) {
    const cbMethod: CashbookPaymentMethod =
      payment === "bank" ? "bank" : payment === "kiotviet" ? "kiotviet" : "cash";
    await addCashbookEntry({
      entryType: "in",
      category: "Bán hàng POS",
      amount: total,
      paymentMethod: cbMethod,
      refCode: code,
      note: `Thu tiền đơn ${code} (${name})`,
      createdBy: admin.email,
    });
  }

  refresh();
  redirect(`/admin/orders/${orderId}/?saved=1`);
}
