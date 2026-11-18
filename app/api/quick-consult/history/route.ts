import { currentAdmin } from "@/lib/auth";
import { currentMember } from "@/lib/member-auth";
import { getPatientHistoryByPhone } from "@/lib/quick-consult";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = (searchParams.get("phone") ?? "").replace(/\s+/g, "").trim();
  if (phone.length < 7) {
    return Response.json({ ok: true, items: [] });
  }

  const [admin, member] = await Promise.all([currentAdmin(), currentMember()]);
  const memberPhone = (member?.phone ?? "").replace(/\s+/g, "").trim();
  const isAuthorized = Boolean(admin) || (Boolean(memberPhone) && memberPhone === phone);

  const rawItems = await getPatientHistoryByPhone(phone);
  if (!isAuthorized) {
    // Prevent IDOR/PII enumeration: only return anonymized count without names or share_token links
    return Response.json({
      ok: true,
      restricted: true,
      count: rawItems.length,
      items: [],
    });
  }

  return Response.json({ ok: true, restricted: false, items: rawItems });
}
