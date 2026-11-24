import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SCRATCH_DIR = "C:\\Users\\Vinh\\.gemini\\antigravity\\brain\\0a78908d-7a2d-4b64-9955-1e20fbf850a3\\scratch";
const DIAGRAMS_DIR = path.join(SCRATCH_DIR, "diagrams");
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

fs.mkdirSync(DIAGRAMS_DIR, { recursive: true });

function assertNoForbiddenDashes(text, label) {
  const bad = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\u2013" || ch === "\u2014") {
      const snippet = text.slice(Math.max(0, i - 25), Math.min(text.length, i + 25)).replace(/\s+/g, " ");
      bad.push(`char U+${ch.charCodeAt(0).toString(16).toUpperCase()} near "${snippet}"`);
    }
  }
  if (bad.length > 0) {
    throw new Error(`Forbidden dash found in ${label}: ${bad.slice(0, 5).join("; ")}`);
  }
}

function wrapDoc({ width = 1400, height, title, subtitle, tag, legend = [], bodyHtml, footerNote }) {
  const legendHtml = legend.length
    ? `<div class="legend">${legend
        .map(
          (l) =>
            `<span class="legend-item"><span class="legend-dot" style="background:${l.bg};border:1.5px solid ${l.border};"></span>${l.label}</span>`,
        )
        .join("")}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    width: ${width}px;
    height: ${height}px;
    overflow: hidden;
    background: #ffffff;
    font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
    color: #202124;
    -webkit-font-smoothing: antialiased;
  }
  .canvas {
    width: ${width}px;
    height: ${height}px;
    padding: 20px 26px 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: #ffffff;
    border: 1px solid #e5e7eb;
  }
  .hdr {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 2px solid #137333;
    padding-bottom: 10px;
    margin-bottom: 10px;
  }
  .hdr-left h1 {
    font-size: 21px;
    font-weight: 800;
    color: #137333;
    letter-spacing: -0.2px;
    line-height: 1.25;
  }
  .hdr-left p {
    margin-top: 3px;
    font-size: 12.5px;
    color: #5f6368;
    font-weight: 500;
  }
  .hdr-tag {
    background: #e6f4ea;
    color: #137333;
    border: 1px solid #86efac;
    border-radius: 999px;
    padding: 5px 13px;
    font-size: 11.5px;
    font-weight: 700;
    white-space: nowrap;
  }
  .main {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 0;
  }
  .ftr {
    margin-top: 8px;
    padding-top: 7px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 10.5px;
    color: #5f6368;
  }
  .legend { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
  .legend-item { display: inline-flex; align-items: center; gap: 5px; font-weight: 500; }
  .legend-dot { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
  .mono { font-family: 'Consolas', 'Courier New', monospace; font-size: 10.5px; }
  .pill {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.3;
  }
</style>
</head>
<body>
  <div class="canvas">
    <div class="hdr">
      <div class="hdr-left">
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      <div class="hdr-tag">${tag}</div>
    </div>
    <div class="main">
      ${bodyHtml}
    </div>
    <div class="ftr">
      ${legendHtml}
      <div>${footerNote}</div>
    </div>
  </div>
</body>
</html>`;
}

