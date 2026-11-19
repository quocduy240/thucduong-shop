import { one, run } from "@/lib/db";
import { currentMember } from "@/lib/member-auth";
import { awardDownloadDocPoints } from "@/lib/loyalty-events";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const docId = Number(b.documentId);
  const doc = await one<{ id: number; title: string; access_mode: string; drive_url: string }>(
    "SELECT id, title, access_mode, drive_url FROM documents WHERE id = ?",
    docId,
  );
  if (!doc) {
    return Response.json({ error: "Tài liệu không tồn tại." }, { status: 404 });
  }

  const mode = String(b.mode || doc.access_mode);
  const name = String(b.name ?? "").trim().slice(0, 100);
  const contact = String(b.contact ?? "").trim().slice(0, 100);
  const answer = String(b.answer ?? "").trim().slice(0, 1000);
  const orderCode = String(b.orderCode ?? "").trim().toUpperCase();

  if (mode === "survey") {
    if (!name || !contact || !answer) {
      return Response.json(
        { error: "Vui lòng nhập họ tên, SĐT/Email và câu trả lời khảo sát để mở khóa tài liệu." },
        { status: 400 },
      );
    }
    await run(
      "INSERT INTO document_leads (document_id, name, contact, answer) VALUES (?, ?, ?, ?)",
      doc.id,
      name,
      contact,
      `[Khảo sát] ${answer}`,
    );
  } else if (mode === "bundle_verify") {
    if (!orderCode) {
      return Response.json({ error: "Vui lòng nhập Mã đơn hàng hoặc Số điện thoại đặt hàng." }, { status: 400 });
    }
    const foundOrder = await one<{ code: string; name: string; phone: string }>(
      "SELECT code, name, phone FROM orders WHERE UPPER(code) = ? OR phone = ? LIMIT 1",
      orderCode,
      orderCode,
    );
    if (!foundOrder && !orderCode.startsWith("TD") && !/^0\d{9,10}$/.test(orderCode)) {
      return Response.json(
        { error: "Không tìm thấy mã đơn hàng hoặc số điện thoại này. Bạn cũng có thể đặt mua sản phẩm kèm tặng phẩm bên dưới!" },
        { status: 400 },
      );
    }
    await run(
      "INSERT INTO document_leads (document_id, name, contact, answer) VALUES (?, ?, ?, ?)",
      doc.id,
      foundOrder?.name || name || "Khách hàng thân thiết",
      foundOrder?.phone || orderCode,
      `[Mở khóa đơn hàng] Mã/SĐT: ${orderCode}`,
    );
  } else if (mode === "paid_verify") {
    if (!name || !contact) {
      return Response.json(
        { error: "Vui lòng nhập Họ tên và Số điện thoại chuyển khoản để xác nhận mở khóa." },
        { status: 400 },
      );
    }
    await run(
      "INSERT INTO document_leads (document_id, name, contact, answer) VALUES (?, ?, ?, ?)",
      doc.id,
      name,
      contact,
      `[Xác nhận CK] ${answer || "Đã chuyển khoản BIDV 8610312888"}`,
    );
  }

  await run("UPDATE documents SET downloads = downloads + 1 WHERE id = ?", doc.id);
  const member = await currentMember();
  if (member) {
    await awardDownloadDocPoints(member.id, doc.id, doc.title);
  }
  return Response.json({ ok: true, downloadUrl: doc.drive_url });
}
