import crypto from "node:crypto";

/**
 * Generate a collision-resistant order code (`DH` + base36 timestamp + 4 random hex chars).
 * Eliminates millisecond collision races under concurrent checkouts.
 */
export function generateOrderCode(nowMs = Date.now()): string {
  const ts = nowMs.toString(36).toUpperCase();
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `DH${ts}${suffix}`;
}

export type OrderPricingInput = {
  subtotal: number;
  couponDiscount: number;
  memberTier?: string | null;
};

export type OrderPricingResult = {
  tierPct: number;
  tierDiscount: number;
  discountAmount: number;
  finalTotal: number;
  earnedPoints: number;
};

export function calculateOrderPricing(input: OrderPricingInput): OrderPricingResult {
  const subtotal = Math.max(0, Math.round(input.subtotal));
  const couponDiscount = Math.max(0, Math.round(input.couponDiscount));
  const tier = (input.memberTier ?? "").toLowerCase();
  const tierPct = tier === "diamond" ? 7 : tier === "gold" ? 5 : tier === "silver" ? 3 : 0;
  const tierDiscount = tierPct > 0 ? Math.round((subtotal * tierPct) / 100) : 0;
  const discountAmount = Math.min(subtotal, couponDiscount + tierDiscount);
  const finalTotal = Math.max(0, subtotal - discountAmount);
  const earnedPoints = finalTotal > 0 ? Math.max(10, Math.floor(finalTotal / 10000)) : 0;

  return {
    tierPct,
    tierDiscount,
    discountAmount,
    finalTotal,
    earnedPoints,
  };
}

export function normalizeIdempotencyKey(raw: string | null | undefined): string {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._:-]/g, "")
    .slice(0, 80);
  return cleaned.length >= 8 ? cleaned : "";
}
