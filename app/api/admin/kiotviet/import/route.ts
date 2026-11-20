import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import {
  applyKiotVietImport,
  buildKiotVietPreview,
  parseKiotVietSpreadsheet,
  type KiotVietImportOptions,
} from "@/lib/kiotviet-import";

export async function POST(req: NextRequest) {
  try {
    const admin = await currentAdmin();
    if (!admin || (admin.role !== "super_admin" && admin.role !== "admin")) {
      return NextResponse.json({ ok: false, error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ ok: false, error: "Vui lòng chọn file Excel (.xlsx) hoặc CSV từ KiotViet." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "File quá lớn (tối đa 10MB)." }, { status: 400 });
    }

    const mode = String(formData.get("mode") ?? "preview");
    const opts: KiotVietImportOptions = {
      createCategories: formData.get("create_categories") !== "0",
      overwritePriceStock: formData.get("overwrite_price_stock") !== "0",
      publishImported: formData.get("publish_imported") !== "0",
      skipServices: formData.get("skip_services") !== "0",
    };

    const bytes = new Uint8Array(await file.arrayBuffer());
    const rows = parseKiotVietSpreadsheet(bytes, file.name);

    if (mode === "apply") {
      const result = await applyKiotVietImport(rows, opts);
      revalidatePath("/", "layout");
      return NextResponse.json({ ok: true, mode: "apply", result });
    }

    const preview = await buildKiotVietPreview(rows, opts);
    return NextResponse.json({ ok: true, mode: "preview", preview });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message || "Lỗi xử lý file." }, { status: 500 });
  }
}
