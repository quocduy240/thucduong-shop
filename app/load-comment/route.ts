import { all } from "@/lib/db";

// GET /load-comment?product_id=<id> → { items }
export function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("product_id"));
  return Response.json({
    items: all("SELECT id, name, content, created_at FROM comments WHERE product_id = ? ORDER BY id DESC LIMIT 50", id),
  });
}