// =========================================================================
// 1. System Architecture (1400 x 880)
// =========================================================================
function buildDiagram01() {
  const box = (title, sub, items, theme) => {
    const palettes = {
      slate: { bg: "#f8fafc", bd: "#94a3b8", hd: "#334155" },
      blue: { bg: "#eff6ff", bd: "#60a5fa", hd: "#1d4ed8" },
      green: { bg: "#f0fdf4", bd: "#4ade80", hd: "#15803d" },
      amber: { bg: "#fffbeb", bd: "#fbbf24", hd: "#b45309" },
      purple: { bg: "#faf5ff", bd: "#c084fc", hd: "#6b21a8" },
      teal: { bg: "#f0fdfa", bd: "#5eead4", hd: "#0f766e" },
    };
    const p = palettes[theme];
    return `<div style="background:${p.bg};border:1.5px solid ${p.bd};border-radius:10px;padding:8px 11px;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:12.5px;font-weight:800;color:${p.hd};margin-bottom:2px;">${title}</div>
      ${sub ? `<div style="font-size:10.5px;color:#475569;font-weight:600;margin-bottom:4px;">${sub}</div>` : ""}
      <div style="font-size:10.5px;color:#1e293b;line-height:1.38;">${items.map((x) => `<div>• ${x}</div>`).join("")}</div>
    </div>`;
  };

  const downArrow = (label) => `
    <div style="display:flex;align-items:center;justify-content:center;gap:8px;height:20px;">
      <svg width="24" height="18" viewBox="0 0 24 18"><path d="M12 0 L12 13 M6 8 L12 15 L18 8" stroke="#137333" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span style="font-size:10.5px;font-weight:700;color:#137333;background:#e6f4ea;padding:1px 8px;border-radius:999px;border:1px solid #bbf7d0;">${label}</span>
      <svg width="24" height="18" viewBox="0 0 24 18"><path d="M12 0 L12 13 M6 8 L12 15 L18 8" stroke="#137333" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>`;

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:4px;">
      <!-- Layer 1: Clients -->
      <div style="border:1.5px solid #cbd5e1;border-radius:12px;padding:8px 10px;background:#ffffff;">
        <div style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Tầng 1: Kênh Khách hàng, Vận hành Nội bộ & Điểm vào Hệ thống</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
          ${box("Storefront Web / Mobile", "thucduongshop.duyvo.win", ["Mua sắm, Tìm kiếm, Giỏ hàng Cookie", "Tư vấn AI (/tu-van-nhanh/), Thành viên", "Thư viện 318 Video & 12 Tài liệu"], "slate")}
          ${box("Admin Portal (/admin/*)", "4 Vai trò RBAC (scrypt + cookie)", ["39 trang quản trị, 9 nhóm Server Actions", "AiIdleQueueProvider (concurrency=1)", "Inline Frontend Edit Overlay"], "blue")}
          ${box("Bán hàng POS & In A5", "/admin/pos/ & /admin/orders/[id]/", ["Bán nhanh tại quầy / Telesale", "Trừ kho tức thì + Sổ quỹ 3 Quỹ", "In hóa đơn chuẩn KiotViet A5/A4/K80"], "amber")}
          ${box("Webhooks & External Crons", "Tự động hóa Liên hệ thống", ["POST /api/kiotviet/webhook", "GET /api/cron/compliance-sync|crm|youtube", "Idle Workers (/idle-worker + x-idle-secret)"], "purple")}
        </div>
      </div>

      ${downArrow("HTTPS / TLS 1.3 + Security Headers & CSP (next.config.ts)")}

      <!-- Layer 2: Cloudflare Edge -->
      <div style="border:1.5px solid #93c5fd;border-radius:12px;padding:8px 10px;background:#f8fbff;">
        <div style="font-size:11px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Tầng 2: Cloudflare Edge Network & Phân phối Nội dung</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
          ${box("Custom Domain & WAF", "Routing & Bảo vệ Biên", ["Pattern: thucduongshop.duyvo.win", "Header cf-connecting-ip cho Rate Limit", "HSTS 1 năm + SAMEORIGIN + nosniff"], "blue")}
          ${box("Static Assets (ASSETS)", ".open-next/assets", ["JS/CSS bundles, favicon, public/*", "/uploads/* (Cache 30 ngày + SWR 1 ngày)", "Ảnh mẫu & bài viết pre-imported"], "blue")}
          ${box("Image Resizing / CDN", "lib/image-url.ts", ["Biến NEXT_PUBLIC_CF_IMAGE_RESIZING=1", "Chuyển /cdn-cgi/image/ (WebP/AVIF)", "Tùy chọn NEXT_PUBLIC_MEDIA_CDN_URL"], "teal")}
          ${box("OpenNext Adapter", "@opennextjs/cloudflare 1.20.17", ["Entry: .open-next/worker.js", "Flags: nodejs_compat, strictly_public", "Binding WORKER_SELF_REFERENCE"], "blue")}
        </div>
      </div>

      ${downArrow("Cloudflare Workers (workerd) + Next.js 16.4.6 App Router Execution")}

      <!-- Layer 3: Application Worker -->
      <div style="border:2px solid #22c55e;border-radius:12px;padding:9px 10px;background:#f4fbf6;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11px;font-weight:800;color:#15803d;text-transform:uppercase;letter-spacing:0.4px;">Tầng 3: Logic Ứng dụng Next.js 16.4.6 & React 19.3 trên Cloudflare Workers (293 tệp · 65.234 LOC)</span>
          <span class="pill" style="background:#dcfce7;color:#166534;border:1px solid #86efac;">Pure TS trên workerd (không dùng cheerio ở runtime)</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
          ${box("Storefront SSR & SEO", "28 files App + 39 Components", ["URL tương thích LoveItop (.html & /)", "Dynamic BlockZone (4 cấp đệ quy)", "JSON-LD, Sitemap.xml, 3 Theme Zero-FOUC"], "green")}
          ${box("E-commerce & Checkout", "lib/cart.ts · checkout-helpers.ts", ["Trừ tồn kho Atomic + Hoàn bù lỗi", "Flash Sale UTC+7 + Coupon + Hạng thẻ", "Idempotency 10p + Rate Limit trượt"], "green")}
          ${box("Retail, CRM & Loyalty", "lib/retail-ops · crm · loyalty.ts", ["Thẻ kho + Sổ quỹ 3 Quỹ + EOD COGS", "RFM 5 phân khúc + Zalo 1-Click", "10 nguồn tích điểm + Đổi quà Atomic"], "amber")}
          ${box("AI Gateway & Workers", "lib/gemini-key · post/product-importer", ["Tư vấn nhanh + Hồ sơ /ho-so-tu-van/", "Lab OCR, AI Rewrite, Image Clean", "Tuân thủ NĐ 15/2018 + TT 09/2015"], "purple")}
        </div>
      </div>

      ${downArrow("Bindings: env.DB (D1) · env.NEXT_INC_CACHE_KV · env.MEDIA_BUCKET (R2) + External HTTPS/TLS")}

      <!-- Layer 4 & 5 Split: Storage + External Integrations -->
      <div style="display:grid;grid-template-columns:1.15fr 1.35fr;gap:12px;">
        <div style="border:1.5px solid #14b8a6;border-radius:12px;padding:8px 10px;background:#f5fdfa;">
          <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Tầng 4: Lưu trữ & Bộ nhớ Đệm (Cloudflare Data Plane)</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${box("Cloudflare D1 (DB)", "thucduong-shop-db", ["34+ bảng SQLite phân tán", "18 composite indexes", "Backup gzip ngày lúc 03:00"], "teal")}
            ${box("Cloudflare KV Cache", "NEXT_INC_CACHE_KV", ["Regional Cache TTL 300s", "9 CACHE_TAGS (revalidateTag)", "Làm mới ngay khi Admin lưu"], "teal")}
            ${box("Media R2 / D1 Fallback", "MEDIA_BUCKET / D1", ["Ưu tiên R2 (chưa khai báo ở wrangler)", "Fallback D1 media_files & assets", "Cache 1 năm + ETag 304"], "teal")}
          </div>
        </div>

        <div style="border:1.5px solid #a855f7;border-radius:12px;padding:8px 10px;background:#fdfaff;">
          <div style="font-size:11px;font-weight:800;color:#6b21a8;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;">Tầng 5: Tích hợp Dịch vụ Ngoài (External Gateways)</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${box("Google Gemini API", "generativelanguage.googleapis.com", ["Text: 2.5-flash / flash-latest", "Image: 3.1 / 2.5-flash-image", "Lab Vision OCR: 3.8-flash"], "purple")}
            ${box("KiotViet & Provinces", "id.kiotviet.vn · public.kiotapi.com", ["OAuth2 Push Order / Pull Stock", "Import Excel .xlsx (node:zlib)", "Provinces Open-API v2 (34/3321)"], "amber")}
            ${box("SMTP, YouTube & VietQR", "TCP TLS / RSS / img.vietqr.io", ["Raw SMTP (node:net/tls 465/587)", "YouTube RSS @quocduy2401", "VietQR BIDV 8610312888"], "slate")}
          </div>
        </div>
      </div>
    </div>`;

  return wrapDoc({
    height: 860,
    title: "Kiến trúc Tổng thể Hệ thống Thực Dưỡng Phúc Thọ (thucduong-shop)",
    subtitle: "Mô hình Edge Serverless Monolith trên Next.js 16.4.6 + OpenNext Cloudflare Workers + D1 + KV + Tích hợp AI & Bán lẻ",
    tag: "SYSTEM ARCHITECTURE",
    legend: [
      { label: "Storefront & Edge", bg: "#f0fdf4", border: "#4ade80" },
      { label: "Cloudflare Infra", bg: "#eff6ff", border: "#60a5fa" },
      { label: "Retail / POS / KiotViet", bg: "#fffbeb", border: "#fbbf24" },
      { label: "AI & External APIs", bg: "#faf5ff", border: "#c084fc" },
      { label: "Data Plane (D1/KV/R2)", bg: "#f0fdfa", border: "#5eead4" },
    ],
    footerNote: "Nguồn: wrangler.jsonc, open-next.config.ts, next.config.ts, lib/db.ts (HEAD 557fbf9)",
    bodyHtml,
  });
}

// =========================================================================
// 2. Codebase Metrics Chart (1400 x 760)
// =========================================================================
function buildDiagram02() {
  const kpis = [
    { val: "293", lbl: "Tổng tệp mã nguồn & cấu hình", sub: "Không tính node_modules / .next / uploads", color: "#137333", bg: "#e6f4ea", bd: "#86efac" },
    { val: "65.234", lbl: "Tổng số dòng mã (LOC)", sub: "TypeScript, TSX, MJS, CSS, SQL, YAML", color: "#065a82", bg: "#e8f0fe", bd: "#93c5fd" },
    { val: "110", lbl: "Git Commits trong lịch sử", sub: "Từ prototype SQLite tới D1 Production", color: "#b45309", bg: "#fef7e0", bd: "#fcd34d" },
    { val: "34+ / 22", lbl: "Bảng D1 & Unit Test Cases", sub: "18 composite indexes + 8 tệp *.test.ts", color: "#5b21b6", bg: "#f3e8ff", bd: "#d8b4fe" },
  ];

  const rows = [
    { name: "lib/ (Core & Domain Logic)", files: 57, loc: 18496, color: "#15803d", note: "DB, Loyalty, CRM, AI Importers, KiotViet, Retail Ops, Security" },
    { name: "components/admin/ (Admin UI)", files: 37, loc: 18393, color: "#1d4ed8", note: "POS, KiotViet Table/Print, CRM, Product/Post Importers, Editors" },
    { name: "components/ (Storefront UI)", files: 39, loc: 9681, color: "#0d9488", note: "Header, QuickConsult, Video/Doc Library, Checkout, MemberPortal" },
    { name: "app/admin/ (Admin Pages & Export)", files: 39, loc: 7576, color: "#2563eb", note: "39 routes quản trị, Inventory 5 tab, Flash Sale, Xuất CSV" },
    { name: "app/api/admin/ (Admin & AI APIs)", files: 26, loc: 3722, color: "#7c3aed", note: "AI Rewrite, Image Edit, Idle Workers, Lab OCR, Mindmap, KiotViet" },
    { name: "app/ (Storefront Pages & Routes)", files: 28, loc: 2052, color: "#16a34a", note: "Trang chủ, Catalog, URL động 3 cấp, Cart/Checkout, Sitemap/QR" },
    { name: "app/admin/_actions/ (Server Actions)", files: 9, loc: 1905, color: "#d97706", note: "auth, catalog, content, orders, members, marketing, retail, settings" },
    { name: "app/api/ (Public, Webhook & Cron APIs)", files: 27, loc: 1394, color: "#0284c7", note: "Checkout, Coupons, Member Auth, Loyalty, Media, Health, 3 Crons" },
    { name: "scripts/ (CLI & Migration Tools)", files: 7, loc: 802, color: "#64748b", note: "Import LoveItop/Haravan, Export/Verify D1, Provinces v2, OpenNext" },
    { name: "Khác (Tests, CI/CD, SQL, Docs, Skills)", files: 24, loc: 1213, color: "#475569", note: "8 unit test (450 LOC), 3 GH Workflows (202), 2 SQL migrations (51)" },
  ];

  const maxLoc = 18496;

  const kpiHtml = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:12px;">
    ${kpis
      .map(
        (k) => `<div style="background:${k.bg};border:1.5px solid ${k.bd};border-radius:10px;padding:11px 14px;">
          <div style="font-size:26px;font-weight:900;color:${k.color};line-height:1.1;">${k.val}</div>
          <div style="font-size:12.5px;font-weight:700;color:#202124;margin-top:3px;">${k.lbl}</div>
          <div style="font-size:10.5px;color:#5f6368;margin-top:2px;">${k.sub}</div>
        </div>`,
      )
      .join("")}
  </div>`;

  const barsHtml = `<div style="border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 16px;background:#f8fafc;flex:1;display:flex;flex-direction:column;justify-content:space-between;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <span style="font-size:13px;font-weight:800;color:#1e293b;">Phân bổ Số dòng mã (LOC) & Số tệp theo Từng Phân hệ</span>
      <span style="font-size:11px;color:#64748b;font-weight:600;">Tỷ trọng % trên tổng 65.234 LOC</span>
    </div>
    ${rows
      .map((r) => {
        const pct = ((r.loc / 65234) * 100).toFixed(1);
        const barW = Math.max(2, (r.loc / maxLoc) * 100).toFixed(1);
        return `<div style="display:grid;grid-template-columns:275px 1fr 158px 345px;align-items:center;gap:12px;padding:5px 0;border-bottom:1px dashed #e2e8f0;">
          <div style="font-size:12px;font-weight:700;color:#1e293b;">${r.name}</div>
          <div style="background:#e2e8f0;height:20px;border-radius:6px;overflow:hidden;position:relative;">
            <div style="width:${barW}%;height:100%;background:${r.color};border-radius:6px;"></div>
          </div>
          <div style="font-size:11.5px;font-weight:700;color:#0f172a;text-align:right;" class="mono">${r.loc.toLocaleString("en-US")} (${pct}%) · ${r.files}f</div>
          <div style="font-size:10.5px;color:#475569;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.note}</div>
        </div>`;
      })
      .join("")}
  </div>`;

  const insightHtml = `<div style="margin-top:10px;background:#fef7e0;border:1.5px solid #fcd34d;border-radius:8px;padding:8px 12px;font-size:11.5px;color:#78350f;">
    <strong>Nhận xét Kiến trúc:</strong> Hơn <strong>56,5% tổng dung lượng mã nguồn</strong> tập trung ở tầng Domain Logic (<span class="mono">lib/</span>: 28,4%) và Giao diện Quản trị (<span class="mono">components/admin/</span>: 28,2%), cho thấy dự án đã vượt xa bản mẫu Storefront ban đầu để trở thành hệ thống ERP bán lẻ, CRM, Loyalty và tự động hóa AI hoàn chỉnh.
  </div>`;

  return wrapDoc({
    height: 750,
    title: "Biểu đồ Quy mô Mã nguồn & Phân bổ Kiến trúc (Codebase Metrics)",
    subtitle: "Thống kê trực tiếp từ cây thư mục làm việc (loại trừ node_modules, .next, .open-next, public/uploads, data, package-lock.json)",
    tag: "CODEBASE METRICS",
    legend: [
      { label: "Domain Logic (lib)", bg: "#15803d", border: "#15803d" },
      { label: "Admin UI & Pages", bg: "#1d4ed8", border: "#1d4ed8" },
      { label: "Storefront UI & Pages", bg: "#0d9488", border: "#0d9488" },
      { label: "APIs & AI Endpoints", bg: "#7c3aed", border: "#7c3aed" },
      { label: "Server Actions & Ops", bg: "#d97706", border: "#d97706" },
    ],
    footerNote: "Đo kiểm tự động bằng Node.js filesystem scan trên workspace d:\\Git\\thucduong-shop",
    bodyHtml: kpiHtml + barsHtml + insightHtml,
  });
}

