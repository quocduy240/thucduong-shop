import { NextResponse } from "next/server";
import { currentAdminForPath } from "@/lib/auth";
import { runCrmEmailAutomation } from "@/lib/crm";
import { safeEqualSecret } from "@/lib/security";

function extractCronSecret(req: Request): string {
  const xCron = req.headers.get("x-cron-secret")?.trim() ?? "";
  if (xCron) return xCron;
  const xIdle = req.headers.get("x-idle-secret")?.trim() ?? "";
  if (xIdle) return xIdle;
  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (/^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, "").trim();
  }
  return new URL(req.url).searchParams.get("secret")?.trim() ?? "";
}

async function handleCron(req: Request) {
  const expectedSecret =
    process.env.CRON_SECRET?.trim() || process.env.IDLE_WORKER_SECRET?.trim() || "";
  const candidate = extractCronSecret(req);
  const authorizedBySecret =
    Boolean(expectedSecret) && Boolean(candidate) && safeEqualSecret(candidate, expectedSecret);

  if (!authorizedBySecret) {
    const admin = await currentAdminForPath("/admin/crm/");
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runCrmEmailAutomation();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
