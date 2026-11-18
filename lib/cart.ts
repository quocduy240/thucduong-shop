import "server-only";
import { cookies } from "next/headers";
import { getProductsByIds, type Product } from "./data";
import { getProductFlashSale } from "./flash-sale";

/** Cart lives in a cookie: { [productId]: qty }. */
export const CART_COOKIE = "cart";
export type CartMap = Record<string, number>;
export type CartLine = { product: Product; qty: number; unit: number; subtotal: number };

export function parseCart(raw: string | undefined): CartMap {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return {};
    const out: CartMap = {};
    for (const [k, q] of Object.entries(v)) {
      const n = Math.floor(Number(q));
      if (/^\d+$/.test(k) && n > 0) out[k] = Math.min(n, 999);
    }
    return out;
  } catch {
    return {};
  }
}

export async function readCart(): Promise<CartMap> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(cart: CartMap) {
  (await cookies()).set(CART_COOKIE, JSON.stringify(cart), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function unitPrice(p: Pick<Product, "id" | "price" | "sale_price">): Promise<number> {
  if (p.id) {
    const fs = await getProductFlashSale(p.id);
    if (fs && fs.flash_price > 0) return fs.flash_price;
  }
  return p.sale_price ?? p.price;
}

export async function cartLines(cart: CartMap): Promise<{ lines: CartLine[]; total: number; count: number }> {
  const products = await getProductsByIds(Object.keys(cart).map(Number));
  const lines = await Promise.all(
    products.map(async (product) => {
      const qty = cart[String(product.id)];
      const unit = await unitPrice(product);
      return { product, qty, unit, subtotal: unit * qty };
    }),
  );
  return {
    lines,
    total: lines.reduce((s, l) => s + l.subtotal, 0),
    count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

export async function addToCart(productId: number, qty = 1, maxStock = 999) {
  const cart = await readCart();
  const key = String(productId);
  const limit = Math.min(Math.max(0, maxStock), 999);
  if (limit > 0) {
    cart[key] = Math.min((cart[key] ?? 0) + Math.max(1, Math.floor(qty)), limit);
    await writeCart(cart);
  }
  return cartLines(cart);
}
