import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_ACTION_ROLES,
  canAccessAdminPath,
  canPerformAdminAction,
  normalizeRole,
  type AdminActionDomain,
} from "./rbac";

test("normalizeRole falls back safely to admin for unknown or empty values", () => {
  assert.equal(normalizeRole("super_admin"), "super_admin");
  assert.equal(normalizeRole("admin"), "admin");
  assert.equal(normalizeRole("editor"), "editor");
  assert.equal(normalizeRole("sales"), "sales");
  assert.equal(normalizeRole("owner"), "admin");
  assert.equal(normalizeRole(null), "admin");
  assert.equal(normalizeRole(undefined), "admin");
});

test("canAccessAdminPath enforces path boundaries for editor and sales roles", () => {
  assert.equal(canAccessAdminPath("super_admin", "/admin/settings/"), true);
  assert.equal(canAccessAdminPath("admin", "/admin/orders/"), true);

  // Editor can edit content/catalog but cannot view orders, CRM, or system settings
  assert.equal(canAccessAdminPath("editor", "/admin/posts/"), true);
  assert.equal(canAccessAdminPath("editor", "/admin/products/12"), true);
  assert.equal(canAccessAdminPath("editor", "/admin/orders/"), false);
  assert.equal(canAccessAdminPath("editor", "/admin/crm/"), false);
  assert.equal(canAccessAdminPath("editor", "/admin/settings/"), false);

  // Sales can operate orders, POS, CRM, and loyalty, but not posts/settings/sitemaps
  assert.equal(canAccessAdminPath("sales", "/admin/orders/"), true);
  assert.equal(canAccessAdminPath("sales", "/admin/pos/"), true);
  assert.equal(canAccessAdminPath("sales", "/admin/loyalty/"), true);
  assert.equal(canAccessAdminPath("sales", "/admin/posts/"), false);
  assert.equal(canAccessAdminPath("sales", "/admin/settings/"), false);
  assert.equal(canAccessAdminPath("sales", "/admin/sitemaps/"), false);
});

test("canPerformAdminAction prevents privilege escalation across all sensitive domains", () => {
  // Super Admin has full access across every defined action domain
  for (const domain of Object.keys(ADMIN_ACTION_ROLES) as AdminActionDomain[]) {
    assert.equal(canPerformAdminAction("super_admin", domain), true, `super_admin should be allowed ${domain}`);
  }

  // Only super_admin may mutate system settings or admin accounts
  assert.equal(canPerformAdminAction("admin", "system_settings"), false);
  assert.equal(canPerformAdminAction("admin", "admin_accounts"), false);
  assert.equal(canPerformAdminAction("editor", "system_settings"), false);
  assert.equal(canPerformAdminAction("sales", "admin_accounts"), false);

  // Editor cannot process orders, adjust inventory/finance, delete catalog/content, or manage coupons
  assert.equal(canPerformAdminAction("editor", "content_write"), true);
  assert.equal(canPerformAdminAction("editor", "catalog_write"), true);
  assert.equal(canPerformAdminAction("editor", "content_delete"), false);
  assert.equal(canPerformAdminAction("editor", "catalog_delete"), false);
  assert.equal(canPerformAdminAction("editor", "orders_ops"), false);
  assert.equal(canPerformAdminAction("editor", "inventory_finance"), false);
  assert.equal(canPerformAdminAction("editor", "coupons_manage"), false);

  // Sales can operate orders/inventory/members/flash_sale/consultations but cannot write/delete content or delete products
  assert.equal(canPerformAdminAction("sales", "orders_ops"), true);
  assert.equal(canPerformAdminAction("sales", "inventory_finance"), true);
  assert.equal(canPerformAdminAction("sales", "members_manage"), true);
  assert.equal(canPerformAdminAction("sales", "flash_sale"), true);
  assert.equal(canPerformAdminAction("sales", "consultations"), true);
  assert.equal(canPerformAdminAction("sales", "content_write"), false);
  assert.equal(canPerformAdminAction("sales", "content_delete"), false);
  assert.equal(canPerformAdminAction("sales", "catalog_delete"), false);
  assert.equal(canPerformAdminAction("sales", "coupons_manage"), false);
});
