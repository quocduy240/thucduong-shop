"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { run } from "@/lib/db";
import { syncAdminMemberAdjustment, type LoyaltyTier } from "@/lib/loyalty";
import { ADMIN_ACTION_ROLES } from "@/lib/rbac";
import { back, num, refresh, str } from "./shared";

export async function addSubscriberAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.members_manage);
  const email = str(formData, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) back("/admin/members/?tab=subscribers", "Địa chỉ email không hợp lệ.");
  await run(
    "INSERT INTO newsletter_subscribers (email, source, status) VALUES (?, 'admin', 'active') ON CONFLICT(email) DO UPDATE SET status = 'active'",
    email,
  );
  refresh();
  redirect("/admin/members/?tab=subscribers&saved=1");
}

export async function deleteSubscriberAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.coupons_manage);
  await run("DELETE FROM newsletter_subscribers WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/members/?tab=subscribers&saved=1");
}

export async function updateMemberAction(formData: FormData) {
  const admin = await requireRole(ADMIN_ACTION_ROLES.members_manage);
  const id = num(formData, "id");
  const tier = str(formData, "tier") as LoyaltyTier;
  const points = Math.max(0, num(formData, "points"));
  if (!["bronze", "silver", "gold", "diamond"].includes(tier)) back("/admin/members/", "Hạng thành viên không hợp lệ.");
  const legacyTier = tier === "diamond" ? "gold" : tier;
  await run("UPDATE members SET tier = ?, points = ? WHERE id = ?", legacyTier, points, id);
  await syncAdminMemberAdjustment({ userId: id, points, tier, adminEmail: admin.email });
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function deleteMemberAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.coupons_manage);
  const id = num(formData, "id");
  await run("DELETE FROM member_sessions WHERE member_id = ?", id);
  await run("DELETE FROM members WHERE id = ?", id);
  refresh();
  redirect("/admin/members/?saved=1");
}

export async function saveCouponAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.coupons_manage);
  const code = str(formData, "code").toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const title = str(formData, "title");
  if (!code || !title) back("/admin/members/?tab=coupons", "Vui lòng nhập Mã giảm giá và Tên chương trình ưu đãi.");
  const description = str(formData, "description");
  const discountType = str(formData, "discount_type") === "fixed" ? "fixed" : "percent";
  const discountValue = Math.max(1, num(formData, "discount_value"));
  const minOrder = Math.max(0, num(formData, "min_order"));
  const maxDiscount = Math.max(0, num(formData, "max_discount"));
  const memberOnly = str(formData, "member_only") === "0" ? 0 : 1;

  await run(
    `INSERT INTO coupons (code, title, description, discount_type, discount_value, min_order, max_discount, member_only, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(code) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       discount_type = excluded.discount_type,
       discount_value = excluded.discount_value,
       min_order = excluded.min_order,
       max_discount = excluded.max_discount,
       member_only = excluded.member_only`,
    code, title, description, discountType, discountValue, minOrder, maxDiscount, memberOnly,
  );
  refresh();
  redirect("/admin/members/?tab=coupons&saved=1");
}

export async function toggleCouponAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.coupons_manage);
  const id = num(formData, "id");
  const active = num(formData, "active") ? 1 : 0;
  await run("UPDATE coupons SET active = ? WHERE id = ?", active, id);
  refresh();
  redirect("/admin/members/?tab=coupons&saved=1");
}

export async function deleteCouponAction(formData: FormData) {
  await requireRole(ADMIN_ACTION_ROLES.coupons_manage);
  await run("DELETE FROM coupons WHERE id = ?", num(formData, "id"));
  refresh();
  redirect("/admin/members/?tab=coupons&saved=1");
}
