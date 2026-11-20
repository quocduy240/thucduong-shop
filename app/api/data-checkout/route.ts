import { cartLines, readCart, writeCart } from "@/lib/cart";
import { calculateOrderPricing, generateOrderCode, normalizeIdempotencyKey } from "@/lib/checkout-helpers";
import { batch, one, run } from "@/lib/db";
import { logError, logInfo, logWarn } from "@/lib/logger";
import { resolveGuestProfile, resolveOnLoginOrRegister } from "@/lib/loyalty";
import { sendNewOrderEmail } from "@/lib/mail";
import { currentMember, evaluateCoupon } from "@/lib/member-auth";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const globalIdempotency = globalThis as unknown as {
  __tdCheckoutIdempotency?: Map<string, { code: string; createdAt: number }>;
};

function getIdempotencyCache() {
  if (!globalIdempotency.__tdCheckoutIdempotency) {
    globalIdempotency.__tdCheckoutIdempotency = new Map();
  }
  return globalIdempotency.__tdCheckoutIdempotency;
}

// POST /api/data-checkout - create an order from the cookie cart with atomic stock compensation & idempotency.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip, { namespace: "checkout", limit: 10, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  const idemKey = normalizeIdempotencyKey(req.headers.get("idempotency-key") || req.headers.get("x-idempotency-key"));
  const idemCache = getIdempotencyCache();
  if (idemKey) {
    const cached = idemCache.get(idemKey);
    if (cached && Date.now() - cached.createdAt < IDEMPOTENCY_TTL_MS) {
      return Response.json({
        success: true,
        code: cached.code,
        deduplicated: true,
        redirect: `/checkout/thankyou?code=${cached.code}`,
      });
    }
  }

  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = (b.name ?? "").trim().slice(0, 120);
  const phone = (b.phone ?? "").trim();
  const address = (b.address ?? "").trim().slice(0, 300);
  const province = String(b.province_code ?? "").trim();
  const ward = String(b.ward_code ?? "").trim();

  if (!name || !/^0\d{9,10}$/.test(phone) || !address) {
    return Response.json({ error: "Vui lòng nhập đủ họ tên, số điện thoại hợp lệ và địa chỉ." }, { status: 400 });
  }
  if (!(await one("SELECT 1 FROM wards WHERE code = ? AND province_code = ?", ward, province))) {
    return Response.json({ error: "Tỉnh/Phường không hợp lệ." }, { status: 400 });
  }

  const { lines, total } = await cartLines(await readCart());
  if (!lines.length) return Response.json({ error: "Giỏ hàng trống." }, { status: 400 });

  for (const l of lines) {
    if (l.product.stock < l.qty) {
      return Response.json(
        {
          error:
            l.product.stock <= 0
              ? `Sản phẩm "${l.product.name}" hiện đã hết hàng.`
              : `Sản phẩm "${l.product.name}" chỉ còn ${l.product.stock} trong kho.`,
        },
        { status: 400 },
      );
    }
  }

  const member = await currentMember();
  const rawCoupon = (b.coupon_code ?? "").trim().toUpperCase();
  let couponDiscount = 0;
  let appliedCoupon = "";
  if (rawCoupon) {
    const cRes = await evaluateCoupon(rawCoupon, total, !!member);
    if (!cRes.valid || !cRes.coupon) {
      return Response.json({ error: cRes.error ?? "Mã giảm giá không hợp lệ." }, { status: 400 });
    }
    couponDiscount = cRes.discount;
    appliedCoupon = cRes.coupon.code;
  }

  const pricing = calculateOrderPricing({
    subtotal: total,
    couponDiscount,
    memberTier: member?.tier,
  });
  const code = generateOrderCode();

  // Deduct stock per item with rollback compensation on failure so partial deductions never leak stock.
  const deducted: { productId: number; qty: number }[] = [];
  const restoreDeductedStock = async (reason: string) => {
    if (!deducted.length) return;
    try {
      await batch(
        deducted.map((d) => ({
          sql: "UPDATE products SET stock = stock + ? WHERE id = ?",
          params: [d.qty, d.productId],
        })),
      );
      logWarn("checkout.stock_compensated", { code, reason, items: deducted.length });
    } catch (err) {
      logError("checkout.stock_compensation_failed", { code, reason, error: err });
    }
  };

  for (const l of lines) {
    const r = await run(
      "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
      l.qty,
      l.product.id,
      l.qty,
    );
    if (!r.changes) {
      await restoreDeductedStock("insufficient_stock");
      return Response.json({ error: `Sản phẩm "${l.product.name}" không đủ số lượng tồn kho.` }, { status: 400 });
    }
    deducted.push({ productId: l.product.id, qty: l.qty });
  }

  let orderId = 0;
  try {
    const orderRes = await run(
      `INSERT INTO orders (code, name, phone, email, address, province_code, ward_code, note, payment, total, coupon_code, discount_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      code,
      name,
      phone,
      (b.email ?? "").trim().slice(0, 120),
      address,
      province,
      ward,
      (b.note ?? "").trim().slice(0, 500),
      b.payment === "bank" ? "bank" : "cod",
      pricing.finalTotal,
      appliedCoupon,
      pricing.discountAmount,
    );
    orderId = Number(orderRes.lastInsertRowid);

    const stmts: { sql: string; params: unknown[] }[] = [];
    for (const l of lines) {
      stmts.push({
        sql: "INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)",
        params: [orderId, l.product.id, l.product.name, l.unit, l.qty],
      });
      stmts.push({
        sql: "UPDATE flash_sale_items SET sold = MIN(quota, sold + ?) WHERE product_id = ? AND active = 1",
        params: [l.qty, l.product.id],
      });
    }
    if (appliedCoupon) {
      stmts.push({
        sql: "UPDATE coupons SET used_count = used_count + 1 WHERE code = ?",
        params: [appliedCoupon],
      });
    }
    await batch(stmts);
  } catch (err) {
    logError("checkout.order_failed", { code, orderId, error: err });
    await restoreDeductedStock("order_write_error");
    if (orderId > 0) {
      await run("DELETE FROM orders WHERE id = ?", orderId).catch(() => undefined);
    }
    throw err;
  }

  // Link customer immediately into unified `member_profiles` (CRM Single Source of Truth).
  // Loyalty points are awarded strictly via `onOrderStatusChanged()` when the order reaches `done`
  // and reversed automatically if `cancelled`, preventing double-awarding or phantom points.
  try {
    if (member) {
      await resolveOnLoginOrRegister({
        userId: member.id,
        phone: phone || member.phone,
        email: (b.email ?? "").trim() || member.email,
        fullName: name || member.name,
      });
    } else {
      await resolveGuestProfile({
        phone,
        email: (b.email ?? "").trim() || undefined,
        fullName: name,
      });
    }
  } catch (err) {
    logWarn("checkout.profile_link_failed", { code, error: err });
  }

  logInfo("checkout.order_created", {
    code,
    orderId,
    itemCount: lines.length,
    finalTotal: pricing.finalTotal,
    discountAmount: pricing.discountAmount,
    coupon: appliedCoupon || undefined,
    memberId: member?.id,
  });

  if (idemKey) {
    if (idemCache.size > 1000) idemCache.clear();
    idemCache.set(idemKey, { code, createdAt: Date.now() });
  }

  await writeCart({});

  const emailPromise = sendNewOrderEmail({
    code,
    name,
    phone,
    email: (b.email ?? "").trim().slice(0, 120),
    address,
    province_code: province,
    ward_code: ward,
    note: (b.note ?? "").trim().slice(0, 500),
    payment: b.payment === "bank" ? "bank" : "cod",
    total: pricing.finalTotal,
    items: lines.map((l) => ({
      name: l.product.name,
      unit: l.unit,
      qty: l.qty,
      subtotal: l.subtotal,
    })),
  }).catch(() => undefined);

  // Keep email dispatch alive on Cloudflare Workers without blocking response beyond a short budget
  await Promise.race([emailPromise, new Promise((resolve) => setTimeout(resolve, 1500))]);

  return Response.json({ success: true, code, redirect: `/checkout/thankyou?code=${code}` });
}
