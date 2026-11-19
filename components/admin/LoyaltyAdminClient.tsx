"use client";

import { useEffect, useState } from "react";
import type { MemberProfile, PointRule, RewardItem } from "@/lib/loyalty";
import LoyaltyGuideDrawer from "./LoyaltyGuideDrawer";
import {
  describePointRule,
  describeRewardValue,
  parsePointFormula,
  parseRewardValue,
  serializePointFormula,
  serializeRewardValue,
  TIER_LABELS,
  type LoyaltyTierKey,
  type ParsedPointFormula,
} from "@/lib/loyalty-rules-shared";

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

const REWARD_TYPE_LABELS: Record<RewardItem["type"], string> = {
  discount_coupon: "Mã giảm giá",
  free_shipping: "Miễn phí vận chuyển",
  gift_item: "Quà hiện vật",
  cash_credit: "Tiền mặt / Ví",
};

const REDEMPTION_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  delivered: "Đã gửi / Đã cấp mã",
  used: "Đã sử dụng",
  expired: "Hết hạn",
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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Add / Edit reward form (100% visual fields, no raw JSON)
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [rName, setRName] = useState("");
  const [rType, setRType] = useState<RewardItem["type"]>("discount_coupon");
  const [rPoints, setRPoints] = useState(150);
  const [rTier, setRTier] = useState<RewardItem["min_tier"]>("bronze");
  const [rDesc, setRDesc] = useState("");
  const [rStock, setRStock] = useState("");
  const [rDiscountType, setRDiscountType] = useState<"fixed" | "percent">("fixed");
  const [rDiscountVal, setRDiscountVal] = useState(30000);
  const [rMinOrder, setRMinOrder] = useState(200000);
  const [rMaxDiscount, setRMaxDiscount] = useState(100000);
  const [rGiftSku, setRGiftSku] = useState("");

  // Edit rule state
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [editingRuleName, setEditingRuleName] = useState("");
  const [editingFormula, setEditingFormula] = useState<ParsedPointFormula | null>(null);

  // Adjust points form
  const [adjMemberId, setAdjMemberId] = useState<number>(initialProfiles[0]?.id ?? 0);
  const [adjDelta, setAdjDelta] = useState(50);
  const [adjReason, setAdjReason] = useState("");

  useEffect(() => {
    if (profiles.length > 0 && !profiles.some((p) => p.id === adjMemberId)) {
      setAdjMemberId(profiles[0].id);
    }
  }, [profiles, adjMemberId]);

  async function postAction(payload: Record<string, unknown>, okText: string) {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(d.error ?? "Thao tác thất bại.");
        return false;
      }
      setRules(d.rules ?? []);
      setRewards(d.rewards ?? []);
      setRedemptions(d.redemptions ?? []);
      setProfiles(d.profiles ?? []);
      setMsg(okText);
      return true;
    } catch {
      setErr("Lỗi kết nối máy chủ, vui lòng thử lại.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function resetRewardForm() {
    setEditingRewardId(null);
    setRName("");
    setRType("discount_coupon");
    setRPoints(150);
    setRTier("bronze");
    setRDesc("");
    setRStock("");
    setRDiscountType("fixed");
    setRDiscountVal(30000);
    setRMinOrder(200000);
    setRMaxDiscount(100000);
    setRGiftSku("");
  }

  function startEditReward(rw: RewardItem) {
    const parsed = parseRewardValue(rw.value);
    setEditingRewardId(rw.id);
    setRName(rw.name);
    setRType(rw.type);
    setRPoints(rw.points_cost);
    setRTier(rw.min_tier);
    setRDesc(rw.description || "");
    setRStock(rw.stock === null || rw.stock === undefined ? "" : String(rw.stock));
    setRDiscountType(parsed.discountType);
    setRDiscountVal(parsed.discountValue || 30000);
    setRMinOrder(parsed.minOrder || 0);
    setRMaxDiscount(parsed.maxDiscount || 100000);
    setRGiftSku(parsed.giftSku || "");
  }

  function startEditRule(rl: PointRule) {
    setEditingRuleId(rl.id);
    setEditingRuleName(rl.name);
    setEditingFormula(parsePointFormula(rl.points_formula));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">🎁 Quản trị Tích điểm &amp; Đổi quà (Loyalty)</h1>
          <p className="mt-1 text-xs text-gray-500">
            Thiết lập công thức tích điểm theo hạng thành viên, quản lý kho quà tặng, duyệt đơn đổi quà và cộng/trừ điểm thủ công.
          </p>
        </div>
        <LoyaltyGuideDrawer />
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
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold">
                        {REDEMPTION_STATUS_LABELS[rr.fulfillment_status] ?? rr.fulfillment_status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        disabled={busy}
                        value={rr.fulfillment_status}
                        onChange={(e) =>
                          postAction(
                            { action: "update_redemption", id: rr.id, status: e.target.value },
                            "✓ Đã cập nhật trạng thái đổi quà.",
                          )
                        }
                        className="cursor-pointer rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 disabled:opacity-50"
                      >
                        <option value="pending">Chờ xử lý</option>
                        <option value="delivered">Đã gửi / Đã cấp mã</option>
                        <option value="used">Đã sử dụng</option>
                        <option value="expired">Hết hạn</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Reward Catalog + Visual Add/Edit Form */}
      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-base font-bold text-gray-900">🏆 Kho Quà Tặng ({rewards.length})</h2>
          <div className="space-y-2.5">
            {rewards.map((rw) => (
              <div key={rw.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900">
                    {rw.name}{" "}
                    <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-amber-800">{rw.points_cost} điểm</span>
                  </div>
                  <div className="mt-0.5 text-gray-600">
                    {describeRewardValue(rw.type, rw.value)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-gray-400">
                    {REWARD_TYPE_LABELS[rw.type]} · Từ hạng {TIER_LABELS[rw.min_tier]} · Kho:{" "}
                    {rw.stock ?? "Không giới hạn"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => startEditReward(rw)}
                    className="cursor-pointer rounded-lg border px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    ✏️ Sửa
                  </button>
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
              </div>
            ))}
          </div>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const serializedVal = serializeRewardValue(rType, {
              discountType: rDiscountType,
              discountValue: rDiscountVal,
              minOrder: rMinOrder,
              maxDiscount: rMaxDiscount,
              giftSku: rGiftSku,
            });
            const ok = await postAction(
              {
                action: "save_reward",
                id: editingRewardId ?? undefined,
                name: rName,
                type: rType,
                description: rDesc,
                points_cost: rPoints,
                min_tier: rTier,
                stock: rStock === "" ? null : Number(rStock),
                value: serializedVal,
                is_active: true,
              },
              editingRewardId ? "✓ Đã cập nhật phần quà!" : "✓ Đã thêm phần quà mới vào kho!",
            );
            if (ok) resetRewardForm();
          }}
          className="space-y-3 rounded-2xl border bg-white p-5 text-xs"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">
              {editingRewardId ? "✏️ Chỉnh sửa Phần quà" : "➕ Thêm Quà Mới"}
            </h3>
            {editingRewardId && (
              <button
                type="button"
                onClick={resetRewardForm}
                className="cursor-pointer text-[11px] font-semibold text-gray-500 hover:underline"
              >
                Huỷ sửa
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block font-semibold text-gray-700">Tên phần quà *</label>
            <input
              required
              value={rName}
              onChange={(e) => setRName(e.target.value)}
              placeholder="VD: Voucher Giảm 50.000đ"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-semibold text-gray-700">Loại phần quà</label>
              <select
                value={rType}
                onChange={(e) => setRType(e.target.value as RewardItem["type"])}
                className="w-full rounded-lg border px-2 py-2"
              >
                <option value="discount_coupon">Mã giảm giá</option>
                <option value="free_shipping">Miễn phí vận chuyển</option>
                <option value="gift_item">Quà hiện vật</option>
                <option value="cash_credit">Tiền mặt / Ví</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold text-gray-700">Hạng tối thiểu</label>
              <select
                value={rTier}
                onChange={(e) => setRTier(e.target.value as RewardItem["min_tier"])}
                className="w-full rounded-lg border px-2 py-2"
              >
                <option value="bronze">Từ Đồng</option>
                <option value="silver">Từ Bạc</option>
                <option value="gold">Từ Vàng</option>
                <option value="diamond">Từ Kim cương</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block font-semibold text-gray-700">Số điểm cần đổi</label>
              <input
                type="number"
                min={1}
                value={rPoints}
                onChange={(e) => setRPoints(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold text-gray-700">Số lượng (trống = ∞)</label>
              <input
                type="number"
                min={0}
                value={rStock}
                onChange={(e) => setRStock(e.target.value)}
                placeholder="Không giới hạn"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          {rType === "gift_item" ? (
            <div>
              <label className="mb-1 block font-semibold text-gray-700">Mã quà / Ghi chú đóng gói</label>
              <input
                value={rGiftSku}
                onChange={(e) => setRGiftSku(e.target.value)}
                placeholder="VD: TRA-BANCHA-100G"
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
              <div className="font-bold text-emerald-900">Giá trị ưu đãi của mã</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">Kiểu giảm</label>
                  <select
                    value={rDiscountType}
                    onChange={(e) => setRDiscountType(e.target.value as "fixed" | "percent")}
                    className="w-full rounded-lg border bg-white px-2 py-1.5"
                  >
                    <option value="fixed">Giảm tiền mặt (đ)</option>
                    <option value="percent">Giảm theo %</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">
                    {rDiscountType === "percent" ? "Mức giảm (%)" : "Số tiền giảm (đ)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rDiscountVal}
                    onChange={(e) => setRDiscountVal(Number(e.target.value))}
                    className="w-full rounded-lg border bg-white px-2.5 py-1.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-gray-600">Đơn tối thiểu (đ)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={rMinOrder}
                    onChange={(e) => setRMinOrder(Number(e.target.value))}
                    className="w-full rounded-lg border bg-white px-2.5 py-1.5"
                  />
                </div>
                {rDiscountType === "percent" && (
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-gray-600">Giảm tối đa (đ)</label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={rMaxDiscount}
                      onChange={(e) => setRMaxDiscount(Number(e.target.value))}
                      className="w-full rounded-lg border bg-white px-2.5 py-1.5"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block font-semibold text-gray-700">Mô tả ngắn cho khách xem</label>
            <input
              value={rDesc}
              onChange={(e) => setRDesc(e.target.value)}
              placeholder="VD: Áp dụng cho đơn từ 200.000đ trở lên"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <button className="w-full cursor-pointer rounded-xl bg-brand py-2.5 font-bold text-white hover:bg-brand-dark">
            {editingRewardId ? "💾 Lưu thay đổi phần quà" : "➕ Lưu phần quà mới"}
          </button>
        </form>
      </section>

      {/* 3. Visual Point Rules & Manual Ledger Adjustment */}
      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="rounded-2xl border bg-white p-5">
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-900">⚙️ Quy tắc Tích điểm ({rules.length})</h2>
            <p className="text-xs text-gray-500">
              Hiển thị bằng Tiếng Việt dễ hiểu — bấm <strong>&ldquo;✏️ Sửa&rdquo;</strong> để thay đổi số điểm hoặc hệ số theo hạng.
            </p>
          </div>
          <div className="space-y-2.5 text-xs">
            {rules.map((rl) => {
              const info = describePointRule(rl.points_formula);
              const isEditing = editingRuleId === rl.id && editingFormula !== null;

              return (
                <div
                  key={rl.id}
                  className={`rounded-xl border p-3.5 transition ${
                    isEditing ? "border-brand bg-emerald-50/20" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 text-sm">{rl.name}</div>
                      <p className="mt-1 text-gray-700">{info.summary}</p>
                      {info.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {info.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-900"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => (isEditing ? setEditingRuleId(null) : startEditRule(rl))}
                        className="cursor-pointer rounded-lg border px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        {isEditing ? "Đóng" : "✏️ Sửa"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          postAction(
                            { action: "toggle_rule", id: rl.id, is_active: rl.is_active !== 1 },
                            `✓ Đã ${rl.is_active === 1 ? "tắt" : "bật"} quy tắc "${rl.name}".`,
                          )
                        }
                        className={`cursor-pointer rounded-lg px-2.5 py-1 font-bold ${
                          rl.is_active === 1 ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {rl.is_active === 1 ? "Đang bật" : "Đang tắt"}
                      </button>
                    </div>
                  </div>

                  {/* Visual Editor Form (No JSON!) */}
                  {isEditing && editingFormula && (
                    <div className="mt-3 space-y-3 border-t border-emerald-200/80 pt-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-gray-700">Tên quy tắc hiển thị</label>
                        <input
                          value={editingRuleName}
                          onChange={(e) => setEditingRuleName(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
                        />
                      </div>

                      {editingFormula.kind === "per_amount" && (
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-gray-700">
                              Cứ mỗi bao nhiêu tiền (VNĐ) = 1 điểm gốc?
                            </label>
                            <input
                              type="number"
                              min={1000}
                              step={1000}
                              value={editingFormula.amount}
                              onChange={(e) =>
                                setEditingFormula({
                                  ...editingFormula,
                                  amount: Math.max(1000, Number(e.target.value) || 1000),
                                })
                              }
                              className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold"
                            />
                          </div>

                          <div>
                            <div className="mb-1.5 text-[11px] font-bold text-gray-700">
                              Hệ số nhân điểm theo từng Hạng thành viên:
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                              {(["bronze", "silver", "gold", "diamond"] as LoyaltyTierKey[]).map((t) => (
                                <div key={t} className="rounded-lg border bg-white p-2">
                                  <label className="mb-1 block text-[11px] font-bold text-gray-600">
                                    Hạng {TIER_LABELS[t]}
                                  </label>
                                  <input
                                    type="number"
                                    min={0.1}
                                    step={0.1}
                                    value={editingFormula.multipliers[t]}
                                    onChange={(e) =>
                                      setEditingFormula({
                                        ...editingFormula,
                                        multipliers: {
                                          ...editingFormula.multipliers,
                                          [t]: Number(e.target.value) || 1,
                                        },
                                      })
                                    }
                                    className="w-full rounded border px-2 py-1 text-xs font-bold"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-lg border border-emerald-200 bg-white p-2.5 text-[11px] text-emerald-900">
                            <strong>💡 Ví dụ tính thử với đơn 500.000đ:</strong>{" "}
                            {(["bronze", "silver", "gold", "diamond"] as LoyaltyTierKey[])
                              .map((t) => {
                                const pts = Math.floor(
                                  (500000 / Math.max(1000, editingFormula.amount)) *
                                    (editingFormula.multipliers[t] || 1),
                                );
                                return `${TIER_LABELS[t]}: +${pts} điểm`;
                              })
                              .join(" · ")}
                          </div>
                        </div>
                      )}

                      {editingFormula.kind === "referral" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-gray-700">
                              Điểm tặng Người giới thiệu
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={editingFormula.referrerPoints}
                              onChange={(e) =>
                                setEditingFormula({
                                  ...editingFormula,
                                  referrerPoints: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-lg border bg-white px-3 py-1.5 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-gray-700">
                              Điểm tặng Bạn mới (đơn đầu)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={editingFormula.refereePoints}
                              onChange={(e) =>
                                setEditingFormula({
                                  ...editingFormula,
                                  refereePoints: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-lg border bg-white px-3 py-1.5 text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {editingFormula.kind === "daily" && (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-gray-700">Điểm mỗi ngày</label>
                            <input
                              type="number"
                              min={0}
                              value={editingFormula.fixed}
                              onChange={(e) =>
                                setEditingFormula({
                                  ...editingFormula,
                                  fixed: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-gray-700">Thưởng chuỗi 7 ngày</label>
                            <input
                              type="number"
                              min={0}
                              value={editingFormula.streak7}
                              onChange={(e) =>
                                setEditingFormula({
                                  ...editingFormula,
                                  streak7: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-bold text-gray-700">Thưởng chuỗi 30 ngày</label>
                            <input
                              type="number"
                              min={0}
                              value={editingFormula.streak30}
                              onChange={(e) =>
                                setEditingFormula({
                                  ...editingFormula,
                                  streak30: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              className="w-full rounded-lg border bg-white px-2.5 py-1.5 text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {editingFormula.kind === "fixed" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-bold text-gray-700">
                            Số điểm thưởng cố định mỗi lần
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={editingFormula.fixed}
                            onChange={(e) =>
                              setEditingFormula({
                                ...editingFormula,
                                fixed: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="w-full max-w-xs rounded-lg border bg-white px-3 py-1.5 text-xs font-bold"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await postAction(
                              {
                                action: "update_rule",
                                id: rl.id,
                                name: editingRuleName,
                                points_formula: serializePointFormula(editingFormula),
                              },
                              `✓ Đã lưu công thức mới cho "${editingRuleName}"!`,
                            );
                            if (ok) setEditingRuleId(null);
                          }}
                          className="cursor-pointer rounded-lg bg-brand px-4 py-1.5 font-bold text-white hover:bg-brand-dark"
                        >
                          💾 Lưu quy tắc
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRuleId(null)}
                          className="cursor-pointer rounded-lg border bg-white px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Huỷ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
          <h3 className="text-sm font-bold text-gray-900">⚖️ Điều chỉnh Điểm (Cộng / Trừ)</h3>
          <div>
            <label className="mb-1 block font-semibold text-gray-700">Chọn khách hàng</label>
            <select
              disabled={busy || profiles.length === 0}
              value={adjMemberId}
              onChange={(e) => setAdjMemberId(Number(e.target.value))}
              className="w-full cursor-pointer rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-gray-900 disabled:bg-gray-100"
            >
              {profiles.length === 0 ? (
                <option value={0}>Chưa có thành viên nào trong hệ thống</option>
              ) : (
                profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.phone || p.email} ({p.current_points} điểm · Hạng {TIER_LABELS[p.tier]})
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-semibold text-gray-700">Số điểm cộng (+) hoặc trừ (-)</label>
            <input
              type="number"
              value={adjDelta}
              onChange={(e) => setAdjDelta(Number(e.target.value))}
              placeholder="VD: 100 hoặc -50"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block font-semibold text-gray-700">Lý do điều chỉnh</label>
            <input
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="VD: Tặng bù điểm sự kiện tri ân..."
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <button
            disabled={busy || adjMemberId <= 0}
            className="w-full cursor-pointer rounded-xl bg-gray-900 py-2.5 font-bold text-white hover:bg-black disabled:opacity-50"
          >
            {busy ? "Đang xử lý..." : "Xác nhận cộng / trừ điểm"}
          </button>
        </form>
      </section>
    </div>
  );
}
