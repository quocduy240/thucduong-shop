import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { ROLE_META } from "@/lib/rbac";

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) {
    return NextResponse.json(
      { isAdmin: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    {
      isAdmin: true,
      admin: {
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
        role: admin.role,
        roleLabel: ROLE_META[admin.role]?.shortLabel ?? admin.role,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
