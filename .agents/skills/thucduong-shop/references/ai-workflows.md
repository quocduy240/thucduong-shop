# AI Workflows

## Preserve the three layers

1. Keep domain prompts, motifs, and compliance separate from HTTP and D1
   plumbing. Inspect `lib/ai-motifs.ts`, `lib/quick-consult-options.ts`,
   `lib/medical-compliance.ts`, and `lib/medical-disclaimer.ts` as relevant.
   Reuse configured motifs and disclaimer placement rather than duplicating
   prompt text. Preserve compliance refresh behavior where implemented.
2. Resolve keys with `await resolveGeminiApiKey(overrideKey)` and invoke
   models with `await callGeminiGenerateContent(...)` from `lib/gemini-key.ts`.
   Read the current gateway before changing key validation, model ordering,
   timeouts, or failure handling.
3. Route interactive admin tasks through
   `useAiIdleQueue().enqueueAiTask(...)` in
   `components/admin/AiIdleQueueProvider.tsx`. Preserve sequential execution,
   browser-idle scheduling, cooldown, ETA tracking, and visible progress.
   Heavy jobs require D1 lease ownership rather than browser-only coordination.

## Gateway behavior and fallback

- Key priority is explicit override, stored D1 setting, then environment.
  An override currently persists to settings, so keep it behind appropriate
  authorization. Never log keys or request URLs containing them; mask UI values.
- Use the gateway's current model defaults or a task-specific existing list.
  Do not hardcode model names or validation rules copied from older skill text.
- The current gateway advances models on HTTP 400/404. It does not guarantee
  retries on 429/5xx or timeouts. Handle unsuccessful responses and thrown
  failures at the feature boundary. Any retry change needs bounded attempts
  and timeout behavior verified against the gateway implementation.
- Supply a deterministic pure-TypeScript fallback for missing credentials,
  quota exhaustion, upstream failure, or timeout. Reuse existing consultation
  fallback builders or importer cleanup where available. Keep fallback output
  distinct from successful OCR or model-generated findings; do not fabricate
  medical results.

## Background jobs and leases

- Existing import jobs live in `lib/post-importer.ts` and
  `lib/product-importer.ts`, not the older `*-import-jobs.ts` paths.
  Inspect `lib/lab-analysis.ts` and its route handlers before changing OCR;
  do not assume that an OCR lease worker already exists.
- Preserve `post_import_jobs` and `product_import_jobs` lease behavior using
  `locked_until`. Select a candidate, atomically update it only while its lease
  is absent/expired, and check affected rows before making an upstream call.
  Include lease availability in the claim update, not just status membership.
- Reuse the existing worker's completion/failure cleanup. When implementing a
  new worker, account for lease expiry, overlapping triggers, and long calls;
  an expired worker must not overwrite a newer worker's result.

## Reduce tokens and unnecessary image calls

- Extract semantic article content or transcript chunks with the existing
  pure-TypeScript helpers in `lib/html-extract.ts`. Strip scripts, styles,
  navigation, footers, decorative attributes, external phones, and third-party
  domains before prompting. Preserve useful headings, paragraphs, lists,
  tables, and image references needed by the task.
- Request the JSON shape or semantic HTML expected by the consumer, without
  Markdown fences. Validate output before use; keep HTML to supported tags.
- Invoke image models only when the requested asset needs watermark, logo,
  phone removal, or enhancement. Save through `saveMediaAsset()`.
- When replacing a shared image, update references in product image/gallery/
  description, post cover/content, content blocks, reusable blocks, and pages.
  Inspect schema and callers before updating; preserve unrelated assets.

## Security and medical compliance

- Validate externally fetched URLs with `assertSafePublicHttpUrl()` before
  fetching. Preserve URL validation across redirects and existing fetch guards.
- Guard free-text prompt inputs with `guardUserPromptInput(text, maxLen)`.
  Sanitize generated HTML with `sanitizeAiHtml()` before storage or rendering.
- Apply medical compliance rules and the selected disclaimer preset. Do not
  allow guaranteed cures or claims that products replace medication.
- Apply the entrypoint's admin authorization rules to admin AI endpoints.
  Public consultation endpoints need IP rate limiting; share-token operations
  need `safeEqualSecret()` verification. Do not require an existing report
  token for creating a new consultation.
- Keep runtime dependencies compatible with `workerd`; do not import `cheerio`
  or native addons into the application dependency graph.

## Focused verification

Check successful and malformed output, missing key, upstream errors/timeouts,
unauthorized access, rate limits, and untrusted prompt/HTML inputs for the
changed feature. For worker changes, check competing claims and expired leases.
Use mocks or local fixtures unless live paid API calls were requested.
