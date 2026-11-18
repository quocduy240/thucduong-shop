import { cartLines, readCart, writeCart } from "@/lib/cart";
import { batch, one, run } from "@/lib/db";
import { sendNewOrderEmail } from "@/lib/mail";
import { currentMember, evaluateCoupon } from "@/lib/member-auth";

// POST /api/data-checkout — create an order from the cookie cart.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = (b.name ?? "").trim();
  const phone = (b.phone ?? "").trim();
  const address = (b.address ?? "").trim();
  const province = b.province_code ?? "";
  const ward = b.ward_code ?? "";

  if (!name || !/^0\d{9,10}$/.test(phone) || !address) {
    return Response.json({ error: "Vui lòng nhập đủ họ tên, số điện thoại hợp lệ và địa chỉ." }, { status: 400 });
  }
  if (!(await one("SELECT 1 FROM wards WHERE code = ? AND province_code = ?", ward, province))) {
    return Response.json({ error: "Tỉnh/Phường không hợp lệ." }, { status: 400 });
  }

  const { lines, total } = await cartLines(await readCart());
  if (!lines.length) return Response.json({ error: "Giỏ hàng trống." }, { status: 400 });

  for (const l of lines) {
    if (l.product.stock < l.qty) {
      return Response.json(
        {
          error:
            l.product.stock <= 0
              ? `Sản phẩm "${l.product.name}" hiện đã hết hàng.`
              : `Sản phẩm "${l.product.name}" chỉ còn ${l.product.stock} trong kho.`,
        },
        { status: 400 },
      );
    }
  }

  const member = await currentMember();
  const rawCoupon = (b.coupon_code ?? "").trim().toUpperCase();
  let couponDiscount = 0;
  let appliedCoupon = "";
  if (rawCoupon) {
    const cRes = await evaluateCoupon(rawCoupon, total, !!member);
    if (!cRes.valid || !cRes.coupon) {
      return Response.json({ error: cRes.error ?? "Mã giảm giá không hợp lệ." }, { status: 400 });
    }
    couponDiscount = cRes.discount;
    appliedCoupon = cRes.coupon.code;
  }

  const tierPct = member?.tier === "gold" ? 5 : member?.tier === "silver" ? 3 : 0;
  const tierDiscount = tierPct > 0 ? Math.round((total * tierPct) / 100) : 0;
  const discountAmount = Math.min(total, couponDiscount + tierDiscount);
  const finalTotal = Math.max(0, total - discountAmount);

  const code = "DH" + Date.now().toString(36).toUpperCase();

  // Deduct stock per item atomically
  for (const l of lines) {
    const r = await run(
      "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
      l.qty,
      l.product.id,
      l.qty,
    );
    if (!r.changes) {
      return Response.json({ error: `Sản phẩm "${l.product.name}" không đủ số lượng tồn kho.` }, { status: 400 });
    }
  }

  const orderRes = await run(
    `INSERT INTO orders (code, name, phone, email, address, province_code, ward_code, note, payment, total, coupon_code, discount_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    code,
    name,
    phone,
    b.email ?? "",
    address,
    province,
    ward,
    b.note ?? "",
    b.payment === "bank" ? "bank" : "cod",
    finalTotal,
    appliedCoupon,
    discountAmount,
  );
  const orderId = Number(orderRes.lastInsertRowid);

  const stmts: { sql: string; params: unknown[] }[] = [];
  for (const l of lines) {
    stmts.push({
      sql: "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
      params: [orderId, l.product.id, l.product.name, l.unit, l.qty],
    });
    stmts.push({
      sql: "UPDATE flash_sale_items SET sold = MIN(quota, sold + ?) WHERE product_id = ? AND active = 1",
      params: [l.qty, l.product.id],
    });
  }
  if (appliedCoupon) {
    stmts.push({
      sql: "UPDATE coupons SET used_count = used_count + 1 WHERE code = ?",
      params: [appliedCoupon],
    });
  }
  if (member) {
    const earnedPoints = Math.max(10, Math.floor(finalTotal / 10000));
    const newPoints = member.points + earnedPoints;
    const newTier = newPoints >= 1500 ? "gold" : newPoints >= 500 ? "silver" : member.tier;
    stmts.push({
      sql: "UPDATE members SET points = ?, tier = ? WHERE id = ?",
      params: [newPoints, newTier, member.id],
    });
  }
  await batch(stmts);

  await writeCart({});

  void sendNewOrderEmail({
    code,
    name,
    phone,
    email: b.email ?? "",
    address,
    province_code: province,
    ward_code: ward,
    note: b.note ?? "",
    payment: b.payment === "bank" ? "bank" : "cod",
    total: finalTotal,
    items: lines.map((l) => ({
      name: l.product.name,
      unit: l.unit,
      qty: l.qty,
      subtotal: l.subtotal,
    })),
  });

  return Response.json({ success: true, code, redirect: `/checkout/thankyou?code=${code}` });
}
