import {
  currentMember,
  endMemberSession,
  getActiveCoupons,
  registerMemberAccount,
  startMemberSession,
  verifyMemberLogin,
} from "@/lib/member-auth";
import { resolveOnLoginOrRegister } from "@/lib/loyalty";
import { attachReferralByCode, awardSignupBonus } from "@/lib/loyalty-events";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET() {
  const [member, coupons] = await Promise.all([currentMember(), getActiveCoupons()]);
  return Response.json({ member: member ?? null, coupons });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");

  if (action === "logout") {
    await endMemberSession();
    return Response.json({ ok: true });
  }

  if (action === "register" || action === "login") {
    const rl = checkRateLimit(getClientIp(req), {
      namespace: `member-auth:${action}`,
      limit: 12,
      windowMs: 5 * 60_000,
    });
    if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);
  }

  if (action === "register") {
    const res = await registerMemberAccount({
      name: String(b.name ?? ""),
      email: String(b.email ?? ""),
      phone: String(b.phone ?? ""),
      password: String(b.password ?? ""),
    });
    if (res.error || !res.memberId) {
      return Response.json({ error: res.error ?? "Đăng ký thất bại." }, { status: 400 });
    }
    await startMemberSession(res.memberId);
    const member = await currentMember();
    if (member) {
      const profile = await resolveOnLoginOrRegister({
        userId: member.id,
        phone: member.phone,
        email: member.email,
        fullName: member.name,
      });
      await awardSignupBonus(profile.id);
      if (b.referralCode) {
        await attachReferralByCode(profile.id, String(b.referralCode));
      }
    }
    return Response.json({ ok: true, member: await currentMember() });
  }

  if (action === "login") {
    const id = await verifyMemberLogin(String(b.identifier ?? ""), String(b.password ?? ""));
    if (!id) {
      return Response.json({ error: "Email/Số điện thoại hoặc mật khẩu không đúng." }, { status: 400 });
    }
    await startMemberSession(id);
    const member = await currentMember();
    if (member) {
      await resolveOnLoginOrRegister({
        userId: member.id,
        phone: member.phone,
        email: member.email,
        fullName: member.name,
      });
    }
    return Response.json({ ok: true, member: await currentMember() });
  }

  return Response.json({ error: "Hành động không hợp lệ." }, { status: 400 });
}
