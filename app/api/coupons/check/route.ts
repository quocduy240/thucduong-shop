import { cartLines, readCart } from "@/lib/cart";
import { currentMember, evaluateCoupon } from "@/lib/member-auth";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const code = String(b.code ?? "");
  const { total } = await cartLines(await readCart());
  const member = await currentMember();

  // Calculate member tier extra discount if applicable
  const tierPct = member?.tier === "gold" ? 5 : member?.tier === "silver" ? 3 : 0;
  const tierDiscount = tierPct > 0 ? Math.round((total * tierPct) / 100) : 0;

  if (!code.trim()) {
    return Response.json({
      ok: true,
      discount: tierDiscount,
      couponDiscount: 0,
      tierDiscount,
      finalTotal: Math.max(0, total - tierDiscount),
    });
  }

  const res = await evaluateCoupon(code, total, !!member);
  if (!res.valid || !res.coupon) {
    return Response.json({ error: res.error ?? "Mã giảm giá không hợp lệ." }, { status: 400 });
  }

  const totalDiscount = Math.min(total, res.discount + tierDiscount);
  return Response.json({
    ok: true,
    code: res.coupon.code,
    title: res.coupon.title,
    couponDiscount: res.discount,
    tierDiscount,
    discount: totalDiscount,
    finalTotal: Math.max(0, total - totalDiscount),
  });
}
