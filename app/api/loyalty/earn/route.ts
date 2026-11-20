import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { currentMember } from "@/lib/member-auth";
import { awardReadArticlePoints, claimDailyLogin } from "@/lib/loyalty-events";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Vui lòng đăng nhập thành viên." }, { status: 401 });
  }

  const rl = checkRateLimit(String(member.id), {
    namespace: "loyalty-earn",
    limit: 20,
    windowMs: 5 * 60_000,
  });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");

  if (action === "daily_login") {
    const res = await claimDailyLogin(member.id);
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store, private" } });
  }

  if (action === "read_article") {
    const postId = Number(b.postId);
    const scrollPct = Number(b.scrollPct ?? 0);
    const seconds = Number(b.seconds ?? 0);
    if (!Number.isInteger(postId) || postId <= 0 || scrollPct < 70 || seconds < 30) {
      return NextResponse.json({ awarded: false, reason: "criteria_not_met" });
    }
    const postRow = await one<{ id: number; title: string }>("SELECT id, title FROM posts WHERE id = ?", postId);
    if (!postRow) {
      return NextResponse.json({ awarded: false, reason: "post_not_found" }, { status: 404 });
    }
    const res = await awardReadArticlePoints(member.id, postRow.id, postRow.title.slice(0, 120));
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store, private" } });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
