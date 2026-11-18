import { currentAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/mail";
import { computeBmi, getQuickConsultById } from "@/lib/quick-consult";
import { getSite } from "@/lib/settings";

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      id?: number;
      toEmail?: string;
      origin?: string;
    };

    const id = Number(body.id ?? 0);
    const toEmail = String(body.toEmail ?? "").trim();
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Mã hồ sơ không hợp lệ." }, { status: 400 });
    }
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      return Response.json({ error: "Vui lòng nhập địa chỉ Email hợp lệ của bệnh nhân." }, { status: 400 });
    }

    const [row, site] = await Promise.all([getQuickConsultById(id), getSite()]);
    if (!row) return Response.json({ error: "Không tìm thấy hồ sơ bệnh nhân." }, { status: 404 });

    const reportHtml = row.expert_report_html || row.article_html;
    if (!reportHtml) {
      return Response.json({ error: "Hồ sơ chưa có nội dung phân tích để gửi." }, { status: 400 });
    }

    const { bmi, label } = computeBmi(row.height_cm, row.weight_kg);
    const origin = (body.origin || "").replace(/\/$/, "");
    const shareUrl = row.share_token && origin ? `${origin}/ho-so-tu-van/${row.share_token}/` : "";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;color:#1f2937;line-height:1.6;">
        <div style="background:#2f7d32;color:#ffffff;padding:20px 24px;border-radius:12px 12px 0 0;">
          <h2 style="margin:0;font-size:20px;">🌿 Hồ Sơ Tư Vấn Sức Khoẻ Cá Nhân Hoá</h2>
          <p style="margin:4px 0 0;font-size:13px;opacity:0.9;">Từ Chuyên gia ${site.name} · Hotline: ${site.hotline}</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:0;padding:20px 24px;border-radius:0 0 12px 12px;background:#ffffff;">
          <p>Thân gửi <strong>${row.customer_name || "Quý khách"}</strong>,</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:14px 0;font-size:13px;">
            <div><strong>Mã hồ sơ:</strong> #${row.id} ${row.age_sex ? `· ${row.age_sex}` : ""}</div>
            <div><strong>Chiều cao / Cân nặng:</strong> ${row.height_cm ? `${row.height_cm} cm` : "—"} · ${row.weight_kg ? `${row.weight_kg} kg` : "—"} ${bmi ? `(BMI: ${bmi} — ${label})` : ""}</div>
          </div>
          ${reportHtml}
          ${
            shareUrl
              ? `<div style="margin-top:24px;text-align:center;">
                  <a href="${shareUrl}" style="display:inline-block;background:#2f7d32;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;">
                    📄 Đọc Bản Đầy Đủ &amp; Tải File PDF Tại Đây
                  </a>
                </div>`
              : ""
          }
        </div>
      </div>
    `;

    const mailRes = await sendEmail({
      to: toEmail,
      subject: `[${site.name}] Hồ Sơ Tư Vấn Sức Khoẻ Cá Nhân #${row.id} - ${row.customer_name || "Quý khách"}`,
      html,
    });

    if (!mailRes.sent) {
      return Response.json(
        { ok: false, error: mailRes.error || "Chưa cấu hình SMTP trong /admin/settings/." },
        { status: 400 },
      );
    }

    return Response.json({ ok: true, message: `Đã gửi hồ sơ tư vấn tới ${toEmail}!` });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Không thể gửi email lúc này." },
      { status: 500 },
    );
  }
}
