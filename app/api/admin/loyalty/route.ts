import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { all, run } from "@/lib/db";
import { awardPoints, spendPoints, type MemberProfile, type PointRule, type RewardItem } from "@/lib/loyalty";

async function loadAdminLoyaltyData() {
  const [rules, rewards, redemptions, profiles] = await Promise.all([
    all<PointRule>("SELECT * FROM point_rules ORDER BY priority ASC, id ASC"),
    all<RewardItem>("SELECT * FROM reward_catalog ORDER BY points_cost ASC, id ASC"),
    all<{
      id: number;
      member_id: number;
      reward_id: number;
      points_spent: number;
      coupon_code: string | null;
      fulfillment_status: string;
      created_at: string;
      reward_name: string;
      full_name: string;
      phone: string | null;
      email: string | null;
    }>(
      `SELECT rr.*, rc.name AS reward_name, mp.full_name, mp.phone, mp.email
       FROM reward_redemptions rr
       JOIN reward_catalog rc ON rc.id = rr.reward_id
       JOIN member_profiles mp ON mp.id = rr.member_id
       ORDER BY rr.created_at DESC, rr.id DESC
       LIMIT 50`,
    ),
    all<MemberProfile>(
      "SELECT * FROM member_profiles WHERE status = 'active' ORDER BY current_points DESC, id DESC LIMIT 50",
    ),
  ]);
  return { rules, rewards, redemptions, profiles };
}

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await loadAdminLoyaltyData());
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const action = String(b.action ?? "");

  if (action === "toggle_rule") {
    const id = Number(b.id);
    const active = b.is_active ? 1 : 0;
    await run("UPDATE point_rules SET is_active = ? WHERE id = ?", active, id);
  } else if (action === "save_reward") {
    const name = String(b.name ?? "").trim();
    const type = String(b.type ?? "discount_coupon");
    const description = String(b.description ?? "").trim();
    const pointsCost = Math.max(1, Math.round(Number(b.points_cost) || 100));
    const minTier = ["bronze", "silver", "gold", "diamond"].includes(String(b.min_tier))
      ? String(b.min_tier)
      : "bronze";
    const stock = b.stock === "" || b.stock === null || b.stock === undefined ? null : Math.max(0, Math.round(Number(b.stock)));
    const value = String(b.value ?? "{}");
    const isActive = b.is_active === false ? 0 : 1;

    if (!name) return NextResponse.json({ error: "Vui lòng nhập tên phần quà." }, { status: 400 });

    if (b.id) {
      await run(
        `UPDATE reward_catalog
         SET type = ?, name = ?, description = ?, points_cost = ?, value = ?, stock = ?, min_tier = ?, is_active = ?
         WHERE id = ?`,
        type,
        name,
        description,
        pointsCost,
        value,
        stock,
        minTier,
        isActive,
        Number(b.id),
      );
    } else {
      await run(
        `INSERT INTO reward_catalog (type, name, description, points_cost, value, stock, min_tier, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        type,
        name,
        description,
        pointsCost,
        value,
        stock,
        minTier,
        isActive,
      );
    }
  } else if (action === "update_redemption") {
    const id = Number(b.id);
    const status = String(b.status ?? "delivered");
    if (!["pending", "delivered", "used", "expired"].includes(status)) {
      return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
    }
    await run(
      "UPDATE reward_redemptions SET fulfillment_status = ?, used_at = CASE WHEN ? = 'used' THEN datetime('now') ELSE used_at END WHERE id = ?",
      status,
      status,
      id,
    );
  } else if (action === "adjust_points") {
    const memberId = Number(b.member_id);
    const delta = Math.round(Number(b.delta) || 0);
    const reason = String(b.reason ?? "").trim() || "Điều chỉnh điểm bởi quản trị viên";
    if (!memberId || delta === 0) {
      return NextResponse.json({ error: "Vui lòng chọn thành viên và số điểm khác 0." }, { status: 400 });
    }
    if (delta > 0) {
      await awardPoints({
        memberId,
        source: "admin_adjust",
        amount: delta,
        description: `[Admin] ${reason}`,
        metadata: { admin_email: admin.email },
      });
    } else {
      const sp = await spendPoints({
        memberId,
        amount: Math.abs(delta),
        source: "admin_adjust",
        referenceType: "admin",
        description: `[Admin] ${reason}`,
        metadata: { admin_email: admin.email },
      });
      if (!sp.ok) return NextResponse.json({ error: sp.error }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...(await loadAdminLoyaltyData()) });
}
