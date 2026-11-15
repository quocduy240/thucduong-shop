import { all } from "@/lib/db";

// GET /api/v2/province → { items: [{ code, name }] }
export function GET() {
  return Response.json({ items: all("SELECT code, name FROM provinces ORDER BY name") });
}
