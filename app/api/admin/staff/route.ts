import { NextResponse } from "next/server";
import {
  createAdmin,
  currentAdmin,
  ensureAdminSchema,
  isValidAdminPhone,
  normalizeAdminPhone,
  setPassword,
} from "@/lib/auth";
import { all, one, run } from "@/lib/db";
import { isValidEmail } from "@/lib/member-auth";
import { ADMIN_ROLES, normalizeRole, type AdminRole } from "@/lib/rbac";

type StaffRow = {
  id: number;
  email: string;
  phone: string;
  name: string;
  role: AdminRole;
  created_at: string;
};

async function listStaff(): Promise<StaffRow[]> {
  await ensureAdminSchema();
  const rows = await all<{
    id: number;
    email: string;
    phone?: string;
    name?: string;
    role?: string;
    created_at: string;
  }>("SELECT id, email, phone, name, role, created_at FROM admins ORDER BY id ASC");
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    phone: r.phone ?? "",
    name: r.name ?? "",
    role: normalizeRole(r.role),
    created_at: r.created_at,
  }));
}

export async function GET() {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "super_admin" && me.role !== "admin") {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }
  return NextResponse.json({ staff: await listStaff() });
}

export async function POST(req: Request) {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (me.role !== "super_admin" && me.role !== "admin") {
    return NextResponse.json({ error: "Chỉ Super Admin hoặc Admin mới được quản lý tài khoản." }, { status: 403 });
  }

  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");

  if (action === "create") {
    await ensureAdminSchema();
    const email = String(b.email ?? "").trim().toLowerCase();
    const phone = normalizeAdminPhone(String(b.phone ?? ""));
    const name = String(b.name ?? "").trim();
    const password = String(b.password ?? "");
    const role = String(b.role ?? "sales") as AdminRole;

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Email không đúng định dạng." }, { status: 400 });
    }
    if (phone && !isValidAdminPhone(phone)) {
      return NextResponse.json({ error: "Số điện thoại không hợp lệ (10–11 số bắt đầu bằng 0)." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu quản trị tối thiểu 8 ký tự." }, { status: 400 });
    }
    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
    }
    if (role === "super_admin" && me.role !== "super_admin") {
      return NextResponse.json({ error: "Chỉ Super Admin mới được tạo tài khoản Super Admin." }, { status: 403 });
    }
    if (await one("SELECT 1 FROM admins WHERE email = ?", email)) {
      return NextResponse.json({ error: "Email này đã tồn tại trong hệ thống quản trị." }, { status: 400 });
    }
    if (phone && (await one("SELECT 1 FROM admins WHERE phone = ?", phone))) {
      return NextResponse.json({ error: "Số điện thoại này đã được gắn cho tài khoản quản trị khác." }, { status: 400 });
    }

    await createAdmin(email, password, role, name, phone);
    return NextResponse.json({ ok: true, staff: await listStaff() });
  }

  const targetId = Number(b.id);
  if (!Number.isInteger(targetId) || targetId <= 0) {
    return NextResponse.json({ error: "ID tài khoản không hợp lệ." }, { status: 400 });
  }
  const target = await one<{ id: number; role: string }>("SELECT id, role FROM admins WHERE id = ?", targetId);
  if (!target) {
    return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
  }
  const targetRole = normalizeRole(target.role);

  if (targetRole === "super_admin" && me.role !== "super_admin") {
    return NextResponse.json({ error: "Chỉ Super Admin mới được thay đổi tài khoản Super Admin." }, { status: 403 });
  }

  if (action === "update_role") {
    const nextRole = String(b.role ?? "") as AdminRole;
    if (!ADMIN_ROLES.includes(nextRole)) {
      return NextResponse.json({ error: "Vai trò không hợp lệ." }, { status: 400 });
    }
    if (nextRole === "super_admin" && me.role !== "super_admin") {
      return NextResponse.json({ error: "Chỉ Super Admin mới được cấp quyền Super Admin." }, { status: 403 });
    }
    if (targetId === me.id && me.role === "super_admin" && nextRole !== "super_admin") {
      const cnt = await one<{ n: number }>("SELECT COUNT(*) AS n FROM admins WHERE role = 'super_admin'");
      if ((cnt?.n ?? 0) <= 1) {
        return NextResponse.json({ error: "Không thể hạ quyền Super Admin cuối cùng." }, { status: 400 });
      }
    }
    await run("UPDATE admins SET role = ? WHERE id = ?", nextRole, targetId);
  } else if (action === "update_phone") {
    await ensureAdminSchema();
    const phone = normalizeAdminPhone(String(b.phone ?? ""));
    if (phone && !isValidAdminPhone(phone)) {
      return NextResponse.json({ error: "Số điện thoại không hợp lệ (10–11 số bắt đầu bằng 0)." }, { status: 400 });
    }
    if (phone && (await one("SELECT 1 FROM admins WHERE phone = ? AND id <> ?", phone, targetId))) {
      return NextResponse.json({ error: "Số điện thoại này đã được gắn cho tài khoản quản trị khác." }, { status: 400 });
    }
    await run("UPDATE admins SET phone = ? WHERE id = ?", phone, targetId);
  } else if (action === "reset_password") {
    const pw = String(b.password ?? "");
    if (pw.length < 8) {
      return NextResponse.json({ error: "Mật khẩu mới tối thiểu 8 ký tự." }, { status: 400 });
    }
    await setPassword(targetId, pw);
  } else if (action === "delete") {
    if (targetId === me.id) {
      return NextResponse.json({ error: "Không thể tự xoá tài khoản đang đăng nhập." }, { status: 400 });
    }
    if (targetRole === "super_admin") {
      const cnt = await one<{ n: number }>("SELECT COUNT(*) AS n FROM admins WHERE role = 'super_admin'");
      if ((cnt?.n ?? 0) <= 1) {
        return NextResponse.json({ error: "Không thể xoá Super Admin cuối cùng." }, { status: 400 });
      }
    }
    await run("DELETE FROM admin_sessions WHERE admin_id = ?", targetId);
    await run("DELETE FROM admins WHERE id = ?", targetId);
  } else {
    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, staff: await listStaff() });
}
