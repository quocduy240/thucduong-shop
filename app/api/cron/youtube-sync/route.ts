import { currentAdmin } from "@/lib/auth";
import { safeEqualSecret } from "@/lib/security";
import { scanYoutubeChannelAndSync } from "@/lib/youtube-sync";

async function handleCron(req: Request) {
  const secret = process.env.IDLE_WORKER_SECRET?.trim() ?? "";
  const reqSecret = req.headers.get("x-cron-secret")?.trim() ?? "";
  const authorizedBySecret = safeEqualSecret(secret, reqSecret);

  if (!authorizedBySecret) {
    const admin = await currentAdmin();
    if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("force") === "1";
  const result = await scanYoutubeChannelAndSync(force);
  return Response.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}
