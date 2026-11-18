import { NextResponse } from "next/server";
import { cartLines, readCart } from "@/lib/cart";
import { currentMember } from "@/lib/member-auth";

export async function GET() {
  try {
    const [cart, member] = await Promise.all([readCart(), currentMember()]);
    const { count } = await cartLines(cart);
    return NextResponse.json(
      {
        cartCount: count,
        memberName: member?.name ?? null,
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { cartCount: 0, memberName: null },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  }
}
