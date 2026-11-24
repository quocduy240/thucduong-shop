import { currentAdminForPath } from "@/lib/auth";
import { getActiveQrCodes } from "@/lib/qr";

export async function GET() {
  if (!(await currentAdminForPath("/admin/qr/"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await getActiveQrCodes();
  return Response.json({ items });
}
