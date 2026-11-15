import { one, run } from "@/lib/db";

// POST /submit-comment  body: { product_id, name, content }
// TODO: add captcha / rate limiting before going live.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.product_id);
  const name = String(b.name ?? "").trim().slice(0, 100);
  const content = String(b.content ?? "").trim().slice(0, 2000);
  if (!name || !content) return Response.json({ error: "Vui lòng nhập họ tên và nội dung." }, { status: 400 });
  if (!one("SELECT 1 FROM products WHERE id = ?", id)) return Response.json({ error: "Sản phẩm không tồn tại." }, { status: 404 });
  run("INSERT INTO comments (product_id, name, content) VALUES (?, ?, ?)", id, name, content);
  return Response.json({ success: true });
}
