import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { all } from "@/lib/db";

const csvEsc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  await requireRole(["super_admin", "admin", "sales"]);
  const rows = await all<{
    code: string;
    name: string;
    phone: string;
    address: string;
    note: string;
    created_at: string;
    sku: string;
    item_name: string;
    qty: number;
    price: number;
  }>(
    `SELECT o.code, o.name, o.phone, o.address, o.note, o.created_at,
            COALESCE(p.sku, '') AS sku, oi.name AS item_name, oi.qty, oi.price
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN products p ON p.id = oi.product_id
     ORDER BY o.id DESC LIMIT 500`,
  );

  const header = [
    "Mã đơn hàng",
    "Thời gian",
    "Khách hàng",
    "Điện thoại",
    "Địa chỉ",
    "Mã hàng",
    "Tên hàng",
    "Số lượng",
    "Đơn giá",
    "Ghi chú",
  ].join(",");

  const body = rows
    .map((r) =>
      [
        r.code,
        r.created_at,
        r.name,
        r.phone,
        r.address,
        r.sku || r.item_name,
        r.item_name,
        r.qty,
        r.price,
        r.note,
      ]
        .map(csvEsc)
        .join(","),
    )
    .join("\n");

  return new NextResponse(`\uFEFF${header}\n${body}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kiotviet-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
