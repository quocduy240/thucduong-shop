import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { one } from "@/lib/db";
import { getKiotVietConfig } from "@/lib/kiotviet";
import { ensureRetailOpsSchema, recordInventoryMovement } from "@/lib/retail-ops";
import { safeEqualSecret } from "@/lib/security";

function verifyKiotVietWebhookAuth(req: NextRequest, rawBody: string, secret: string): boolean {
  const directToken =
    req.headers.get("x-webhook-secret") ||
    req.nextUrl.searchParams.get("secret") ||
    "";
  if (directToken && safeEqualSecret(directToken, secret)) {
    return true;
  }

  const rawSig = (
    req.headers.get("x-hub-signature") ||
    req.headers.get("x-signature") ||
    ""
  ).trim();
  if (!rawSig) return false;

  const normalizedSig = rawSig.replace(/^sha256=/i, "").trim();
  const hexHmac = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const base64Hmac = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return (
    safeEqualSecret(normalizedSig.toLowerCase(), hexHmac.toLowerCase()) ||
    safeEqualSecret(normalizedSig, base64Hmac)
  );
}

type KiotVietWebhookInventoryRow = {
  BranchId?: number;
  branchId?: number;
  OnHand?: number;
  onHand?: number;
  Cost?: number;
  cost?: number;
};

type KiotVietWebhookDataItem = {
  Code?: string;
  code?: string;
  ProductCode?: string;
  productCode?: string;
  BranchId?: number;
  branchId?: number;
  OnHand?: number;
  onHand?: number;
  Cost?: number;
  cost?: number;
  Inventories?: KiotVietWebhookInventoryRow[];
  inventories?: KiotVietWebhookInventoryRow[];
};

export async function POST(req: NextRequest) {
  try {
    await ensureRetailOpsSchema();
    const cfg = await getKiotVietConfig();
    // Fail closed: webhook is disabled until a Webhook Secret is configured in /admin/kiotviet/.
    if (!cfg.webhookSecret) {
      return NextResponse.json({ ok: false, error: "Webhook chưa được cấu hình bí mật." }, { status: 503 });
    }

    const rawBody = await req.text();
    if (!verifyKiotVietWebhookAuth(req, rawBody, cfg.webhookSecret)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody || "{}") as {
      Notifications?: {
        Action?: string;
        Data?: KiotVietWebhookDataItem[];
      }[];
      code?: string;
      productCode?: string;
      onHand?: number;
      cost?: number;
    };

    const targetBranchId = Number(cfg.branchId) || 0;
    const items: { code: string; onHand?: number; cost?: number }[] = [];

    for (const notif of body.Notifications ?? []) {
      for (const d of notif.Data ?? []) {
        const code = (d.ProductCode ?? d.productCode ?? d.Code ?? d.code ?? "").trim();
        if (!code) continue;

        const invList = d.Inventories ?? d.inventories;
        if (Array.isArray(invList) && invList.length > 0) {
          const matchedInv = targetBranchId
            ? invList.find((i) => (i.BranchId ?? i.branchId) === targetBranchId) ?? invList[0]
            : invList[0];
          items.push({
            code,
            onHand: matchedInv?.OnHand ?? matchedInv?.onHand,
            cost: matchedInv?.Cost ?? matchedInv?.cost,
          });
        } else {
          const itemBranchId = d.BranchId ?? d.branchId;
          if (targetBranchId && itemBranchId && itemBranchId !== targetBranchId) {
            continue;
          }
          items.push({
            code,
            onHand: d.OnHand ?? d.onHand,
            cost: d.Cost ?? d.cost,
          });
        }
      }
    }

    const directCode = (body.productCode ?? body.code ?? "").trim();
    if (directCode && typeof body.onHand === "number") {
      items.push({ code: directCode, onHand: body.onHand, cost: body.cost });
    }

    let updated = 0;
    for (const item of items) {
      if (typeof item.onHand !== "number") continue;
      const prod = await one<{ id: number; stock: number }>(
        "SELECT id, stock FROM products WHERE kv_code = ? OR sku = ? LIMIT 1",
        item.code,
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
