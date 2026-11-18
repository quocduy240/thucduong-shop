import { currentAdmin } from "@/lib/auth";
import { exportOrders, type OrderSort } from "@/lib/admin-data";

const cell = (v: unknown) => {
  let s = String(v ?? "");
  // neutralise spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

// GET /admin/orders/export - filtered orders as CSV (UTF-8 with BOM so Excel shows Vietnamese correctly).
export async function GET(req: Request) {
  if (!(await currentAdmin())) return new Response("Unauthorized", { status: 401 });
  const { searchParams } = new URL(req.url);
  const sortRaw = searchParams.get("sort") ?? "newest";
  const sort: OrderSort =
    sortRaw === "oldest" || sortRaw === "total_desc" || sortRaw === "total_asc" ? sortRaw : "newest";

  const rows = await exportOrders({
    status: searchParams.get("status") ?? "",
    q: searchParams.get("q") ?? "",
    payment: searchParams.get("payment") ?? "",
    date: searchParams.get("date") ?? "",
    month: searchParams.get("month") ?? "",
    year: searchParams.get("year") ?? "",
    from: searchParams.get("from") ?? "",
    to: searchParams.get("to") ?? "",
    sort,
  });

  const head = [
    "Mã đơn",
    "Ngày đặt",
    "Khách hàng",
    "Điện thoại",
    "Email",
    "Địa chỉ",
    "Ghi chú",
    "Thanh toán",
    "Trạng thái",
    "Tổng tiền",
    "Sản phẩm",
  ];
  const lines = rows.map((o) =>
    [o.code, o.created_at, o.name, o.phone, o.email, o.address, o.note, o.payment, o.status, o.total, o.items]
      .map(cell)
      .join(","),
  );
  const body = "\uFEFF" + [head.map(cell).join(","), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="don-hang-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
