"use client";

import { useState } from "react";
import { ADMIN_ROLES, ROLE_META, type AdminRole } from "@/lib/rbac";

export type StaffMember = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  created_at: string;
};

export default function AdminStaffPanel({
  initialStaff,
  myId,
  myRole,
}: {
  initialStaff: StaffMember[];
  myId: number;
  myRole: AdminRole;
}) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminRole>("sales");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function callStaffApi(payload: Record<string, unknown>, okText: string) {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Thao tác thất bại.");
        return false;
      }
      setStaff(d.staff);
      setMsg(okText);
      return true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-purple-200 bg-white p-5 shadow-2xs space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">
            👑 Quản lý Tài khoản Quản trị &amp; Phân quyền (RBAC)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Cấp tài khoản riêng cho từng bộ phận (Super Admin, Admin, Editor nội dung, Nhân viên bán hàng) theo chuẩn bảo mật tối thiểu quyền hạn.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${ROLE_META[myRole].badge}`}>
          Bạn đang là: {ROLE_META[myRole].shortLabel}
        </span>
      </div>

      {/* Role Reference Matrix */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_ROLES.map((r) => {
          const meta = ROLE_META[r];
          return (
            <div key={r} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs space-y-1.5">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                {meta.shortLabel}
              </span>
              <p className="font-medium text-gray-700">{meta.description}</p>
              <ul className="space-y-0.5 text-[11px] text-gray-500">
                {meta.permissionsSummary.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-bold ${
            err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* Create Staff Account Form */}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await callStaffApi(
            { action: "create", email, name, password, role },
            `✓ Đã tạo tài khoản ${ROLE_META[role].shortLabel}: ${email}`,
          );
          if (ok) {
            setEmail("");
            setName("");
            setPassword("");
          }
        }}
        className="grid gap-3 rounded-xl border border-purple-100 bg-purple-50/40 p-4 sm:grid-cols-5"
      >
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Họ tên nhân sự</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Nguyễn Thu Hà"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Email đăng nhập *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nhanvien@domain.com"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Mật khẩu (&ge; 8 ký tự) *</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Vai trò phân quyền *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs font-semibold outline-none focus:border-brand"
          >
            {ADMIN_ROLES.filter((r) => myRole === "super_admin" || r !== "super_admin").map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-lg bg-purple-700 px-3 py-2 text-xs font-extrabold text-white shadow hover:bg-purple-800 disabled:opacity-50"
          >
            {busy ? "Đang tạo..." : "➕ Tạo tài khoản"}
          </button>
        </div>
      </form>

      {/* Staff List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 uppercase text-gray-500">
            <tr>
              <th className="px-3 py-2.5">Tài khoản</th>
              <th className="px-3 py-2.5">Vai trò hiện tại</th>
              <th className="px-3 py-2.5">Đổi vai trò</th>
              <th className="px-3 py-2.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staff.map((s) => {
              const meta = ROLE_META[s.role];
              const lockedSuper = s.role === "super_admin" && myRole !== "super_admin";
              return (
                <tr key={s.id}>
                  <td className="px-3 py-2.5">
                    <div className="font-bold text-gray-900">
                      {s.name || "Quản trị viên"}{" "}
                      {s.id === myId && <span className="text-[10px] text-brand">(Bạn)</span>}
                    </div>
                    <div className="text-gray-500">{s.email}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                      {meta.shortLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      disabled={busy || lockedSuper}
                      value={s.role}
                      onChange={(e) =>
                        callStaffApi(
                          { action: "update_role", id: s.id, role: e.target.value },
                          `✓ Đã đổi quyền ${s.email} sang ${ROLE_META[e.target.value as AdminRole].shortLabel}`,
                        )
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {ADMIN_ROLES.filter((r) => myRole === "super_admin" || r !== "super_admin" || r === s.role).map(
                        (r) => (
                          <option key={r} value={r}>
                            {ROLE_META[r].shortLabel}
                          </option>
                        ),
                      )}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-right space-x-2">
                    <button
                      type="button"
                      disabled={busy || lockedSuper}
                      onClick={() => {
                        const pw = prompt(`Nhập mật khẩu mới (>= 8 ký tự) cho ${s.email}:`);
                        if (pw && pw.length >= 8) {
                          callStaffApi({ action: "reset_password", id: s.id, password: pw }, `✓ Đã đổi mật khẩu cho ${s.email}`);
                        } else if (pw !== null) {
                          setErr("Mật khẩu mới phải từ 8 ký tự trở lên.");
                        }
                      }}
                      className="cursor-pointer rounded border px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      Đổi MK
                    </button>
                    {s.id !== myId && !lockedSuper && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Xoá tài khoản quản trị ${s.email}?`)) {
                            callStaffApi({ action: "delete", id: s.id }, `✓ Đã xoá tài khoản ${s.email}`);
                          }
                        }}
                        className="cursor-pointer rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Xoá
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
