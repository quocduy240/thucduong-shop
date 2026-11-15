import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cartLines, readCart, writeCart } from "@/lib/cart";
import { url } from "@/lib/data";
import { vnd } from "@/lib/site";
import { Breadcrumb, Thumb } from "@/components/ui";

export const metadata = { title: "Giỏ hàng" };

async function updateQty(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const qty = Math.floor(Number(formData.get("qty")));
  const cart = await readCart();
  if (qty > 0) cart[id] = Math.min(qty, 999);
  else delete cart[id];
  await writeCart(cart);
  revalidatePath("/cart");
}

async function removeItem(formData: FormData) {
  "use server";
  const cart = await readCart();
  delete cart[String(formData.get("id"))];
  await writeCart(cart);
  revalidatePath("/cart");
}

export default async function CartPage() {
  const { lines, total } = cartLines(await readCart());

  return (
    <>
      <Breadcrumb items={[{ label: "Giỏ hàng" }]} />
      <div className="mx-auto max-w-6xl px-4">
        <h1 className="mb-6 text-2xl font-bold">Giỏ hàng</h1>
        {lines.length === 0 ? (
          <div className="rounded-lg border bg-white p-10 text-center">
            <p className="text-gray-500">Giỏ hàng của bạn đang trống.</p>
            <Link href="/san-pham/" className="mt-4 inline-block rounded-full bg-brand px-5 py-2 text-white">Tiếp tục mua sắm</Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <ul className="divide-y rounded-lg border bg-white">
              {lines.map(({ product: p, qty, unit, subtotal }) => (
                <li key={p.id} className="flex items-center gap-4 p-4">
                  <Link href={url.product(p)} className="w-20 shrink-0 overflow-hidden rounded">
                    <Thumb label="" seed={p.id} />
                  </Link>
                  <div className="flex-1">
                    <Link href={url.product(p)} className="font-medium hover:text-brand">{p.name}</Link>
                    <div className="text-sm text-gray-500">{vnd(unit)}</div>
                  </div>
                  <form action={updateQty} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="qty" type="number" min={0} defaultValue={qty} className="w-16 rounded border px-2 py-1 text-center" />
                    <button className="text-sm text-brand hover:underline">Cập nhật</button>
                  </form>
                  <div className="w-28 text-right font-semibold">{vnd(subtotal)}</div>
                  <form action={removeItem}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="text-gray-400 hover:text-accent" aria-label="Xoá">✕</button>
                  </form>
                </li>
              ))}
            </ul>
            <aside className="h-fit rounded-lg border bg-white p-5">
              <div className="flex justify-between text-lg">
                <span>Tạm tính</span>
                <span className="font-bold text-accent">{vnd(total)}</span>
              </div>
              <Link href="/checkout" className="mt-4 block rounded-lg bg-accent py-3 text-center font-semibold text-white">Tiến hành đặt hàng</Link>
              <Link href="/san-pham/" className="mt-2 block text-center text-sm text-brand hover:underline">Tiếp tục mua sắm</Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