// =========================================================================
// 3. Database ERD (1400 x 980)
// =========================================================================
function buildDiagram03() {
  const tbl = (name, cols, fkNote) => `
    <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:7px;padding:5px 8px;margin-bottom:5px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span class="mono" style="font-weight:800;font-size:11px;color:#0f172a;">${name}</span>
        ${fkNote ? `<span style="font-size:9.5px;color:#475569;font-weight:600;background:#f1f5f9;padding:1px 5px;border-radius:4px;">${fkNote}</span>` : ""}
      </div>
      <div style="font-size:10px;color:#475569;margin-top:2px;line-height:1.3;">${cols}</div>
    </div>`;

  const domainBox = (title, accent, bg, bd, tablesHtml) => `
    <div style="background:${bg};border:1.5px solid ${bd};border-radius:10px;padding:8px 9px;display:flex;flex-direction:column;">
      <div style="font-size:11.5px;font-weight:800;color:${accent};margin-bottom:6px;border-bottom:1px solid ${bd};padding-bottom:4px;">${title}</div>
      <div style="flex:1;">${tablesHtml}</div>
    </div>`;

  const d1 = domainBox(
    "1. Danh mục, Sản phẩm & Khuyến mãi (5 bảng)",
    "#15803d", "#f0fdf4", "#86efac",
    tbl("product_categories", "PK id · slug (UQ) · name · sort · show_in_menu/home/footer · is_active · seo_title · description", "1 -> N products") +
    tbl("products", "PK id · slug (UQ) · FK category_id · sku/kv_code/barcode · price/sale_price/cost_price · contact_only · stock/min/max · is_published · source_url · seo_*", "N -> 1 category") +
    tbl("comments", "PK id · FK product_id · name · content · rating (1..5) · created_at", "N -> 1 product") +
    tbl("flash_sale_slots & flash_sale_items", "slots: PK id · start_hour · end_hour · discount_pct | items: FK slot_id · FK product_id · flash_price · quota · sold · gift_note", "1:N slot · N:1 product")
  );

  const d2 = domainBox(
    "2. Nội dung, Thư viện & Marketing (10 bảng)",
    "#1d4ed8", "#eff6ff", "#93c5fd",
    tbl("post_sections -> post_categories -> posts", "sections(PK slug) · categories(PK id, FK section_slug) · posts(PK id, FK category_id, cover, source_url, related_product_ids, seo_*)", "Phân cấp 3 tầng") +
    tbl("pages & content_blocks", "pages: PK (grp, slug) · title · content | content_blocks: PK id · slug · style_variant · positions · target_post/product_ids", "Block đệ quy") +
    tbl("videos & youtube_sync_pending", "videos: PK id · video_id · topic · title · sort | pending: PK video_id · youtube_url · status (pending|approved)", "318+ videos") +
    tbl("documents & document_leads", "documents: PK id · doc_type · folder_path · access_mode · bundle_product_id · downloads | leads: FK document_id · contact", "1 -> N leads") +
    tbl("qr_codes", "PK id · slug (UQ) · target_url · fg/bg_color · positions · target_post/product_ids · scans · active", "Shortlink /q/[slug]")
  );

  const d3 = domainBox(
    "3. Đơn hàng, POS, Kho vận & Quỹ (9 bảng)",
    "#b45309", "#fffbeb", "#fcd34d",
    tbl("provinces & wards", "provinces(PK code, name: 34) -> wards(PK code, FK province_code, name: 3.321)", "1 -> N wards") +
    tbl("orders & order_items", "orders: PK id · code (UQ) · phone · status (6 tt) · payment · coupon_code · shipping_* · kiotviet_order_id | items: FK order_id · product_id · price · qty", "1 -> N items") +
    tbl("coupons", "PK id · code (UQ) · type (percent|fixed) · value · min_order · max_discount · member_only · used_count · active", "Dùng tại Checkout") +
    tbl("inventory_movements", "PK id · product_id · change_qty · stock_after · unit_cost · reason (7 loại) · ref_code · created_by", "Thẻ kho lịch sử") +
    tbl("cashbook_entries, suppliers & delivery_partners", "cashbook: entry_type (in|out) · payment_method (cash|bank|kiotviet) · amount | suppliers (5+) · delivery_partners (6+)", "Sổ quỹ 3 Quỹ")
  );

  const d4 = domainBox(
    "4. Quản trị, Thành viên, CRM & Loyalty (15 bảng)",
    "#6b21a8", "#faf5ff", "#d8b4fe",
    tbl("admins & admin_sessions", "admins: PK id · email (UQ) · phone (UQ) · role (4 cấp) · salt/hash | sessions: PK token · FK admin_id · expires_at", "RBAC 7 ngày") +
    tbl("members & member_sessions", "members: PK id · email (UQ) · phone · tier · points | member_sessions: PK token · FK member_id · expires_at", "Auth 30 ngày") +
    tbl("member_profiles & point_transactions", "profiles: PK id · user_id · current/lifetime_points · tier · status · merged_into_id · referral_code · total_orders/spent | tx: FK member_id · source (14) · ref_type/id", "Sổ cái Hợp nhất") +
    tbl("point_rules, reward_catalog, reward_redemptions", "rules: code · points_formula | catalog: type · points_cost · stock · min_tier | redemptions: FK member_id · FK reward_id · coupon_code · fulfillment_status", "Đổi quà Atomic") +
    tbl("referrals, daily_login_streaks & newsletter", "referrals: referrer_id · referee_id · status | streaks: member_id · current/best_streak | newsletter_subscribers: email · status", "Gamification") +
    tbl("crm_notes, crm_customer_tags & crm_automation_logs", "notes: customer_key · next_followup_date · followup_done | tags: (customer_key, tag) | logs: (order_id, step_code)", "RFM +3/+25 ngày")
  );

  const d5 = domainBox(
    "5. Hệ sinh thái AI, Tư vấn & Import (6 bảng)",
    "#0f766e", "#f0fdfa", "#5eead4",
    tbl("quick_consultations", "PK id · customer_name · phone · audience · height_cm · weight_kg · needs/conditions/habits/diet_recall_json · article_html · share_token · expert_report_html · booking_*", "Hồ sơ /ho-so-tu-van/") +
    tbl("quick_consult_cache", "PK cache_key (SHA-256) · article_html · hit_count · created_at", "Cache AI 14 ngày") +
    tbl("lab_analyses", "PK id · patient_name · file_mime · file_base64 (xóa khi done) · raw_text · status · summary · analysis_html · started_at", "Worker hồi phục 3p") +
    tbl("post_import_jobs", "PK id · source_url · extra_urls · status (7 tt) · step_cursor · locked_until (40s) · research_json · policy_audit_json · draft_json · post_id", "Lease lock 40s") +
    tbl("product_import_jobs", "PK id · source_url · product_id · status (7 tt) · step_cursor · locked_until (35s) · raw_payload · normalized_payload · working_images", "Lease lock 35s") +
    tbl("consultation_requests", "PK id · name · phone · question · page_url · status (new|done)", "Widget Hỏi nhanh")
  );

  const d6 = domainBox(
    "6. Cấu hình Hệ thống, Media & Chỉ mục (3 bảng + Indexes)",
    "#334155", "#f8fafc", "#cbd5e1",
    tbl("settings (Key-Value JSON & Config Store)", "PK key · value | Lưu: Brand/SMTP/Widget, gemini_api_key, ai_motifs_json, medical_compliance_policy, expert_consult_config, kiotviet_*, flash_sale_*, social_links_config, ui_themes_config, sitemap_config, youtube_sync_config, invoice_print_config_json", "15+ nhóm cấu hình") +
    tbl("media_files (r2-storage fallback)", "PK path · mime · data_base64 · created_at", "Phục vụ /api/media/[...path]") +
    tbl("media_assets (media-assets fallback)", "PK slug · mime_type · data_base64 · created_at", "Phục vụ /api/media/[slug]") +
    `<div style="background:#e2e8f0;border-radius:7px;padding:6px 8px;margin-top:4px;font-size:10px;color:#1e293b;line-height:1.35;">
      <strong>18 Composite Indexes (migrations/0002_performance_indexes.sql):</strong><br/>
      • Catalog: <span class="mono">idx_products_cat_pub_feat</span>, <span class="mono">idx_comments_product_id</span><br/>
      • Orders & Sessions: <span class="mono">idx_orders_phone_created</span>, <span class="mono">idx_orders_status_created</span>, <span class="mono">idx_admin/member_sessions_expires</span><br/>
      • Loyalty & CRM: <span class="mono">idx_member_profiles_phone/email/user_status</span>, <span class="mono">idx_point_transactions_member_created</span>
    </div>
    <div style="background:#e6f4ea;border:1px solid #86efac;border-radius:7px;padding:6px 8px;margin-top:5px;font-size:10px;color:#14532d;line-height:1.35;">
      <strong>Liên kết Khóa ngoại Liên miền (Cross-Domain Links):</strong><br/>
      • <span class="mono">orders.coupon_code</span> &lt;-&gt; <span class="mono">coupons.code</span> / <span class="mono">reward_redemptions</span><br/>
      • <span class="mono">orders.phone/email</span> -&gt; <span class="mono">member_profiles</span> -&gt; <span class="mono">crm_notes/tags</span><br/>
      • <span class="mono">documents.bundle_product_id</span> -&gt; <span class="mono">products.id</span><br/>
      • <span class="mono">post_import_jobs.post_id</span> -&gt; <span class="mono">posts.id</span> · <span class="mono">product_import_jobs.product_id</span> -&gt; <span class="mono">products.id</span>
    </div>`
  );

  const bodyHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px;">
      ${d1}${d2}${d3}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
      ${d4}${d5}${d6}
    </div>`;

  return wrapDoc({
    height: 890,
    title: "Sơ đồ Thực thể Quan hệ Cơ sở Dữ liệu Cloudflare D1 (Database ERD)",
    subtitle: "Toàn bộ 48 bảng/thực thể (phát sinh từ baseline schema + ensure*Schema() + migrations/) phân theo 6 miền nghiệp vụ",
    tag: "D1 DATABASE ERD",
    legend: [
      { label: "Sản phẩm & Sale", bg: "#f0fdf4", border: "#86efac" },
      { label: "CMS & Marketing", bg: "#eff6ff", border: "#93c5fd" },
      { label: "Bán lẻ & Kho vận", bg: "#fffbeb", border: "#fcd34d" },
      { label: "CRM & Loyalty", bg: "#faf5ff", border: "#d8b4fe" },
      { label: "AI & Hàng đợi Job", bg: "#f0fdfa", border: "#5eead4" },
      { label: "Settings & Media", bg: "#f8fafc", border: "#cbd5e1" },
    ],
    footerNote: "Nguồn: lib/db.ts, lib/retail-ops.ts, lib/loyalty.ts, lib/crm.ts, lib/post/product-importer.ts, migrations/0001 & 0002",
    bodyHtml,
  });
}

// =========================================================================
// 4. URL Routing & Multilayer Caching (1400 x 840)
// =========================================================================
function buildDiagram04() {
  const stepBox = (num, title, desc, bg, bd, tc) => `
    <div style="background:${bg};border:1.5px solid ${bd};border-radius:8px;padding:7px 10px;">
      <div style="font-size:11.5px;font-weight:800;color:${tc};">${num} ${title}</div>
      <div style="font-size:10.5px;color:#334155;margin-top:2px;line-height:1.35;">${desc}</div>
    </div>`;

  const bodyHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;height:100%;">
      <!-- Left: URL Routing -->
      <div style="border:1.5px solid #86efac;border-radius:12px;padding:10px 12px;background:#f9fefb;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;font-weight:800;color:#137333;">1. Phân giải Định tuyến URL (Tương thích LoveItop)</span>
            <span class="pill" style="background:#dcfce7;color:#166534;">trailingSlash: true + skipTrailingSlashRedirect</span>
          </div>
          <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:7px 10px;margin-bottom:8px;font-size:11px;">
            <strong>Single Source of Truth (<span class="mono">lib/data.ts -&gt; url.*</span>):</strong><br/>
            Danh sách kết thúc bằng <span class="mono">/</span> · Chi tiết kết thúc bằng <span class="mono">.html</span> · Cart/Checkout/API không có dấu gạch chéo bắt buộc (lưu ý POST cần trailing <span class="mono">/</span>).
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${stepBox("Ưu tiên 1:", "Tuyến Tĩnh Tường minh (Static Segments)",
              "<span class='mono'>/</span> (Home) · <span class='mono'>/san-pham/</span> · <span class='mono'>/canh-duong-sinh/</span> · <span class='mono'>/cart</span> · <span class='mono'>/checkout</span> · <span class='mono'>/search/</span> · <span class='mono'>/tu-van-nhanh/</span> · <span class='mono'>/thanh-vien/</span> · <span class='mono'>/tra-cuu-don-hang/</span> · <span class='mono'>/so-do-trang.html</span> · <span class='mono'>/sitemap.xml</span> · <span class='mono'>/robots.txt</span>",
              "#e6f4ea", "#4ade80", "#14532d")}
            ${stepBox("Ưu tiên 2:", "Tuyến Động Chức năng & Theo dõi Chuyển hướng",
              "<span class='mono'>/san-pham/[category]/</span> · <span class='mono'>/san-pham/[category]/[product].html</span> · <span class='mono'>/ho-so-tu-van/[token]/</span> · <span class='mono'>/q/[slug]</span> (tăng scans + 302) · <span class='mono'>/go/social/[id]</span> (đếm clicks + UTM + 302)",
              "#eff6ff", "#60a5fa", "#1e3a8a")}
            ${stepBox("Ưu tiên 3:", "Bộ phân giải 1 Cấp app/[section]/page.tsx",
              "Kết thúc <span class='mono'>.html</span> -&gt; <span class='mono'>getPage('', slug)</span> (VD: /gioi-thieu.html).<br/>Ngược lại -&gt; <span class='mono'>getPostSection(section)</span>; riêng <span class='mono'>/thu-vien/</span> hiển thị <span class='mono'>&lt;VideoLibrary /&gt;</span>.",
              "#fef7e0", "#fbbf24", "#92400e")}
            ${stepBox("Ưu tiên 4:", "Bộ phân giải 2 Cấp app/[section]/[slug]/page.tsx",
              "Có <span class='mono'>.html</span>: Ưu tiên <span class='mono'>getPage(first, slug)</span> (/chinh-sach/*.html) trước, sau đó fallback <span class='mono'>getPost(first, slug)</span> (URL bài viết ngắn).<br/>Không <span class='mono'>.html</span>: <span class='mono'>/thu-vien/tai-lieu-thuc-duong/</span> -&gt; <span class='mono'>&lt;DocumentLibrary /&gt;</span>, <span class='mono'>/thu-vien/bai-giang-thuc-duong/</span> -&gt; Trigger YouTube Sync + <span class='mono'>&lt;VideoLibrary /&gt;</span>.",
              "#fff7ed", "#fb923c", "#9a3412")}
            ${stepBox("Ưu tiên 5:", "Tuyến Chuẩn Canonical 3 Cấp [section]/[slug]/[post]",
              "URL chuẩn <span class='mono'>/&lt;section&gt;/&lt;category&gt;/&lt;slug&gt;.html</span>: xuất JSON-LD <span class='mono'>Article</span>, canonical URL, OpenGraph và nhúng <span class='mono'>&lt;ArticleReadTracker /&gt;</span> cộng +2 điểm Loyalty.",
              "#faf5ff", "#c084fc", "#6b21a8")}
          </div>
        </div>
        <div style="font-size:10.5px;color:#475569;margin-top:6px;padding-top:5px;border-top:1px dashed #cbd5e1;">
          Tất cả 22 Public/Webhook API routes (<span class="mono">/api/v2/*</span>, <span class="mono">/api/data-checkout</span>, <span class="mono">/load-comment</span>...) giữ nguyên đường dẫn tương thích LoveItop.
        </div>
      </div>

      <!-- Right: Multi-layer Caching -->
      <div style="border:1.5px solid #93c5fd;border-radius:12px;padding:10px 12px;background:#f8fbff;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;font-weight:800;color:#1d4ed8;">2. Kiến trúc Caching Đa tầng & Vô hiệu hóa Theo Tag</span>
            <span class="pill" style="background:#dbeafe;color:#1e40af;">Regional KV TTL 300s</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${stepBox("Tầng 1: HTTP / Browser / CDN Cache", "Phản hồi theo loại tài nguyên",
              "• <span class='mono'>/api/media/*</span>: <span class='mono'>public, max-age=31536000, immutable</span> (+ ETag 304 trên [slug])<br/>• <span class='mono'>/uploads/*</span>: 30 ngày + SWR 1 ngày · <span class='mono'>/sitemap.xml</span>: 300s · <span class='mono'>/robots.txt</span>: 3600s<br/>• <span class='mono'>/api/v2/cart-summary</span>, <span class='mono'>session-summary</span>, <span class='mono'>health</span>: <span class='mono'>no-store</span>",
              "#ffffff", "#93c5fd", "#1e3a8a")}
            ${stepBox("Tầng 2: Client Memory & SessionStorage Cache", "Giảm gọi API lặp trên trình duyệt",
              "• <span class='mono'>HeaderAccountCart</span>: cache giỏ/tên thành viên 45 giây + gộp inflight.<br/>• <span class='mono'>FrontendAdminProvider</span>: cache ngữ cảnh Admin 180 giây trong <span class='mono'>sessionStorage</span>.<br/>• <span class='mono'>DocumentLibrary</span> &amp; <span class='mono'>ThemeSwitcher</span>: lưu trạng thái tại <span class='mono'>localStorage</span>.",
              "#ffffff", "#93c5fd", "#1e3a8a")}
            ${stepBox("Tầng 3: SSR Root Layout & React Request Cache", "Lưu ý hành vi force-dynamic thực tế",
              "• <span class='mono'>app/layout.tsx</span> đặt <span class='mono'>export const dynamic = 'force-dynamic'</span> để luôn đọc Theme/Widget mới nhất, do đó vô hiệu hóa ISR cấp trang (<span class='mono'>revalidate = 60/300</span> ở trang con).<br/>• <span class='mono'>React cache()</span> khử trùng lặp truy vấn trùng trong cùng 1 request SSR.",
              "#fef2f2", "#fca5a5", "#991b1b")}
            ${stepBox("Tầng 4: Next.js Data Cache (unstable_cache) + Cloudflare KV", "open-next.config.ts + lib/cache-tags.ts",
              "• Lưu trên <span class='mono'>NEXT_INC_CACHE_KV</span> kèm <span class='mono'>withRegionalCache</span> (mode long-lived 300s).<br/>• Đang cache: <span class='mono'>settings</span> (60s), <span class='mono'>product_categories</span> (60s), <span class='mono'>post_sections/categories</span> (120s), <span class='mono'>pages</span> (120s), <span class='mono'>videos/topics</span> (120s), <span class='mono'>documents</span> (120s).<br/>• Truy vấn <span class='mono'>products/posts/blocks/flashSale</span> hiện đọc trực tiếp D1 mỗi request.",
              "#f0fdf4", "#4ade80", "#166534")}
            ${stepBox("Cơ chế Vô hiệu hóa: invalidateStorefront(...tags)", "9 Tag tập trung trong lib/cache-tags.ts",
              "Tags: <span class='mono'>site, categories, products, posts, pages, videos, documents, blocks, flashSale</span>.<br/>Khi Admin lưu dữ liệu -&gt; gọi <span class='mono'>revalidateTag(tag, 'max')</span> + <span class='mono'>revalidatePath('/', 'layout')</span>.",
              "#fef7e0", "#fbbf24", "#92400e")}
          </div>
        </div>
        <div style="font-size:10.5px;color:#475569;margin-top:6px;padding-top:5px;border-top:1px dashed #cbd5e1;">
          Ngoài ra <span class="mono">quick_consult_cache</span> trong D1 lưu kết quả AI Tư vấn nhanh theo SHA-256 trong 14 ngày.
        </div>
      </div>
    </div>`;

  return wrapDoc({
    height: 750,
    title: "Sơ đồ Định tuyến URL Tương thích LoveItop & Kiến trúc Caching Đa tầng",
    subtitle: "Cơ chế ưu tiên phân giải đường dẫn App Router và luồng bộ nhớ đệm qua Browser, Edge KV, React cache() và D1",
    tag: "ROUTING & CACHING",
    legend: [
      { label: "Ưu tiên tuyến tĩnh / Storefront", bg: "#e6f4ea", border: "#4ade80" },
      { label: "Dynamic Resolution & HTTP Cache", bg: "#eff6ff", border: "#60a5fa" },
      { label: "Lưu ý force-dynamic", bg: "#fef2f2", border: "#fca5a5" },
      { label: "Tag Invalidation", bg: "#fef7e0", border: "#fbbf24" },
    ],
    footerNote: "Nguồn: next.config.ts, open-next.config.ts, lib/cache-tags.ts, lib/data.ts, app/[section]/**, app/layout.tsx",
    bodyHtml,
  });
}

