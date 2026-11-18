import { currentAdmin } from "@/lib/auth";
import { getAllBlocks } from "@/lib/blocks";

export async function GET() {
  if (!(await currentAdmin())) {
    return Response.json({ items: [] }, { status: 401 });
  }
  return Response.json({ items: getAllBlocks() });
}
