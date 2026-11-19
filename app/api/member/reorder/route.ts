import { NextResponse } from "next/server";
import { readCart, writeCart } from "@/lib/cart";
import { all, one } from "@/lib/db";
import { currentMember } from "@/lib/member-auth";

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Vui lòng đăng nhập thành viên." }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const orderId = Number(b.orderId);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Đơn hàng không hợp lệ." }, { status: 400 });
  }

  const order = await one<{ id: number }>(
    `SELECT id FROM orders
     WHERE id = ? AND (LOWER(email) = LOWER(?) OR (phone <> '' AND phone = ?))`,
    orderId,
    member.email,
    member.phone,
  );
  if (!order) {
    return NextResponse.json({ error: "Không tìm thấy đơn hàng thuộc tài khoản của bạn." }, { status: 404 });
  }

  const items = await all<{ product_id: number; qty: number }>(
    `SELECT oi.product_id, oi.qty
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ? AND p.price > 0 AND p.stock > 0`,
    orderId,
  );
  if (items.length === 0) {
    return NextResponse.json({ error: "Các sản phẩm trong đơn này hiện tạm hết hàng." }, { status: 400 });
  }

  const cart = await readCart();
  for (const it of items) {
    const key = String(it.product_id);
    cart[key] = Math.min(999, (cart[key] ?? 0) + it.qty);
  }
  await writeCart(cart);

  return NextResponse.json({ ok: true, addedCount: items.length });
}
