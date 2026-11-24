import { currentAdminForPath } from "@/lib/auth";
import { getAllBlocks } from "@/lib/blocks";

export async function GET() {
  if (!(await currentAdminForPath("/admin/blocks/"))) {
    return Response.json({ items: [] }, { status: 401 });
  }
  return Response.json({ items: await getAllBlocks() });
}
