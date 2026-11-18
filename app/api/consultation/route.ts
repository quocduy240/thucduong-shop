import { run } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { getSite, getWidgetSettings } from "@/lib/settings";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    question?: string;
    pageUrl?: string;
  };

  const name = String(body.name ?? "").trim().slice(0, 100) || "Khách hàng";
  const phone = String(body.phone ?? "").replace(/[^\d+]/g, "").slice(0, 20);
  const question = String(body.question ?? "").trim().slice(0, 2000);
  const pageUrl = String(body.pageUrl ?? "").trim().slice(0, 500);

  if (!/^0\d{8,10}$/.test(phone)) {
    return Response.json(
      { error: "Vui lòng nhập số điện thoại hợp lệ (10–11 số, bắt đầu bằng số 0) để tư vấn viên gọi lại." },
      { status: 400 },
    );
  }
  if (!question || question.length < 5) {
    return Response.json(
      { error: "Vui lòng nhập ngắn gọn câu hỏi hoặc vấn đề sức khỏe cần tư vấn." },
      { status: 400 },
    );
  }

  await run(`CREATE TABLE IF NOT EXISTS consultation_requests (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL,
    question TEXT NOT NULL,
    page_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const inserted = await run(
    "INSERT INTO consultation_requests (name, phone, question, page_url, status) VALUES (?, ?, ?, ?, 'new')",
    name,
    phone,
    question,
    pageUrl,
  );

  const [site, widget] = await Promise.all([getSite(), getWidgetSettings()]);
  const notifyTo = widget.widget_consultant_email.trim() || undefined;

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
      <div style="background:#2f7d32;color:#ffffff;padding:16px 20px;border-radius:12px 12px 0 0;">
        <h2 style="margin:0;font-size:18px;">💬 Yêu cầu Tư vấn Nhanh từ Website</h2>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">${esc(site.name)} — Khách đang chờ liên hệ lại</p>
      </div>
      <div style="border:1px solid #d1d5db;border-top:0;padding:18px 20px;border-radius:0 0 12px 12px;background:#ffffff;">
        <p style="margin:6px 0;"><strong>Khách hàng:</strong> ${esc(name)}</p>
        <p style="margin:6px 0;"><strong>Số điện thoại gọi lại:</strong> <a href="tel:${esc(phone)}" style="color:#c62828;font-size:16px;font-weight:bold;">${esc(phone)}</a></p>
        ${pageUrl ? `<p style="margin:6px 0;"><strong>Trang đang xem:</strong> <a href="${esc(pageUrl)}">${esc(pageUrl)}</a></p>` : ""}
        <div style="margin-top:12px;padding:12px 14px;background:#f0fdf4;border-left:4px solid #2f7d32;border-radius:0 8px 8px 0;">
          <div style="font-size:12px;font-weight:bold;color:#15803d;margin-bottom:4px;">Nội dung câu hỏi:</div>
          <div style="white-space:pre-line;line-height:1.6;">${esc(question)}</div>
        </div>
        <p style="margin-top:14px;font-size:12px;color:#6b7280;">
          Vui lòng liên hệ lại qua SĐT <strong>${esc(phone)}</strong> trong thời gian sớm nhất.
        </p>
      </div>
    </div>`;

  let emailSent = false;
  try {
    const res = await sendEmail({
      to: notifyTo,
      subject: `[Tư vấn nhanh] ${name} (${phone}) cần hỗ trợ - ${site.name}`,
      html: emailHtml,
    });
    emailSent = res.sent;
  } catch (e) {
    console.error("[Consultation email warning]:", (e as Error).message);
  }

  return Response.json({
    ok: true,
    id: inserted.lastInsertRowid,
    emailSent,
    message: `Đã gửi câu hỏi thành công! Tư vấn viên sẽ liên hệ lại qua số ${phone} trong ít phút.`,
  });
}
