import { search, url } from "@/lib/data";
import { unitPrice } from "@/lib/cart";
import { vnd } from "@/lib/site";

// GET /search/post/autocomplete?q=... → { items: [{ type, name, url, price? }] }
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ items: [] });
  const { products, posts } = await search(q, 6);
  const productItems = await Promise.all(
    products.map(async (p) => ({
      type: "product",
      name: p.name,
      url: url.product(p),
      price: vnd(await unitPrice(p)),
    })),
  );
  return Response.json({
    items: [
      ...productItems,
      ...posts.map((p) => ({ type: "post", name: p.title, url: url.post(p) })),
    ],
  });
}
