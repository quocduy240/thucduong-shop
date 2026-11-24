import { NextResponse } from "next/server";
import { currentAdminForPath } from "@/lib/auth";
import { runCrmEmailAutomation } from "@/lib/crm";
import { safeEqualSecret } from "@/lib/security";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.IDLE_WORKER_SECRET?.trim() || "";
  const provided =
    req.headers.get("x-cron-secret")?.trim() ||
    req.headers.get("x-idle-secret")?.trim() ||
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const isCron = Boolean(secret) && safeEqualSecret(secret, provided);

  // Fail closed: without a valid cron secret only a signed-in CRM admin may trigger the run.
  if (!isCron && !(await currentAdminForPath("/admin/crm/"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runCrmEmailAutomation();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
