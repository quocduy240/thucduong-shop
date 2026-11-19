import { NextResponse } from "next/server";
import { currentMember } from "@/lib/member-auth";
import { redeemReward } from "@/lib/loyalty-redeem";

export async function POST(req: Request) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Vui lòng đăng nhập thành viên để đổi quà." }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));
  const rewardId = Number(b.rewardId);
  if (!Number.isInteger(rewardId) || rewardId <= 0) {
    return NextResponse.json({ error: "Phần quà không hợp lệ." }, { status: 400 });
  }

  const res = await redeemReward(member.id, rewardId);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }
  return NextResponse.json(res, { headers: { "Cache-Control": "no-store, private" } });
}
