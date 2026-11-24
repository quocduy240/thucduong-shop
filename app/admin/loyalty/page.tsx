import { requireAdminPath } from "@/lib/auth";
import { all } from "@/lib/db";
import type { MemberProfile, PointRule, RewardItem } from "@/lib/loyalty";
import LoyaltyAdminClient from "@/components/admin/LoyaltyAdminClient";

export default async function AdminLoyaltyPage() {
  await requireAdminPath("/admin/loyalty/");

  const [rules, rewards, redemptions, profiles] = await Promise.all([
    all<PointRule>("SELECT * FROM point_rules ORDER BY priority ASC, id ASC"),
    all<RewardItem>("SELECT * FROM reward_catalog ORDER BY points_cost ASC, id ASC"),
    all<{
      id: number;
      member_id: number;
      reward_id: number;
      points_spent: number;
      coupon_code: string | null;
      fulfillment_status: string;
      created_at: string;
      reward_name: string;
      full_name: string;
      phone: string | null;
      email: string | null;
    }>(
      `SELECT rr.*, rc.name AS reward_name, mp.full_name, mp.phone, mp.email
       FROM reward_redemptions rr
       JOIN reward_catalog rc ON rc.id = rr.reward_id
       JOIN member_profiles mp ON mp.id = rr.member_id
       ORDER BY rr.created_at DESC, rr.id DESC
       LIMIT 50`,
    ),
    all<MemberProfile>(
      "SELECT * FROM member_profiles WHERE status = 'active' ORDER BY current_points DESC, id DESC LIMIT 200",
    ),
  ]);

  return (
    <LoyaltyAdminClient
      initialRules={rules}
      initialRewards={rewards}
      initialRedemptions={redemptions}
      initialProfiles={profiles}
    />
  );
}
