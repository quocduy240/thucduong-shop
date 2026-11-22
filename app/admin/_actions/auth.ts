"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  checkPassword,
  createAdmin,
  currentToken,
  endSession,
  hasAdmin,
  isValidAdminPhone,
  normalizeAdminPhone,
  removeAdmin,
  requireAdmin,
  requireRole,
  setPassword,
  startSession,
  verifyLogin,
} from "@/lib/auth";
import { one } from "@/lib/db";
import { logInfo, logWarn } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import { back, num, str } from "./shared";

export async function loginAction(formData: FormData) {
  const hdrs = await headers();
  const ip = hdrs.get("cf-connecting-ip")?.trim() || hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const identifier = str(formData, "identifier") || str(formData, "email");
  const rl = checkRateLimit(`${ip}:${identifier.toLowerCase()}`, {
    namespace: "admin-login",
    limit: 8,
    windowMs: 5 * 60_000,
  });
  if (!rl.allowed) {
    logWarn("admin.login_rate_limited", { ip, identifier });
    back("/admin/", `Thử đăng nhập quá nhiều lần. Vui lòng đợi ${rl.retryAfterSec} giây.`);
  }
  const id = await verifyLogin(identifier, str(formData, "password"));
  if (!id) {
    logWarn("admin.login_failed", { ip, identifier });
    back("/admin/", "Sai email/số điện thoại hoặc mật khẩu.");
  }
  await startSession(id!);
  redirect("/admin/");
}

/** Creates the very first admin; refuses once any admin exists. */
export async function setupAction(formData: FormData) {
  if (await hasAdmin()) redirect("/admin/");
  const email = str(formData, "email").toLowerCase();
  const phone = normalizeAdminPhone(str(formData, "phone"));
  const password = str(formData, "password");
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/", "Email không hợp lệ.");
  if (phone && !isValidAdminPhone(phone)) back("/admin/", "Số điện thoại không hợp lệ (10–11 số bắt đầu bằng 0).");
  if (password.length < 8) back("/admin/", "Mật khẩu tối thiểu 8 ký tự.");
  if (password !== str(formData, "password2")) back("/admin/", "Hai mật khẩu mới không khớp.");
  await startSession(await createAdmin(email, password, "super_admin", "", phone));
  redirect("/admin/");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/");
}

export async function changePasswordAction(formData: FormData) {
  const me = await requireAdmin();
  if (!(await checkPassword(me.id, str(formData, "current")))) back("/admin/settings/", "Mật khẩu hiện tại không đúng.");
  const pw = str(formData, "password");
  if (pw.length < 8) back("/admin/settings/", "Mật khẩu mới tối thiểu 8 ký tự.");
  if (pw !== str(formData, "password2")) back("/admin/settings/", "Hai mật khẩu mới không khớp.");
  await setPassword(me.id, pw, await currentToken());
  logInfo("admin.password_changed", { actor: me.email });
  redirect("/admin/settings/?saved=1");
}

export async function addAdminAction(formData: FormData) {
  const me = await requireRole(ADMIN_ACTION_ROLES.admin_accounts);
  const email = str(formData, "email").toLowerCase();
  const pw = str(formData, "password");
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/settings/", "Email không hợp lệ.");
  if (pw.length < 8) back("/admin/settings/", "Mật khẩu tối thiểu 8 ký tự.");
  try {
    await createAdmin(email, pw);
    logWarn("admin.account_created", { newAdminEmail: email, actor: me.email });
  } catch (e) {
    if (String(e).includes("UNIQUE")) back("/admin/settings/", "Email này đã là admin.");
    throw e;
  }
  redirect("/admin/settings/?saved=1");
}

export async function deleteAdminAction(formData: FormData) {
  const me = await requireRole(ADMIN_ACTION_ROLES.admin_accounts);
  const id = num(formData, "id");
  if (id === me.id) back("/admin/settings/", "Không thể tự xoá tài khoản đang đăng nhập.");
  const target = await one<{ email: string; role?: string }>("SELECT email, role FROM admins WHERE id = ?", id);
  if (target?.role === "super_admin") {
    const remaining = await one<{ n: number }>("SELECT COUNT(*) AS n FROM admins WHERE role = 'super_admin'");
    if ((remaining?.n ?? 0) <= 1) {
      back("/admin/settings/", "Không thể xoá tài khoản Super Admin cuối cùng của hệ thống.");
    }
  }
  await removeAdmin(id);
  logWarn("admin.account_deleted", { targetId: id, targetEmail: target?.email ?? "", actor: me.email });
  redirect("/admin/settings/?saved=1");
}
