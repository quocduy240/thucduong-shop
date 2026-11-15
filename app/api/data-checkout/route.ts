import { cartLines, readCart, writeCart } from "@/lib/cart";
import { db, one } from "@/lib/db";

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
  if (!one("SELECT 1 FROM wards WHERE code = ? AND province_code = ?", ward, province)) {
    return Response.json({ error: "Tỉnh/Phường không hợp lệ." }, { status: 400 });
  }

  const { lines, total } = cartLines(await readCart());
  if (!lines.length) return Response.json({ error: "Giỏ hàng trống." }, { status: 400 });

  const code = "DH" + Date.now().toString(36).toUpperCase();
  const conn = db();
  conn.exec("BEGIN");
  try {
    const orderId = Number(
      conn
        .prepare(
          `INSERT INTO orders (code, name, phone, email, address, province_code, ward_code, note, payment, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(code, name, phone, b.email ?? "", address, province, ward, b.note ?? "", b.payment === "bank" ? "bank" : "cod", total)
        .lastInsertRowid,
    );
    const ins = conn.prepare("INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)");
    for (const l of lines) ins.run(orderId, l.product.id, l.product.name, l.unit, l.qty);
    conn.exec("COMMIT");
  } catch (e) {
    conn.exec("ROLLBACK");
    throw e;
  }

  await writeCart({});
  return Response.json({ success: true, code, redirect: `/checkout/thankyou?code=${code}` });
}
