import { NextResponse } from "next/server";
import { cartLines, readCart } from "@/lib/cart";
import { getCrossSellProducts } from "@/lib/data";

const FREESHIP_THRESHOLD = 500000;

export async function GET() {
  const cart = await readCart();
  const { lines, total, count } = await cartLines(cart);
  const excludeIds = lines.map((l) => l.product.id);
  const suggestions = await getCrossSellProducts(excludeIds, 3);

  return NextResponse.json(
    {
      count,
      subtotal: total,
      freeshipThreshold: FREESHIP_THRESHOLD,
      items: lines.map((l) => ({
        id: l.product.id,
        name: l.product.name,
        image: l.product.image,
        unitPrice: l.unit,
        qty: l.qty,
        lineTotal: l.subtotal,
        href: `/san-pham/${l.product.category_slug}/${l.product.slug}.html`,
      })),
      suggestions: suggestions.map((s) => ({
        id: s.id,
        name: s.name,
        image: s.image,
        price: s.sale_price ?? s.price,
      })),
    },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
