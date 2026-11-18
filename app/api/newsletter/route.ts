import { run } from "@/lib/db";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? "").trim().toLowerCase();
  const source = String(b.source ?? "footer").trim().slice(0, 40) || "footer";

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: "Vui lòng nhập địa chỉ email hợp lệ." }, { status: 400 });
  }

  run(
    "INSERT INTO newsletter_subscribers (email, source, status) VALUES (?, ?, 'active') ON CONFLICT(email) DO UPDATE SET status = 'active'",
    email,
    source,
  );

  return Response.json({
    ok: true,
    message: "✓ Đã đăng ký nhận bản tin thực dưỡng & mã ưu đãi thành công!",
  });
}
