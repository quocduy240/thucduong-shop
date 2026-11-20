export type AdminRole = "super_admin" | "admin" | "editor" | "sales";

export const ADMIN_ROLES: AdminRole[] = ["super_admin", "admin", "editor", "sales"];

export const ROLE_META: Record<
  AdminRole,
  {
    label: string;
    shortLabel: string;
    badge: string;
    description: string;
    permissionsSummary: string[];
  }
> = {
  super_admin: {
    label: "Super Admin (Tối cao)",
    shortLabel: "Super Admin",
    badge: "bg-purple-700 text-white",
    description: "Toàn quyền hệ thống, quản lý tài khoản quản trị, cài đặt SMTP & bảo mật.",
    permissionsSummary: [
      "Tạo / sửa / xoá tài khoản Super Admin, Admin, Editor, Bán hàng",
      "Toàn quyền Đơn hàng, Sản phẩm, CRM, Loyalty, Nội dung & AI",
      "Cấu hình Cài đặt hệ thống (SMTP), Sitemaps SEO, Giao diện",
    ],
  },
  admin: {
    label: "Admin (Quản lý cửa hàng)",
    shortLabel: "Admin",
    badge: "bg-brand text-white",
    description: "Quản lý toàn bộ vận hành bán hàng, nội dung, CRM và thành viên (trừ quản lý Super Admin).",
    permissionsSummary: [
      "Quản lý Đơn hàng, Sản phẩm, Flash Sale, Danh mục, Kho quà",
      "Quản lý CRM Chăm sóc, Thành viên, Tư vấn AI, Nội dung & SEO",
      "Không sửa/xoá tài khoản Super Admin",
    ],
  },
  editor: {
    label: "Editor (Biên tập nội dung)",
    shortLabel: "Editor",
    badge: "bg-blue-600 text-white",
    description: "Chuyên trách viết bài, cập nhật mô tả sản phẩm, video, tài liệu, QR & SEO.",
    permissionsSummary: [
      "Đăng & sửa Bài viết, Video, Tài liệu, Block, QR, Trang tĩnh, Danh mục",
      "Cập nhật nội dung Sản phẩm & quản lý Sitemaps SEO, Bình luận",
      "Không xem Đơn hàng, Doanh thu, CRM SĐT khách & Cài đặt hệ thống",
    ],
  },
  sales: {
    label: "Bán hàng & CSKH (Sales)",
    shortLabel: "Bán hàng",
    badge: "bg-amber-600 text-white",
    description: "Xử lý đơn hàng, tư vấn khách hàng, chăm sóc CRM & tích điểm đổi quà.",
    permissionsSummary: [
      "Xử lý Đơn hàng, CRM Chăm sóc (Zalo/Ghi chú), Tích điểm & Quà",
      "Trả lời Tư vấn nhanh AI, Xét nghiệm AI, Bình luận & xem Sản phẩm/Thành viên",
      "Không xoá Sản phẩm/Bài viết, không đổi Cài đặt/Giao diện/Sitemaps",
    ],
  },
};

const EDITOR_ALLOWED_PREFIXES = [
  "/admin/products/",
  "/admin/posts/",
  "/admin/videos/",
  "/admin/documents/",
  "/admin/blocks/",
  "/admin/social-links/",
  "/admin/qr/",
  "/admin/comments/",
  "/admin/pages/",
  "/admin/categories/",
  "/admin/sitemaps/",
  "/admin/upload",
];

const SALES_ALLOWED_PREFIXES = [
  "/admin/pos/",
  "/admin/orders/",
  "/admin/inventory/",
  "/admin/products/",
  "/admin/flash-sale/",
  "/admin/crm/",
  "/admin/loyalty/",
  "/admin/members/",
  "/admin/quick-consult/",
  "/admin/lab-analysis/",
  "/admin/comments/",
];

export function normalizeRole(raw?: string | null): AdminRole {
  if (raw === "super_admin" || raw === "admin" || raw === "editor" || raw === "sales") return raw;
  return "admin";
}

export function canAccessAdminPath(role: AdminRole, rawPathname: string): boolean {
  const path = rawPathname.replace(/\/?$/, "/");
  if (path === "/admin/") return true;
  if (role === "super_admin" || role === "admin") return true;
  if (role === "editor") {
    return EDITOR_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
  }
  if (role === "sales") {
    return SALES_ALLOWED_PREFIXES.some((p) => path.startsWith(p));
  }
  return false;
}

export type AdminActionDomain =
  | "system_settings"
  | "admin_accounts"
  | "orders_ops"
  | "inventory_finance"
  | "members_manage"
  | "coupons_manage"
  | "flash_sale"
  | "consultations"
  | "catalog_write"
  | "catalog_delete"
  | "content_write"
  | "content_delete"
  | "comments_moderate";

export const ADMIN_ACTION_ROLES: Record<AdminActionDomain, AdminRole[]> = {
  system_settings: ["super_admin"],
  admin_accounts: ["super_admin"],
  orders_ops: ["super_admin", "admin", "sales"],
  inventory_finance: ["super_admin", "admin", "sales"],
  members_manage: ["super_admin", "admin", "sales"],
  coupons_manage: ["super_admin", "admin"],
  flash_sale: ["super_admin", "admin", "sales"],
  consultations: ["super_admin", "admin", "sales"],
  catalog_write: ["super_admin", "admin", "editor", "sales"],
  catalog_delete: ["super_admin", "admin"],
  content_write: ["super_admin", "admin", "editor"],
  content_delete: ["super_admin", "admin"],
  comments_moderate: ["super_admin", "admin", "editor", "sales"],
};

export function canPerformAdminAction(role: AdminRole, domain: AdminActionDomain): boolean {
  return ADMIN_ACTION_ROLES[domain].includes(role);
}
