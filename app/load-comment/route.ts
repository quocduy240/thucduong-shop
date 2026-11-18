import { all, one } from "@/lib/db";

// GET /load-comment?product_id=<id> → { items, stats }
export async function GET(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("product_id"));
  const [items, statsRow, byStar] = await Promise.all([
    all<{ id: number; name: string; content: string; rating: number; created_at: string }>(
      "SELECT id, name, content, rating, created_at FROM comments WHERE product_id = ? ORDER BY id DESC LIMIT 50",
      id,
    ),
    one<{ avg: number; total: number }>(
      "SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS avg, COUNT(*) AS total FROM comments WHERE product_id = ?",
      id,
    ),
    all<{ rating: number; n: number }>(
      "SELECT rating, COUNT(*) AS n FROM comments WHERE product_id = ? GROUP BY rating",
      id,
    ),
  ]);
  const stats = statsRow ?? { avg: 0, total: 0 };
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of byStar) {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating] = r.n;
  }
  return Response.json({ items, stats: { ...stats, counts } });
}
