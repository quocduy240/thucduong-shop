import { NextResponse } from "next/server";
import { currentAdminForPath } from "@/lib/auth";
import { syncCompliancePolicyWeekly } from "@/lib/medical-compliance";
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
  return "";
}

async function handleSync(req: Request) {
  const secret =
    process.env.CRON_SECRET?.trim() || process.env.IDLE_WORKER_SECRET?.trim() || "";
  const reqSecret = extractCronSecret(req);
  const isCron = Boolean(secret) && Boolean(reqSecret) && safeEqualSecret(secret, reqSecret);

  if (!isCron) {
    const admin = await currentAdminForPath("/admin/quick-consult/", "/admin/posts/");
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";
  const res = await syncCompliancePolicyWeekly(force);
  return NextResponse.json({ ok: true, ...res });
}

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}
