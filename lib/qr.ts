import "server-only";
import { all, one, run } from "./db";

export type QrPosition =
  | "post_top"
  | "post_middle"
  | "post_bottom"
  | "post_sidebar"
  | "product_top"
  | "product_bottom"
  | "product_sidebar"
  | "home_top"
  | "home_bottom"
  | "video_library"
  | "product_card_badge"
  | "post_image_badge"
  | "manual";

export const QR_POSITION_LABELS: Record<QrPosition, string> = {
  post_top: "📰 Đầu bài viết (Trước nội dung bài viết)",
  post_middle: "📰 Giữa bài viết (Tự động chèn sau mục H2 đầu tiên)",
  post_bottom: "📰 Cuối bài viết (Sau nội dung bài viết)",
  post_sidebar: "📰 Cột bên phải trang bài viết (Sidebar)",
  product_top: "🛍️ Đầu mô tả chi tiết sản phẩm",
  product_bottom: "🛍️ Cuối mô tả chi tiết sản phẩm",
  product_sidebar: "🛍️ Cột phải trang sản phẩm (Dưới thông số)",
  home_top: "🏠 Trang chủ — Dưới Banner chính",
  home_bottom: "🏠 Trang chủ — Trước Footer",
  video_library: "🎬 Khung Video trong Thư viện Video Bài giảng",
  product_card_badge: "🖼️ Huy hiệu QR trên Khung Ảnh Sản phẩm",
  post_image_badge: "🖼️ Huy hiệu QR trên Hình ảnh trong Bài viết",
  manual: "✍️ Chỉ chèn thủ công bằng mã [[qr:slug]] hoặc lồng trong Block khác",
};

export type QrBlockRow = {
  id: number;
  slug: string;
  name: string;
  target_url: string;
  caption: string;
  fg_color: string;
  bg_color: string;
  style_variant: string;
  positions: string;
  target_post_ids: string;
  target_product_ids: string;
  scans: number;
  active: number;
  sort: number;
  created_at: string;
};

let ensured = false;

export async function ensureQrTable() {
  if (ensured) return;
  await run(`CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    target_url TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    fg_color TEXT NOT NULL DEFAULT '#14532d',
    bg_color TEXT NOT NULL DEFAULT '#ffffff',
    style_variant TEXT NOT NULL DEFAULT 'emerald',
    positions TEXT NOT NULL DEFAULT 'manual',
    target_post_ids TEXT NOT NULL DEFAULT '',
    target_product_ids TEXT NOT NULL DEFAULT '',
    scans INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const existing = await one<{ n: number }>("SELECT COUNT(*) AS n FROM qr_codes");
  if ((existing?.n ?? 0) === 0) {
    await run(
      `INSERT INTO qr_codes (slug, name, target_url, caption, fg_color, bg_color, style_variant, positions, active, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      "tu-van-zalo",
      "QR Tư vấn Thực Dưỡng 1:1 qua Zalo",
      "https://zalo.me/0767518592",
      "Quét mã để kết nối trực tiếp Zalo Thực Dưỡng Phúc Thọ (0767.518.592)",
      "#14532d",
      "#ffffff",
      "emerald",
      "video_library,product_sidebar",
    );
    await run(
      `INSERT INTO qr_codes (slug, name, target_url, caption, fg_color, bg_color, style_variant, positions, active, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 2)`,
      "tai-lieu-mien-phi",
      "QR Tải Tài liệu & Sách Thực Dưỡng Miễn Phí",
      "/thu-vien/tai-lieu-thuc-duong/",
      "Quét mã trên điện thoại để mở Kho Tài liệu Thực Dưỡng Drive",
      "#1e3a8a",
      "#ffffff",
      "blue",
      "post_bottom",
    );
  }
  ensured = true;
}

export async function getAllQrCodes(): Promise<QrBlockRow[]> {
  await ensureQrTable();
  return all<QrBlockRow>(
    "SELECT id, slug, name, target_url, caption, fg_color, bg_color, style_variant, positions, target_post_ids, target_product_ids, scans, active, sort, created_at FROM qr_codes ORDER BY sort ASC, id DESC",
  );
}

