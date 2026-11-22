# Verification and Cloudflare Deployment

## Select the gates

Confirm scripts in `package.json`. Run commands from the repository root.

| Requested work | Verification |
| --- | --- |
| Application code change | `npm test` and `npm run typecheck` |
| Production security review or deployment | Above gates plus `npm run security:check` |
| Cloudflare build without deployment | `npm run cf:build` |
| Authorized production deployment | Passing gates, then `npm run cf:deploy`, then read-only live checks |
| Existing D1 SQL export validation | `npm run backup:verify -- <path>` |
| Instructions or skill content only | Skill validation, links, whitespace, and preservation checks |

`typecheck` includes `next typegen` before `tsc --noEmit` so global route types
exist. `security:check` includes a production dependency audit and typecheck;
one successful execution can satisfy the typecheck gate. Avoid repeating a
successful gate unless relevant inputs changed. Do not silently fix dependency
versions or invoke `npm audit fix` as part of verification.

The test script covers HTML extraction, rate limiting, checkout helpers, logging,
RBAC, media security, image URLs, and backup verification. Read the actual test
output; do not claim a fixed test count or infer browser coverage from unit tests.

## Build and deploy

- Keep `app/layout.tsx` dynamic to prevent build-time prerender reads against
  an unseeded D1 database.
- Inspect `wrangler.jsonc` bindings and target before deployment. Preserve D1
  `DB`, KV `NEXT_INC_CACHE_KV`, assets, and self-reference configuration.
  Optional R2 `MEDIA_BUCKET` falls back to D1 media storage when unavailable.
  Do not add an R2 binding for an unprovisioned bucket.
- `cf:deploy` already builds OpenNext before deploying. Do not run a separate
  successful build immediately beforehand unless the task requires that artifact.
- On a build-only transient D1 timeout, inspect logs and retry the build once
  with `npm run cf:build`. Retry deployment only when the requested deployment
  remains authorized and the prior outcome is known. For an indeterminate
  deploy, check the active version before publishing again. Stop repeated
  failures and report the failing gate.
- Do not run remote D1 import/reset scripts as a build or deployment check.
  Backup verification validates an existing dump without restoring it.

## Read-only live checks

After a confirmed deployment, or when live inspection is requested, use the
configured production origin (currently `https://thucduongshop.duyvo.win`).
On Windows use `curl.exe`; on other shells use `curl`.

```powershell
curl.exe --silent --show-error --output NUL --write-out "%{http_code}" --max-time 30 "https://thucduongshop.duyvo.win/"
```

Check these public routes for HTTP 200 and meaningful content:

- `/`
- `/san-pham/`
- `/canh-duong-sinh/`
- `/tu-van-nhanh.html`
- `/sitemap.xml` (verify XML)

Use read-only requests without cookies to verify `/api/admin/crm/` denies
access (currently 401) and `/api/cron/crm-automation/` denies unauthenticated
execution (currently 401). Distinguish authentication denial from a server error;
do not accept an arbitrary 503 as proof of correct authorization.

Do not create carts, orders, loyalty transactions, CRM tasks, or paid AI jobs
as routine production smoke tests. Exercise JSON cart/checkout flows locally or
with explicitly authorized test data. Inspect the selected product, session,
and current response contract rather than assuming product ID 1 exists.

## Finish with evidence

Report commands and results, observed deployment/version and live statuses when
available, and any checks that were blocked or not run. A successful build is
not proof of deployment or runtime correctness. Stage, commit, or push only when
requested; inspect the current branch and stage only task-owned changes rather
than assuming `origin main` is the intended destination.
