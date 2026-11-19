import "server-only";
import { all, one, run } from "./db";
import {
  awardPoints,
  getMemberProfileByUserId,
  normalizeEmail,
  normalizePhone,
  resolveGuestProfile,
  TIER_MULTIPLIERS,
  todayHoChiMinh,
} from "./loyalty";

function yesterdayHoChiMinh(): string {
  const vn = new Date(Date.now() + 7 * 3600 * 1000 - 86400 * 1000);
  return vn.toISOString().slice(0, 10);
}

/**
 * Priority 1 & 2: Award or reverse loyalty points when an order transitions to `done` or `cancelled`.
 */
export async function onOrderStatusChanged(orderId: number, prevStatus: string, nextStatus: string) {
  const order = await one<{
    id: number;
    code: string;
    name: string;
    phone: string;
    email: string;
    total: number;
  }>("SELECT id, code, name, phone, email, total FROM orders WHERE id = ?", orderId);
  if (!order) return;

  const profile = await resolveGuestProfile({
    phone: order.phone,
    email: order.email,
    fullName: order.name,
  });
  if (!profile) return;

  if (nextStatus === "done" && prevStatus !== "done") {
    const multiplier = TIER_MULTIPLIERS[profile.tier] ?? 1;
    const pts = Math.floor((Math.max(0, order.total) / 10000) * multiplier);
    if (pts > 0) {
      const awarded = await awardPoints({
        memberId: profile.id,
        source: "purchase",
        amount: pts,
        referenceType: "order",
        referenceId: order.id,
        description: `Tích điểm đơn hàng #${order.code} (hệ số ${multiplier}x)`,
        metadata: { order_code: order.code, order_total: order.total, tier: profile.tier },
      });
      if (awarded.awarded) {
        await run(
          `UPDATE member_profiles
           SET total_orders = total_orders + 1, total_spent = total_spent + ?,
               last_purchase_at = datetime('now'), updated_at = datetime('now')
           WHERE id = ?`,
          order.total,
          profile.id,
        );
      }
    }

    // Priority 2: Unlock pending referral reward on referee's first completed order
    const pendingRef = await one<{
      id: number;
      referrer_id: number;
      referee_id: number;
      referrer_bonus_points: number;
      referee_bonus_points: number;
    }>("SELECT * FROM referrals WHERE referee_id = ? AND status = 'pending'", profile.id);

    if (pendingRef) {
      await run(
        `UPDATE referrals
         SET status = 'rewarded', referee_first_order_id = ?, qualified_at = datetime('now'), rewarded_at = datetime('now')
         WHERE id = ?`,
        order.id,
        pendingRef.id,
      );
      await awardPoints({
        memberId: pendingRef.referrer_id,
        source: "referral_bonus",
        amount: pendingRef.referrer_bonus_points,
        referenceType: "referral",
        referenceId: pendingRef.id,
        description: `Thưởng giới thiệu bạn bè hoàn thành đơn đầu #${order.code}`,
      });
      await awardPoints({
        memberId: pendingRef.referee_id,
        source: "referral_joined",
        amount: pendingRef.referee_bonus_points,
        referenceType: "referral",
        referenceId: pendingRef.id,
        description: `Quà chào mừng từ mã giới thiệu (đơn #${order.code})`,
      });
    }
  } else if (prevStatus === "done" && nextStatus === "cancelled") {
    const orig = await one<{ change_amount: number }>(
      `SELECT change_amount FROM point_transactions
       WHERE member_id = ? AND source = 'purchase' AND reference_type = 'order' AND reference_id = ?`,
      profile.id,
      order.id,
    );
    if (orig && orig.change_amount > 0) {
      await awardPoints({
        memberId: profile.id,
        source: "refund_reversal",
        amount: -orig.change_amount,
        referenceType: "order",
        referenceId: order.id,
        description: `Thu hồi điểm do huỷ/hoàn đơn #${order.code}`,
      });
    }
  }
}

/**
 * Priority 2: Link a newly registered/active profile to a referrer via referral code (blocks self-referral).
 */
