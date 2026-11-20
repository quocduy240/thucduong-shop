import "server-only";
import crypto from "node:crypto";
import { all, batch, one, run } from "./db";
import { logInfo } from "./logger";

export type LoyaltyTier = "bronze" | "silver" | "gold" | "diamond";
export type PointSource =
  | "purchase"
  | "signup"
  | "referral_bonus"
  | "referral_joined"
  | "comment"
  | "review"
  | "read_article"
  | "download_doc"
  | "daily_login"
  | "streak_bonus"
  | "redemption"
  | "admin_adjust"
  | "refund_reversal"
  | "expiry";

export type MemberProfile = {
  id: number;
  user_id: number | null;
  phone: string | null;
  email: string | null;
  full_name: string;
  current_points: number;
  lifetime_points: number;
  tier: LoyaltyTier;
  status: "active" | "merged" | "banned";
  merged_into_id: number | null;
  rfm_segment: string | null;
  referral_code: string;
  last_active_at: string;
  last_purchase_at: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
};

export type PointTransaction = {
  id: number;
  member_id: number;
  source: PointSource;
  change_amount: number;
  balance_after: number;
  reference_type: string;
  reference_id: number | null;
  metadata: string;
  description: string;
  expires_at: string | null;
  created_at: string;
};

export type PointRule = {
  id: number;
  code: string;
  name: string;
  source: PointSource;
  points_formula: string;
  conditions: string;
  limits: string;
  is_active: number;
  priority: number;
};

export type RewardItem = {
  id: number;
  type: "discount_coupon" | "free_shipping" | "gift_item" | "cash_credit";
  name: string;
  description: string;
  points_cost: number;
  value: string;
  stock: number | null;
  min_tier: LoyaltyTier;
  is_active: number;
  expires_at: string | null;
  created_at: string;
};

export type RewardRedemption = {
  id: number;
  member_id: number;
  reward_id: number;
  points_spent: number;
  coupon_code: string | null;
  fulfillment_status: "pending" | "delivered" | "used" | "expired";
  metadata: string;
  created_at: string;
  used_at: string | null;
  reward_name?: string;
  reward_type?: string;
};

export const TIER_ORDER: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  diamond: 3,
};

export const TIER_MULTIPLIERS: Record<LoyaltyTier, number> = {
  bronze: 1.0,
  silver: 1.2,
  gold: 1.5,
  diamond: 2.0,
};

export function computeTier(lifetimePoints: number): LoyaltyTier {
  if (lifetimePoints >= 10000) return "diamond";
  if (lifetimePoints >= 3000) return "gold";
  if (lifetimePoints >= 1000) return "silver";
  return "bronze";
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  let clean = phone.replace(/[^\d]/g, "");
  if (clean.startsWith("84") && clean.length >= 11) {
    clean = "0" + clean.slice(2);
  }
  return clean.length >= 9 ? clean : null;
}

export function normalizeEmail(email?: string | null): string | null {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  return clean.includes("@") ? clean : null;
}

export function generateReferralCode(seed?: number): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return seed ? `TD${seed}${rand.slice(0, 4)}` : `TD${rand}`;
}

export function todayHoChiMinh(): string {
  // Asia/Ho_Chi_Minh is UTC+7 year-round
  const vn = new Date(Date.now() + 7 * 3600 * 1000);
  return vn.toISOString().slice(0, 10);
}

/**
 * Sync legacy `members` table with `member_profiles` balance/tier so existing UI/APIs remain consistent.
 */
async function syncLegacyMember(profileId: number) {
  const profile = await one<{ user_id: number | null; current_points: number; tier: LoyaltyTier }>(
    "SELECT user_id, current_points, tier FROM member_profiles WHERE id = ?",
    profileId,
  );
  if (profile?.user_id) {
    const legacyTier = profile.tier === "diamond" ? "gold" : profile.tier;
    await run("UPDATE members SET points = ?, tier = ? WHERE id = ?", profile.current_points, legacyTier, profile.user_id);
  }
}

/**
 * Append-only ledger entry + atomic balance update on `member_profiles`.
 * Enforces idempotency when `referenceType` & `referenceId` are provided.
 */
