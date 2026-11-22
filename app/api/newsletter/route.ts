import { run } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rl = checkRateLimit(getClientIp(req), { namespace: "newsletter", limit: 8, windowMs: 5 * 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? "").trim().toLowerCase();
  const source = String(b.source ?? "footer").trim().slice(0, 40) || "footer";

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: "Vui lòng nhập địa chỉ email hợp lệ." }, { status: 400 });
  }

  await run(
    "INSERT INTO newsletter_subscribers (email, source, status) VALUES (?, ?, 'active') ON CONFLICT(email) DO UPDATE SET status = 'active'",
    email,
    source,
  );

  return Response.json({
    ok: true,
    message: "✓ Đã đăng ký nhận bản tin thực dưỡng & mã ưu đãi thành công!",
  });
}
