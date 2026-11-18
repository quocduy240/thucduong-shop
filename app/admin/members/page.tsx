import Link from "next/link";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, strParam, ui } from "@/components/admin/ui";
import { listMembersData } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { vnd } from "@/lib/site";
import {
  addSubscriberAction,
  deleteCouponAction,
  deleteMemberAction,
  deleteSubscriberAction,
  saveCouponAction,
  toggleCouponAction,
  updateMemberAction,
} from "../actions";

export const metadata = { title: "Thành viên, Bản tin Email & Mã giảm giá | Quản trị" };

export default async function MembersAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const { members, subscribers, coupons } = await listMembersData({ q });

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <PageHeader title="Quản lý Thành viên, Bản tin Email & Mã giảm giá">
        <Link href="/thanh-vien/" target="_blank" className={ui.secondary}>
          Xem Trang Thành viên ↗
        </Link>
        <a href="/admin/members/export?type=subscribers" className={ui.secondary}>
          ⬇️ Xuất CSV Email nhận tin ({subscribers.length})
        </a>
        <a href="/admin/members/export?type=members" className={ui.secondary}>
          ⬇️ Xuất CSV Thành viên ({members.length})
        </a>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* Search bar */}
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm theo tên thành viên, email, số điện thoại..."
          className={`${ui.input} max-w-sm`}
        />
        <button className={ui.secondary}>Tìm kiếm</button>
        {q && (
          <Link href="/admin/members/" className={ui.secondary}>
            Bỏ lọc
          </Link>
        )}
      </form>

      {/* SECTION 1: COUPONS & MEMBER BENEFIT CONFIGURATION */}
      <section className={`${ui.card} p-5 space-y-4`}>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            🎟️ 1. Cấu hình Mã giảm giá &amp; Chính sách Ưu đãi Thành viên
          </h2>
          <p className="text-xs text-gray-500">
            Các mã giảm giá này hiển thị trong Ví Voucher của thành viên và tại trang Thanh toán (`/checkout`). Ngoài ra, hệ thống tự động cộng thêm chiết khấu theo hạng thành viên: <strong>Hạng Bạc (-3%)</strong>, <strong>Hạng Vàng VIP (-5%)</strong>.
          </p>
        </div>

        {/* Add / Update Coupon Form */}
        <form action={saveCouponAction} className="grid gap-3 rounded-xl border border-green-200 bg-green-50/40 p-4 sm:grid-cols-6">
          <div>
            <label className={ui.label}>Mã giảm giá *</label>
            <input name="code" required placeholder="VD: PHUCTHO15" className={`${ui.input} font-mono uppercase`} />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Tên chương trình ưu đãi *</label>
            <input name="title" required placeholder="VD: Ưu đãi Thành viên giảm 15%" className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Loại giảm</label>
            <select name="discount_type" className={ui.input}>
              <option value="percent">Theo %</option>
              <option value="fixed">Số tiền (VNĐ)</option>
            </select>
          </div>
          <div>
            <label className={ui.label}>Giá trị giảm *</label>
            <input name="discount_value" type="number" min={1} required placeholder="10 hoặc 30000" className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Đơn tối thiểu</label>
            <input name="min_order" type="number" min={0} defaultValue={0} className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Giảm tối đa (VNĐ)</label>
            <input name="max_discount" type="number" min={0} defaultValue={50000} className={ui.input} />
          </div>
          <div>
            <label className={ui.label}>Phạm vi áp dụng</label>
            <select name="member_only" className={ui.input}>
              <option value="1">👑 Chỉ Thành viên</option>
              <option value="0">🌐 Mọi khách hàng</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className={ui.label}>Mô tả điều kiện</label>
            <input name="description" placeholder="Mô tả ngắn hiển thị trên thẻ Voucher..." className={ui.input} />
          </div>
          <div className="flex items-end">
            <button className={`${ui.primary} w-full`}>+ Lưu Mã giảm giá</button>
          </div>
        </form>

        {/* Coupons Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className={ui.th}>Mã Code</th>
                <th className={ui.th}>Tên ưu đãi</th>
                <th className={ui.th}>Mức giảm</th>
                <th className={ui.th}>Đơn tối thiểu</th>
                <th className={ui.th}>Đối tượng</th>
                <th className={ui.th}>Đã dùng</th>
                <th className={ui.th}>Trạng thái</th>
                <th className={ui.th}></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className={`${ui.td} font-mono font-bold text-brand`}>{c.code}</td>
                  <td className={ui.td}>
                    <div className="font-medium">{c.title}</div>
                    {c.description && <div className="text-xs text-gray-500">{c.description}</div>}
                  </td>
                  <td className={`${ui.td} font-bold text-accent`}>
                    {c.discount_type === "percent" ? `-${c.discount_value}%` : `-${vnd(c.discount_value)}`}
                    {c.max_discount > 0 && c.discount_type === "percent" && (
                      <div className="text-[11px] font-normal text-gray-500">Tối đa {vnd(c.max_discount)}</div>
                    )}
                  </td>
                  <td className={ui.td}>{c.min_order > 0 ? vnd(c.min_order) : "0₫"}</td>
                  <td className={ui.td}>
                    {c.member_only ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        👑 Thành viên
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        Mọi khách
                      </span>
                    )}
                  </td>
                  <td className={ui.td}>{c.used_count} lần</td>
                  <td className={ui.td}>
                    <form action={toggleCouponAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={c.active ? 0 : 1} />
                      <button
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          c.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {c.active ? "Đang bật" : "Đã tắt"}
                      </button>
                    </form>
                  </td>
                  <td className={`${ui.td} text-right`}>
                    <form action={deleteCouponAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton message="Xoá mã giảm giá này?" className="text-xs text-red-600 hover:underline">
                        Xoá
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: REGISTERED MEMBERS */}
      <section className={`${ui.card} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              👑 2. Danh sách Thành viên đã đăng ký ({members.length})
            </h2>
            <p className="text-xs text-gray-500">
              Quản lý tài khoản thành viên, điểm thưởng tích lũy và nâng/hạ hạng thành viên (Đồng / Bạc / Vàng VIP).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className={ui.th}>Mã TV</th>
                <th className={ui.th}>Họ tên &amp; Liên hệ</th>
                <th className={ui.th}>Hạng thành viên &amp; Điểm</th>
                <th className={ui.th}>Ngày đăng ký</th>
                <th className={ui.th}></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className={`${ui.td} font-mono text-xs text-gray-500`}>
                    #PT-{String(m.id).padStart(4, "0")}
                  </td>
                  <td className={ui.td}>
                    <div className="font-semibold text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-500">
                      ✉️ {m.email} {m.phone ? `· 📞 ${m.phone}` : ""}
                    </div>
                  </td>
                  <td className={ui.td}>
                    <form action={updateMemberAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={m.id} />
                      <select name="tier" defaultValue={m.tier} className="rounded border px-2 py-1 text-xs font-medium">
                        <option value="bronze">🥉 Hạng Đồng</option>
                        <option value="silver">🥈 Hạng Bạc (-3%)</option>
                        <option value="gold">👑 Hạng Vàng VIP (-5%)</option>
                      </select>
                      <input
                        name="points"
                        type="number"
                        min={0}
                        defaultValue={m.points}
                        className="w-20 rounded border px-2 py-1 text-center text-xs"
                        title="Điểm tích lũy"
                      />
                      <span className="text-xs text-gray-500">điểm</span>
                      <button className="rounded bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-dark">
                        Lưu
                      </button>
                    </form>
                  </td>
                  <td className={`${ui.td} text-xs text-gray-500`}>{m.created_at.slice(0, 16)}</td>
                  <td className={`${ui.td} text-right`}>
                    <form action={deleteMemberAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <ConfirmButton message="Xoá tài khoản thành viên này?" className="text-xs text-red-600 hover:underline">
                        Xoá
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                    Chưa có thành viên nào đăng ký.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: NEWSLETTER EMAIL SUBSCRIBERS */}
      <section className={`${ui.card} p-5 space-y-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              ✉️ 3. Danh sách Người đăng ký nhận thông tin qua Email ({subscribers.length})
            </h2>
            <p className="text-xs text-gray-500">
              Bao gồm khách hàng nhập email ở thanh &quot;Đăng ký nhận tin&quot; cuối trang và thành viên mới đăng ký.
            </p>
          </div>
          <form action={addSubscriberAction} className="flex items-center gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="Thêm email nhận tin..."
              className={`${ui.input} max-w-xs`}
            />
            <button className={`${ui.primary} whitespace-nowrap`}>+ Thêm Email</button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className={ui.th}>ID</th>
                <th className={ui.th}>Địa chỉ Email</th>
                <th className={ui.th}>Nguồn đăng ký</th>
                <th className={ui.th}>Trạng thái</th>
                <th className={ui.th}>Ngày đăng ký</th>
                <th className={ui.th}></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className={`${ui.td} text-xs text-gray-400`}>#{s.id}</td>
                  <td className={`${ui.td} font-medium text-gray-900`}>{s.email}</td>
                  <td className={ui.td}>
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {s.source === "footer"
                        ? "Chân trang (Footer)"
                        : s.source === "member_register"
                          ? "Đăng ký Thành viên"
                          : s.source}
                    </span>
                  </td>
                  <td className={ui.td}>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      Đang nhận tin
                    </span>
                  </td>
                  <td className={`${ui.td} text-xs text-gray-500`}>{s.created_at.slice(0, 16)}</td>
                  <td className={`${ui.td} text-right`}>
                    <form action={deleteSubscriberAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmButton message="Xoá email này khỏi danh sách nhận tin?" className="text-xs text-red-600 hover:underline">
                        Xoá
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
              {subscribers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                    Chưa có email nào đăng ký nhận bản tin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
