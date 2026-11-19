import "server-only";
import crypto from "node:crypto";
import { one, run } from "./db";
import {
  getMemberProfileByUserId,
  spendPoints,
  TIER_ORDER,
  type RewardItem,
} from "./loyalty";

export async function redeemReward(userId: number, rewardId: number): Promise<{
  ok: boolean;
  couponCode?: string | null;
  balanceAfter?: number;
  redemptionId?: number;
  error?: string;
}> {
  const profile = await getMemberProfileByUserId(userId);
  if (!profile) {
    return { ok: false, error: "Không tìm thấy hồ sơ thành viên." };
  }

  const reward = await one<RewardItem>(
    `SELECT * FROM reward_catalog
     WHERE id = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    rewardId,
  );
  if (!reward) {
    return { ok: false, error: "Phần quà không tồn tại hoặc đã ngừng áp dụng." };
  }

  if ((TIER_ORDER[profile.tier] ?? 0) < (TIER_ORDER[reward.min_tier] ?? 0)) {
    return { ok: false, error: `Phần quà này yêu cầu hạng từ ${reward.min_tier.toUpperCase()} trở lên.` };
  }

  // Reserve stock atomically if limited
  if (reward.stock !== null) {
    const stockRes = await run(
      "UPDATE reward_catalog SET stock = stock - 1 WHERE id = ? AND stock > 0",
      reward.id,
    );
    if (stockRes.changes === 0) {
      return { ok: false, error: "Phần quà này đã hết số lượng." };
    }
  }

  // Deduct points atomically (`WHERE current_points >= points_cost`)
  const spent = await spendPoints({
    memberId: profile.id,
    amount: reward.points_cost,
    source: "redemption",
    referenceType: "reward",
    referenceId: reward.id,
    description: `Đổi quà: ${reward.name}`,
    metadata: { reward_id: reward.id, reward_type: reward.type },
  });

  if (!spent.ok) {
    // Rollback reserved stock if point deduction failed
    if (reward.stock !== null) {
      await run("UPDATE reward_catalog SET stock = stock + 1 WHERE id = ?", reward.id);
    }
    return { ok: false, error: spent.error ?? "Không đủ điểm để đổi quà." };
  }

  let couponCode: string | null = null;
  let fulfillmentStatus: "pending" | "delivered" = "pending";
  let parsedValue: {
    discount_type?: "percent" | "fixed";
    discount_value?: number;
    min_order?: number;
    max_discount?: number;
  } = {};
  try {
    parsedValue = JSON.parse(reward.value || "{}");
  } catch {
    parsedValue = {};
  }

  if (reward.type === "discount_coupon" || reward.type === "free_shipping") {
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    couponCode = `${reward.type === "free_shipping" ? "TDFREE" : "TDGIFT"}${rand}`;
    fulfillmentStatus = "delivered";

    const dType = parsedValue.discount_type === "percent" ? "percent" : "fixed";
    const dVal = Number(parsedValue.discount_value) || (reward.type === "free_shipping" ? 35000 : 30000);
    const minOrder = Number(parsedValue.min_order) || 0;
    const maxDiscount = Number(parsedValue.max_discount) || 0;

    await run(
      `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order, max_discount, member_only, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      couponCode,
      reward.name,
      `Mã đổi điểm từ ${profile.full_name || "Thành viên"}`,
      dType,
      dVal,
      minOrder,
      maxDiscount,
    );
  }

  const ins = await run(
    `INSERT INTO reward_redemptions (member_id, reward_id, points_spent, coupon_code, fulfillment_status, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`,
    profile.id,
    reward.id,
    reward.points_cost,
    couponCode,
    fulfillmentStatus,
    reward.value || "{}",
  );

  return {
    ok: true,
    couponCode,
    balanceAfter: spent.balanceAfter,
    redemptionId: ins.lastInsertRowid,
  };
}
