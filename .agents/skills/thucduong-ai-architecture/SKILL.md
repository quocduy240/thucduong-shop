---
name: thucduong-ai-architecture
description: >-
  Project blueprint for building, modifying, or optimizing AI features in thucduong-shop
  (text rewrite, image editing, product/post import, medical compliance) using a 3-layer
  AI Gateway + Sequential Idle Queue + token-saving architecture on Cloudflare Workers.
---

# ThucDuong AI Architecture Blueprint

Use this skill whenever adding a new AI feature, changing AI prompts/motifs, or optimizing AI cost and stability in `thucduong-shop`.

## 1. Three-Layer Separation

1. **Prompt & Policy Config Layer** (easy to edit without touching business logic):
   - Article motifs: `lib/ai-motifs.ts`
   - Medical/advertising compliance (VN Law + Google YMYL + YouTube): `lib/medical-compliance.ts`
   - Medical disclaimers (3 presets + custom): `lib/medical-disclaimer.ts`
2. **AI Gateway Layer** (`lib/gemini-key.ts`):
   - Always resolve keys via `resolveGeminiApiKey()` (never hardcode keys).
   - Always call models via `callGeminiGenerateContent()` for automatic model fallback.
   - Always provide a deterministic pure-TS fallback when no API key is configured or rate-limited.
3. **Sequential Idle Queue & Notice Layer**:
   - Interactive admin AI tasks MUST enqueue via `useAiIdleQueue().enqueueAiTask(...)` (`components/admin/AiIdleQueueProvider.tsx`) so `concurrency = 1`, browser idle pacing, adaptive ETA countdown, and high-contrast floating/inline notices work automatically.
   - Heavy batch jobs (post/product import, lab analysis) MUST use D1 lease-locked idle workers (`locked_until`).

## 2. Token & Cost Optimization Rules

- **Model routing:** Use Flash (`gemini-2.5-flash` / `gemini-flash-latest`) for cleanup, summarization, rewriting, and classification; reserve heavier models only for deep multi-source synthesis.
- **Pre-strip HTML:** Strip `<script>`, `<style>`, inline `style`/`class`/`id`/`data-*`, phone numbers, external buy buttons, and source domains in pure TypeScript BEFORE calling Gemini.
- **Image pre-filter:** Run lightweight detection first; only invoke image-generation models (`gemini-2.5-flash-image`) when an image contains external logos/watermarks/phones.
- **Structured JSON output:** Request strict JSON schemas (`summary`, `description_html`) to eliminate conversational filler tokens.

## 3. Cloudflare Workers (`workerd`) & Security Checklist

- NEVER import `cheerio` or Node-only native packages inside Next.js App Router API routes running on Cloudflare Workers.
- Public AI endpoints (like `/api/quick-consult`) must enforce rate limiting, input length caps, and `guardUserPromptInput()` (`lib/security.ts`).
- Always use trailing slash `/` in client `fetch("/api/.../")` calls for `POST` routes (`trailingSlash: true` in `next.config.ts`).
- After updating any admin AI workflow, sync `lib/admin-handbook.ts` with `badge: "Mới"`.
