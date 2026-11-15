import { Flash, PageHeader, ui } from "@/components/admin/ui";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { listAdmins } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getSite } from "@/lib/settings";
import { addAdminAction, changePasswordAction, deleteAdminAction, saveSettingsAction } from "../actions";

export const metadata = { title: "Cài đặt | Quản trị" };

export default async function SettingsAdmin({ searchParams }: PageProps<"/admin/settings">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const site = getSite();
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

      <form action={saveSettingsAction} className={`${ui.card} space-y-4 p-6`}>
        <h2 className="font-semibold">Thông tin cửa hàng</h2>
        {field("name", "Tên cửa hàng")}
        {field("tagline", "Khẩu hiệu")}
        <div className="grid gap-4 sm:grid-cols-2">
          {field("hotline", "Hotline")}
          {field("email", "Email liên hệ")}
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
