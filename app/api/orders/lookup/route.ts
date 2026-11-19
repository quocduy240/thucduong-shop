import { NextResponse } from "next/server";
import { all, one } from "@/lib/db";
import { normalizePhone } from "@/lib/loyalty";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const code = String(b.code ?? "").trim().toUpperCase();
  const phone = normalizePhone(String(b.phone ?? ""));

  if (!code || !phone) {
    return NextResponse.json(
      { error: "Vui lòng nhập đầy đủ Mã đơn hàng và Số điện thoại đặt hàng." },
      { status: 400 },
    );
  }

  const order = await one<{
    id: number;
    code: string;
    name: string;
    phone: string;
    address: string;
    payment: string;
    total: number;
    discount_amount: number;
    coupon_code: string;
    status: string;
    created_at: string;
  }>(
    "SELECT id, code, name, phone, address, payment, total, discount_amount, coupon_code, status, created_at FROM orders WHERE UPPER(code) = ?",
    code,
  );

  if (!order || normalizePhone(order.phone) !== phone) {
    return NextResponse.json(
      { error: "Không tìm thấy đơn hàng khớp với Mã đơn và Số điện thoại đã nhập." },
      { status: 404 },
    );
  }

  const items = await all<{ name: string; price: number; qty: number }>(
    "SELECT name, price, qty FROM order_items WHERE order_id = ?",
    order.id,
  );

  const estimatedPoints = Math.floor(Math.max(0, order.total) / 10000);
  const maskedPhone = order.phone.length >= 7 ? `${order.phone.slice(0, 3)}****${order.phone.slice(-3)}` : order.phone;

  return NextResponse.json({
    order: {
      code: order.code,
      name: order.name,
      phone: maskedPhone,
      payment: order.payment,
      total: order.total,
      discount_amount: order.discount_amount,
      coupon_code: order.coupon_code,
      status: order.status,
      created_at: order.created_at,
      estimatedPoints,
    },
    items,
  });
}
