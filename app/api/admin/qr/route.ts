import { currentAdmin } from "@/lib/auth";
import { getActiveQrCodes } from "@/lib/qr";

export async function GET() {
  if (!(await currentAdmin())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const items = await getActiveQrCodes();
  return Response.json({ items });
}