export async function awardPoints(params: {
  memberId: number;
  source: PointSource;
  amount: number;
  referenceType?: string;
  referenceId?: number | null;
  description: string;
  metadata?: Record<string, unknown>;
  expiresAt?: string | null;
}): Promise<{ awarded: boolean; balanceAfter?: number; reason?: string }> {
  const amount = Math.floor(params.amount);
  if (amount === 0) return { awarded: false, reason: "zero_amount" };

  const profile = await one<MemberProfile>(
    "SELECT * FROM member_profiles WHERE id = ? AND status = 'active'",
    params.memberId,
  );
  if (!profile) return { awarded: false, reason: "profile_not_found" };

  const refType = params.referenceType ?? "";
  const refId = params.referenceId ?? null;

  if (refId !== null) {
    const dup = await one<{ id: number }>(
      `SELECT id FROM point_transactions
       WHERE member_id = ? AND source = ? AND reference_type = ? AND reference_id = ?`,
      profile.id,
      params.source,
      refType,
      refId,
    );
    if (dup) return { awarded: false, reason: "duplicate" };
  }

  const lifetimeDelta = amount > 0 ? amount : 0;
  try {
    await batch([
      {
        sql: `UPDATE member_profiles
              SET current_points = MAX(0, current_points + ?),
                  lifetime_points = lifetime_points + ?,
                  last_active_at = datetime('now'),
                  updated_at = datetime('now')
              WHERE id = ? AND status = 'active'`,
        params: [amount, lifetimeDelta, profile.id],
      },
      {
        sql: `INSERT INTO point_transactions
              (member_id, source, change_amount, balance_after, reference_type, reference_id, metadata, description, expires_at)
              VALUES (?, ?, ?, (SELECT current_points FROM member_profiles WHERE id = ?), ?, ?, ?, ?, ?)`,
        params: [
          profile.id,
          params.source,
          amount,
          profile.id,
          refType,
          refId,
          JSON.stringify(params.metadata ?? {}),
          params.description,
          params.expiresAt ?? null,
        ],
      },
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return { awarded: false, reason: "duplicate" };
    }
    throw err;
  }

  const updated = await one<{ current_points: number; lifetime_points: number; tier: LoyaltyTier }>(
    "SELECT current_points, lifetime_points, tier FROM member_profiles WHERE id = ?",
    profile.id,
  );
  const nextBalance = updated?.current_points ?? Math.max(0, profile.current_points + amount);
  const nextTier = computeTier(updated?.lifetime_points ?? profile.lifetime_points + lifetimeDelta);
  if (updated && updated.tier !== nextTier) {
    await run("UPDATE member_profiles SET tier = ?, updated_at = datetime('now') WHERE id = ?", nextTier, profile.id);
  }

  await syncLegacyMember(profile.id);
  logInfo("loyalty.points_awarded", {
    memberId: profile.id,
    source: params.source,
    amount,
    balanceAfter: nextBalance,
    tier: nextTier,
    referenceType: refType || undefined,
    referenceId: refId ?? undefined,
  });
  return { awarded: true, balanceAfter: nextBalance };
}

/**
 * Synchronize manual admin adjustments from `/admin/members/` directly into the unified
 * `member_profiles` + `point_transactions` ledger so both tables never diverge.
 */
export async function syncAdminMemberAdjustment(params: {
  userId: number;
  points: number;
  tier: LoyaltyTier;
  adminEmail?: string;
}) {
  const member = await one<{ id: number; name: string; email: string; phone: string }>(
    "SELECT id, name, email, phone FROM members WHERE id = ?",
    params.userId,
  );
  if (!member) return;

  const profile = await resolveOnLoginOrRegister({
    userId: member.id,
    phone: member.phone,
    email: member.email,
    fullName: member.name,
  });

  const targetPoints = Math.max(0, Math.floor(params.points));
  const delta = targetPoints - profile.current_points;
  const nextLifetime = Math.max(profile.lifetime_points, targetPoints);

  await batch([
    {
      sql: `UPDATE member_profiles
            SET current_points = ?, lifetime_points = ?, tier = ?, updated_at = datetime('now')
            WHERE id = ?`,
      params: [targetPoints, nextLifetime, params.tier, profile.id],
    },
    ...(delta !== 0
      ? [
          {
            sql: `INSERT INTO point_transactions
                  (member_id, source, change_amount, balance_after, reference_type, reference_id, metadata, description)
                  VALUES (?, 'admin_adjust', ?, ?, 'admin', NULL, ?, ?)`,
            params: [
              profile.id,
              delta,
              targetPoints,
              JSON.stringify({ adminEmail: params.adminEmail ?? "" }),
              `Quản trị viên điều chỉnh điểm (${profile.current_points} → ${targetPoints})`,
            ],
          },
        ]
      : []),
  ]);

  await syncLegacyMember(profile.id);
  logInfo("loyalty.admin_adjusted", {
    memberId: profile.id,
    userId: params.userId,
    delta,
    targetPoints,
    tier: params.tier,
  });
}

/**
 * Atomic point deduction (`WHERE current_points >= amount`) to prevent negative balances / race conditions.
 */
export async function spendPoints(params: {
  memberId: number;
  amount: number;
  source?: PointSource;
  referenceType?: string;
  referenceId?: number | null;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; balanceAfter?: number; error?: string }> {
  const cost = Math.floor(params.amount);
  if (cost <= 0) return { ok: false, error: "Số điểm cần trừ phải lớn hơn 0." };

  const res = await run(
    `UPDATE member_profiles
     SET current_points = current_points - ?, last_active_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND status = 'active' AND current_points >= ?`,
    cost,
    params.memberId,
    cost,
  );
  if (res.changes === 0) {
    return { ok: false, error: "Số dư điểm không đủ để thực hiện đổi quà." };
  }

  const updated = await one<{ current_points: number }>(
    "SELECT current_points FROM member_profiles WHERE id = ?",
    params.memberId,
  );
  const balanceAfter = updated?.current_points ?? 0;

  await run(
    `INSERT INTO point_transactions
     (member_id, source, change_amount, balance_after, reference_type, reference_id, metadata, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    params.memberId,
    params.source ?? "redemption",
    -cost,
    balanceAfter,
    params.referenceType ?? "reward",
    params.referenceId ?? null,
    JSON.stringify(params.metadata ?? {}),
    params.description,
  );

  await syncLegacyMember(params.memberId);
  return { ok: true, balanceAfter };
}

/**
 * Resolve or create a guest `member_profiles` record by phone or email (for guest checkout).
 */
export async function resolveGuestProfile(input: {
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
}): Promise<MemberProfile | null> {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  if (!phone && !email) return null;

  let existing: MemberProfile | undefined;
  if (phone) {
    existing = await one<MemberProfile>(
      "SELECT * FROM member_profiles WHERE phone = ? AND status = 'active'",
      phone,
    );
  }
  if (!existing && email) {
    existing = await one<MemberProfile>(
      "SELECT * FROM member_profiles WHERE email = ? AND status = 'active'",
      email,
    );
  }

  if (existing) {
    // Enrich missing contact fields cleanly
    const nextPhone = existing.phone ?? phone;
    const nextEmail = existing.email ?? email;
    const nextName = existing.full_name || (input.fullName ?? "").trim();
    if (nextPhone !== existing.phone || nextEmail !== existing.email || nextName !== existing.full_name) {
      await run(
        "UPDATE member_profiles SET phone = ?, email = ?, full_name = ?, updated_at = datetime('now') WHERE id = ?",
        nextPhone,
        nextEmail,
        nextName,
        existing.id,
      );
    }
    return (await one<MemberProfile>("SELECT * FROM member_profiles WHERE id = ?", existing.id)) ?? existing;
  }

  const code = generateReferralCode();
  const ins = await run(
    `INSERT INTO member_profiles (user_id, phone, email, full_name, referral_code)
     VALUES (NULL, ?, ?, ?, ?)`,
    phone,
    email,
    (input.fullName ?? "").trim(),
    code,
  );
  return (await one<MemberProfile>("SELECT * FROM member_profiles WHERE id = ?", ins.lastInsertRowid)) ?? null;
}

/**
 * IdentityResolverService: merge guest profiles matching phone/email into the logged-in user's profile
 * so points earned during guest checkout are never lost upon registration/login.
 */
export async function resolveOnLoginOrRegister(input: {
  userId: number;
  phone?: string | null;
  email?: string | null;
  fullName?: string | null;
}): Promise<MemberProfile> {
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  let primary = await one<MemberProfile>(
    "SELECT * FROM member_profiles WHERE user_id = ? AND status = 'active'",
    input.userId,
  );

  // Find guest profiles (user_id IS NULL) matching phone or email
  const guestCandidates: MemberProfile[] = [];
  if (phone) {
    const g = await one<MemberProfile>(
      "SELECT * FROM member_profiles WHERE phone = ? AND status = 'active' AND (user_id IS NULL OR user_id <> ?)",
      phone,
      input.userId,
    );
    if (g && !g.user_id) guestCandidates.push(g);
  }
  if (email) {
    const g = await one<MemberProfile>(
      "SELECT * FROM member_profiles WHERE email = ? AND status = 'active' AND (user_id IS NULL OR user_id <> ?)",
      email,
      input.userId,
    );
    if (g && !g.user_id && !guestCandidates.some((c) => c.id === g.id)) {
      guestCandidates.push(g);
    }
  }

  if (!primary) {
    if (guestCandidates.length > 0) {
      // Promote first guest profile to become the user's primary profile
      const promoted = guestCandidates.shift()!;
      await run(
        `UPDATE member_profiles
         SET user_id = ?, phone = COALESCE(phone, ?), email = COALESCE(email, ?),
             full_name = CASE WHEN full_name = '' THEN ? ELSE full_name END,
             last_active_at = datetime('now'), updated_at = datetime('now')
         WHERE id = ?`,
        input.userId,
        phone,
        email,
        (input.fullName ?? "").trim(),
        promoted.id,
      );
      primary = (await one<MemberProfile>("SELECT * FROM member_profiles WHERE id = ?", promoted.id))!;
    } else {
      const memberRow = await one<{ points: number; tier: string }>(
        "SELECT points, tier FROM members WHERE id = ?",
        input.userId,
      );
      const pts = memberRow?.points ?? 0;
      const ins = await run(
        `INSERT INTO member_profiles (user_id, phone, email, full_name, current_points, lifetime_points, tier, referral_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        input.userId,
        phone,
        email,
        (input.fullName ?? "").trim(),
        pts,
        pts,
        computeTier(pts),
        generateReferralCode(input.userId),
      );
      primary = (await one<MemberProfile>("SELECT * FROM member_profiles WHERE id = ?", ins.lastInsertRowid))!;
    }
  }

  // Merge any remaining guest candidates into `primary`
  for (const guest of guestCandidates) {
    if (guest.id === primary.id) continue;
    await run(
      "UPDATE member_profiles SET status = 'merged', merged_into_id = ?, phone = NULL, email = NULL, updated_at = datetime('now') WHERE id = ?",
      primary.id,
      guest.id,
    );
    if (guest.current_points > 0) {
      await awardPoints({
        memberId: primary.id,
        source: "admin_adjust",
        amount: guest.current_points,
        referenceType: "merge_profile",
        referenceId: guest.id,
        description: `Gộp ${guest.current_points} điểm từ lịch sử mua hàng trước khi đăng ký`,
        metadata: { merged_from_profile_id: guest.id },
      });
    }
    await run(
      `UPDATE member_profiles
       SET total_orders = total_orders + ?, total_spent = total_spent + ?,
           last_purchase_at = COALESCE(last_purchase_at, ?), updated_at = datetime('now')
       WHERE id = ?`,
      guest.total_orders,
      guest.total_spent,
      guest.last_purchase_at,
      primary.id,
    );
  }

  await syncLegacyMember(primary.id);
  return (await one<MemberProfile>("SELECT * FROM member_profiles WHERE id = ?", primary.id))!;
}

export async function getMemberProfileByUserId(userId: number): Promise<MemberProfile | null> {
  const row = await one<MemberProfile>(
    "SELECT * FROM member_profiles WHERE user_id = ? AND status = 'active'",
    userId,
  );
  return row ?? null;
}

export async function getPointTransactions(memberId: number, limit = 30): Promise<PointTransaction[]> {
  return all<PointTransaction>(
    "SELECT * FROM point_transactions WHERE member_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
    memberId,
    limit,
  );
}

export async function getActiveRewards(): Promise<RewardItem[]> {
  return all<RewardItem>(
    `SELECT * FROM reward_catalog
     WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))
     ORDER BY points_cost ASC, id ASC`,
  );
}

export async function getMemberRedemptions(memberId: number, limit = 20): Promise<RewardRedemption[]> {
  return all<RewardRedemption>(
    `SELECT rr.*, rc.name AS reward_name, rc.type AS reward_type
     FROM reward_redemptions rr
     JOIN reward_catalog rc ON rc.id = rr.reward_id
     WHERE rr.member_id = ?
     ORDER BY rr.created_at DESC, rr.id DESC
     LIMIT ?`,
    memberId,
    limit,
  );
}
