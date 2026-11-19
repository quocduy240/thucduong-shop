import { NextResponse } from "next/server";
import { runCrmEmailAutomation } from "@/lib/crm";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    const urlSecret = new URL(req.url).searchParams.get("secret") ?? "";
    if (auth !== `Bearer ${secret}` && urlSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await runCrmEmailAutomation();
  return NextResponse.json({ ok: true, ...result });
}