// =========================================================================
// 5. Checkout, Order Lifecycle, POS & KiotViet Flow (1400 x 920)
// =========================================================================
function buildDiagram05() {
  const node = (title, sub, bg, bd, tc) => `
    <div style="background:${bg};border:1.5px solid ${bd};border-radius:9px;padding:8px 9px;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:11.5px;font-weight:800;color:${tc};line-height:1.2;">${title}</div>
      <div style="font-size:10px;color:#334155;margin-top:3px;line-height:1.35;">${sub}</div>
    </div>`;

  const rArrow = `<div style="display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 20 20"><path d="M2 10 L16 10 M11 5 L17 10 L11 15" stroke="#137333" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <!-- Top: Atomic Checkout Pipeline -->
      <div style="border:1.5px solid #4ade80;border-radius:12px;padding:10px 12px;background:#f4fbf6;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12.5px;font-weight:800;color:#14532d;">A. Luồng Đặt hàng Online & Trừ kho Nguyên tử (POST /api/data-checkout)</span>
          <span class="pill" style="background:#dcfce7;color:#166534;">Rate Limit: 10 req/phút/IP · Idempotency: TTL 10 phút</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 22px 1fr 22px 1.15fr 22px 1.15fr 22px 1fr;align-items:stretch;">
          ${node("1. Giỏ & Khuyến mãi", "Cookie <span class='mono'>cart</span> (max 999)<br/>Flash Sale > sale_price<br/>Coupon + Giảm hạng thẻ (Silver 3%, Gold 5%, Diamond 7%)", "#ffffff", "#86efac", "#166534")}
          ${rArrow}
          ${node("2. Kiểm tra Hợp lệ", "SĐT <span class='mono'>0\\d{9,10}</span><br/>Xác thực Tỉnh/Phường trong <span class='mono'>wards</span><br/>Kiểm Idempotency-Key trong bộ nhớ Isolate", "#ffffff", "#86efac", "#166534")}
          ${rArrow}
          ${node("3. Trừ kho Nguyên tử", "<span class='mono'>UPDATE products SET stock = stock - ? WHERE id = ? AND stock &gt;= ?</span><br/>Nếu 1 dòng thiếu kho -&gt; hoàn bù các dòng trước đó", "#fef7e0", "#fbbf24", "#92400e")}
          ${rArrow}
          ${node("4. Batch Ghi DB", "Mã <span class='mono'>DH&lt;ts&gt;&lt;hex&gt;</span><br/>Insert <span class='mono'>orders</span> + <span class='mono'>order_items</span><br/>Tăng <span class='mono'>flash_sale_items.sold</span> &amp; <span class='mono'>coupons.used_count</span><br/>Bù kho nếu batch lỗi", "#ffffff", "#60a5fa", "#1d4ed8")}
          ${rArrow}
          ${node("5. Hậu xử lý & VietQR", "Liên kết <span class='mono'>member_profiles</span><br/>Xóa cookie <span class='mono'>cart</span><br/>Gửi SMTP via <span class='mono'>ctx.waitUntil</span><br/>Hiện VietQR BIDV 8610312888", "#eff6ff", "#60a5fa", "#1d4ed8")}
        </div>
      </div>

      <!-- Middle: Order State Machine -->
      <div style="border:1.5px solid #93c5fd;border-radius:12px;padding:10px 12px;background:#f8fbff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:12.5px;font-weight:800;color:#1e3a8a;">B. Máy Trạng thái Vòng đời Đơn hàng (6 Trạng thái) & Hệ quả Liên hoàn</span>
          <span class="pill" style="background:#dbeafe;color:#1e40af;">lib/admin-data.ts · app/admin/_actions/orders.ts</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 22px 1fr 22px 1fr 22px 1.25fr 18px 1.25fr;align-items:stretch;">
          ${node("Mới (new)", "Đơn web mới tạo.<br/>Hiển thị badge đỏ trên menu Admin.<br/>Đã trừ tồn kho web.", "#e0f2fe", "#38bdf8", "#0369a1")}
          ${rArrow}
          ${node("Đã xác nhận (confirmed)", "Đã gọi xác nhận.<br/>Tạo từ POS nếu chọn thu COD.<br/>Có thể gắn ĐVVC (6 đối tác).", "#eef2ff", "#818cf8", "#3730a3")}
          ${rArrow}
          ${node("Đang giao (shipping)", "Theo dõi <span class='mono'>shipping_status</span>:<br/>picked -&gt; shipping -&gt; delivered.<br/>Cập nhật mã vận đơn &amp; COD.", "#fef7e0", "#fbbf24", "#b45309")}
          ${rArrow}
          ${node("Hoàn thành (done)", "Gọi <span class='mono'>onOrderStatusChanged</span>:<br/>• Cộng điểm Loyalty (<span class='mono'>purchase</span>)<br/>• Mở khóa thưởng giới thiệu<br/>• Đưa vào hàng chờ CRM +3/+25d", "#dcfce7", "#22c55e", "#15803d")}
          <div></div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${node("Trả hàng (returned)", "Nút <span class='mono'>returnOrderAction</span>:<br/>Cộng hoàn kho thẻ <span class='mono'>TH-</span> + Phiếu chi hoàn tiền 3 Quỹ.", "#fff1f2", "#fb7185", "#be123c")}
            ${node("Đã hủy (cancelled)", "Hoàn kho <span class='mono'>reason=cancel</span>.<br/>Nếu từ <span class='mono'>done</span> -&gt; hủy: trừ hoàn điểm Loyalty.", "#fee2e2", "#f87171", "#991b1b")}
          </div>
        </div>
      </div>

      <!-- Bottom: POS, Inventory, 3-Fund Cashbook & KiotViet Sync -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
        <div style="border:1.5px solid #fbbf24;border-radius:10px;padding:9px 11px;background:#fffdf5;">
          <div style="font-size:12px;font-weight:800;color:#b45309;margin-bottom:5px;">C. Bán hàng POS & In Hóa đơn KiotViet</div>
          <div style="font-size:10.5px;color:#334155;line-height:1.42;">
            • <span class="mono">/admin/pos/</span>: Tìm theo tên/SKU, giảm giá VNĐ, thanh toán Tiền mặt / CK Ngân hàng / Theo KiotViet / COD.<br/>
            • Tự sinh mã <span class="mono">TD-POS-xxxxxx</span>, ghi Thẻ kho (<span class="mono">sale</span>) và tự lập Phiếu Thu vào đúng Quỹ tương ứng.<br/>
            • <span class="mono">KiotVietInvoicePrintStudio</span>: 4 khổ giấy (A5 Dọc/Ngang, A4, K80), 16 block bật/tắt, đọc tiền chữ tiếng Việt, QR VietQR tự điền số tiền.
          </div>
        </div>
        <div style="border:1.5px solid #f59e0b;border-radius:10px;padding:9px 11px;background:#fffbeb;">
          <div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:5px;">D. Kho vận 5 Tab, Sổ quỹ 3 Quỹ & Báo cáo EOD</div>
          <div style="font-size:10.5px;color:#334155;line-height:1.42;">
            • <span class="mono">inventory_movements</span>: Theo dõi 7 lý do (<span class="mono">import, stocktake, sale, cancel, kiotviet_sync, internal_use, damage</span>).<br/>
            • <span class="mono">cashbook_entries</span>: Tách biệt 3 Quỹ (<span class="mono">cash</span>, <span class="mono">bank</span>, <span class="mono">kiotviet</span>), tự tạo Phiếu Chi khi nhập hàng NCC.<br/>
            • Báo cáo cuối ngày (EOD): Doanh thu thuần, Giá vốn COGS, Lãi gộp &amp; tỷ suất %, Đối soát thu chi 3 Quỹ.
          </div>
        </div>
        <div style="border:1.5px solid #60a5fa;border-radius:10px;padding:9px 11px;background:#f8fbff;">
          <div style="font-size:12px;font-weight:800;color:#1d4ed8;margin-bottom:5px;">E. Đồng bộ KiotViet 2 Chiều & CRM / Loyalty</div>
          <div style="font-size:10.5px;color:#334155;line-height:1.42;">
            • <strong>API OAuth2:</strong> Đẩy đơn Web -&gt; KiotViet (<span class="mono">POST /orders</span>) &amp; Kéo tồn kho (<span class="mono">GET /products</span> 100 SP/trang).<br/>
            • <strong>Webhook & Excel:</strong> <span class="mono">/api/kiotviet/webhook</span> cập nhật tồn kho realtime; Bộ parse <span class="mono">.xlsx</span> ZIP thuần (<span class="mono">node:zlib</span>) không cần thư viện ngoài.<br/>
            • <strong>CRM & Loyalty:</strong> Phân loại 5 nhóm RFM (<span class="mono">vip, refill_due, at_risk, new_buyer, lead</span>), Zalo 1 chạm, giữ khách khỏi thất thoát sàn TMĐT.
          </div>
        </div>
      </div>
    </div>`;

  return wrapDoc({
    height: 770,
    title: "Luồng Checkout Nguyên tử, Vòng đời Đơn hàng, Kho vận POS & Tích hợp KiotViet",
    subtitle: "Cơ chế bảo toàn tồn kho khi đặt hàng đồng thời, 6 trạng thái xử lý đơn, Sổ quỹ 3 Quỹ và đồng bộ 2 chiều với KiotViet / CRM / Loyalty",
    tag: "RETAIL & ORDER FLOW",
    legend: [
      { label: "Checkout & Trạng thái hoàn thành", bg: "#dcfce7", border: "#4ade80" },
      { label: "Thẻ kho & Giao vận", bg: "#fef7e0", border: "#fbbf24" },
      { label: "Trả hàng / Hủy đơn", bg: "#fee2e2", border: "#f87171" },
      { label: "Tích hợp KiotViet & VietQR", bg: "#eff6ff", border: "#60a5fa" },
    ],
    footerNote: "Nguồn: app/api/data-checkout/route.ts, app/admin/_actions/orders.ts, lib/retail-ops.ts, lib/kiotviet*.ts, lib/crm.ts, lib/loyalty*.ts",
    bodyHtml,
  });
}

