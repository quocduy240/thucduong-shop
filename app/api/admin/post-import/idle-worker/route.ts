import { revalidatePath } from "next/cache";
import { currentAdminForPath } from "@/lib/auth";
import { getPostIdleWorkerSummary, processNextIdlePostImportJob } from "@/lib/post-importer";
import { safeEqualSecret } from "@/lib/security";

async function handleIdleRun(req: Request) {
  const secret = process.env.IDLE_WORKER_SECRET?.trim() ?? "";
  const reqSecret = req.headers.get("x-idle-secret")?.trim() ?? "";
  const isCronAuthorized = Boolean(secret) && safeEqualSecret(secret, reqSecret);

  if (!isCronAuthorized) {
    const admin = await currentAdminForPath("/admin/posts/");
    if (!admin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let targetJobId: number | undefined;
  try {
    const { searchParams } = new URL(req.url);
    const rawId = Number(searchParams.get("id") ?? "0");
    if (Number.isInteger(rawId) && rawId > 0) targetJobId = rawId;
  } catch {
    /* ignore */
  }

  const result = await processNextIdlePostImportJob(targetJobId);
  if (result.processed) {
    revalidatePath("/", "layout");
  }
  const workerSummary = await getPostIdleWorkerSummary();
  return Response.json({ ok: true, ...result, workerSummary });
}

export async function GET(req: Request) {
  return handleIdleRun(req);
}

export async function POST(req: Request) {
  return handleIdleRun(req);
}
