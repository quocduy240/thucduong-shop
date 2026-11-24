---
name: thucduong-shop
description: >-
  Implement and maintain thucduong-shop admin, RBAC, retail ERP, checkout,
  loyalty, CRM, and Gemini AI workflows; verify changes and perform requested
  Cloudflare Workers deployments. Use for these project-specific workflows,
  not unrelated repositories or ordinary prose edits.
---

# ThucDuong Shop Engineering

Use this skill from the repository root. Read [AGENTS.md](../../../AGENTS.md)
first and follow its project constraints. Read the installed Next.js guides as
directed there before changing Next.js code. Use the current source and
[package.json](../../../package.json) to confirm symbols, scripts, and versions;
do not copy version numbers, model lists, or test counts from older reports.

## Select the relevant guidance

Read only the references required by the task, combining them when a change
crosses domains:

| Task | Read before implementation or execution |
| --- | --- |
| Admin pages, API permissions, Server Actions, POS, inventory, KiotViet, pricing, loyalty, CRM | [Admin and retail](references/admin-retail.md) |
| Consultation, OCR, imports, rewriting, image editing, mindmaps, prompts, AI cost or latency | [AI workflows](references/ai-workflows.md) |
| Tests, typecheck, security audit, Cloudflare build/deploy, live checks, SQL backup validation | [Verification and deployment](references/verification-deployment.md) |

## Shared working rules

- Preserve existing staged and unstaged work. Consolidation or implementation
  does not authorize staging, committing, pushing, deployment, or production
  data changes. Perform those actions only within the user's requested scope.
- Keep D1 queries awaited through `lib/db.ts`, runtime code compatible with
  `workerd`, and the root layout's `force-dynamic` setting intact. Apply the
  cache, URL builder, async Next.js API, and trailing-slash rules in AGENTS.md.
- Apply server-side authorization at every changed admin boundary. Keep
  webhook and worker authentication fail-closed. Never expose credentials.
- Update `ADMIN_HANDBOOK_SECTIONS` in `lib/admin-handbook.ts` with Vietnamese
  usage instructions and `badge: "Mới"` when an admin workflow changes.
- Treat documented but absent modules as intended architecture, not available
  APIs. Search for the current implementation before choosing a helper; state
  any gap relevant to the task without creating unrelated subsystems.
- For code changes, run `npm test` and `npm run typecheck` before claiming
  completion. For instruction-only edits, validate structure, links, scope,
  and whitespace instead. Report checks run, failures, and unverified behavior.
