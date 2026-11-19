import { NextResponse } from "next/server";
import { currentMember } from "@/lib/member-auth";
import { awardReadArticlePoints, claimDailyLogin } from "@/lib/loyalty-events";

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Vui lòng đăng nhập thành viên." }, { status: 401 });
  }

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
    const postTitle = String(b.postTitle ?? "").slice(0, 120);
    if (!Number.isInteger(postId) || postId <= 0 || scrollPct < 70 || seconds < 30) {
      return NextResponse.json({ awarded: false, reason: "criteria_not_met" });
    }
    const res = await awardReadArticlePoints(member.id, postId, postTitle);
    return NextResponse.json(res, { headers: { "Cache-Control": "no-store, private" } });
  }

  return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
