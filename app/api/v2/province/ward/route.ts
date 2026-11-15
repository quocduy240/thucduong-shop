import { all } from "@/lib/db";

// GET /api/v2/province/ward?province=<code> → { items: [{ code, name }] }
export function GET(req: Request) {
  const province = new URL(req.url).searchParams.get("province") ?? "";
  return Response.json({ items: all("SELECT code, name FROM wards WHERE province_code = ? ORDER BY name", province) });
}