export async function attachReferralByCode(refereeProfileId: number, rawCode?: string | null) {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!code) return { linked: false, reason: "empty" };

  const [referrer, referee] = await Promise.all([
    one<{ id: number; phone: string | null; email: string | null }>(
      "SELECT id, phone, email FROM member_profiles WHERE UPPER(referral_code) = ? AND status = 'active'",
      code,
    ),
    one<{ id: number; phone: string | null; email: string | null }>(
      "SELECT id, phone, email FROM member_profiles WHERE id = ? AND status = 'active'",
      refereeProfileId,
    ),
  ]);
  if (!referrer || !referee) return { linked: false, reason: "not_found" };
  if (referrer.id === referee.id) return { linked: false, reason: "self_referral" };

  const rPhone = normalizePhone(referrer.phone);
  const ePhone = normalizePhone(referee.phone);
  const rEmail = normalizeEmail(referrer.email);
  const eEmail = normalizeEmail(referee.email);
  if ((rPhone && ePhone && rPhone === ePhone) || (rEmail && eEmail && rEmail === eEmail)) {
    return { linked: false, reason: "self_referral" };
  }

  await run(
    `INSERT OR IGNORE INTO referrals (referrer_id, referee_id, status, referrer_bonus_points, referee_bonus_points)
     VALUES (?, ?, 'pending', 200, 100)`,
    referrer.id,
    referee.id,
  );
  return { linked: true };
}

/**
 * Priority 3: Signup bonus (50 pts, once per lifetime).
 */
export async function awardSignupBonus(profileId: number) {
  return awardPoints({
    memberId: profileId,
    source: "signup",
    amount: 50,
    referenceType: "member",
    referenceId: profileId,
    description: "Thưởng đăng ký thành viên Thực Dưỡng Phúc Thọ",
  });
}

/**
 * Priority 4a: Award points for product review (verified purchase: 30 pts, max 5/month)
 * or quality comment (>= 50 chars: 10 pts, max 3/day).
 */
