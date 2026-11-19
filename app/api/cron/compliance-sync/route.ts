import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { syncCompliancePolicyWeekly } from "@/lib/medical-compliance";
import { safeEqualSecret } from "@/lib/security";

async function handleSync(req: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.IDLE_WORKER_SECRET?.trim() || "";
  const reqSecret = req.headers.get("x-cron-secret")?.trim() || req.headers.get("x-idle-secret")?.trim() || "";
  const isCron = Boolean(secret) && safeEqualSecret(secret, reqSecret);

  if (!isCron) {
    const admin = await currentAdmin();
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
