import { addToCart } from "@/lib/cart";
import { one } from "@/lib/db";

// POST /api/v2/add-to-cart/{id}  body: { qty?: number }  → { count, total }
export async function POST(req: Request, ctx: RouteContext<"/api/v2/add-to-cart/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || !one("SELECT 1 FROM products WHERE id = ?", id)) {
    return Response.json({ error: "Sản phẩm không tồn tại" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const { count, total } = await addToCart(id, Number(body.qty) || 1);
  return Response.json({ success: true, count, total });
}
