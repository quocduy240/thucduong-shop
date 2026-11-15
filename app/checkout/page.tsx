import { redirect } from "next/navigation";
import { cartLines, readCart } from "@/lib/cart";
import { vnd } from "@/lib/site";
import { Breadcrumb } from "@/components/ui";
import CheckoutForm from "@/components/CheckoutForm";

export const metadata = { title: "Thanh toán" };

export default async function CheckoutPage() {
  const { lines, total } = cartLines(await readCart());
  if (lines.length === 0) redirect("/cart");

  return (
    <>
      <Breadcrumb items={[{ label: "Giỏ hàng", href: "/cart" }, { label: "Thanh toán" }]} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_360px]">
        <div className="rounded-lg border bg-white p-5">
          <h1 className="mb-4 text-xl font-bold">Thông tin giao hàng</h1>
          <CheckoutForm />
        </div>
        <aside className="h-fit rounded-lg border bg-white p-5">
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
        </aside>
      </div>
    </>
  );
}
