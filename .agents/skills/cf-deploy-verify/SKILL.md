---
name: cf-deploy-verify
description: >-
  Standard verification, Cloudflare Workers deployment, live curl smoke-testing,
  and Git commit/push runbook for thucduong-shop (thucduongshop.duyvo.win).
---

# Cloudflare Deploy & Live Verification Runbook

Follow these exact steps after completing code changes in `thucduong-shop`:

1. **Type-check first:**
   ```bash
   npm run typecheck
   ```
   Fix all TypeScript errors before building.

2. **Deploy to Cloudflare Workers (`OpenNext`):**
   ```bash
   npm run cf:deploy
   ```
   - Note: If `next build` encounters a transient remote D1 prerender error (e.g. on `/canh-duong-sinh` during 7-worker parallel prerendering), re-run `npm run cf:deploy`.

3. **Live Smoke-Test on `https://thucduongshop.duyvo.win`:**
   - Verify changed pages return `HTTP 200` with `curl`.
   - For `POST` API endpoints, always include the trailing `/` (because `trailingSlash: true` redirects non-slash POSTs).
   - Verify JSON responses do not return unexpected `500` errors on `workerd`.

4. **Commit & Push:**
   - Stage only the modified/created feature files and push to `origin main`.
