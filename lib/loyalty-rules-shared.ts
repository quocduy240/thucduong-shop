export type LoyaltyTierKey = "bronze" | "silver" | "gold" | "diamond";

export const TIER_LABELS: Record<LoyaltyTierKey, string> = {
  bronze: "Đồng",
  silver: "Bạc",
  gold: "Vàng",
  diamond: "Kim cương",
};

export type ParsedPointFormula =
  | {
      kind: "per_amount";
      amount: number;
      multipliers: Record<LoyaltyTierKey, number>;
    }
  | {
      kind: "referral";
      referrerPoints: number;
      refereePoints: number;
    }
  | {
      kind: "daily";
      fixed: number;
      streak7: number;
      streak30: number;
    }
  | {
      kind: "fixed";
      fixed: number;
    };

export function parsePointFormula(rawJson: string): ParsedPointFormula {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(rawJson || "{}") as Record<string, unknown>;
  } catch {
    obj = {};
  }

  if (obj.type === "per_amount" || typeof obj.amount === "number") {
    const mult = (obj.multiplier_by_tier ?? {}) as Record<string, unknown>;
    return {
      kind: "per_amount",
      amount: Math.max(1000, Number(obj.amount) || 10000),
      multipliers: {
        bronze: Number(mult.bronze) || 1,
        silver: Number(mult.silver) || 1.2,
        gold: Number(mult.gold) || 1.5,
        diamond: Number(mult.diamond) || 2,
      },
    };
  }

  if ("referrer_points" in obj || "referee_points" in obj) {
    return {
      kind: "referral",
      referrerPoints: Math.max(0, Number(obj.referrer_points) || 200),
      refereePoints: Math.max(0, Number(obj.referee_points) || 100),
    };
  }

  if ("streak_7" in obj || "streak_30" in obj) {
    return {
      kind: "daily",
      fixed: Math.max(0, Number(obj.fixed) || 5),
      streak7: Math.max(0, Number(obj.streak_7) || 50),
      streak30: Math.max(0, Number(obj.streak_30) || 200),
    };
  }

  return {
    kind: "fixed",
    fixed: Math.max(0, Number(obj.fixed) || 0),
  };
}

export function serializePointFormula(parsed: ParsedPointFormula): string {
  if (parsed.kind === "per_amount") {
    return JSON.stringify({
      type: "per_amount",
      amount: Math.max(1000, Math.round(parsed.amount || 10000)),
      multiplier_by_tier: {
        bronze: Number(parsed.multipliers.bronze) || 1,
        silver: Number(parsed.multipliers.silver) || 1.2,
        gold: Number(parsed.multipliers.gold) || 1.5,
        diamond: Number(parsed.multipliers.diamond) || 2,
      },
    });
  }
  if (parsed.kind === "referral") {
    return JSON.stringify({
      referrer_points: Math.max(0, Math.round(parsed.referrerPoints || 0)),
      referee_points: Math.max(0, Math.round(parsed.refereePoints || 0)),
    });
  }
  if (parsed.kind === "daily") {
    return JSON.stringify({
      fixed: Math.max(0, Math.round(parsed.fixed || 0)),
      streak_7: Math.max(0, Math.round(parsed.streak7 || 0)),
      streak_30: Math.max(0, Math.round(parsed.streak30 || 0)),
    });
  }
  return JSON.stringify({
    fixed: Math.max(0, Math.round(parsed.fixed || 0)),
  });
}

function fmtVnd(n: number): string {
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

export function describePointRule(rawJson: string): { summary: string; tags: string[] } {
  const f = parsePointFormula(rawJson);
  if (f.kind === "per_amount") {
    return {
      summary: `Cứ mỗi ${fmtVnd(f.amount)} chi tiêu = 1 điểm gốc (nhân theo hạng thành viên):`,
      tags: [
        `Đồng: ×${f.multipliers.bronze}`,
        `Bạc: ×${f.multipliers.silver}`,
        `Vàng: ×${f.multipliers.gold}`,
        `Kim cương: ×${f.multipliers.diamond}`,
      ],
    };
  }
  if (f.kind === "referral") {
    return {
      summary: `Người giới thiệu nhận +${f.referrerPoints} điểm · Bạn mới hoàn thành đơn đầu nhận +${f.refereePoints} điểm`,
      tags: [],
    };
  }
  if (f.kind === "daily") {
    return {
      summary: `Điểm danh mỗi ngày nhận +${f.fixed} điểm`,
      tags: [`Chuỗi 7 ngày: +${f.streak7} điểm`, `Chuỗi 30 ngày: +${f.streak30} điểm`],
    };
  }
  return {
    summary: `Tặng cố định +${f.fixed} điểm mỗi lần đạt điều kiện`,
    tags: [],
  };
}

export type ParsedRewardValue = {
  discountType: "fixed" | "percent";
  discountValue: number;
  minOrder: number;
  maxDiscount: number;
  giftSku: string;
};

export function parseRewardValue(rawJson: string): ParsedRewardValue {
  let obj: Record<string, unknown> = {};
  try {
    obj = JSON.parse(rawJson || "{}") as Record<string, unknown>;
  } catch {
    obj = {};
  }
  const discountType = obj.discount_type === "percent" ? "percent" : "fixed";
  const discountValue = Number(obj.discount_value ?? obj.discount_amount ?? 0) || 0;
  const minOrder = Number(obj.min_order ?? 0) || 0;
  const maxDiscount = Number(obj.max_discount ?? 0) || 0;
  const giftSku = String(obj.gift_sku ?? "");
  return { discountType, discountValue, minOrder, maxDiscount, giftSku };
}

export function serializeRewardValue(
  rewardType: "discount_coupon" | "free_shipping" | "gift_item" | "cash_credit",
  val: ParsedRewardValue,
): string {
  if (rewardType === "gift_item") {
    return JSON.stringify({
      gift_sku: val.giftSku.trim(),
    });
  }
  const out: Record<string, unknown> = {
    discount_type: val.discountType,
    discount_value: Math.max(0, Math.round(val.discountValue || 0)),
    min_order: Math.max(0, Math.round(val.minOrder || 0)),
  };
  if (val.discountType === "percent" && val.maxDiscount > 0) {
    out.max_discount = Math.round(val.maxDiscount);
  }
  return JSON.stringify(out);
}

export function describeRewardValue(
  rewardType: "discount_coupon" | "free_shipping" | "gift_item" | "cash_credit",
  rawJson: string,
): string {
  const v = parseRewardValue(rawJson);
  if (rewardType === "gift_item") {
    return v.giftSku ? `Quà hiện vật · Mã: ${v.giftSku}` : "Quà hiện vật gửi kèm đơn / nhận tại shop";
  }
  const parts: string[] = [];
  if (v.discountValue > 0) {
    parts.push(
      v.discountType === "percent"
        ? `Giảm ${v.discountValue}%${v.maxDiscount > 0 ? ` (tối đa ${fmtVnd(v.maxDiscount)})` : ""}`
        : `${rewardType === "free_shipping" ? "Freeship tối đa" : "Giảm"} ${fmtVnd(v.discountValue)}`,
    );
  }
  if (v.minOrder > 0) {
    parts.push(`Đơn từ ${fmtVnd(v.minOrder)}`);
  }
  return parts.join(" · ") || "Ưu đãi thành viên";
}
