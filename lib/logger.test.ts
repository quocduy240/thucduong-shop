import assert from "node:assert/strict";
import test from "node:test";
import { formatStructuredLog, sanitizeLogMeta } from "./logger";

test("formatStructuredLog outputs valid single-line JSON with timestamp, level, and event", () => {
  const line = formatStructuredLog("info", "checkout.order_created", {
    orderId: 42,
    total: 350000,
  });

  assert.equal(line.includes("\n"), false);
  const parsed = JSON.parse(line) as Record<string, unknown>;
  assert.equal(parsed.level, "info");
  assert.equal(parsed.event, "checkout.order_created");
  assert.equal(parsed.orderId, 42);
  assert.equal(parsed.total, 350000);
  assert.match(String(parsed.ts), /^\d{4}-\d{2}-\d{2}T/);
});

test("sanitizeLogMeta recursively redacts secrets and preserves safe fields", () => {
  const sanitized = sanitizeLogMeta({
    actor: "admin@thucduong.vn",
    password: "super-secret-password",
    nested: {
      geminiApiKey: "AIzaSySecret1234567890",
      smtp_pass: "app-pass-16-chars",
      authorization: "Bearer xyz",
      cookie: "td_admin=abc",
      orderCode: "TD-2026-0001",
    },
    items: [
      { name: "Gạo lứt", token: "secret-tok" },
    ],
  }) as Record<string, unknown>;

  assert.equal(sanitized.actor, "admin@thucduong.vn");
  assert.equal(sanitized.password, "[REDACTED]");

  const nested = sanitized.nested as Record<string, unknown>;
  assert.equal(nested.geminiApiKey, "[REDACTED]");
  assert.equal(nested.smtp_pass, "[REDACTED]");
  assert.equal(nested.authorization, "[REDACTED]");
  assert.equal(nested.cookie, "[REDACTED]");
  assert.equal(nested.orderCode, "TD-2026-0001");

  const items = sanitized.items as Array<Record<string, unknown>>;
  assert.equal(items[0].name, "Gạo lứt");
  assert.equal(items[0].token, "[REDACTED]");
});

test("sanitizeLogMeta formats Error instances, truncates long strings, and enforces depth limit", () => {
  const longText = "a".repeat(800);
  const deepObj = { a: { b: { c: { d: { e: { f: "too-deep" } } } } } };
  const result = sanitizeLogMeta({
    err: new Error("D1 write failed"),
    longText,
    deepObj,
  }) as Record<string, unknown>;

  assert.deepEqual(result.err, { name: "Error", message: "D1 write failed" });
  assert.equal(String(result.longText).length, 501);
  assert.ok(String(result.longText).endsWith("…"));

  const d = ((((result.deepObj as Record<string, unknown>).a as Record<string, unknown>).b as Record<string, unknown>).c as Record<string, unknown>).d;
  assert.equal(d, "[max-depth]");
});
