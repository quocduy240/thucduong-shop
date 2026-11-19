import { NextResponse } from "next/server";
import { recordSocialClick } from "@/lib/social-links";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const target = await recordSocialClick(decodeURIComponent(id || ""));
  if (!target) {
    return NextResponse.redirect(new URL("/", _req.url), 302);
  }
  return NextResponse.redirect(target, 302);
}
