import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { canAccessAdminPath } from "@/lib/rbac";
import { getSocialLinksConfig, saveSocialLinksConfig } from "@/lib/social-links";
import type { SocialLinksConfig } from "@/lib/social-links-shared";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAdminPath(admin.role, "/admin/social-links/")) {
    return NextResponse.json({ error: "Không có quyền truy cập." }, { status: 403 });
  }
  const config = await getSocialLinksConfig();
  return NextResponse.json({ config });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessAdminPath(admin.role, "/admin/social-links/")) {
    return NextResponse.json({ error: "Không có quyền chỉnh sửa cấu hình này." }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    config?: Partial<SocialLinksConfig>;
  };

  if (body.action === "reset_clicks") {
    const current = await getSocialLinksConfig();
    const next = await saveSocialLinksConfig({
      ...current,
      channels: current.channels.map((c) => ({ ...c, clicks: 0 })),
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, config: next });
  }

  if (!body.config || typeof body.config !== "object") {
    return NextResponse.json({ error: "Dữ liệu cấu hình không hợp lệ." }, { status: 400 });
  }

  const saved = await saveSocialLinksConfig(body.config);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, config: saved });
}
