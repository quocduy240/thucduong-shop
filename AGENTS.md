<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Before writing code, list the files in `node_modules/next/dist/docs/` (resolved from this file's directory) and read only the guides whose topics match the Next.js APIs you are about to use (for example routing, caching, or server actions). If this directory cannot be found, stop and tell the user that the Next.js docs are missing. Do not write code from training data. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guide for Coding Agents (`thucduong-shop`)

Full-featured Vietnamese macrobiotic e-commerce storefront, CMS, retail ERP (POS, 3-Fund Cashbook, Stock Movements, KiotViet 2-way Sync, A5 Invoice Printer), 4-tier Loyalty & CRM platform, and Google Gemini AI Health Consultation suite for **Thực Dưỡng Phúc Thọ** (`https://thucduongshop.duyvo.win`).

Human-facing overview: `README.md` (Vietnamese). Comprehensive technical audit report and architecture diagrams: `artifacts/bao-cao-he-thong-thucduong-shop.md`.
Reply to the user in **Vietnamese** unless they write in another language. Write all source code identifiers and code comments in **English**.

---

## 1. Production Stack & Runtime Environment

- **Framework:** Next.js **16.2** App Router, React **19.2**, TypeScript **5.9**, Tailwind CSS **4.2** (`@tailwindcss/turbopack`).
- **Edge Runtime:** Deployed to **Cloudflare Workers** (`workerd`, `nodejs_compat`) via `@opennextjs/cloudflare` **1.18** and Wrangler **4.81** (`wrangler.jsonc`).
- **Database:** **Cloudflare D1** (`DB` binding -> `thucduong-shop-db`, 39 SQLite tables managed by `SCHEMA` and `migrate()` in `lib/db.ts`).
  - All database queries in application code MUST use the async helpers exported by `lib/db.ts`: `await all<T>(sql, ...params)`, `await one<T>(sql, ...params)`, `await run(sql, ...params)`, and `await batch(statements)`.
  - Never forget `await` on `all()`, `one()`, `run()`, or `batch()`.
  - Note: `node:sqlite` and `data/shop.db` are ONLY used by the offline CLI scraper scripts (`scripts/import-post.mjs` and `scripts/import-products.mjs`).
- **Caching & Storage:**
  - **Cloudflare KV** (`NEXT_INC_CACHE_KV`) + `unstable_cache` with tag invalidation in `lib/cache.ts` (`CACHE_TAGS`, `invalidateTags()`).
  - **Cloudflare R2** (`MEDIA_BUCKET` optional binding in `lib/r2-storage.ts`) with automatic fallback to D1 `media_files` (`lib/media-assets.ts`), served at `/api/media/[...path]` and optimized via Cloudflare Image Resizing (`lib/image-url.ts`).
- **Root Layout Rendering:** `app/layout.tsx` intentionally exports `export const dynamic = "force-dynamic"` so Cloudflare CI builds never crash against empty build-time D1 instances. Do not remove `force-dynamic` from `app/layout.tsx`; use `cached()` from `lib/cache.ts` for D1 read queries executed on storefront page renders or public API routes; use direct `all()` or `one()` calls for admin and write-path reads.

---

## 2. Commands & Verification Workflow

| Task | Command | Notes |
|---|---|---|
| Install dependencies | `npm ci` (or `npm install`) | Installs all 390 packages from lockfile |
| Dev server | `npm run dev` | Starts Next.js on `http://localhost:3000` |
| Type-check | `npm run typecheck` | Runs `next typegen && tsc --noEmit` (always run `next typegen` first so global `PageProps`/`LayoutProps`/`RouteContext` exist) |
| Unit test suite | `npm test` | Runs 24 unit tests via `tsx --test` (`html-extract`, `rate-limit`, `checkout-helpers`, `logger`, `rbac`, `media-security`, `image-url`, `backup-verify`) |
| Build for Cloudflare | `npm run cf:build` | Compiles OpenNext bundle into `.open-next/` |
| Deploy to Production | `npm run cf:deploy` | Builds and deploys to `https://thucduongshop.duyvo.win` |
| Verify D1 SQL backup | `npm run backup:verify -- <path>` | Validates D1 SQL dump integrity (`scripts/verify-d1-backup.mjs`) |
| Offline CLI imports | `npm run import:post -- <url>` / `npm run import:products` | Local Node CLI scrapers (not used in `workerd` runtime) |

Always verify code changes with `npm test` and `npm run typecheck` before claiming completion or deploying.

---

## 3. Codebase Layout

```text
app/
  page.tsx                                 Home page (Flash Sale, category product blocks, latest posts, block zones)
  san-pham/[category]/[product]/page.tsx   Product detail (slug parameter ends with ".html")
  [section]/page.tsx                       Post section listing (/thuc-duong/) OR static page (/gioi-thieu.html)
  [section]/[slug]/page.tsx                Category listing (/thuc-duong/<cat>/), policy page (/chinh-sach/<x>.html), or short post URL
  [section]/[slug]/[post]/page.tsx         Canonical article URL (/<section>/<cat>/<post>.html)
  canh-duong-sinh/page.tsx                 Dedicated landing page for Canh Duong Sinh King Kung
  tu-van-nhanh.html/page.tsx               Public AI Health Consultation wizard
  ho-so-suc-khoe/[token]/page.tsx          Shareable/printable patient health report
  tai-khoan/                               Member portal (login, register, loyalty dashboard, order history)
  cart/, checkout/, checkout/thankyou/     Cart and checkout pages
  admin/                                   22 admin modules under sidebar layout (app/admin/layout.tsx)
    _actions/                              Domain-split Server Actions (auth, catalog, content, orders, system)
    upload/route.ts                        Admin media upload endpoint (strict MIME + magic-byte validation)
    orders/export/, members/export/        CSV export route handlers
  api/
    v2/add-to-cart/[id]/route.ts           Cart add API (accepts qty or quantity in JSON body or query string)
    data-checkout/route.ts                 Checkout order creation, pricing, stock deduction, loyalty point redemption
    coupons/check/route.ts                 Coupon + member tier discount preview (shares calculateOrderPricing)
    media/[...path]/route.ts               Media streaming route (reads R2 MEDIA_BUCKET first, falls back to D1 media_files)
    cron/crm-automation/route.ts           Scheduled CRM email dispatcher (fail-closed on CRON_SECRET / admin auth)
    kiotviet/webhook/route.ts              KiotViet inventory/order webhook (fail-closed on webhookSecret)
    admin/                                 Protected admin REST APIs (AI rewrite, image edit, mindmap, quick-consult, lab-analysis, CRM, loyalty, QR, blocks, themes, sitemaps, videos)
components/
  Header.tsx, Footer.tsx, BlockZone.tsx    Storefront layout & inline admin edit buttons
  CanhDuongSinhLanding.tsx, FlashSaleShowcase.tsx, QuickConsultClient.tsx
  admin/                                   Admin UI kit, RichTextEditor, AiIdleQueueProvider, AdminHandbookDrawer
lib/
  db.ts                                    D1 database adapter, 39-table SCHEMA, migrate(), async helpers (all, one, run, batch)
  auth.ts, rbac.ts                         Admin session auth (scrypt), 4-role RBAC matrix, requireAdminPath, currentAdminForPath, requireAdminAction
  member-auth.ts                           Storefront member session auth
  data.ts, admin-data.ts                   Storefront queries, url.* builders (single source of truth for URLs), admin queries
  checkout-helpers.ts                      Single source of truth for order pricing (calculateOrderPricing), order codes, idempotency keys
  loyalty.ts, loyalty-events.ts            Unified point ledger (point_transactions), 4 tiers (bronze/silver/gold/diamond), referrals, streaks, point reversal
  inventory.ts, kiotviet.ts                Stock movement ledger, 3-fund cashbook, EOD reports, paginated KiotViet sync
  crm.ts                                   Post-purchase CRM tasks (+3d usage guide, +25d reorder reminder) & escaped HTML emails
  gemini-key.ts                            Unified Gemini API key resolver & model fallback gateway
  quick-consult.ts, lab-analysis.ts        AI health consultation & D1 lease-locked lab OCR analysis
  medical-compliance.ts, medical-disclaimer.ts  VN Medical/Ad Law + Google YMYL compliance & disclaimer presets
  media-assets.ts, r2-storage.ts, media-security.ts, image-url.ts
  rate-limit.ts, security.ts, logger.ts, cache.ts, settings.ts, mail.ts
  admin-handbook.ts                        In-app contextual Admin Handbook sections (auto-synced with new features)
```

---

## 4. Routing, URL & Next.js 16 Conventions

- **Preserve Original Storefront URLs:** Build internal links only through `url.*` in `lib/data.ts`.
  - Listing URLs end with `/` (`/san-pham/`, `/thuc-duong/`).
  - Detail URLs end with `.html` (`/san-pham/<cat>/<slug>.html`, `/<section>/<cat>/<slug>.html`).
  - `next.config.ts` sets `trailingSlash: true` and `skipTrailingSlashRedirect: true`. Keep both.
- **Trailing Slash on Client `fetch` Calls:** Because `trailingSlash: true` is active, client-side `POST`/`PUT`/`DELETE` calls to `/api/admin/.../` MUST include a trailing slash; do not rely on redirects.
- **Next.js 16 Async Dynamic APIs:** `params`, `searchParams`, `cookies()`, and `headers()` are Promises. Always `await` them. `cookies()` can only be modified inside Route Handlers or Server Actions, never in Server Component pages.

---

## 5. Admin Security & RBAC Rules (Mandatory)

- **Four Admin Roles (`lib/rbac.ts`):** `super_admin`, `admin`, `editor`, `sales`.
- **Every Admin Page (`app/admin/**/page.tsx`) and Admin Export Route:**
  - Must call `await requireAdminPath("/admin/<module>/")` from `lib/auth.ts` (use `requireAdmin()` only on the shared `/admin/` dashboard).
- **Every Admin API Route (`app/api/admin/**/route.ts` and `app/admin/**/route.ts`):**
  - Must call `const admin = await currentAdminForPath("/admin/<module>/")` and return HTTP `401`/`403` when `null`. For shared utility endpoints (like `/admin/upload` or `/api/admin/ai-image-edit/`), pass all allowed module prefixes: `currentAdminForPath("/admin/posts/", "/admin/products/", ...)`.
- **Every Admin Server Action (`app/admin/_actions/*.ts`):**
  - Must call `await requireAdminAction("<action.key>")` so action-level permissions and the last-`super_admin` deletion guard are enforced server-side.
- **Webhooks & Cron Endpoints:**
  - Must **fail closed** when secrets (`CRON_SECRET`, `IDLE_WORKER_SECRET`, KiotViet `webhookSecret`) are unconfigured, and must compare tokens with `safeEqualSecret()` from `lib/security.ts`.
- **Admin Handbook Auto-Sync Rule:**
  - Whenever adding a new admin feature or changing an existing admin workflow, ALWAYS update `lib/admin-handbook.ts` (`ADMIN_HANDBOOK_SECTIONS`) with clear Vietnamese instructions and `badge: "Mới"`.

---

## 6. Retail ERP, Checkout & Loyalty Invariants

- **Single Source of Truth for Pricing:** Both `/api/coupons/check` and `/api/data-checkout` must compute tier discounts, coupon caps, point redemptions, and shipping fees via `calculateOrderPricing()` in `lib/checkout-helpers.ts`. Resolve a logged-in member's tier from `getMemberProfileByUserId(member.id)?.tier ?? member.tier` so all 4 tiers (`bronze` 0%, `silver` 2%, `gold` 5%, `diamond` 7%) match everywhere.
- **Order Status Lifecycle (`ORDER_STATUS`):** `new`, `confirmed`, `shipping`, `done`, `returned`, `cancelled`.
  - Transitioning to `done` with a real customer phone (including POS orders created as `done`) triggers `onOrderStatusChanged(orderId, prevStatus, "done")` (`lib/loyalty-events.ts`) to award purchase points, unlock pending referral rewards, and schedule CRM follow-ups (`lib/crm.ts`). If a `done` order has no real customer phone, skip member point awards and CRM scheduling, and still apply stock movements.
  - Transitioning from `done` to `cancelled` or `returned` restores product stock (`lib/inventory.ts`) and triggers `onOrderStatusChanged` to record a negative `refund_reversal` transaction in `point_transactions`. For transitions from `new`, `confirmed`, or `shipping` to `cancelled` or `returned`, restore product stock via `lib/inventory.ts` only if stock was already deducted at order creation, and do not call `onOrderStatusChanged` for point reversal unless the order was previously `done`.
- **Media Storage & Upload Security:**
  - Validate all uploads against an explicit MIME allowlist and `verifyFileMagicBytes(buf, mime)` (`lib/media-security.ts`); sanitize SVGs via `sanitizeSvgContent()`.
  - Save assets through `saveMediaAsset()` (`lib/media-assets.ts`), which writes to R2 `MEDIA_BUCKET` first and D1 `media_files` as fallback.
  - `/api/media/[...path]/route.ts` reads from R2 `getMediaObject()` first before querying D1 `media_files`.

---

## 7. AI Gateway, Sequential Idle Queue & Medical Compliance Rules

- **Unified AI Gateway (`lib/gemini-key.ts`):**
  - All Gemini calls MUST resolve their key via `await resolveGeminiApiKey(overrideKey)` and execute via `await callGeminiGenerateContent(...)`. Never hardcode or log API keys.
  - Always provide a deterministic pure-TypeScript fallback when no API key is configured or when upstream models return 429/5xx.
- **Cloudflare Workers (`workerd`) Compatibility:**
  - NEVER import `cheerio` or Node-only native packages inside Next.js App Router pages or API routes. Use pure TypeScript parsers in `lib/html-extract.ts`.
- **Token Optimization & Sequential Idle Queue:**
  - Strip scripts, styles, classes, phone numbers, and external domains in pure TypeScript before sending HTML/text to Gemini.
  - Route interactive admin AI tasks through `AiIdleQueueProvider` (`components/admin/AiIdleQueueProvider.tsx`, `concurrency = 1`) and heavy background jobs (article import, product import, lab OCR) through D1 lease-locked workers (`locked_until`).
- **Medical Law & YMYL Compliance:**
  - Sanitize all AI-generated HTML with `sanitizeAiHtml()` (`lib/security.ts`), guard user prompt inputs with `guardUserPromptInput()`, enforce Vietnamese medical/advertising compliance rules via `lib/medical-compliance.ts`, and attach disclaimers via `lib/medical-disclaimer.ts`.