export async function getActiveQrCodes(): Promise<QrBlockRow[]> {
  await ensureQrTable();
  return all<QrBlockRow>(
    "SELECT id, slug, name, target_url, caption, fg_color, bg_color, style_variant, positions, target_post_ids, target_product_ids, scans, active, sort, created_at FROM qr_codes WHERE active = 1 ORDER BY sort ASC, id DESC",
  );
}

export async function getQrCodeById(id: number): Promise<QrBlockRow | undefined> {
  await ensureQrTable();
  return one<QrBlockRow>(
    "SELECT id, slug, name, target_url, caption, fg_color, bg_color, style_variant, positions, target_post_ids, target_product_ids, scans, active, sort, created_at FROM qr_codes WHERE id = ?",
    id,
  );
}

export async function getQrCodeBySlug(slug: string): Promise<QrBlockRow | undefined> {
  await ensureQrTable();
  return one<QrBlockRow>(
    "SELECT id, slug, name, target_url, caption, fg_color, bg_color, style_variant, positions, target_post_ids, target_product_ids, scans, active, sort, created_at FROM qr_codes WHERE slug = ?",
    slug,
  );
}

function escHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const QR_CARD_THEMES: Record<string, { border: string; bg: string; title: string; badge: string }> = {
  emerald: { border: "#86efac", bg: "#f0fdf4", title: "#14532d", badge: "#15803d" },
  amber: { border: "#fcd34d", bg: "#fffbeb", title: "#92400e", badge: "#b45309" },
  blue: { border: "#93c5fd", bg: "#eff6ff", title: "#1e3a8a", badge: "#1d4ed8" },
  neutral: { border: "#e5e7eb", bg: "#ffffff", title: "#111827", badge: "#374151" },
};

/** Render a Dynamic QR_Block card HTML ready for inline embedding or Block-Position zones. */
export function renderQrBlockHtml(qr: QrBlockRow): string {
  const th = QR_CARD_THEMES[qr.style_variant] ?? QR_CARD_THEMES.emerald;
  const imgSrc = `/api/qr/${encodeURIComponent(qr.slug)}`;
  const scanHref = `/q/${encodeURIComponent(qr.slug)}`;
  return `
<section data-rendered-qr="${escHtml(qr.slug)}" style="border:2px solid ${th.border};background:${th.bg};border-radius:16px;padding:16px 18px;margin:18px 0;display:flex;flex-wrap:wrap;align-items:center;gap:16px;">
  <a href="${scanHref}" target="_blank" rel="noopener noreferrer" style="display:block;flex-shrink:0;background:#ffffff;padding:8px;border-radius:12px;border:1px solid #d1d5db;box-shadow:0 2px 6px rgba(0,0,0,0.05);">
    <img src="${imgSrc}" alt="${escHtml(qr.name)}" width="116" height="116" style="width:116px;height:116px;display:block;border-radius:6px;" />
  </a>
  <div style="flex:1;min-width:200px;">
    <div style="display:inline-block;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;color:#ffffff;background:${th.badge};padding:2px 9px;border-radius:999px;">
      📱 QR Code Động · Quét bằng điện thoại
    </div>
    <h3 style="margin:6px 0 4px;font-size:16px;font-weight:800;color:${th.title};">
      ${escHtml(qr.name)}
    </h3>
    ${qr.caption ? `<p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.5;">${escHtml(qr.caption)}</p>` : ""}
    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:12px;">
      <a href="${scanHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${th.badge};color:#ffffff;font-weight:700;padding:6px 12px;border-radius:8px;text-decoration:none;">
        🔗 Mở liên kết ngay ↗
      </a>
      <span style="color:#6b7280;font-family:monospace;">/q/${escHtml(qr.slug)}</span>
    </div>
  </div>
</section>`;
}
