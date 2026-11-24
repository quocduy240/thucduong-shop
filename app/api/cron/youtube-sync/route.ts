import { currentAdminForPath } from "@/lib/auth";
import { safeEqualSecret } from "@/lib/security";
import { scanYoutubeChannelAndSync } from "@/lib/youtube-sync";

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

async function handleCron(req: Request) {
  const secret =
    process.env.CRON_SECRET?.trim() || process.env.IDLE_WORKER_SECRET?.trim() || "";
  const reqSecret = extractCronSecret(req);
  const authorizedBySecret =
    Boolean(secret) && Boolean(reqSecret) && safeEqualSecret(secret, reqSecret);

  if (!authorizedBySecret) {
    const admin = await currentAdminForPath("/admin/videos/");
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
