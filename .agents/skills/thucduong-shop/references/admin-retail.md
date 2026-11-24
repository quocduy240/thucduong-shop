# Admin and Retail Workflows

## Find the implementation

Start with `lib/auth.ts`, `lib/rbac.ts`, `app/admin/_actions/orders.ts`,
`lib/admin-data.ts`, `lib/checkout-helpers.ts`, `lib/loyalty.ts`,
`lib/loyalty-events.ts`, `lib/kiotviet.ts`, and `lib/crm.ts` as relevant.
Search callers and schema before changing stock or cashbook behavior. Older
guidance names `lib/inventory.ts`, which is absent in this checkout; locate the
current implementation or identify the missing capability explicitly.

## Authorization boundaries

The roles are `super_admin`, `admin`, `editor`, and `sales`. Sidebar visibility
does not enforce access. Preserve all three server-side layers:

| Boundary | Required guard |
| --- | --- |
| Admin module page and export handler | `await requireAdminPath("/admin/<module>/")` |
| Shared admin dashboard | `await requireAdmin()` |
| Admin API and upload handler | `await currentAdminForPath(...)`; return 401/403 when access is denied |
| Exported admin Server Action | `await requireAdminAction("<action.key>")` using the actual `AdminAction` union |

For shared utility APIs, pass all permitted module prefixes to
`currentAdminForPath`, for example posts and products for shared rewriting.
Preserve the guard against deleting or demoting the last active `super_admin`.
Check both allowed and denied roles when changing permissions.

## Orders, stock, and cashbook

- Preserve the six statuses: `new`, `confirmed`, `shipping`, `done`, `returned`,
  and `cancelled`. Follow AGENTS.md for completed orders, anonymous POS sales,
  early cancellation/return, stock restoration, and point reversal.
- Trace stock deduction at order creation before implementing restoration.
  Avoid repeated deductions or restorations when a transition is retried.
- Record stock changes in the immutable `stock_movements` ledger through the
  existing inventory implementation. Cover web/POS sales, returns,
  cancellation, adjustment, stock take, purchase receipt, and KiotViet sync.
  Older helper names such as `recordOrderStockDeduct`, `recordOrderStockRestore`,
  `recordCustomerReturnOrder`, and `recordStockAdjustment` are search hints,
  not imports to assume exist.
- Preserve the cashbook funds `cash`, `bank_transfer`, and `kiotviet`.
  POS receipts and return refunds belong to the selected fund and the
  end-of-day report. Do not silently create a refund voucher merely because
  stock was restored; inspect the existing refund workflow.

## Pricing, loyalty, and CRM

- Keep coupon preview and checkout on `calculateOrderPricing()` rather than
  separate arithmetic. Resolve `getMemberProfileByUserId(member.id)` first,
  then use `profile?.tier ?? member.tier`.
- Preserve tier discounts: bronze 0%, silver 2%, gold 5%, diamond 7%.
  Verify redemption limits against the current pricing helper, including the
  existing 1 point = 100 VND conversion and 50% post-discount cap.
- Award purchase points on entry to `done`, including eligible POS orders.
  The anonymous POS phone placeholder `0000000000` is not a real customer.
  Completing a referee's first eligible order also unlocks pending rewards.
- Reverse an original purchase award with a negative `refund_reversal`
  ledger entry when a completed order becomes cancelled or returned.
  Do not invent a reversal for an order without an original award.
- Keep `member_profiles.current_points`, lifetime-point tier calculation,
  `members.points`, and `members.tier` synchronized through existing loyalty
  helpers. Preserve deduplication of purchase and referral rewards.
- Preserve CRM scheduling at +3 days for usage guidance and +25 days for
  reorder reminders on eligible completed orders. Escape customer data with
  `escapeHtml()` and check `sendMail()`'s `sent` result before recording
  `email_sent_at`.

## KiotViet and automation

- Preserve product SKU and `kv_code` mappings to KiotViet product codes.
  Inventory sync currently uses `pageSize=100`, `currentItem`, and a 50-page
  cap. Handle partial failure without reporting an incomplete sync as complete.
- Keep the webhook closed when `webhookSecret` is missing and compare
  credentials with `safeEqualSecret()`. Inspect its handler for exact statuses.
- CRM cron supports a configured cron/idle secret or an authorized CRM admin.
  Missing secrets must never make unauthenticated execution public.

## Focused verification

Exercise changed pricing through both preview and checkout, status effects
through eligible and anonymous orders, and authorization through allowed and
denied roles. Use local or mocked data. Follow the shared test/typecheck gates
and handbook rule in the skill entrypoint.
