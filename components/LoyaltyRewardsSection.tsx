"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SummaryData = {
  profile: {
    id: number;
    current_points: number;
    lifetime_points: number;
    tier: "bronze" | "silver" | "gold" | "diamond";
    referral_code: string;
    total_orders: number;
    total_spent: number;
  };
  streak: {
    currentStreak: number;
    bestStreak: number;
    claimedToday: boolean;
  };
  referrals: {
    total: number;
    rewarded: number;
  };
  transactions: {
    id: number;
    source: string;
    change_amount: number;
    balance_after: number;
    description: string;
    created_at: string;
  }[];
  rewards: {
    id: number;
    type: "discount_coupon" | "free_shipping" | "gift_item" | "cash_credit";
    name: string;
    description: string;
    points_cost: number;
    stock: number | null;
    min_tier: "bronze" | "silver" | "gold" | "diamond";
  }[];
  redemptions: {
    id: number;
    reward_name?: string;
    reward_type?: string;
    points_spent: number;
    coupon_code: string | null;
    fulfillment_status: string;
    created_at: string;
  }[];
};

const TIER_ORDER = { bronze: 0, silver: 1, gold: 2, diamond: 3 };
const REWARD_ICON: Record<string, string> = {
  discount_coupon: "🎟️",
  free_shipping: "🚚",
  gift_item: "🎁",
  cash_credit: "💵",
};

