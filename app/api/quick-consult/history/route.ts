import { getPatientHistoryByPhone } from "@/lib/quick-consult";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone") ?? "";
  if (phone.replace(/\s+/g, "").length < 7) {
    return Response.json({ ok: true, items: [] });
  }
  const items = await getPatientHistoryByPhone(phone);
  return Response.json({ ok: true, items });
}
