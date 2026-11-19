import type { AdminRole } from "./rbac";

export type FrontendEditResource =
  | "product"
  | "post"
  | "page"
  | "category"
  | "block"
  | "flash_sale"
  | "video"
  | "document"
  | "social"
  | "settings"
  | "themes"
  | "quick_consult"
  | "orders";

const EDITOR_RESOURCES = new Set<FrontendEditResource>([
  "product",
  "post",
  "page",
  "category",
  "block",
  "video",
  "document",
  "social",
]);

const SALES_RESOURCES = new Set<FrontendEditResource>([
  "product",
  "flash_sale",
  "quick_consult",
  "orders",
]);

export function canEditFrontendResource(
  role: AdminRole,
  resource: FrontendEditResource,
): boolean {
  if (role === "super_admin" || role === "admin") return true;
  if (role === "editor") return EDITOR_RESOURCES.has(resource);
  if (role === "sales") return SALES_RESOURCES.has(resource);
  return false;
}

export type FrontendQuickLink = {
  label: string;
  href: string;
  resource: FrontendEditResource;
};

const ALL_QUICK_LINKS: FrontendQuickLink[] = [
  { label: "Sản phẩm", href: "/admin/products/", resource: "product" },
  { label: "Bài viết", href: "/admin/posts/", resource: "post" },
  { label: "Danh mục", href: "/admin/categories/", resource: "category" },
  { label: "Trang tĩnh", href: "/admin/pages/", resource: "page" },
  { label: "Block", href: "/admin/blocks/", resource: "block" },
  { label: "Flash Sale", href: "/admin/flash-sale/", resource: "flash_sale" },
  { label: "Tư vấn AI", href: "/admin/quick-consult/", resource: "quick_consult" },
  { label: "Đơn hàng", href: "/admin/orders/", resource: "orders" },
  { label: "Giao diện", href: "/admin/themes/", resource: "themes" },
  { label: "Cài đặt", href: "/admin/settings/", resource: "settings" },
];

export function getFrontendQuickLinks(role: AdminRole): FrontendQuickLink[] {
  return ALL_QUICK_LINKS.filter((item) => canEditFrontendResource(role, item.resource));
}
