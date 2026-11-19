import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import {
  addCrmNote,
  addCustomerTag,
  getCrmDashboardData,
  markAutomationSent,
  markFollowupsDone,
  removeCustomerTag,
  runCrmEmailAutomation,
} from "@/lib/crm";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getCrmDashboardData());
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "add_note");

  if (action === "add_note") {
    const customerKey = String(b.customerKey ?? "").trim();
    const note = String(b.note ?? "").trim();
    const nextFollowupDate = String(b.nextFollowupDate ?? "").trim() || null;
    if (!customerKey || !note) {
      return NextResponse.json({ error: "Vui lòng nhập nội dung ghi chú chăm sóc." }, { status: 400 });
    }
    await addCrmNote({ customerKey, adminEmail: admin.email, note, nextFollowupDate });
  } else if (action === "done_followup") {
    await markFollowupsDone(String(b.customerKey ?? "").trim());
  } else if (action === "add_tag") {
    await addCustomerTag(String(b.customerKey ?? "").trim(), String(b.tag ?? "").trim());
  } else if (action === "remove_tag") {
    await removeCustomerTag(String(b.customerKey ?? "").trim(), String(b.tag ?? "").trim());
  } else if (action === "mark_automation_sent") {
    await markAutomationSent(
      Number(b.orderId),
      String(b.stepCode ?? ""),
      String(b.channel ?? "zalo_manual"),
      String(b.recipient ?? ""),
    );
  } else if (action === "run_email_automation") {
    const res = await runCrmEmailAutomation();
    return NextResponse.json({ ok: true, emailResult: res, ...(await getCrmDashboardData()) });
  } else {
    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...(await getCrmDashboardData()) });
}
