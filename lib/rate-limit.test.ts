import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit, getClientIp, rateLimitResponse } from "./rate-limit";

test("sliding window allows requests up to limit and blocks excess until window expires", () => {
  const store = new Map();
  const opts = { namespace: "test-ns", limit: 3, windowMs: 10_000 };

  assert.equal(checkRateLimit("1.2.3.4", opts, 1000, store).allowed, true);
  assert.equal(checkRateLimit("1.2.3.4", opts, 2000, store).allowed, true);
  const third = checkRateLimit("1.2.3.4", opts, 3000, store);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);

  const blocked = checkRateLimit("1.2.3.4", opts, 4000, store);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, 7);

  // Different IP is unaffected
  assert.equal(checkRateLimit("5.6.7.8", opts, 4000, store).allowed, true);

  // After oldest timestamp ages out (> 1000 + 10000), request succeeds again
  const recovered = checkRateLimit("1.2.3.4", opts, 11_500, store);
  assert.equal(recovered.allowed, true);
});

test("extracts client IP prioritizing cf-connecting-ip over x-forwarded-for", () => {
  const req1 = new Request("https://example.com", {
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    },
  });
  assert.equal(getClientIp(req1), "203.0.113.10");

  const req2 = new Request("https://example.com", {
    headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" },
  });
  assert.equal(getClientIp(req2), "198.51.100.7");
});

test("rateLimitResponse returns HTTP 429 with Retry-After header", async () => {
  const res = rateLimitResponse(15);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("Retry-After"), "15");
  const body = (await res.json()) as { error: string };
  assert.ok(body.error.includes("15"));
});
