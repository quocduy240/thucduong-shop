import {
  type AiMotifPreset,
  deleteAiMotif,
  importAiMotifs,
  loadAiMotifs,
  upsertAiMotif,
} from "@/lib/ai-motifs";
import { currentAdminForPath } from "@/lib/auth";

export async function GET() {
  if (!(await currentAdminForPath("/admin/posts/", "/admin/products/"))) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
  }
  const items = await loadAiMotifs();
  return Response.json({ ok: true, items, configPath: "data/ai-motifs.json" });
}

export async function POST(req: Request) {
  if (!(await currentAdminForPath("/admin/posts/", "/admin/products/"))) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    action?: "save" | "import" | "delete";
    preset?: Partial<AiMotifPreset>;
    presets?: Partial<AiMotifPreset>[];
    id?: string;
  };

  if (body.action === "delete" && body.id) {
    const items = await deleteAiMotif(body.id);
    return Response.json({ ok: true, items });
  }

  if (body.action === "import" && Array.isArray(body.presets)) {
    const items = await importAiMotifs(body.presets);
    return Response.json({ ok: true, items });
  }

  if (body.preset) {
    const items = await upsertAiMotif(body.preset);
    return Response.json({ ok: true, items });
  }

  return Response.json({ error: "Dữ liệu cấu hình Mô-típ không hợp lệ." }, { status: 400 });
}
