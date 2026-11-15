import { redirect } from "next/navigation";
import { addToCart } from "@/lib/cart";
import { one } from "@/lib/db";

// GET /add-to-cart/{id} — no-JS fallback link: add one item, then go to the cart.
export async function GET(_req: Request, ctx: RouteContext<"/add-to-cart/[id]">) {
  const id = Number((await ctx.params).id);
  const prod = Number.isInteger(id)
    ? one<{ stock: number; price: number }>("SELECT stock, price FROM products WHERE id = ?", id)
    : undefined;
  if (prod && prod.stock > 0 && prod.price > 0) await addToCart(id, 1, prod.stock);
  redirect("/cart");
}
