import "server-only";
import net from "node:net";
import tls from "node:tls";
import { one } from "./db";
import { getMailSettings, getSite } from "./settings";
import { vnd } from "./site";

const encodeHeader = (s: string) => `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Minimal dependency-free SMTP client supporting port 465 (implicit TLS) and 587 (STARTTLS). */
async function sendSmtp(opts: {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
  to: string[];
  subject: string;
  html: string;
}) {
  const { host, port, user, pass, fromName, to, subject, html } = opts;

  let sock: net.Socket | tls.TLSSocket =
    port === 465
      ? tls.connect({ host, port, servername: host })
      : net.connect({ host, port });

  let buf = "";
  const readResp = (): Promise<{ code: number; text: string }> =>
    new Promise((resolve, reject) => {
      const onData = (chunk: Buffer) => {
        buf += chunk.toString("utf8");
        const lines = buf.split("\r\n");
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (/^\d{3} /.test(line)) {
            const consumed = lines.slice(0, i + 1).join("\r\n");
            buf = lines.slice(i + 1).join("\r\n");
            cleanup();
            resolve({ code: Number(line.slice(0, 3)), text: consumed });
            return;
          }
        }
      };
      const onErr = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onClose = () => {
        cleanup();
        reject(new Error("Kết nối SMTP bị đóng đột ngột."));
      };
      const cleanup = () => {
        sock.off("data", onData);
        sock.off("error", onErr);
        sock.off("close", onClose);
      };
      sock.on("data", onData);
      sock.on("error", onErr);
      sock.on("close", onClose);
    });

  const cmd = async (line: string, expectedCodes: number[]) => {
    sock.write(line + "\r\n");
    const r = await readResp();
    if (!expectedCodes.includes(r.code)) {
      throw new Error(`SMTP lỗi (${r.code}): ${r.text}`);
    }
    return r;
  };

  try {
    sock.setTimeout(15000, () => sock.destroy(new Error("Quá thời gian kết nối SMTP (15s).")));
    const greet = await readResp();
    if (greet.code !== 220) throw new Error(`SMTP greeting lỗi: ${greet.text}`);

    await cmd("EHLO localhost", [250]);

    if (port !== 465) {
      await cmd("STARTTLS", [220]);
      sock = await new Promise<tls.TLSSocket>((resolve, reject) => {
        const tlsSock = tls.connect({ socket: sock, servername: host }, () => resolve(tlsSock));
        tlsSock.once("error", reject);
      });
      buf = "";
      await cmd("EHLO localhost", [250]);
    }

    await cmd("AUTH LOGIN", [334]);
    await cmd(Buffer.from(user, "utf8").toString("base64"), [334]);
    await cmd(Buffer.from(pass.replace(/\s+/g, ""), "utf8").toString("base64"), [235]);

    await cmd(`MAIL FROM:<${user}>`, [250]);
    for (const rcpt of to) {
      await cmd(`RCPT TO:<${rcpt}>`, [250, 251]);
    }
    await cmd("DATA", [354]);

    const bodyB64 = Buffer.from(html, "utf8")
      .toString("base64")
      .replace(/.{1,76}/g, "$&\r\n")
      .trimEnd();

    const headers = [
      `From: ${encodeHeader(fromName)} <${user}>`,
      `To: ${to.join(", ")}`,
      `Subject: ${encodeHeader(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
    ].join("\r\n");

    await cmd(`${headers}\r\n\r\n${bodyB64}\r\n.`, [250]);
    await cmd("QUIT", [221]).catch(() => {});
  } finally {
    sock.destroy();
  }
}

export async function sendEmail(opts: { to?: string; subject: string; html: string }): Promise<{ sent: boolean; error?: string }> {
  const cfg = await getMailSettings();
  const site = await getSite();
  const rawTo = opts.to ?? cfg.order_notify_email;
  const recipients = rawTo
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => /^\S+@\S+\.\S+$/.test(s));

  if (!recipients.length) {
    return { sent: false, error: "Chưa có địa chỉ email người nhận hợp lệ." };
  }

  const host = cfg.smtp_host.trim() || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(cfg.smtp_port) || Number(process.env.SMTP_PORT) || 465;
  const user = cfg.smtp_user.trim() || process.env.SMTP_USER || "";
  const pass = cfg.smtp_pass.trim() || process.env.SMTP_PASS || "";

  if (!user || !pass) {
    console.log(
      `[Email preview → ${recipients.join(", ")}] ${opts.subject} (Chưa cấu hình tài khoản/mật khẩu SMTP trong /admin/settings/)`,
    );
    return {
      sent: false,
      error: "Chưa cấu hình Tài khoản hoặc Mật khẩu ứng dụng SMTP. Vui lòng điền ở mục Cấu hình Email bên dưới.",
    };
  }

  await sendSmtp({
    host,
    port,
    user,
    pass,
    fromName: site.name,
    to: recipients,
    subject: opts.subject,
    html: opts.html,
  });
  return { sent: true };
}

export type OrderEmailPayload = {
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  province_code: string;
  ward_code: string;
  note: string;
  payment: string;
  total: number;
  items: { name: string; unit: number; qty: number; subtotal: number }[];
};

export async function sendNewOrderEmail(order: OrderEmailPayload) {
  const site = await getSite();
  const prov = (await one<{ name: string }>("SELECT name FROM provinces WHERE code = ?", order.province_code))?.name;
  const ward = (await one<{ name: string }>("SELECT name FROM wards WHERE code = ?", order.ward_code))?.name;
  const fullAddress = [order.address, ward, prov].filter(Boolean).join(", ");

  const rowsHtml = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${esc(it.name)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">${it.qty}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">${vnd(it.unit)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:600;">${vnd(it.subtotal)}</td>
      </tr>`,
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937;">
    <h2 style="color:#2f7d32;margin-bottom:4px;">Đơn hàng mới #${esc(order.code)}</h2>
    <p style="margin-top:0;color:#6b7280;font-size:14px;">Từ cửa hàng ${esc(site.name)}</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:4px 0;"><strong>Khách hàng:</strong> ${esc(order.name)}</p>
      <p style="margin:4px 0;"><strong>Điện thoại:</strong> <a href="tel:${esc(order.phone)}">${esc(order.phone)}</a></p>
      ${order.email ? `<p style="margin:4px 0;"><strong>Email khách:</strong> ${esc(order.email)}</p>` : ""}
      <p style="margin:4px 0;"><strong>Địa chỉ giao:</strong> ${esc(fullAddress)}</p>
      <p style="margin:4px 0;"><strong>Thanh toán:</strong> ${order.payment === "bank" ? "Chuyển khoản ngân hàng" : "Thanh toán khi nhận hàng (COD)"}</p>
      ${order.note ? `<p style="margin:4px 0;"><strong>Ghi chú:</strong> ${esc(order.note)}</p>` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Sản phẩm</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:center;">SL</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">Đơn giá</th>
          <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:right;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:10px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;">Tổng cộng</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:#c62828;font-size:16px;">${vnd(order.total)}</td>
        </tr>
      </tfoot>
    </table>
  </div>`;

  try {
    await sendEmail({
      subject: `[${site.name}] Đơn hàng mới #${order.code} - ${order.name} (${vnd(order.total)})`,
      html,
    });
  } catch (e) {
    console.error(`[Email error] Không gửi được email đơn hàng #${order.code}:`, (e as Error).message);
  }
}
