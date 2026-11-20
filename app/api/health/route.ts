import { one } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/health/
 * Readiness & DB connectivity probe for uptime monitoring (Cloudflare Health Checks / UptimeRobot).
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    const row = await one<{ ok: number }>("SELECT 1 AS ok");
    const dbLatencyMs = Date.now() - startedAt;
    if (!row || row.ok !== 1) {
      return Response.json(
        { status: "degraded", db: "unexpected_response", latencyMs: dbLatencyMs },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      {
        status: "ok",
        db: "connected",
        latencyMs: dbLatencyMs,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        status: "error",
        db: "unreachable",
        latencyMs: Date.now() - startedAt,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
