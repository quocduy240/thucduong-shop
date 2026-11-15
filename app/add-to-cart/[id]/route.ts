import { redirect } from "next/navigation";
import { addToCart } from "@/lib/cart";
import { one } from "@/lib/db";

// GET /add-to-cart/{id} — no-JS fallback link: add one item, then go to the cart.
export async function GET(_req: Request, ctx: RouteContext<"/add-to-cart/[id]">) {
  const id = Number((await ctx.params).id);
  if (Number.isInteger(id) && one("SELECT 1 FROM products WHERE id = ?", id)) await addToCart(id, 1);
  redirect("/cart");
}
