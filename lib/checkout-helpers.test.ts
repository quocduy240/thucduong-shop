import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateOrderPricing,
  generateOrderCode,
  normalizeIdempotencyKey,
} from "./checkout-helpers";

test("generateOrderCode produces unique codes even within the same millisecond", () => {
  const now = 1763600000000;
  const codes = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const c = generateOrderCode(now);
    assert.match(c, /^DH[0-9A-Z]+$/);
    codes.add(c);
  }
  assert.equal(codes.size, 50);
});

test("calculateOrderPricing computes tier discounts, caps total discount, and computes earned points", () => {
  const gold = calculateOrderPricing({ subtotal: 500_000, couponDiscount: 50_000, memberTier: "gold" });
  assert.equal(gold.tierPct, 5);
  assert.equal(gold.tierDiscount, 25_000);
  assert.equal(gold.discountAmount, 75_000);
  assert.equal(gold.finalTotal, 425_000);
  assert.equal(gold.earnedPoints, 42);

  const capped = calculateOrderPricing({ subtotal: 100_000, couponDiscount: 150_000, memberTier: "silver" });
  assert.equal(capped.discountAmount, 100_000);
  assert.equal(capped.finalTotal, 0);
  assert.equal(capped.earnedPoints, 0);
});

test("normalizeIdempotencyKey sanitizes and enforces minimum length", () => {
  assert.equal(normalizeIdempotencyKey("short"), "");
  assert.equal(normalizeIdempotencyKey("  order-req:12345_abc!@#  "), "order-req:12345_abc");
});
