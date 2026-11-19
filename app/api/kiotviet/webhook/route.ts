import { NextRequest, NextResponse } from "next/server";
import { one } from "@/lib/db";
import { getKiotVietConfig } from "@/lib/kiotviet";
import { ensureRetailOpsSchema, recordInventoryMovement } from "@/lib/retail-ops";

export async function POST(req: NextRequest) {
  try {
    await ensureRetailOpsSchema();
    const cfg = await getKiotVietConfig();
    if (cfg.webhookSecret) {
      const provided =
        req.headers.get("x-webhook-secret") ||
        req.nextUrl.searchParams.get("secret") ||
        "";
      if (provided !== cfg.webhookSecret) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = (await req.json().catch(() => ({}))) as {
      Notifications?: {
        Data?: {
          Code?: string;
          code?: string;
          OnHand?: number;
          onHand?: number;
          Cost?: number;
          cost?: number;
        }[];
      }[];
      code?: string;
      onHand?: number;
    };

    const items: { code: string; onHand?: number; cost?: number }[] = [];
    for (const notif of body.Notifications ?? []) {
      for (const d of notif.Data ?? []) {
        const code = (d.Code ?? d.code ?? "").trim();
        if (code) {
          items.push({
            code,
            onHand: d.OnHand ?? d.onHand,
            cost: d.Cost ?? d.cost,
          });
        }
      }
    }
    if (body.code && typeof body.onHand === "number") {
      items.push({ code: body.code.trim(), onHand: body.onHand });
    }

    let updated = 0;
    for (const item of items) {
      if (typeof item.onHand !== "number") continue;
      const prod = await one<{ id: number; stock: number }>(
        "SELECT id, stock FROM products WHERE sku = ? LIMIT 1",
        item.code,
      );
      if (!prod) continue;
      const target = Math.max(0, Math.round(item.onHand));
      const diff = target - prod.stock;
      if (diff !== 0) {
        await recordInventoryMovement({
          productId: prod.id,
          changeQty: diff,
          unitCost: typeof item.cost === "number" ? Math.round(item.cost) : undefined,
          updateCostPrice: typeof item.cost === "number",
          reason: "kiotviet_sync",
          refCode: item.code,
          note: "Webhook KiotViet cập nhật tồn kho",
          createdBy: "kiotviet-webhook",
        });
        updated++;
      }
    }

    return NextResponse.json({ ok: true, received: items.length, updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
