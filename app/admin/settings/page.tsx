import { Flash, PageHeader, ui } from "@/components/admin/ui";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { listAdmins } from "@/lib/admin-data";
import { requireRole } from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { isLikelyValidGeminiKey } from "@/lib/gemini-key";
import { getMailSettings, getSite, getWidgetSettings } from "@/lib/settings";
import {
  addAdminAction,
  changePasswordAction,
  deleteAdminAction,
  deleteConsultationAction,
  saveGeminiKeyAction,
  saveMailSettingsAction,
  saveSettingsAction,
  saveWidgetSettingsAction,
  testMailAction,
  updateConsultationStatusAction,
} from "../actions";

export const metadata = { title: "Cài đặt | Quản trị" };

export default async function SettingsAdmin({ searchParams }: PageProps<"/admin/settings">) {
  const me = await requireRole(["super_admin", "admin"]);
  const sp = await searchParams;
  await run(`CREATE TABLE IF NOT EXISTS consultation_requests (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL,
    question TEXT NOT NULL,
    page_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const [site, mail, widget, admins, consultations, geminiRow] = await Promise.all([
    getSite(),
    getMailSettings(),
    getWidgetSettings(),
    listAdmins(),
    all<{
      id: number;
      name: string;
      phone: string;
      question: string;
      page_url: string;
      status: string;
      created_at: string;
    }>("SELECT id, name, phone, question, page_url, status, created_at FROM consultation_requests ORDER BY id DESC LIMIT 30"),
    one<{ value: string }>("SELECT value FROM settings WHERE key = 'gemini_api_key'"),
  ]);
  const savedGemini = (geminiRow?.value ?? "").trim() || (process.env.GEMINI_API_KEY ?? "").trim();
  const hasValidGemini = isLikelyValidGeminiKey(savedGemini);

  const field = (name: keyof typeof site, label: string, hint?: string) => (
    <div>
      <label className={ui.label}>{label}</label>
      <input name={name} defaultValue={site[name]} className={ui.input} />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title="Cài đặt" />
      <Flash saved={sp.saved} error={sp.error} />
      {sp.mail_sent && (
        <p className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Đã lưu cấu hình và gửi email thử thành công tới <strong>{mail.order_notify_email}</strong>!
        </p>
      )}

      <form action={saveGeminiKeyAction} className={`${ui.card} space-y-3 border-emerald-200 p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-gray-900">🤖 Cấu hình Gemini AI API Key (Dùng chung toàn hệ thống)</h2>
            <p className="text-xs text-gray-500">
              Dùng cho: Tạo lại ảnh AI Image, Viết lại đoạn văn bản, Phân tích Xét nghiệm AI và Tư vấn nhanh Chuyên gia.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              hasValidGemini ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            }`}
          >
            {hasValidGemini ? `✓ Đã cấu hình (${savedGemini.slice(0, 8)}...)` : "⚠️ Chưa cấu hình Key hợp lệ"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="password"
            name="gemini_api_key"
            placeholder="Dán Gemini API Key từ Google AI Studio (bắt đầu bằng AIza...)"
            className={`${ui.input} flex-1 min-w-[260px]`}
          />
          <button className={ui.primary}>Lưu API Key</button>
        </div>
        <p className="text-xs text-gray-500">
          Lấy API Key miễn phí tại{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-brand underline">
            aistudio.google.com/apikey
          </a>
          . Để trống và bấm Lưu nếu muốn xoá Key đã lưu trong D1.
        </p>
      </form>

      <form action={saveMailSettingsAction} className={`${ui.card} space-y-4 p-6`}>
        <div>
          <h2 className="font-semibold">Email nhận thông báo đơn hàng mới</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Khi khách đặt hàng, chi tiết đơn hàng sẽ tự động gửi về địa chỉ email này.
          </p>
        </div>
        <div>
          <label className={ui.label}>Email nhận đơn hàng *</label>
          <input
            name="order_notify_email"
            required
            defaultValue={mail.order_notify_email}
            placeholder="agvinh@gmail.com"
            className={ui.input}
          />
          <p className="mt-1 text-xs text-gray-500">
            Mặc định: <code>agvinh@gmail.com</code>. Có thể nhập nhiều email cách nhau bằng dấu phẩy.
          </p>
        </div>

        <div className="border-t pt-4">
          <div className="mb-3 text-sm font-medium text-gray-800">Máy chủ gửi mail (SMTP / Gmail)</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label}>SMTP Host</label>
              <input name="smtp_host" defaultValue={mail.smtp_host} placeholder="smtp.gmail.com" className={ui.input} />
            </div>
            <div>
              <label className={ui.label}>SMTP Port</label>
              <input name="smtp_port" type="number" defaultValue={mail.smtp_port} placeholder="465" className={ui.input} />
              <p className="mt-1 text-xs text-gray-500">465 (SSL/TLS) hoặc 587 (STARTTLS)</p>
            </div>
            <div>
              <label className={ui.label}>Tài khoản SMTP (Email gửi đi)</label>
              <input
                name="smtp_user"
                type="email"
                defaultValue={mail.smtp_user}
                placeholder="agvinh@gmail.com"
                autoComplete="off"
                className={ui.input}
              />
            </div>
            <div>
              <label className={ui.label}>Mật khẩu ứng dụng (App Password)</label>
              <input
                name="smtp_pass"
                type="password"
                defaultValue={mail.smtp_pass}
                placeholder="16 ký tự App Password của Gmail"
                autoComplete="new-password"
                className={ui.input}
              />
              <p className="mt-1 text-xs text-gray-500">
                Với Gmail: tạo tại Bảo mật Google → Xác minh 2 bước → Mật khẩu ứng dụng.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={ui.primary}>Lưu cấu hình email</button>
          <button formAction={testMailAction} className={ui.secondary}>
            ✉ Lưu &amp; Gửi email thử
          </button>
        </div>
      </form>

      <form action={saveSettingsAction} className={`${ui.card} space-y-4 p-6`}>
        <h2 className="font-semibold">Thông tin cửa hàng</h2>
        {field("name", "Tên cửa hàng")}
        {field("tagline", "Khẩu hiệu")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("hotline", "Hotline")}
          {field("email", "Email hiển thị trên web")}
        </div>
        {field("address", "Địa chỉ")}
        <button className={ui.primary}>Lưu thông tin</button>
      </form>

      {/* Module Tư vấn Nổi: Zalo, Messenger, Hotline, Hỏi nhanh */}
      <form action={saveWidgetSettingsAction} className={`${ui.card} space-y-4 p-6 border-green-200`}>
        <div>
          <h2 className="font-semibold text-brand">💬 Cấu hình Công cụ Tư vấn Nổi (Zalo · Messenger · Hotline · Hỏi nhanh)</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Thanh công cụ chạy dọc góc dưới bên phải toàn bộ website, giúp khách kết nối Zalo, Messenger, gọi Hotline hoặc gửi câu hỏi nhanh qua email.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>Trạng thái hiển thị trên web</label>
            <select name="widget_enabled" defaultValue={widget.widget_enabled} className={ui.input}>
              <option value="1">🟢 Đang bật (Hiển thị góc dưới bên phải)</option>
              <option value="0">⚪ Đang tắt</option>
            </select>
          </div>
          <div>
            <label className={ui.label}>Email tư vấn viên nhận câu hỏi nhanh</label>
            <input
              name="widget_consultant_email"
              defaultValue={widget.widget_consultant_email}
              placeholder={`Để trống = dùng email nhận đơn (${mail.order_notify_email})`}
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Số điện thoại / Link Zalo</label>
            <input
              name="widget_zalo"
              defaultValue={widget.widget_zalo}
              placeholder="VD: 0767518592 hoặc https://zalo.me/0767518592"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Link Facebook Messenger (m.me)</label>
            <input
              name="widget_messenger"
              defaultValue={widget.widget_messenger}
              placeholder="VD: https://m.me/tenfanpage"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Số Hotline chính (nút Gọi ngay)</label>
            <input
              name="widget_hotline"
              defaultValue={widget.widget_hotline}
              placeholder="0767.518.592"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Số Hotline phụ (trong popup Hỏi nhanh)</label>
            <input
              name="widget_hotline_2"
              defaultValue={widget.widget_hotline_2}
              placeholder="0858.816.070"
              className={ui.input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Tiêu đề hộp thoại Hỏi nhanh</label>
            <input
              name="widget_quick_ask_title"
              defaultValue={widget.widget_quick_ask_title}
              className={ui.input}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Lời nhắn hướng dẫn khách để lại SĐT</label>
            <input
              name="widget_quick_ask_subtitle"
              defaultValue={widget.widget_quick_ask_subtitle}
              className={ui.input}
            />
          </div>
        </div>

        <button className={ui.primary}>💾 Lưu cấu hình Công cụ Tư vấn</button>
      </form>

      {/* Danh sách Yêu cầu Tư vấn Nhanh */}
      <div className={`${ui.card} p-6`}>
        <h2 className="mb-1 font-semibold">📋 Khách hàng Hỏi nhanh &amp; Chờ gọi lại ({consultations.length})</h2>
        <p className="mb-4 text-xs text-gray-500">
          Mỗi khi khách gửi câu hỏi trên thanh tư vấn, hệ thống lưu tại đây và gửi email báo tư vấn viên gọi lại qua SĐT.
        </p>
        {consultations.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-xs text-gray-500">
            Chưa có yêu cầu tư vấn nhanh nào.
          </p>
        ) : (
          <div className="divide-y">
            {consultations.map((c) => (
              <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-900">{c.name}</span>
                    <a
                      href={`tel:${c.phone}`}
                      className="rounded-full bg-red-50 px-2.5 py-0.5 font-mono text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      📞 {c.phone}
                    </a>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        c.status === "done"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.status === "done" ? "✓ Đã tư vấn" : "🔔 Chờ gọi lại"}
                    </span>
                    <span className="text-xs text-gray-400">{c.created_at.slice(0, 16)}</span>
                  </div>
                  <p className="whitespace-pre-line text-xs text-gray-700">{c.question}</p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={updateConsultationStatusAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="status" value={c.status === "done" ? "new" : "done"} />
                    <button className={ui.secondary}>
                      {c.status === "done" ? "Mở lại" : "✓ Đã gọi"}
                    </button>
                  </form>
                  <form action={deleteConsultationAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <ConfirmButton message="Xoá yêu cầu tư vấn này?" className={ui.danger}>
                      Xoá
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form action={changePasswordAction} className={`${ui.card} space-y-4 p-6`}>
        <h2 className="font-semibold">Đổi mật khẩu của bạn ({me.email})</h2>
        <input name="current" type="password" required placeholder="Mật khẩu hiện tại" autoComplete="current-password" className={ui.input} />
        <input name="password" type="password" required minLength={8} placeholder="Mật khẩu mới (tối thiểu 8 ký tự)" autoComplete="new-password" className={ui.input} />
        <input name="password2" type="password" required placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" className={ui.input} />
        <button className={ui.primary}>Đổi mật khẩu</button>
      </form>

      <div className={`${ui.card} p-6`}>
        <h2 className="mb-3 font-semibold">Tài khoản quản trị</h2>
        <ul className="mb-4 divide-y">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2 text-sm">
              <span>{a.email}{a.id === me.id && <span className="ml-2 text-xs text-gray-400">(bạn)</span>}</span>
              {a.id !== me.id && (
                <form action={deleteAdminAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <ConfirmButton message={`Xoá tài khoản ${a.email}?`} className={ui.danger}>Xoá</ConfirmButton>
                </form>
              )}
            </li>
          ))}
        </ul>
        <form action={addAdminAction} className="flex flex-wrap gap-2">
          <input name="email" type="email" required placeholder="Email admin mới" className={`${ui.input} max-w-xs`} />
          <input name="password" type="password" required minLength={8} placeholder="Mật khẩu (tối thiểu 8 ký tự)" autoComplete="new-password" className={`${ui.input} max-w-xs`} />
          <button className={ui.secondary}>+ Thêm admin</button>
        </form>
      </div>
    </div>
  );
}
