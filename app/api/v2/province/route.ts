import { all } from "@/lib/db";

// GET /api/v2/province → { items: [{ code, name }] }
export async function GET() {
  const items = await all("SELECT code, name FROM provinces ORDER BY name");
  return Response.json({ items });
}
