import { cartLines, readCart } from "@/lib/cart";
import { calculateOrderPricing } from "@/lib/checkout-helpers";
import { getMemberProfileByUserId } from "@/lib/loyalty";
import { currentMember, evaluateCoupon } from "@/lib/member-auth";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const code = String(b.code ?? "");
  const { total } = await cartLines(await readCart());
  const member = await currentMember();
  // Same pricing rules as /api/data-checkout (unified loyalty tier incl. diamond 7%).
  const tier = member ? ((await getMemberProfileByUserId(member.id))?.tier ?? member.tier) : undefined;

  if (!code.trim()) {
    const p = calculateOrderPricing({ subtotal: total, couponDiscount: 0, memberTier: tier });
    return Response.json({
      ok: true,
      discount: p.discountAmount,
      couponDiscount: 0,
      tierDiscount: p.tierDiscount,
      finalTotal: p.finalTotal,
    });
  }

  const res = await evaluateCoupon(code, total, !!member);
  if (!res.valid || !res.coupon) {
    return Response.json({ error: res.error ?? "Mã giảm giá không hợp lệ." }, { status: 400 });
  }

  const p = calculateOrderPricing({ subtotal: total, couponDiscount: res.discount, memberTier: tier });
  return Response.json({
    ok: true,
    code: res.coupon.code,
    title: res.coupon.title,
    couponDiscount: res.discount,
    tierDiscount: p.tierDiscount,
    discount: p.discountAmount,
    finalTotal: p.finalTotal,
  });
}
