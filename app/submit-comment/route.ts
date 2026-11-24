import { one, run } from "@/lib/db";
import { currentMember } from "@/lib/member-auth";
import { awardCommentOrReviewPoints } from "@/lib/loyalty-events";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

// POST /submit-comment  body: { product_id, name, content, rating }
export async function POST(req: Request) {
  const rl = checkRateLimit(getClientIp(req), { namespace: "submit-comment", limit: 6, windowMs: 5 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);
  const b = await req.json().catch(() => ({}));
  const id = Number(b.product_id);
  const name = String(b.name ?? "").trim().slice(0, 100);
  const content = String(b.content ?? "").trim().slice(0, 2000);
  const rating = Math.min(5, Math.max(1, Math.round(Number(b.rating) || 5)));
  if (!name || !content) return Response.json({ error: "Vui lòng nhập họ tên và nội dung." }, { status: 400 });

  const prod = await one("SELECT 1 FROM products WHERE id = ?", id);
  if (!prod) return Response.json({ error: "Sản phẩm không tồn tại." }, { status: 404 });

  const ins = await run(
    "INSERT INTO comments (product_id, name, content, rating) VALUES (?, ?, ?, ?)",
    id,
    name,
    content,
    rating,
  );

  let pointsAwarded = 0;
  const member = await currentMember();
  if (member && ins.lastInsertRowid) {
    const res = await awardCommentOrReviewPoints({
      userId: member.id,
      productId: id,
      commentId: ins.lastInsertRowid,
      content,
    });
    if (res.awarded) pointsAwarded = res.points ?? (content.trim().length >= 50 ? 10 : 30);
  }

  return Response.json({ success: true, pointsAwarded });
}