export async function awardCommentOrReviewPoints(params: {
  userId: number;
  productId: number;
  commentId: number;
  content: string;
}) {
  const profile = await getMemberProfileByUserId(params.userId);
  if (!profile) return { awarded: false };

  // Check verified purchase for this product
  const contactConds: string[] = [];
  const contactParams: unknown[] = [params.productId];
  if (profile.phone) {
    contactConds.push("o.phone = ?");
    contactParams.push(profile.phone);
  }
  if (profile.email) {
    contactConds.push("LOWER(o.email) = ?");
    contactParams.push(profile.email.toLowerCase());
  }

  let verifiedPurchase = false;
  if (contactConds.length > 0) {
    const found = await one<{ id: number }>(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.status = 'done' AND oi.product_id = ? AND (${contactConds.join(" OR ")})
       LIMIT 1`,
      ...contactParams,
    );
    verifiedPurchase = Boolean(found);
  }

  if (verifiedPurchase) {
    const monthCount = await one<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM point_transactions
       WHERE member_id = ? AND source = 'review' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      profile.id,
    );
    if ((monthCount?.cnt ?? 0) >= 5) return { awarded: false, reason: "monthly_limit" };
    return awardPoints({
      memberId: profile.id,
      source: "review",
      amount: 30,
      referenceType: "comment",
      referenceId: params.commentId,
      description: "Đánh giá sản phẩm đã mua (Verified Purchase)",
    });
  }

  if (params.content.trim().length < 50) return { awarded: false, reason: "too_short" };
  const today = todayHoChiMinh();
  const dayCount = await one<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM point_transactions
     WHERE member_id = ? AND source = 'comment' AND date(created_at, '+7 hours') = ?`,
    profile.id,
    today,
  );
  if ((dayCount?.cnt ?? 0) >= 3) return { awarded: false, reason: "daily_limit" };

  return awardPoints({
    memberId: profile.id,
    source: "comment",
    amount: 10,
    referenceType: "comment",
    referenceId: params.commentId,
    description: "Bình luận chất lượng chia sẻ trải nghiệm",
  });
}

/**
 * Priority 4b: Read article (>= 70% scroll + >= 30s): 2 pts/article, max 5 pts/day.
 */
export async function awardReadArticlePoints(userId: number, postId: number, postTitle?: string) {
  const profile = await getMemberProfileByUserId(userId);
  if (!profile) return { awarded: false, reason: "no_profile" };

  const today = todayHoChiMinh();
  const daySum = await one<{ total: number }>(
    `SELECT COALESCE(SUM(change_amount), 0) AS total FROM point_transactions
     WHERE member_id = ? AND source = 'read_article' AND date(created_at, '+7 hours') = ?`,
    profile.id,
    today,
  );
  if ((daySum?.total ?? 0) >= 5) return { awarded: false, reason: "daily_limit" };

  const grant = Math.min(2, 5 - (daySum?.total ?? 0));
  return awardPoints({
    memberId: profile.id,
    source: "read_article",
    amount: grant,
    referenceType: "article",
    referenceId: postId,
    description: `Đọc hoàn tất bài viết${postTitle ? `: ${postTitle}` : ""}`,
  });
}

/**
 * Priority 4c: Download document: 5 pts, max 3 downloads/day.
 */
export async function awardDownloadDocPoints(userId: number, documentId: number, docTitle?: string) {
  const profile = await getMemberProfileByUserId(userId);
  if (!profile) return { awarded: false, reason: "no_profile" };

  const today = todayHoChiMinh();
  const dayCount = await one<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM point_transactions
     WHERE member_id = ? AND source = 'download_doc' AND date(created_at, '+7 hours') = ?`,
    profile.id,
    today,
  );
  if ((dayCount?.cnt ?? 0) >= 3) return { awarded: false, reason: "daily_limit" };

  return awardPoints({
    memberId: profile.id,
    source: "download_doc",
    amount: 5,
    referenceType: "document",
    referenceId: documentId,
    description: `Tải tài liệu Thực dưỡng${docTitle ? `: ${docTitle}` : ""}`,
  });
}

/**
 * Priority 5: Daily login (+5 pts/day, Asia/Ho_Chi_Minh) + Streak bonus (+50 at day 7, +200 at day 30).
 */
export async function claimDailyLogin(userId: number): Promise<{
  claimed: boolean;
  alreadyClaimed?: boolean;
  pointsAwarded: number;
  streakBonus?: number;
  currentStreak: number;
  bestStreak: number;
  balanceAfter?: number;
}> {
  const profile = await getMemberProfileByUserId(userId);
  if (!profile) {
    return { claimed: false, pointsAwarded: 0, currentStreak: 0, bestStreak: 0 };
  }

  const today = todayHoChiMinh();
  const yesterday = yesterdayHoChiMinh();
  const row = await one<{ current_streak: number; last_login_date: string; best_streak: number }>(
    "SELECT current_streak, last_login_date, best_streak FROM daily_login_streaks WHERE member_id = ?",
    profile.id,
  );

  if (row?.last_login_date === today) {
    return {
      claimed: false,
      alreadyClaimed: true,
      pointsAwarded: 0,
      currentStreak: row.current_streak,
      bestStreak: row.best_streak,
      balanceAfter: profile.current_points,
    };
  }

  const nextStreak = row?.last_login_date === yesterday ? row.current_streak + 1 : 1;
  const bestStreak = Math.max(row?.best_streak ?? 0, nextStreak);

  await run(
    `INSERT INTO daily_login_streaks (member_id, current_streak, last_login_date, best_streak)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(member_id) DO UPDATE SET
       current_streak = excluded.current_streak,
       last_login_date = excluded.last_login_date,
       best_streak = excluded.best_streak`,
    profile.id,
    nextStreak,
    today,
    bestStreak,
  );

  const dayKey = Number(today.replace(/-/g, ""));
  const dailyRes = await awardPoints({
    memberId: profile.id,
    source: "daily_login",
    amount: 5,
    referenceType: "daily",
    referenceId: dayKey,
    description: `Điểm danh ngày ${today} (chuỗi ${nextStreak} ngày)`,
  });

  let streakBonus = 0;
  if (nextStreak === 7) streakBonus = 50;
  else if (nextStreak === 30) streakBonus = 200;

  let finalBalance = dailyRes.balanceAfter ?? profile.current_points;
  if (streakBonus > 0) {
    const bonusRes = await awardPoints({
      memberId: profile.id,
      source: "streak_bonus",
      amount: streakBonus,
      referenceType: "streak",
      referenceId: dayKey,
      description: `Thưởng chuỗi điểm danh ${nextStreak} ngày liên tiếp!`,
    });
    if (bonusRes.balanceAfter !== undefined) finalBalance = bonusRes.balanceAfter;
  }

  return {
    claimed: true,
    pointsAwarded: 5 + streakBonus,
    streakBonus: streakBonus || undefined,
    currentStreak: nextStreak,
    bestStreak,
    balanceAfter: finalBalance,
  };
}

export async function getMemberStreak(memberId: number) {
  const row = await one<{ current_streak: number; last_login_date: string; best_streak: number }>(
    "SELECT current_streak, last_login_date, best_streak FROM daily_login_streaks WHERE member_id = ?",
    memberId,
  );
  const today = todayHoChiMinh();
  return {
    currentStreak: row?.current_streak ?? 0,
    bestStreak: row?.best_streak ?? 0,
    claimedToday: row?.last_login_date === today,
  };
}

export async function getMemberReferralsCount(memberId: number) {
  const rows = await all<{ status: string }>("SELECT status FROM referrals WHERE referrer_id = ?", memberId);
  return {
    total: rows.length,
    rewarded: rows.filter((r) => r.status === "rewarded").length,
  };
}
