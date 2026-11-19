import { all } from "@/lib/db";

// GET /api/v2/province/ward?province=<code> → { items: [{ code, name }] }
export async function GET(req: Request) {
  const province = new URL(req.url).searchParams.get("province") ?? "";
  const items = await all("SELECT code, name FROM wards WHERE province_code = ? ORDER BY name", province);
  return Response.json({ items });
}
