import { currentAdmin } from "@/lib/auth";
import { saveImage } from "@/lib/uploads";

// POST /admin/upload - used by the "Chèn ảnh" button in the post editor. Returns { url }.
export async function POST(req: Request) {
  if (!(await currentAdmin())) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Không có file." }, { status: 400 });
  try {
    return Response.json({ url: await saveImage(file, "posts") });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}

