import { currentAdminForPath } from "@/lib/auth";
import {
  runBackendExpertAnalysis,
  saveExpertProfileConfig,
  type ExpertProfileConfig,
} from "@/lib/quick-consult";

export async function POST(req: Request) {
  const admin = await currentAdminForPath("/admin/quick-consult/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      id?: number;
      saveConfig?: boolean;
      config?: Partial<ExpertProfileConfig>;
    };

    if (body.saveConfig && body.config) {
      await saveExpertProfileConfig({
        expertName: body.config.expertName?.trim() || "Chuyên gia Thực dưỡng Phúc Thọ",
        expertTitle: body.config.expertTitle?.trim() || "Cố vấn Dinh dưỡng Thực dưỡng",
        schoolOfThought: body.config.schoolOfThought?.trim() || "Thực dưỡng Quân bình Âm – Dương",
        focusAreas: body.config.focusAreas?.trim() || "",
        customDirective: body.config.customDirective?.trim() || "",
      });
      if (!body.id) {
        return Response.json({ ok: true, savedConfigOnly: true });
      }
    }

    const id = Number(body.id ?? 0);
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ error: "Mã hồ sơ không hợp lệ." }, { status: 400 });
    }

    const row = await runBackendExpertAnalysis(id, body.config);
    return Response.json({ ok: true, row });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Không thể phân tích hồ sơ bệnh nhân." },
      { status: 500 },
    );
  }
}