export default function LoyaltyRewardsSection() {
  const router = useRouter();
  const [data, setData] = useState<SummaryData | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [checkinBusy, setCheckinBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [err, setErr] = useState("");
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/loyalty/summary", { credentials: "same-origin" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCheckin() {
    setCheckinBusy(true);
    setErr("");
    setToast("");
    try {
      const res = await fetch("/api/loyalty/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "daily_login" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Điểm danh thất bại.");
      } else if (d.alreadyClaimed) {
        setToast("Bạn đã điểm danh hôm nay rồi. Hẹn gặp lại ngày mai!");
      } else {
        setToast(
          `🎉 Điểm danh thành công! +${d.pointsAwarded} điểm (Chuỗi ${d.currentStreak} ngày)${d.streakBonus ? ` — Bao gồm thưởng mốc +${d.streakBonus}đ!` : ""}`,
        );
        await load();
        router.refresh();
      }
    } finally {
      setCheckinBusy(false);
    }
  }

  async function handleRedeem(rewardId: number) {
    setBusyId(rewardId);
    setErr("");
    setToast("");
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Không đổi được quà.");
      } else {
        setToast(
          d.couponCode
            ? `🎉 Đổi quà thành công! Mã ưu đãi của bạn: ${d.couponCode}`
            : "🎉 Đổi quà thành công! Cửa hàng sẽ liên hệ giao quà cho bạn sớm nhất.",
        );
        await load();
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-xs text-gray-500">
        Đang tải ví điểm thưởng &amp; kho quà...
      </div>
    );
  }

  const { profile, streak, referrals, rewards, redemptions, transactions } = data;
  const refUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/thanh-vien/?ref=${profile.referral_code}`
      : `https://thucduongshop.duyvo.win/thanh-vien/?ref=${profile.referral_code}`;

  return (
    <div className="space-y-8">
      {(toast || err) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            err
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || toast}
        </div>
      )}

      {/* Daily Check-in & Referral Banner */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">
                🗓️ Điểm danh nhận điểm mỗi ngày
              </div>
              <div className="mt-1 text-lg font-extrabold text-gray-900">
                Chuỗi hiện tại: <span className="text-amber-600">{streak.currentStreak} ngày</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">
                +5 điểm/ngày · Mốc <strong>7 ngày (+50đ)</strong> · Mốc <strong>30 ngày (+200đ)</strong> · Kỷ lục: {streak.bestStreak} ngày
              </p>
            </div>
            <button
              type="button"
              disabled={checkinBusy || streak.claimedToday}
              onClick={handleCheckin}
              className={`shrink-0 cursor-pointer rounded-xl px-4 py-2.5 text-xs font-extrabold shadow-xs transition ${
                streak.claimedToday
                  ? "cursor-default bg-emerald-100 text-emerald-800"
                  : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              }`}
            >
              {streak.claimedToday ? "✓ Đã điểm danh" : checkinBusy ? "Đang nhận..." : "🎁 Điểm danh (+5đ)"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50 p-5 shadow-2xs">
          <div className="text-xs font-bold uppercase tracking-wide text-brand">
            🤝 Giới thiệu bạn bè — Nhận +200 điểm
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-sm font-extrabold text-brand">
              {profile.referral_code}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(refUrl);
                setCopiedRef(true);
                setTimeout(() => setCopiedRef(false), 2000);
              }}
              className="cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
            >
              {copiedRef ? "✓ Đã copy link" : "📋 Copy link mời"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-600">
            Bạn nhận <strong>+200đ</strong> &amp; bạn bè nhận <strong>+100đ</strong> khi đơn đầu tiên hoàn tất · Đã mời: <strong>{referrals.total}</strong> ({referrals.rewarded} thành công).
          </p>
        </div>
      </section>

      {/* Reward Catalog */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gray-900">🎁 Đổi Điểm Lấy Quà &amp; Voucher</h2>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-brand">
            Số dư khả dụng: {profile.current_points.toLocaleString("vi-VN")} điểm
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rewards.map((rw) => {
            const enoughPts = profile.current_points >= rw.points_cost;
            const enoughTier = (TIER_ORDER[profile.tier] ?? 0) >= (TIER_ORDER[rw.min_tier] ?? 0);
            const inStock = rw.stock === null || rw.stock > 0;
            const canRedeem = enoughPts && enoughTier && inStock;

            return (
              <div
                key={rw.id}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs transition hover:border-brand/40"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xl">{REWARD_ICON[rw.type] ?? "🎁"}</span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                      {rw.points_cost} điểm
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold text-gray-900">{rw.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{rw.description}</p>
                </div>

                <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Hạng từ: {rw.min_tier.toUpperCase()}</span>
                    {rw.stock !== null && <span>Còn: {rw.stock}</span>}
                  </div>
                  <button
                    type="button"
                    disabled={!canRedeem || busyId === rw.id}
                    onClick={() => handleRedeem(rw.id)}
                    className={`w-full cursor-pointer rounded-xl py-2 text-xs font-bold transition ${
                      canRedeem
                        ? "bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
                        : "cursor-not-allowed bg-gray-100 text-gray-400"
                    }`}
                  >
                    {busyId === rw.id
                      ? "Đang đổi..."
                      : !inStock
                        ? "Đã hết quà"
                        : !enoughTier
                          ? `Cần hạng ${rw.min_tier.toUpperCase()}`
                          : !enoughPts
                            ? `Thiếu ${rw.points_cost - profile.current_points} điểm`
                            : "Đổi quà ngay"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Redemptions + Ledger History */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-base font-bold text-gray-900">🎫 Quà &amp; Mã Đã Đổi ({redemptions.length})</h3>
          {redemptions.length === 0 ? (
            <p className="text-xs text-gray-500">Bạn chưa đổi phần quà nào.</p>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {redemptions.map((rr) => (
                <div key={rr.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 text-xs">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-gray-900">{rr.reward_name ?? "Phần quà"}</div>
                    <div className="mt-0.5 text-[11px] text-gray-500">
                      -{rr.points_spent} điểm · {rr.created_at.slice(0, 16)}
                    </div>
                  </div>
                  {rr.coupon_code ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(rr.coupon_code!);
                        setCopiedCoupon(rr.coupon_code!);
                        setTimeout(() => setCopiedCoupon(""), 2000);
                      }}
                      className="shrink-0 cursor-pointer rounded-lg border border-brand/30 bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-brand hover:bg-emerald-50"
                    >
                      {copiedCoupon === rr.coupon_code ? "✓ Đã copy" : rr.coupon_code}
                    </button>
                  ) : (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {rr.fulfillment_status === "delivered" ? "Đã giao" : "Chờ giao quà"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-base font-bold text-gray-900">📜 Lịch sử Biến động Điểm</h3>
          {transactions.length === 0 ? (
            <p className="text-xs text-gray-500">Chưa có biến động điểm nào.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 text-xs last:border-0">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-800">{tx.description}</div>
                    <div className="text-[11px] text-gray-400">
                      {tx.created_at.slice(0, 16)} · Số dư sau: {tx.balance_after}đ
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-extrabold ${
                      tx.change_amount >= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {tx.change_amount >= 0 ? `+${tx.change_amount}` : tx.change_amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
