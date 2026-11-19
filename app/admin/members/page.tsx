import Link from "next/link";
import AdminStaffPanel, { type StaffMember } from "@/components/admin/AdminStaffPanel";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { Flash, PageHeader, strParam, ui } from "@/components/admin/ui";
import {
  getMembersOverviewCounts,
  listCoupons,
  listMembersPaged,
  listSubscribersPaged,
} from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { normalizeRole } from "@/lib/rbac";
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

type TabKey = "members" | "coupons" | "subscribers" | "staff";

function buildHref(params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && String(v).trim() !== "") sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/admin/members/?${qs}` : "/admin/members/";
}

export default async function MembersAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = strParam(sp.q);
  const tier = strParam(sp.tier);
  const page = Math.max(1, Number(strParam(sp.page)) || 1);
  const canManageStaff = admin.role === "super_admin" || admin.role === "admin";

  const rawTab = strParam(sp.tab);
  const activeTab: TabKey =
    rawTab === "coupons" || rawTab === "subscribers" || (rawTab === "staff" && canManageStaff)
      ? rawTab
      : "members";

  const [counts, membersRes, coupons, subscribersRes, staffRows] = await Promise.all([
    getMembersOverviewCounts(canManageStaff),
    activeTab === "members"
      ? listMembersPaged({ q, tier, page, pageSize: 30 })
      : Promise.resolve({ rows: [], total: 0, page: 1, pageSize: 30 }),
    activeTab === "coupons" ? listCoupons(q) : Promise.resolve([]),
    activeTab === "subscribers"
      ? listSubscribersPaged({ q, page, pageSize: 30 })
      : Promise.resolve({ rows: [], total: 0, page: 1, pageSize: 30 }),
    activeTab === "staff" && canManageStaff
      ? all<{ id: number; email: string; phone?: string; name?: string; role?: string; created_at: string }>(
          "SELECT id, email, phone, name, role, created_at FROM admins ORDER BY id ASC",
        )
      : Promise.resolve([]),
  ]);

  const staff: StaffMember[] = staffRows.map((r) => ({
    id: r.id,
    email: r.email,
    phone: r.phone ?? "",
    name: r.name ?? "",
    role: normalizeRole(r.role),
    created_at: r.created_at,
  }));

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "members", label: "👑 Thành viên", count: counts.membersTotal },
    { key: "coupons", label: "🎟️ Mã giảm giá", count: counts.couponsTotal },
    { key: "subscribers", label: "✉️ Email nhận tin", count: counts.subscribersTotal },
    ...(canManageStaff ? [{ key: "staff" as const, label: "🛡️ Nhân sự Admin", count: counts.staffTotal }] : []),
  ];

  const totalPages =
    activeTab === "members"
      ? Math.max(1, Math.ceil(membersRes.total / membersRes.pageSize))
      : activeTab === "subscribers"
        ? Math.max(1, Math.ceil(subscribersRes.total / subscribersRes.pageSize))
        : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader title="Quản lý Thành viên, Ưu đãi & Bản tin">
        <Link href="/thanh-vien/" target="_blank" className={ui.secondary}>
          Xem Trang Thành viên ↗
        </Link>
        <a href="/admin/members/export?type=members" className={ui.secondary}>
          ⬇️ CSV Thành viên ({counts.membersTotal})
        </a>
        <a href="/admin/members/export?type=subscribers" className={ui.secondary}>
          ⬇️ CSV Email ({counts.subscribersTotal})
        </a>
      </PageHeader>
      <Flash saved={sp.saved} error={sp.error} />

      {/* 4 Clickable KPI Summary Cards */}
      <div className={`grid gap-3 ${canManageStaff ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        <Link
          href={buildHref({ tab: "members" })}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "members" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">👑 Thành viên đăng ký</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{counts.membersTotal}</div>
          <div className="mt-1 text-[11px] text-emerald-700">
            Vàng VIP: <strong>{counts.membersGold}</strong> · Bạc: <strong>{counts.membersSilver}</strong>
          </div>
        </Link>

        <Link
          href={buildHref({ tab: "coupons" })}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "coupons" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">🎟️ Mã giảm giá</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{counts.couponsTotal}</div>
          <div className="mt-1 text-[11px] text-amber-700">
            Đang kích hoạt: <strong>{counts.couponsActive}</strong> mã
          </div>
        </Link>

        <Link
          href={buildHref({ tab: "subscribers" })}
          className={`rounded-2xl border p-4 transition ${
            activeTab === "subscribers" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
          }`}
        >
          <div className="text-xs font-bold text-gray-500">✉️ Email nhận bản tin</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{counts.subscribersTotal}</div>
          <div className="mt-1 text-[11px] text-gray-500">Từ chân trang &amp; đăng ký thành viên</div>
        </Link>

        {canManageStaff && (
          <Link
            href={buildHref({ tab: "staff" })}
            className={`rounded-2xl border p-4 transition ${
              activeTab === "staff" ? "border-brand bg-green-50/70 shadow-xs" : "bg-white hover:border-gray-300"
            }`}
          >
            <div className="text-xs font-bold text-gray-500">🛡️ Nhân sự quản trị</div>
            <div className="mt-1 text-2xl font-extrabold text-gray-900">{counts.staffTotal}</div>
            <div className="mt-1 text-[11px] text-gray-500">Phân quyền Super Admin / Admin / Editor / Sales</div>
          </Link>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={buildHref({ tab: t.key })}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === t.key
                  ? "bg-brand text-white shadow-xs"
                  : "border bg-white text-gray-700 hover:border-brand hover:text-brand"
              }`}
            >
              {t.label} ({t.count})
            </Link>
          ))}
        </div>

        {activeTab !== "staff" && (
          <form method="get" action="/admin/members/" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="tab" value={activeTab} />
            {activeTab === "members" && tier && <input type="hidden" name="tier" value={tier} />}
            <input
              name="q"
              defaultValue={q}
              placeholder={
                activeTab === "coupons"
                  ? "Tìm mã hoặc tên ưu đãi..."
                  : activeTab === "subscribers"
                    ? "Tìm theo email..."
                    : "Tìm tên, email, SĐT..."
              }
              className={`${ui.input} w-56 py-1.5 text-xs`}
            />
            <button className={ui.secondary}>Tìm</button>
            {q && (
              <Link href={buildHref({ tab: activeTab, tier: activeTab === "members" ? tier : undefined })} className={ui.secondary}>
                Xoá lọc
              </Link>
            )}
          </form>
        )}
      </div>

      {/* TAB 1: REGISTERED MEMBERS */}
      {activeTab === "members" && (
        <section className={`${ui.card} p-5 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Danh sách Thành viên ({membersRes.total})
              </h2>
              <p className="text-xs text-gray-500">
                Quản lý hạng thành viên (Đồng / Bạc -3% / Vàng VIP -5%) và điểm thưởng tích lũy.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { val: "", label: "Tất cả" },
                { val: "gold", label: "👑 Vàng VIP" },
                { val: "silver", label: "🥈 Bạc" },
                { val: "bronze", label: "🥉 Đồng" },
              ].map((opt) => (
                <Link
                  key={opt.val || "all"}
                  href={buildHref({ tab: "members", q, tier: opt.val || undefined })}
                  className={`rounded-full border px-3 py-1 font-semibold transition ${
                    tier === opt.val
                      ? "border-brand bg-green-50 text-brand"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
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
                {membersRes.rows.map((m) => (
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
                        <button className="rounded bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-dark cursor-pointer">
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
                {membersRes.rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-gray-500">
                      Không tìm thấy thành viên phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-3 text-xs text-gray-600">
              <span>
                Trang {page} / {totalPages} ({membersRes.total} thành viên)
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildHref({ tab: "members", q, tier, page: page - 1 })} className={ui.secondary}>
                    ← Trang trước
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildHref({ tab: "members", q, tier, page: page + 1 })} className={ui.secondary}>
                    Trang sau →
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: COUPONS */}
      {activeTab === "coupons" && (
        <section className={`${ui.card} p-5 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Mã giảm giá &amp; Chính sách Ưu đãi ({coupons.length})
              </h2>
              <p className="text-xs text-gray-500">
                Hiển thị trong Ví Voucher thành viên và trang Thanh toán (`/checkout`).
              </p>
            </div>
          </div>

          <details className="rounded-xl border border-green-200 bg-green-50/40 p-3.5">
            <summary className="cursor-pointer text-xs font-bold text-brand select-none">
              + Tạo / Cập nhật Mã giảm giá mới
            </summary>
            <form action={saveCouponAction} className="mt-3 grid gap-3 sm:grid-cols-6">
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
                <button className={`${ui.primary} w-full`}>+ Lưu Mã</button>
              </div>
            </form>
          </details>

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
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer ${
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
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                      Chưa có mã giảm giá nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: NEWSLETTER EMAIL SUBSCRIBERS */}
      {activeTab === "subscribers" && (
        <section className={`${ui.card} p-5 space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Email đăng ký nhận bản tin ({subscribersRes.total})
              </h2>
              <p className="text-xs text-gray-500">
                Khách hàng nhập email ở chân trang hoặc đăng ký tài khoản thành viên.
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
                {subscribersRes.rows.map((s) => (
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
                {subscribersRes.rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                      Chưa có email nào đăng ký nhận bản tin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-3 text-xs text-gray-600">
              <span>
                Trang {page} / {totalPages} ({subscribersRes.total} email)
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={buildHref({ tab: "subscribers", q, page: page - 1 })} className={ui.secondary}>
                    ← Trang trước
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={buildHref({ tab: "subscribers", q, page: page + 1 })} className={ui.secondary}>
                    Trang sau →
                  </Link>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: ADMIN STAFF & RBAC */}
      {activeTab === "staff" && canManageStaff && (
        <AdminStaffPanel initialStaff={staff} myId={admin.id} myRole={admin.role} />
      )}
    </div>
  );
}
