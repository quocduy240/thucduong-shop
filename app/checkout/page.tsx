import Link from "next/link";
import { redirect } from "next/navigation";
import { cartLines, readCart } from "@/lib/cart";
import { vnd } from "@/lib/site";
import { Breadcrumb } from "@/components/ui";
import CheckoutForm from "@/components/CheckoutForm";

export const metadata = { title: "Thanh toán" };

export default async function CheckoutPage() {
  const { lines, total } = await cartLines(await readCart());
  if (lines.length === 0) redirect("/cart");

  return (
    <>
      <Breadcrumb items={[{ label: "Giỏ hàng", href: "/cart" }, { label: "Thanh toán" }]} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_380px]">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h1 className="mb-4 text-xl font-bold">Thông tin giao hàng</h1>
          <CheckoutForm subtotal={total} />
        </div>
        <aside className="space-y-4 h-fit">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold">Đơn hàng ({lines.length} sản phẩm)</h2>
            <ul className="space-y-2 text-sm">
              {lines.map((l) => (
                <li key={l.product.id} className="flex justify-between gap-2">
                  <span>{l.product.name} × {l.qty}</span>
                  <span className="shrink-0">{vnd(l.subtotal)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t pt-3 text-lg">
              <span>Tổng cộng</span>
              <span className="font-bold text-accent">{vnd(total)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50/60 p-4 text-xs text-gray-700 space-y-2">
            <div className="text-sm font-bold text-brand">Quyền lợi &amp; Chính sách khách hàng</div>
            <ul className="space-y-1.5">
              <li>
                🚚 <strong>Vận chuyển:</strong> Nội thành TP.HCM giao trong <strong>1 – 2 ngày</strong>; các khu vực khác <strong>3 – 4 ngày</strong> (nguyên đai, nguyên kiện).{" "}
                <Link href="/chinh-sach/chinh-sach-van-chuyen.html" className="text-brand underline">Chi tiết</Link>
              </li>
              <li>
                📦 <strong>Kiểm hàng:</strong> Chấp nhận đồng kiểm với nhân viên giao hàng hoặc trong vòng <strong>30 phút</strong> từ khi nhận (quý khách vui lòng quay video lúc mở thùng).{" "}
                <Link href="/chinh-sach/chinh-sach-kiem-hang.html" className="text-brand underline">Chi tiết</Link>
              </li>
              <li>
                🔄 <strong>Đổi trả - Hoàn tiền:</strong> Thông báo trong <strong>48h</strong> và gửi trả trong <strong>7 ngày</strong> nếu sai mẫu mã, thiếu số lượng hoặc rách/vỡ bao bì.{" "}
                <Link href="/chinh-sach/chinh-sach-doi-tra-hoan-tien.html" className="text-brand underline">Chi tiết</Link>
              </li>
              <li>
                🔒 <strong>Bảo mật thông tin:</strong> Cam kết chỉ dùng thông tin để xác nhận &amp; giao đơn hàng; giải quyết khiếu nại trong vòng <strong>24h</strong>.{" "}
                <Link href="/chinh-sach/chinh-sach-bao-mat-thong-tin.html" className="text-brand underline">Chi tiết</Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
