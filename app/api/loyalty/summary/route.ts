import { NextResponse } from "next/server";
import { currentMember } from "@/lib/member-auth";
import {
  getActiveRewards,
  getMemberProfileByUserId,
  getMemberRedemptions,
  getPointTransactions,
  resolveOnLoginOrRegister,
} from "@/lib/loyalty";
import { getMemberReferralsCount, getMemberStreak } from "@/lib/loyalty-events";

export async function GET() {
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profile = await getMemberProfileByUserId(member.id);
  if (!profile) {
    profile = await resolveOnLoginOrRegister({
      userId: member.id,
      phone: member.phone,
      email: member.email,
      fullName: member.name,
    });
  }

  const [streak, referrals, transactions, rewards, redemptions] = await Promise.all([
    getMemberStreak(profile.id),
    getMemberReferralsCount(profile.id),
    getPointTransactions(profile.id, 30),
    getActiveRewards(),
    getMemberRedemptions(profile.id, 20),
  ]);

  return NextResponse.json(
    {
      profile,
      streak,
      referrals,
      transactions,
      rewards,
      redemptions,
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
