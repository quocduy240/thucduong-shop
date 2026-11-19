import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { addCrmNote, getCrmCustomers } from "@/lib/crm";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customers = await getCrmCustomers();
  return NextResponse.json({ customers });
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const customerKey = String(b.customerKey ?? "").trim();
  const note = String(b.note ?? "").trim();
  const nextFollowupDate = String(b.nextFollowupDate ?? "").trim() || null;

  if (!customerKey || !note) {
    return NextResponse.json({ error: "Vui lòng nhập nội dung ghi chú chăm sóc." }, { status: 400 });
  }

  await addCrmNote({
    customerKey,
    adminEmail: admin.email,
    note,
    nextFollowupDate,
  });

  const customers = await getCrmCustomers();
  return NextResponse.json({ ok: true, customers });
}
