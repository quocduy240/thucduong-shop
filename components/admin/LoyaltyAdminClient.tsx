"use client";

import { useState } from "react";
import type { MemberProfile, PointRule, RewardItem } from "@/lib/loyalty";

type AdminRedemption = {
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
};

export default function LoyaltyAdminClient({
  initialRules,
  initialRewards,
  initialRedemptions,
  initialProfiles,
}: {
  initialRules: PointRule[];
  initialRewards: RewardItem[];
  initialRedemptions: AdminRedemption[];
  initialProfiles: MemberProfile[];
}) {
  const [rules, setRules] = useState(initialRules);
  const [rewards, setRewards] = useState(initialRewards);
  const [redemptions, setRedemptions] = useState(initialRedemptions);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // New reward form
  const [rName, setRName] = useState("");
  const [rType, setRType] = useState<RewardItem["type"]>("discount_coupon");
  const [rPoints, setRPoints] = useState(150);
  const [rTier, setRTier] = useState<RewardItem["min_tier"]>("bronze");
  const [rDesc, setRDesc] = useState("");
  const [rStock, setRStock] = useState("");
  const [rVal, setRVal] = useState('{"discount_type":"fixed","discount_value":30000,"min_order":200000}');

  // Adjust points form
  const [adjMemberId, setAdjMemberId] = useState<number>(initialProfiles[0]?.id ?? 0);
  const [adjDelta, setAdjDelta] = useState(50);
  const [adjReason, setAdjReason] = useState("");

  async function postAction(payload: Record<string, unknown>, okText: string) {
    setMsg("");
    setErr("");
    const res = await fetch("/api/admin/loyalty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) {
      setErr(d.error ?? "Thao tác thất bại.");
      return false;
    }
    setRules(d.rules);
    setRewards(d.rewards);
    setRedemptions(d.redemptions);
    setProfiles(d.profiles);
    setMsg(okText);
    return true;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-5 shadow-2xs">
        <h1 className="text-xl font-extrabold text-gray-900">🎁 Quản trị Tích điểm &amp; Đổi quà (Loyalty)</h1>
        <p className="mt-1 text-xs text-gray-500">
          Quản lý rule tích điểm, kho quà tặng, duyệt đơn đổi quà và điều chỉnh điểm qua sổ cái <code>point_transactions</code>.
        </p>
      </div>

      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
            err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* 1. Redemptions Fulfillment */}
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="mb-3 text-base font-bold text-gray-900">📦 Danh sách Đổi quà ({redemptions.length})</h2>
        {redemptions.length === 0 ? (
          <p className="text-xs text-gray-500">Chưa có lượt đổi quà nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50 uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2">Khách hàng</th>
                  <th className="px-3 py-2">Phần quà</th>
                  <th className="px-3 py-2">Điểm</th>
                  <th className="px-3 py-2">Mã / Trạng thái</th>
                  <th className="px-3 py-2">Cập nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {redemptions.map((rr) => (
                  <tr key={rr.id}>
                    <td className="px-3 py-2">
                      <div className="font-bold text-gray-900">{rr.full_name || "Khách"}</div>
                      <div className="text-gray-400">{rr.phone || rr.email}</div>
                    </td>
                    <td className="px-3 py-2 font-medium">{rr.reward_name}</td>
                    <td className="px-3 py-2 font-bold text-red-600">-{rr.points_spent}</td>
                    <td className="px-3 py-2">
                      {rr.coupon_code && <div className="font-mono font-bold text-brand">{rr.coupon_code}</div>}
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase">
                        {rr.fulfillment_status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={rr.fulfillment_status}
                        onChange={(e) =>
                          postAction(
                            { action: "update_redemption", id: rr.id, status: e.target.value },
                            "✓ Đã cập nhật trạng thái đổi quà.",
                          )
                        }
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="pending">pending</option>
                        <option value="delivered">delivered</option>
                        <option value="used">used</option>
                        <option value="expired">expired</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Reward Catalog + Add Form */}
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-gray-900">🏆 Kho Quà Tặng ({rewards.length})</h2>
          <div className="space-y-2.5">
            {rewards.map((rw) => (
              <div key={rw.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-xs">
                <div>
                  <div className="font-bold text-gray-900">
                    {rw.name}{" "}
                    <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-amber-800">{rw.points_cost}đ</span>
                  </div>
                  <div className="text-gray-500">
                    Loại: {rw.type} · Hạng: {rw.min_tier} · Kho: {rw.stock ?? "Không giới hạn"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    postAction(
                      {
                        action: "save_reward",
                        id: rw.id,
                        name: rw.name,
                        type: rw.type,
                        description: rw.description,
                        points_cost: rw.points_cost,
                        min_tier: rw.min_tier,
                        stock: rw.stock,
                        value: rw.value,
                        is_active: rw.is_active === 1 ? false : true,
                      },
                      "✓ Đã cập nhật trạng thái phần quà.",
                    )
                  }
                  className={`cursor-pointer rounded-lg px-2.5 py-1 font-bold ${
                    rw.is_active === 1 ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {rw.is_active === 1 ? "Đang bật" : "Đang tắt"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              {
                action: "save_reward",
                name: rName,
                type: rType,
                description: rDesc,
                points_cost: rPoints,
                min_tier: rTier,
                stock: rStock === "" ? null : Number(rStock),
                value: rVal,
                is_active: true,
              },
              "✓ Đã thêm phần quà mới vào kho!",
            );
            if (ok) {
              setRName("");
              setRDesc("");
            }
          }}
          className="space-y-3 rounded-2xl border bg-white p-5 text-xs"
        >
          <h3 className="text-sm font-bold text-gray-900">➕ Thêm Quà Mới</h3>
          <input
            required
            value={rName}
            onChange={(e) => setRName(e.target.value)}
            placeholder="Tên phần quà *"
            className="w-full rounded-lg border px-3 py-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={rType} onChange={(e) => setRType(e.target.value as RewardItem["type"])} className="rounded-lg border px-2 py-2">
              <option value="discount_coupon">Mã giảm giá</option>
              <option value="free_shipping">Freeship</option>
              <option value="gift_item">Quà hiện vật</option>
              <option value="cash_credit">Tiền mặt / Ví</option>
            </select>
            <select value={rTier} onChange={(e) => setRTier(e.target.value as RewardItem["min_tier"])} className="rounded-lg border px-2 py-2">
              <option value="bronze">Từ Bronze</option>
              <option value="silver">Từ Silver</option>
              <option value="gold">Từ Gold</option>
              <option value="diamond">Từ Diamond</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={1}
              value={rPoints}
              onChange={(e) => setRPoints(Number(e.target.value))}
              placeholder="Số điểm đổi"
              className="rounded-lg border px-3 py-2"
            />
            <input
              type="number"
              min={0}
              value={rStock}
              onChange={(e) => setRStock(e.target.value)}
              placeholder="Số lượng (trống = ∞)"
              className="rounded-lg border px-3 py-2"
            />
          </div>
          <input
            value={rDesc}
            onChange={(e) => setRDesc(e.target.value)}
            placeholder="Mô tả ngắn"
            className="w-full rounded-lg border px-3 py-2"
          />
          <textarea
            rows={2}
            value={rVal}
            onChange={(e) => setRVal(e.target.value)}
            className="w-full rounded-lg border p-2 font-mono text-[11px]"
          />
          <button className="w-full cursor-pointer rounded-xl bg-brand py-2.5 font-bold text-white hover:bg-brand-dark">
            Lưu phần quà
          </button>
        </form>
      </section>

      {/* 3. Rules & Manual Ledger Adjustment */}
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-gray-900">⚙️ Rule Tích Điểm ({rules.length})</h2>
          <div className="space-y-2 text-xs">
            {rules.map((rl) => (
              <div key={rl.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <div>
                  <div className="font-bold text-gray-900">
                    {rl.name} <code className="text-[10px] text-gray-400">({rl.code})</code>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-gray-500">{rl.points_formula}</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    postAction(
                      { action: "toggle_rule", id: rl.id, is_active: rl.is_active !== 1 },
                      `✓ Đã ${rl.is_active === 1 ? "tắt" : "bật"} rule "${rl.name}".`,
                    )
                  }
                  className={`shrink-0 cursor-pointer rounded-lg px-2.5 py-1 font-bold ${
                    rl.is_active === 1 ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {rl.is_active === 1 ? "Bật" : "Tắt"}
                </button>
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await postAction(
              { action: "adjust_points", member_id: adjMemberId, delta: adjDelta, reason: adjReason },
              "✓ Đã ghi giao dịch điều chỉnh điểm vào sổ cái!",
            );
            if (ok) setAdjReason("");
          }}
          className="space-y-3 rounded-2xl border bg-white p-5 text-xs"
        >
          <h3 className="text-sm font-bold text-gray-900">⚖️ Điều chỉnh Điểm (Qua Ledger)</h3>
          <select
            value={adjMemberId}
            onChange={(e) => setAdjMemberId(Number(e.target.value))}
            className="w-full rounded-lg border px-2.5 py-2"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name || p.phone || p.email} ({p.current_points}đ · {p.tier})
              </option>
            ))}
          </select>
          <input
            type="number"
            value={adjDelta}
            onChange={(e) => setAdjDelta(Number(e.target.value))}
            placeholder="VD: 50 hoặc -50"
            className="w-full rounded-lg border px-3 py-2"
          />
          <input
            required
            value={adjReason}
            onChange={(e) => setAdjReason(e.target.value)}
            placeholder="Lý do điều chỉnh *"
            className="w-full rounded-lg border px-3 py-2"
          />
          <button className="w-full cursor-pointer rounded-xl bg-gray-900 py-2.5 font-bold text-white hover:bg-black">
            Ghi nhận biến động điểm
          </button>
        </form>
      </section>
    </div>
  );
}
