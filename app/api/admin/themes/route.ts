import { currentAdmin } from "@/lib/auth";
import { getThemeSettings, saveThemeSettings } from "@/lib/theme-settings";
import { DEFAULT_THEME_CONFIG, type ThemeSettingsConfig } from "@/lib/themes";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const config = await getThemeSettings();
  return Response.json({ ok: true, config });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      reset?: boolean;
      config?: ThemeSettingsConfig;
    };

    if (body.reset) {
      const saved = await saveThemeSettings(DEFAULT_THEME_CONFIG);
      return Response.json({ ok: true, config: saved });
    }

    if (!body.config || !Array.isArray(body.config.presets)) {
      return Response.json({ error: "Dữ liệu cấu hình giao diện không hợp lệ." }, { status: 400 });
    }

    const saved = await saveThemeSettings(body.config);
    return Response.json({ ok: true, config: saved });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Không thể lưu cấu hình giao diện." },
      { status: 500 },
    );
  }
}