// =========================================================================
// 6. AI 3-Layer Architecture & Idle Queue (1400 x 900)
// =========================================================================
function buildDiagram06() {
  const card = (title, items, bg, bd, tc) => `
    <div style="background:${bg};border:1.5px solid ${bd};border-radius:9px;padding:7px 10px;">
      <div style="font-size:11.5px;font-weight:800;color:${tc};margin-bottom:3px;">${title}</div>
      <div style="font-size:10.5px;color:#1e293b;line-height:1.38;">${items.map((x) => `<div>• ${x}</div>`).join("")}</div>
    </div>`;

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <!-- Layer 1 -->
      <div style="border:1.5px solid #4ade80;border-radius:12px;padding:8px 10px;background:#f4fbf6;">
        <div style="font-size:11.5px;font-weight:800;color:#15803d;text-transform:uppercase;margin-bottom:6px;">Tầng 1: Cấu hình Prompt, Nhân vật Chuyên gia & Động cơ Tuân thủ Pháp lý Y tế (D1 settings)</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
          ${card("8 Motif Bài viết (lib/ai-motifs.ts)", [
            "duyvo, deep_research, youtube_lecture",
            "gdocs_handbook, step_by_step, storytelling",
            "medical_wfpb, seo_conversion + custom JSON",
          ], "#ffffff", "#86efac", "#166534")}
          ${card("Tuân thủ Pháp luật & YMYL", [
            "Luật Quảng cáo VN, NĐ 15/2018, TT 09/2015",
            "Google YMYL E-E-A-T & YouTube Medical",
            "5 regex mặc định (tới 20), tự cập nhật 7 ngày",
          ], "#fef7e0", "#fbbf24", "#92400e")}
          ${card("Miễn trừ Y khoa (3 Văn phong)", [
            "gemini_standard, warm_senior, legal_strict",
            "Vị trí: bottom / top / both + custom text",
            "Hiển thị ở Web, PDF /ho-so-tu-van/ & Email",
          ], "#ffffff", "#86efac", "#166534")}
          ${card("Cấu hình Tư vấn Nhanh", [
            "4 đối tượng (trẻ em, trưởng thành, bệnh lý, cao tuổi)",
            "3 phong cách Chuyên gia & 4 gói đặt lịch",
            "Asian BMI (<18.5 / 18.5-22.9 / >=23 / >=25)",
          ], "#ffffff", "#86efac", "#166534")}
        </div>
      </div>

      <div style="display:flex;justify-content:center;align-items:center;gap:10px;height:18px;">
        <span style="font-size:10.5px;font-weight:700;color:#6b21a8;background:#f3e8ff;padding:1px 10px;border-radius:999px;border:1px solid #d8b4fe;">Prompt Injection Guard (guardUserPromptInput) + Tiền xử lý HTML/SĐT/Domain thuần TypeScript</span>
      </div>

      <!-- Layer 2 -->
      <div style="border:2px solid #a855f7;border-radius:12px;padding:9px 10px;background:#fdfaff;">
        <div style="font-size:11.5px;font-weight:800;color:#6b21a8;text-transform:uppercase;margin-bottom:6px;">Tầng 2: Hợp nhất AI Gateway (lib/gemini-key.ts) & Tối ưu Chi phí Token</div>
        <div style="display:grid;grid-template-columns:1fr 1.15fr 1.15fr 1fr;gap:10px;">
          ${card("Phân giải Khóa & Fallback", [
            "1. Request overrideKey (AIza* / AQ.*)",
            "2. D1 settings.gemini_api_key",
            "3. Biến môi trường GEMINI_API_KEY",
            "Deterministic TS fallback khi thiếu key",
          ], "#ffffff", "#d8b4fe", "#5b21b6")}
          ${card("Kỹ thuật Tiết kiệm Token", [
            "Loại script/style/SĐT/domain nguồn trước khi gửi",
            "JSON Schema cố định giảm token thừa",
            "Image Pre-filter: chỉ tái tạo khi HAS_WATERMARK",
            "quick_consult_cache SHA-256 TTL 14 ngày",
          ], "#ffffff", "#d8b4fe", "#5b21b6")}
          ${card("Định tuyến Model Gemini", [
            "Text/Rewrite: gemini-2.5-flash -&gt; flash-latest",
            "Image Studio: 3.1-flash -&gt; 3-pro -&gt; 2.5-flash-image",
            "Importer Img: 2.5-flash-image -&gt; 2.0-exp",
            "Lab OCR (gọi thẳng): gemini-3.8-flash",
          ], "#ffffff", "#d8b4fe", "#5b21b6")}
          ${card("Phương án Ảnh 0 Đồng", [
            "Nếu model sinh ảnh lỗi / hết quota:",
            "Gemini Vision đề xuất thông số chỉnh màu",
            "HTML5 Canvas + Unsharp Mask 3x3 tại trình duyệt",
            "Xuất WebP 0.9 &amp; đồng bộ URL toàn DB",
          ], "#eff6ff", "#93c5fd", "#1d4ed8")}
        </div>
      </div>

      <div style="display:flex;justify-content:center;align-items:center;gap:10px;height:18px;">
        <span style="font-size:10.5px;font-weight:700;color:#0f766e;background:#ccfbf1;padding:1px 10px;border-radius:999px;border:1px solid #5eead4;">Tránh quá tải Quota Gemini & Giới hạn CPU Time trên Cloudflare Workers</span>
      </div>

      <!-- Layer 3 -->
      <div style="display:grid;grid-template-columns:0.95fr 1.25fr;gap:12px;">
        <div style="border:1.5px solid #fb923c;border-radius:12px;padding:9px 11px;background:#fffaf5;">
          <div style="font-size:11.5px;font-weight:800;color:#c2410c;text-transform:uppercase;margin-bottom:6px;">Tầng 3A: Hàng đợi Client (AiIdleQueueProvider)</div>
          ${card("Xếp hàng Tuần tự tại Trình duyệt (/admin/*)", [
            "Cơ chế FIFO nghiêm ngặt với concurrency = 1 (processingRef)",
            "Nghỉ giữa 2 việc 900ms + window.requestIdleCallback(timeout 1300ms)",
            "Tự học ETA thực tế bằng EMA (0.65 * cũ + 0.35 * mới) lưu localStorage",
            "Hiển thị pill nổi góc dưới trái + thanh trạng thái inline từng nút",
            "Dùng bởi: AiImageRegenerateModal, ProductDescriptionAiPanel, ProductImporterClient (clean_data)",
          ], "#ffffff", "#fdba74", "#9a3412")}
        </div>
        <div style="border:1.5px solid #14b8a6;border-radius:12px;padding:9px 11px;background:#f2fcfa;">
          <div style="font-size:11.5px;font-weight:800;color:#0f766e;text-transform:uppercase;margin-bottom:6px;">Tầng 3B: D1 Lease-Locked Idle Workers (Tác vụ Nặng Chia bước)</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${card("Post Importer (40s Lease)", [
              "post_import_jobs (step_cursor)",
              "Step 0: Crawl Web/YT -&gt; Brief",
              "Step 1: Viết SEO + Compliance",
              "Step 2+: Sinh 1 ảnh AI / tick",
              "UI poll 1400ms / x-idle-secret",
            ], "#ffffff", "#5eead4", "#0f766e")}
            ${card("Product Importer (35s Lease)", [
              "product_import_jobs (tối đa 20 link)",
              "Fetch 0-token &amp; quét dấu vết cũ",
              "Step 0: Tẩy HTML/SĐT/Domain",
              "Step 1+: Lọc/tái tạo 1 ảnh / tick",
              "UI poll 1200ms + Check Diff",
            ], "#ffffff", "#5eead4", "#0f766e")}
            ${card("Lab Analysis (3p Recovery)", [
              "lab_analyses (Ảnh/PDF tới 6MB)",
              "Thu thập giọng nói vi-VN",
              "ctx.waitUntil() + Idle 2500ms",
              "Gemini 3.8 OCR + 5 mục chuẩn y khoa",
              "Xóa file_base64 sau khi done",
            ], "#ffffff", "#5eead4", "#0f766e")}
          </div>
        </div>
      </div>
    </div>`;

  return wrapDoc({
    height: 740,
    title: "Kiến trúc AI 3 Tầng, Hàng đợi Tuần tự & Idle Worker Khóa Lease D1",
    subtitle: "Cách hệ thống kết hợp cấu hình tuân thủ pháp lý, bộ lọc tiết kiệm token, hàng đợi client và máy trạng thái chia bước trên Worker",
    tag: "3-LAYER AI ENGINE",
    legend: [
      { label: "Prompt & Tuân thủ Pháp lý", bg: "#f4fbf6", border: "#4ade80" },
      { label: "AI Gateway & Token Opt", bg: "#fdfaff", border: "#a855f7" },
      { label: "Client Idle Queue", bg: "#fffaf5", border: "#fb923c" },
      { label: "Server D1 Lease Workers", bg: "#f2fcfa", border: "#14b8a6" },
    ],
    footerNote: "Nguồn: .agents/skills/thucduong-ai-architecture/SKILL.md, lib/gemini-key.ts, AiIdleQueueProvider.tsx, lib/*-importer.ts, lib/lab-analysis.ts",
    bodyHtml,
  });
}

// =========================================================================
// 7. Security Defense-in-Depth, RBAC & Media Pipeline (1400 x 880)
// =========================================================================
function buildDiagram07() {
  const rbacRows = [
    ["system_settings, admin_accounts", "Cho phép", "Chặn (trừ view)", "Chặn", "Chặn"],
    ["coupons_manage, catalog/content_delete", "Cho phép", "Cho phép", "Chặn", "Chặn"],
    ["orders_ops, inventory, members, crm, AI", "Cho phép", "Cho phép", "Chặn", "Cho phép*"],
    ["content_write (Bài, Video, Block, QR, SEO)", "Cho phép", "Cho phép", "Cho phép", "Chặn"],
    ["catalog_write (Sửa SP), comments_moderate", "Cho phép", "Cho phép", "Cho phép", "Cho phép"],
  ];

  const cellStyle = (v) => {
    if (v.startsWith("Cho phép")) return "background:#dcfce7;color:#166534;font-weight:700;";
    if (v.startsWith("Chặn (")) return "background:#fef3c7;color:#92400e;font-weight:700;";
    return "background:#fee2e2;color:#991b1b;font-weight:700;";
  };

  const bodyHtml = `
    <div style="display:grid;grid-template-columns:1.05fr 0.95fr;gap:14px;height:100%;">
      <!-- Left: Security & RBAC -->
      <div style="border:1.5px solid #fca5a5;border-radius:12px;padding:10px 12px;background:#fffafa;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="font-size:12.5px;font-weight:800;color:#b91c1c;margin-bottom:8px;">1. Phòng thủ Bảo mật Đa tầng & Ma trận Phân quyền RBAC</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <div style="background:#ffffff;border:1px solid #fecaca;border-radius:8px;padding:7px 9px;font-size:10.5px;line-height:1.38;">
              <strong style="color:#991b1b;">Lớp 1: HTTP & Rate Limiting</strong><br/>
              • Headers: HSTS, X-Frame SAMEORIGIN, nosniff, CSP <span class="mono">object-src 'none'</span>.<br/>
              • Rate Limiter trượt trong bộ nhớ Isolate (cap 5.000 key): Login Admin (8/5p), Checkout (10/1p), Member Auth (12/5p), Tra cứu (15/5p), Quick Consult (6/5p), Loyalty Earn (20/5p).
            </div>
            <div style="background:#ffffff;border:1px solid #fecaca;border-radius:8px;padding:7px 9px;font-size:10.5px;line-height:1.38;">
              <strong style="color:#991b1b;">Lớp 2: Auth & Session Cookies</strong><br/>
              • Admin (<span class="mono">lib/auth.ts</span>): <span class="mono">scrypt</span> 64B + salt 16B, <span class="mono">timingSafeEqual</span>, TTL 7 ngày.<br/>
              • Member (<span class='mono'>member-auth.ts</span>): <span class='mono'>scryptSync</span> 64B, TTL 30 ngày.<br/>
              • Cookies: <span class="mono">HttpOnly, SameSite=Lax, Secure (prod)</span>.<br/>
              • Bảo mật Cron/Idle: <span class="mono">safeEqualSecret()</span>.
            </div>
            <div style="background:#ffffff;border:1px solid #fecaca;border-radius:8px;padding:7px 9px;font-size:10.5px;line-height:1.38;">
              <strong style="color:#991b1b;">Lớp 3: Sanitizer, SSRF & LLM Guard</strong><br/>
              • <span class="mono">assertSafePublicHttpUrl</span> chặn RFC1918, localhost, 169.254.169.254 + <span class="mono">global_fetch_strictly_public</span>.<br/>
              • <span class="mono">guardUserPromptInput</span> lọc jailbreak tiếng Việt/Anh.<br/>
              • <span class="mono">sanitizeHtml</span> / <span class="mono">sanitizeAiHtml</span> lọc script/event/CSS.
            </div>
            <div style="background:#ffffff;border:1px solid #fecaca;border-radius:8px;padding:7px 9px;font-size:10.5px;line-height:1.38;">
              <strong style="color:#991b1b;">Lớp 4: Structured Log & Audit Gaps</strong><br/>
              • <span class="mono">lib/logger.ts</span>: Tự ẩn 11 từ khóa nhạy cảm (<span class="mono">[REDACTED]</span>), giới hạn sâu 4, dài 500.<br/>
              • <strong>Điểm cần vá:</strong> <span class="mono">crm-automation</span> &amp; <span class="mono">kiotviet/webhook</span> mở nếu thiếu secret; 4 API ghi công khai chưa có rate limit.
            </div>
          </div>

          <div style="font-size:11.5px;font-weight:800;color:#7f1d1d;margin-bottom:4px;">Ma trận RBAC: 4 Vai trò x 13 Miền Hành động (lib/rbac.ts)</div>
          <table style="width:100%;border-collapse:collapse;font-size:10px;background:#ffffff;border:1px solid #cbd5e1;">
            <thead>
              <tr style="background:#fee2e2;color:#7f1d1d;">
                <th style="padding:5px 6px;border:1px solid #e2e8f0;text-align:left;">Miền Quyền (AdminActionDomain)</th>
                <th style="padding:5px 6px;border:1px solid #e2e8f0;">Super Admin</th>
                <th style="padding:5px 6px;border:1px solid #e2e8f0;">Admin</th>
                <th style="padding:5px 6px;border:1px solid #e2e8f0;">Editor</th>
                <th style="padding:5px 6px;border:1px solid #e2e8f0;">Sales</th>
              </tr>
            </thead>
            <tbody>
              ${rbacRows
                .map(
                  (r) => `<tr>
                    <td style="padding:5px 6px;border:1px solid #e2e8f0;font-weight:600;" class="mono">${r[0]}</td>
                    <td style="padding:5px 6px;border:1px solid #e2e8f0;text-align:center;${cellStyle(r[1])}">${r[1]}</td>
                    <td style="padding:5px 6px;border:1px solid #e2e8f0;text-align:center;${cellStyle(r[2])}">${r[2]}</td>
                    <td style="padding:5px 6px;border:1px solid #e2e8f0;text-align:center;${cellStyle(r[3])}">${r[3]}</td>
                    <td style="padding:5px 6px;border:1px solid #e2e8f0;text-align:center;${cellStyle(r[4])}">${r[4]}</td>
                  </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        <div style="font-size:10px;color:#64748b;margin-top:5px;">
          * Lưu ý kiểm toán: Sales bị giới hạn tối đa +100 điểm/lần tại CRM. Một số API route hiện mới kiểm tra <span class="mono">currentAdmin()</span> mà chưa kiểm vai trò chi tiết.
        </div>
      </div>

      <!-- Right: Media Pipeline -->
      <div style="border:1.5px solid #5eead4;border-radius:12px;padding:10px 12px;background:#f4fbfa;display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div style="font-size:12.5px;font-weight:800;color:#0f766e;margin-bottom:8px;">2. Đường ống Kiểm duyệt & Lưu trữ Media (R2 / D1 / Edge)</div>
          <div style="display:flex;flex-direction:column;gap:7px;">
            <div style="background:#ffffff;border:1px solid #99f6e4;border-radius:8px;padding:7px 10px;">
              <div style="font-size:11px;font-weight:800;color:#0f766e;">Bước 1: Tiếp nhận & Kiểm tra Định dạng Thật (Magic-Byte)</div>
              <div style="font-size:10.5px;color:#334155;margin-top:2px;line-height:1.38;">
                • Giới hạn <span class="mono">1.5 MB</span> (<span class="mono">lib/uploads.ts</span>), hỗ trợ Ảnh (JPEG, PNG, GIF, WebP, SVG) &amp; Tài liệu (PDF, DOC/DOCX, PPT/PPTX).<br/>
                • <span class="mono">verifyFileMagicBytes()</span> đối chiếu byte đầu (<span class="mono">FFD8FF</span>, <span class="mono">89504E47</span>, <span class="mono">RIFF..WEBP</span>, <span class="mono">%PDF-</span>, <span class="mono">PK</span>, OLE2).<br/>
                • <span class="mono">sanitizeSvgContent()</span> xóa thẻ <span class="mono">script/iframe/foreignObject</span>, <span class="mono">on*=</span>, <span class="mono">javascript:</span>.
              </div>
            </div>

            <div style="background:#ffffff;border:1px solid #99f6e4;border-radius:8px;padding:7px 10px;">
              <div style="font-size:11px;font-weight:800;color:#0f766e;">Bước 2: Đặt tên Nội dung (Content-Addressed SHA-256)</div>
              <div style="font-size:10.5px;color:#334155;margin-top:2px;line-height:1.38;">
                • <span class="mono">buildContentAddressedFilename()</span> băm SHA-256 lấy 16 ký tự hex (64-bit) tránh trùng lặp &amp; đảm bảo tính bất biến cache.
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="background:#e6f4ea;border:1.5px solid #4ade80;border-radius:8px;padding:7px 9px;">
                <div style="font-size:11px;font-weight:800;color:#14532d;">Nhánh A: Structured Uploads</div>
                <div style="font-size:10px;color:#1e293b;margin-top:2px;line-height:1.35;">
                  <span class="mono">lib/r2-storage.ts</span> (Sản phẩm, Bài, Tài liệu)<br/>
                  1. Nếu có R2 <span class="mono">MEDIA_BUCKET</span>: ghi khóa <span class="mono">products/&lt;hash&gt;</span>.<br/>
                  2. Fallback: ghi Base64 vào bảng D1 <span class="mono">media_files</span>.<br/>
                  Phục vụ qua <span class="mono">/api/media/[...path]</span> (không đọc R2!).
                </div>
              </div>
              <div style="background:#eff6ff;border:1.5px solid #60a5fa;border-radius:8px;padding:7px 9px;">
                <div style="font-size:11px;font-weight:800;color:#1d4ed8;">Nhánh B: AI & Importer Media</div>
                <div style="font-size:10px;color:#1e293b;margin-top:2px;line-height:1.35;">
                  <span class="mono">lib/media-assets.ts</span> (Ảnh AI, Importer)<br/>
                  1. Nếu có R2 <span class="mono">MEDIA_BUCKET</span>: ghi khóa <span class="mono">media/&lt;slug&gt;</span>.<br/>
                  2. Fallback: tự tạo bảng D1 <span class="mono">media_assets</span>.<br/>
                  Phục vụ qua <span class="mono">/api/media/[slug]</span> (đọc cả R2 &amp; D1 + ETag 304).
                </div>
              </div>
            </div>

            <div style="background:#ffffff;border:1px solid #99f6e4;border-radius:8px;padding:7px 10px;">
              <div style="font-size:11px;font-weight:800;color:#0f766e;">Bước 3: Tối ưu Ảnh & Phân phối Tĩnh (<span class="mono">lib/image-url.ts</span>)</div>
              <div style="font-size:10.5px;color:#334155;margin-top:2px;line-height:1.38;">
                • Tài sản tĩnh từ script offline nằm ở <span class="mono">public/uploads/*</span> (đóng gói vào <span class="mono">ASSETS</span>).<br/>
                • <span class="mono">optimizeImageUrl()</span> &amp; <span class="mono">buildImageSrcSet(320,640,960)</span>: chuyển <span class="mono">/api/media/</span> sang CDN nếu có <span class="mono">NEXT_PUBLIC_MEDIA_CDN_URL</span>, bọc <span class="mono">/cdn-cgi/image/</span> (bỏ qua SVG/ICO).
              </div>
            </div>
          </div>
        </div>
        <div style="background:#fef7e0;border:1px solid #fcd34d;border-radius:7px;padding:6px 9px;font-size:10px;color:#78350f;">
          <strong>Cảnh báo cấu hình:</strong> <span class="mono">wrangler.jsonc</span> hiện chưa khai báo <span class="mono">r2_buckets</span> nên 100% file tải lên đang lưu trong D1. Nếu gắn <span class="mono">MEDIA_BUCKET</span> mà không đặt <span class="mono">NEXT_PUBLIC_MEDIA_CDN_URL</span>, <span class="mono">/api/media/[...path]</span> sẽ 404.
        </div>
      </div>
    </div>`;

  return wrapDoc({
    height: 760,
    title: "Phòng thủ Bảo mật Đa tầng, Ma trận RBAC & Đường ống Lưu trữ Media",
    subtitle: "Kiến trúc kiểm soát truy cập, bảo vệ đầu vào AI/Web/File và cơ chế lưu trữ kép Cloudflare R2 + D1 Fallback",
    tag: "SECURITY & MEDIA",
    legend: [
      { label: "Lớp Bảo vệ / Được phép", bg: "#dcfce7", border: "#4ade80" },
      { label: "Hạn chế một phần / Lưu ý", bg: "#fef7e0", border: "#fbbf24" },
      { label: "Từ chối / Rủi ro", bg: "#fee2e2", border: "#f87171" },
      { label: "Media Pipeline R2/D1", bg: "#f0fdfa", border: "#5eead4" },
    ],
    footerNote: "Nguồn: lib/rbac.ts, lib/auth.ts, lib/security.ts, lib/rate-limit.ts, lib/media-security.ts, lib/r2-storage.ts, lib/media-assets.ts",
    bodyHtml,
  });
}

// =========================================================================
// 8. CI/CD, D1 Backup & Production Deployment (1400 x 820)
// =========================================================================
function buildDiagram08() {
  const pipeStep = (txt, bg = "#ffffff", bd = "#cbd5e1", tc = "#1e293b") =>
    `<div style="background:${bg};border:1.5px solid ${bd};border-radius:7px;padding:6px 8px;font-size:10.5px;color:${tc};font-weight:600;text-align:center;line-height:1.3;">${txt}</div>`;
  const arrowR = `<div style="display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 8 L13 8 M9 4 L14 8 L9 12" stroke="#475569" stroke-width="2" fill="none" stroke-linecap="round"/></svg></div>`;

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <!-- Workflow 1: Deploy -->
      <div style="border:1.5px solid #4ade80;border-radius:11px;padding:9px 12px;background:#f4fbf6;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
          <span style="font-size:12px;font-weight:800;color:#14532d;">1. Pipeline Triển khai Tự động (.github/workflows/deploy-cloudflare.yml)</span>
          <span class="pill" style="background:#dcfce7;color:#166534;">Trigger: push main (bỏ qua *.md, *.test.*) + workflow_dispatch · Node 24</span>
        </div>
        <div style="display:grid;grid-template-columns:0.8fr 18px 1fr 18px 1.15fr 18px 1.25fr 18px 1.25fr 18px 1.15fr;align-items:center;">
          ${pipeStep("Checkout &<br/>npm ci")}
          ${arrowR}
          ${pipeStep("npm run typecheck<br/><span class='mono'>next typegen + tsc</span>")}
          ${arrowR}
          ${pipeStep("Unit Tests (22 cases)<br/><span class='mono'>npx tsx --test lib/*.test.ts</span>", "#eff6ff", "#93c5fd", "#1e3a8a")}
          ${arrowR}
          ${pipeStep("Build OpenNext Bundle<br/><span class='mono'>opennextjs-cloudflare build</span><br/>(+ postinstall auto-build)", "#e6f4ea", "#4ade80", "#14532d")}
          ${arrowR}
          ${pipeStep("Apply D1 Indexes<br/><span class='mono'>wrangler d1 execute</span><br/>0002_performance_indexes.sql", "#fef7e0", "#fbbf24", "#92400e")}
          ${arrowR}
          ${pipeStep("Deploy Worker<br/><span class='mono'>opennextjs-cloudflare deploy</span><br/>(hoặc CF Workers Builds)", "#dcfce7", "#22c55e", "#14532d")}
        </div>
      </div>

      <!-- Workflow 2: Security Audit -->
      <div style="border:1.5px solid #fca5a5;border-radius:11px;padding:9px 12px;background:#fffafa;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
          <span style="font-size:12px;font-weight:800;color:#991b1b;">2. Pipeline Quét Bảo mật & AppSec (.github/workflows/security-audit.yml)</span>
          <span class="pill" style="background:#fee2e2;color:#991b1b;">Trigger: push/PR main + Cron Thứ Hai 02:00 UTC (09:00 VN)</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
          ${pipeStep("Job 1: Node Typecheck & NPM Audit<br/><span class='mono'>npm audit --omit=dev --audit-level=high</span> + typecheck", "#ffffff", "#fca5a5", "#7f1d1d")}
          ${pipeStep("Job 2: Semgrep SAST<br/><span class='mono'>p/typescript, p/react, p/owasp-top-ten</span> (--error)", "#ffffff", "#fca5a5", "#7f1d1d")}
          ${pipeStep("Job 3: Trivy Filesystem Scan<br/>Quét <span class='mono'>vuln, secret, misconfig</span> (HIGH, CRITICAL)", "#ffffff", "#fca5a5", "#7f1d1d")}
        </div>
      </div>

      <!-- Workflow 3: Daily Backup -->
      <div style="border:1.5px solid #93c5fd;border-radius:11px;padding:9px 12px;background:#f8fbff;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;">
          <span style="font-size:12px;font-weight:800;color:#1d4ed8;">3. Pipeline Sao lưu D1 Hàng ngày (.github/workflows/backup-d1.yml)</span>
          <span class="pill" style="background:#dbeafe;color:#1e40af;">Cron: 20:00 UTC = 03:00 Sáng VN Mỗi ngày</span>
        </div>
        <div style="display:grid;grid-template-columns:1.1fr 18px 1.2fr 18px 1fr 18px 1.1fr 18px 1.1fr;align-items:center;">
          ${pipeStep("wrangler d1 export<br/><span class='mono'>thucduong-shop-db</span><br/>--remote (.sql)")}
          ${arrowR}
          ${pipeStep("verify-d1-backup.mjs<br/>Kiểm >=512B, 9 bảng cốt lõi<br/>&amp; có lệnh INSERT INTO", "#fef7e0", "#fbbf24", "#92400e")}
          ${arrowR}
          ${pipeStep("Nén & Băm<br/><span class='mono'>gzip -9</span> +<br/><span class='mono'>sha256sum</span>")}
          ${arrowR}
          ${pipeStep("GitHub Artifacts<br/>Lưu <span class='mono'>.sql.gz</span> + <span class='mono'>.sha256</span><br/>trong 30 ngày", "#e6f4ea", "#4ade80", "#14532d")}
          ${arrowR}
          ${pipeStep("R2 Mirror (Tùy chọn)<br/>Nếu có <span class='mono'>vars.R2_BACKUP_BUCKET</span><br/>put d1-backups/*", "#eff6ff", "#60a5fa", "#1d4ed8")}
        </div>
      </div>

      <!-- Bottom: Environments & Runbook -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="border:1.5px solid #cbd5e1;border-radius:10px;padding:9px 12px;background:#f8fafc;">
          <div style="font-size:11.5px;font-weight:800;color:#334155;margin-bottom:4px;">Môi trường Phát triển (Local / Docker Dev)</div>
          <div style="font-size:10.5px;color:#334155;line-height:1.4;">
            • <span class="mono">docker-compose.yml</span> (<span class="mono">node:24</span>, cổng <span class="mono">3000</span>, <span class="mono">WATCHPACK_POLLING=true</span>) hoặc <span class="mono">npm run dev</span>.<br/>
            • <span class="mono">next.config.ts</span> gọi <span class="mono">initOpenNextCloudflareForDev()</span> giả lập bindings D1/KV cục bộ.<br/>
            • 7 script CLI (<span class="mono">scripts/*.mjs</span>) hỗ trợ đồng bộ 34 tỉnh/3.321 xã, crawl dữ liệu LoveItop/Haravan &amp; nạp D1 (<span class="mono">cf:db:local</span>).
          </div>
        </div>
        <div style="border:1.5px solid #22c55e;border-radius:10px;padding:9px 12px;background:#f0fdf4;">
          <div style="font-size:11.5px;font-weight:800;color:#14532d;margin-bottom:4px;">Môi trường Production (Cloudflare Edge + Giám sát)</div>
          <div style="font-size:10.5px;color:#1e293b;line-height:1.4;">
            • Domain: <span class="mono">https://thucduongshop.duyvo.win</span> | Worker: <span class="mono">thucduong-shop</span> (<span class="mono">2025-05-05</span>).<br/>
            • Health Probe: <span class="mono">GET /api/health/</span> đo round-trip <span class="mono">SELECT 1</span> D1 trả về <span class="mono">200</span> hoặc <span class="mono">503</span>.<br/>
            • Runbook <span class="mono">cf-deploy-verify</span>: typecheck -&gt; <span class="mono">cf:deploy</span> -&gt; <span class="mono">curl</span> smoke-test (nhớ <span class="mono">/</span> cuối URL POST).
          </div>
        </div>
      </div>
    </div>`;

  return wrapDoc({
    height: 670,
    title: "Quy trình CI/CD, Sao lưu Tự động D1 & Kiến trúc Triển khai Production",
    subtitle: "Tự động hóa kiểm thử, quét bảo mật SAST/Trivy, sao lưu cơ sở dữ liệu hằng ngày và vận hành trên Cloudflare Workers",
    tag: "CI/CD & DEPLOYMENT",
    legend: [
      { label: "Build & Deploy Cloudflare", bg: "#dcfce7", border: "#4ade80" },
      { label: "Security Audit (Semgrep/Trivy)", bg: "#fee2e2", border: "#fca5a5" },
      { label: "Backup & Verification", bg: "#dbeafe", border: "#93c5fd" },
      { label: "D1 Index / Integrity Gate", bg: "#fef7e0", border: "#fbbf24" },
    ],
    footerNote: "Nguồn: .github/workflows/*.yml, wrangler.jsonc, package.json, .agents/skills/cf-deploy-verify/SKILL.md",
    bodyHtml,
  });
}

const specs = [
  { file: "01_system_architecture", h: 860, build: buildDiagram01 },
  { file: "02_codebase_metrics_chart", h: 750, build: buildDiagram02 },
  { file: "03_erd_database", h: 890, build: buildDiagram03 },
  { file: "04_url_routing_cache", h: 750, build: buildDiagram04 },
  { file: "05_checkout_order_retail_flow", h: 770, build: buildDiagram05 },
  { file: "06_ai_3layer_idle_queue", h: 740, build: buildDiagram06 },
  { file: "07_security_rbac_media", h: 760, build: buildDiagram07 },
  { file: "08_cicd_deployment_ops", h: 670, build: buildDiagram08 },
];

for (const s of specs) {
  const html = s.build();
  assertNoForbiddenDashes(html, s.file);
  const htmlPath = path.join(DIAGRAMS_DIR, `${s.file}.html`);
  const pngPath = path.join(DIAGRAMS_DIR, `${s.file}.png`);
  fs.writeFileSync(htmlPath, html, "utf8");
  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  execFileSync(CHROME_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--hide-scrollbars",
    "--virtual-time-budget=2000",
    "--force-device-scale-factor=2",
    `--window-size=1400,${s.h}`,
    `--screenshot=${pngPath}`,
    fileUrl,
  ], { stdio: "pipe" });
  const stat = fs.statSync(pngPath);
  console.log(`Rendered ${s.file}.png (${Math.round(stat.size / 1024)} KB, 1400x${s.h}@2x)`);
}
