import { Flash, PageHeader, ui } from "@/components/admin/ui";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { listAdmins } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getMailSettings, getSite } from "@/lib/settings";
import {
  addAdminAction,
  changePasswordAction,
  deleteAdminAction,
  saveMailSettingsAction,
  saveSettingsAction,
  testMailAction,
} from "../actions";

export const metadata = { title: "Cài đặt | Quản trị" };

export default async function SettingsAdmin({ searchParams }: PageProps<"/admin/settings">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const site = getSite();
  const mail = getMailSettings();
  const admins = listAdmins();

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
