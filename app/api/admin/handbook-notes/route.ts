import { getHandbookCustomNotes, recordAuditLog, saveHandbookCustomNote } from "@/lib/audit-log";
import { currentAdmin } from "@/lib/auth";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Chưa đăng nhập." }, { status: 401 });
  const notes = await getHandbookCustomNotes();
  return Response.json({ notes, role: admin.role, email: admin.email });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin || (admin.role !== "super_admin" && admin.role !== "admin")) {
    return Response.json({ error: "Chỉ Super Admin hoặc Quản lý mới được sửa Quy định nội bộ." }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { sectionId?: string; noteText?: string };
  const sectionId = String(body.sectionId || "dashboard").trim();
  const noteText = String(body.noteText ?? "").trim();

  await saveHandbookCustomNote(sectionId, noteText, admin.email);
  await recordAuditLog({
    actor: admin,
    module: "settings",
    action: "update_sop_note",
    severity: "info",
    entityType: "handbook_note",
    entityId: sectionId,
    entityLabel: `Quy định SOP nội bộ (${sectionId})`,
    diffSummary: noteText
      ? `Cập nhật ghi chú quy định cửa hàng cho mục [${sectionId}]: "${noteText.slice(0, 120)}"`
      : `Đã xóa ghi chú quy định nội bộ mục [${sectionId}]`,
  });

  const notes = await getHandbookCustomNotes();
  return Response.json({ ok: true, notes });
}
