import Link from "next/link";
import { revalidatePath } from "next/cache";
import { cartLines, readCart, writeCart } from "@/lib/cart";
import { url } from "@/lib/data";
import { one } from "@/lib/db";
import { vnd } from "@/lib/site";
import { Breadcrumb, Thumb } from "@/components/ui";

export const metadata = { title: "Giỏ hàng" };

async function updateQty(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const qty = Math.floor(Number(formData.get("qty")));
  const cart = await readCart();
  const prod = await one<{ stock: number }>("SELECT stock FROM products WHERE id = ? AND COALESCE(is_published, 1) = 1", Number(id));
  const max = Math.min(prod?.stock ?? 0, 999);
  if (qty > 0 && max > 0) cart[id] = Math.min(qty, max);
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
  const { lines, total } = await cartLines(await readCart());

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
          <div className="grid gap-6 md:grid-cols-[1fr_340px]">
            <ul className="divide-y rounded-2xl border border-gray-200 bg-white shadow-2xs">
              {lines.map(({ product: p, qty, unit, subtotal }) => (
                <li key={p.id} className="p-3.5 sm:p-4">
                  <div className="flex items-start gap-3 sm:items-center sm:gap-4">
                    <Link href={url.product(p)} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-100 sm:h-20 sm:w-20">
                      <Thumb label={p.name} seed={p.id} image={p.image} />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={url.product(p)} className="line-clamp-2 text-sm font-bold text-gray-900 hover:text-brand sm:text-base">
                          {p.name}
                        </Link>
                        <form action={removeItem} className="shrink-0 sm:hidden">
                          <input type="hidden" name="id" value={p.id} />
                          <button
                            className="grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-gray-100 text-xs text-gray-500 hover:bg-red-50 hover:text-accent"
                            aria-label="Xoá"
                            title="Xoá sản phẩm"
                          >
                            ✕
                          </button>
                        </form>
                      </div>

                      <div className="mt-1 text-xs text-gray-500 sm:text-sm">
                        Đơn giá: <span className="font-semibold text-gray-700">{vnd(unit)}</span>
                        {p.stock <= 5 && p.stock > 0 && <span className="ml-2 text-xs text-amber-700">(Còn {p.stock})</span>}
                        {p.stock <= 0 && <span className="ml-2 text-xs font-semibold text-red-600">(Hết hàng)</span>}
                      </div>

                      {/* Mobile row 2: Qty + Subtotal */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5 sm:mt-0 sm:border-0 sm:pt-0 sm:hidden">
                        <form action={updateQty} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={p.id} />
                          <input
                            name="qty"
                            type="number"
                            min={0}
                            max={Math.max(1, p.stock)}
                            defaultValue={qty}
                            className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm font-semibold"
                          />
                          <button className="cursor-pointer rounded-lg border border-brand/30 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-brand hover:bg-brand hover:text-white">
                            Cập nhật
                          </button>
                        </form>
                        <div className="text-right">
                          <div className="text-[10px] text-gray-400">Thành tiền</div>
                          <div className="text-sm font-extrabold text-accent">{vnd(subtotal)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop columns */}
                    <form action={updateQty} className="hidden items-center gap-2 sm:flex">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="qty"
                        type="number"
                        min={0}
                        max={Math.max(1, p.stock)}
                        defaultValue={qty}
                        className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-center text-sm font-semibold"
                      />
                      <button className="cursor-pointer text-xs font-bold text-brand hover:underline">Cập nhật</button>
                    </form>
                    <div className="hidden w-28 text-right font-extrabold text-accent sm:block">{vnd(subtotal)}</div>
                    <form action={removeItem} className="hidden sm:block">
                      <input type="hidden" name="id" value={p.id} />
                      <button className="cursor-pointer p-1 text-gray-400 hover:text-accent" aria-label="Xoá" title="Xoá">
                        ✕
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="h-fit space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs">
              <div className="rounded-xl bg-emerald-50/70 p-3 text-xs">
                {total >= 500000 ? (
                  <div className="font-bold text-emerald-800">
                    🎉 Đơn hàng đã đủ điều kiện <strong>Miễn phí vận chuyển</strong>!
                  </div>
                ) : (
                  <div className="text-gray-700">
                    Mua thêm <strong className="text-accent">{vnd(500000 - total)}</strong> để được{" "}
                    <strong className="text-brand">Miễn phí vận chuyển</strong>
                  </div>
                )}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-200/70">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${Math.min(100, Math.round((total / 500000) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-base">
                <span className="font-semibold text-gray-700">Tạm tính</span>
                <span className="text-xl font-extrabold text-accent">{vnd(total)}</span>
              </div>
              <Link href="/checkout" className="block rounded-xl bg-accent py-3 text-center text-sm font-extrabold text-white shadow hover:opacity-95">
                Tiến hành đặt hàng →
              </Link>
              <Link href="/san-pham/" className="block text-center text-xs font-semibold text-brand hover:underline">
                ← Tiếp tục mua sắm
              </Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
