import { addToCart } from "@/lib/cart";
import { one } from "@/lib/db";

// POST /api/v2/add-to-cart/{id}  body: { qty?: number }  → { count, total }
export async function POST(req: Request, ctx: RouteContext<"/api/v2/add-to-cart/[id]">) {
  const id = Number((await ctx.params).id);
  const prod = Number.isInteger(id)
    ? await one<{ stock: number; price: number }>(
        "SELECT stock, CASE WHEN COALESCE(contact_only, 0) = 1 THEN 0 ELSE price END AS price FROM products WHERE id = ? AND COALESCE(is_published, 1) = 1",
        id,
      )
    : undefined;
  if (!prod) {
    return Response.json({ error: "Sản phẩm không tồn tại" }, { status: 404 });
  }
  if (prod.stock <= 0 || prod.price <= 0) {
    return Response.json({ error: "Sản phẩm hiện đang hết hàng." }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  // Accept `qty` (canonical), `quantity` (body) or ?quantity= (legacy callers).
  const rawQty = body.qty ?? body.quantity ?? new URL(req.url).searchParams.get("quantity");
  const reqQty = Math.min(999, Math.max(1, Math.floor(Number(rawQty) || 1)));
  if (reqQty > prod.stock) {
    return Response.json({ error: `Chỉ còn ${prod.stock} sản phẩm trong kho.` }, { status: 400 });
  }
  const { count, total } = await addToCart(id, reqQty, prod.stock);
  return Response.json({ success: true, count, total });
}
