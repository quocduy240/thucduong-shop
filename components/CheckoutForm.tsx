"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { vnd } from "@/lib/site";
import SearchableSelect from "./SearchableSelect";

type Opt = { code: string; name: string };
type MemberInfo = { id: number; name: string; email: string; phone: string; tier: "bronze" | "silver" | "gold"; points: number };
type CouponInfo = {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  member_only: number;
};

/** Province/ward pickers use /api/v2/province and /api/v2/province/ward; submit goes to /api/data-checkout. */
export default function CheckoutForm({ subtotal = 0 }: { subtotal?: number }) {
  const router = useRouter();
  const [provinces, setProvinces] = useState<Opt[]>([]);
  const [wards, setWards] = useState<Opt[]>([]);
  const [province, setProvince] = useState("");
  const [ward, setWard] = useState("");
  const [payment, setPayment] = useState<"cod" | "bank">("cod");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Member & Coupon state
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [coupons, setCoupons] = useState<CouponInfo[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [appliedTitle, setAppliedTitle] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [couponErr, setCouponErr] = useState("");

  // ClaudePayFlow Progressive Disclosure features: Auto-Refill Subscription, Business Tax ID (VAT), Affiliate Referral
  const [autoRefillEnabled, setAutoRefillEnabled] = useState(false);
  const [autoRefillCycleDays, setAutoRefillCycleDays] = useState<"15" | "30" | "45">("30");
  const [needVatInvoice, setNeedVatInvoice] = useState(false);
  const [businessTaxId, setBusinessTaxId] = useState("");
  const [businessCompanyName, setBusinessCompanyName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [copiedBankField, setCopiedBankField] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlRef = new URLSearchParams(window.location.search).get("ref");
      const savedRef = window.localStorage.getItem("td_ref_code") || "";
      if (urlRef) {
        const cleanRef = urlRef.trim().toUpperCase();
        setReferralCode(cleanRef);
        window.localStorage.setItem("td_ref_code", cleanRef);
      } else if (savedRef) {
        setReferralCode(savedRef);
      }
    }
    fetch("/api/v2/province")
      .then((r) => r.json())
      .then((d) => setProvinces(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setProvinces([]));
    fetch("/api/member/auth")
      .then((r) => r.json())
      .then((d) => {
        if (d.member) {
          setMember(d.member);
          setName((prev) => prev || d.member.name);
          setPhone((prev) => prev || d.member.phone);
          setEmail((prev) => prev || d.member.email);
        }
        if (d.coupons) setCoupons(d.coupons);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!province) return;
    fetch(`/api/v2/province/ward?province=${encodeURIComponent(province)}`)
      .then((r) => r.json())
      .then((d) => setWards(Array.isArray(d?.items) ? d.items : []))
      .catch(() => setWards([]));
  }, [province]);

  async function applyCoupon(codeToTry: string) {
    setCouponErr("");
    setCouponMsg("");
    const res = await fetch("/api/coupons/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeToTry }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAppliedCode("");
      setAppliedTitle("");
      setDiscount(0);
      return setCouponErr(data.error ?? "Mã giảm giá không hợp lệ.");
    }
    setCouponInput(data.code || "");
    setAppliedCode(data.code || "");
    setAppliedTitle(data.title || "");
    setDiscount(data.discount || 0);
    if (data.code) {
      setCouponMsg(`✓ Đã áp dụng "${data.code}" — Giảm ${vnd(data.discount)}`);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
    body.coupon_code = appliedCode;
    const extraTags: string[] = [];
    if (autoRefillEnabled) {
      extraTags.push(`[Đặt định kỳ Auto-Refill: mỗi ${autoRefillCycleDays} ngày]`);
    }
    if (needVatInvoice && businessTaxId.trim()) {
      extraTags.push(
        `[Xuất HĐ VAT - MST: ${businessTaxId.trim()}${businessCompanyName.trim() ? ` - ĐV: ${businessCompanyName.trim()}` : ""}]`,
      );
    }
    if (referralCode.trim()) {
      extraTags.push(`[Mã GT/CTV: ${referralCode.trim().toUpperCase()}]`);
    }
    if (extraTags.length > 0) {
      const baseNote = String(body.note ?? "").trim();
      body.note = [baseNote, ...extraTags].filter(Boolean).join(" | ");
    }
    const res = await fetch("/api/data-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Đặt hàng thất bại.");
    router.push(`/checkout/thankyou?code=${data.code}`);
    router.refresh();
  }

  function copyBankText(text: string, label: string) {
    navigator.clipboard?.writeText(text);
    setCopiedBankField(label);
    setTimeout(() => setCopiedBankField(""), 2000);
  }

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand";
  const finalTotal = Math.max(0, subtotal - discount);
  const transferMemo = `TD ${phone || "SDT"} ${name ? name.slice(0, 18) : ""}`.trim();
  const vietQrUrl = `https://img.vietqr.io/image/970418-8610312888-compact2.png?amount=${finalTotal}&addInfo=${encodeURIComponent(
    transferMemo,
  )}&accountName=${encodeURIComponent("HO KINH DOANH CUA HANG PHUC THO")}`;

  return (
    <form onSubmit={submit} className="grid gap-3.5 sm:grid-cols-2">
      {/* Member Banner */}
      <div className="sm:col-span-2">
        {member ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50/70 px-3.5 py-2.5 text-xs">
            <div>
              👑 Xin chào Thành viên <strong>{member.name}</strong> ({member.points} điểm thưởng)
              {member.tier === "gold" && <span className="ml-1.5 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Hạng Vàng -5%</span>}
              {member.tier === "silver" && <span className="ml-1.5 rounded bg-slate-500 px-1.5 py-0.5 text-[10px] font-bold text-white">Hạng Bạc -3%</span>}
            </div>
            <Link href="/thanh-vien/" className="font-semibold text-brand hover:underline">
              Xem quyền lợi thành viên →
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs text-amber-900">
            <span>
              🎁 <strong>Đặc quyền Thành viên:</strong> Đăng ký miễn phí để dùng mã <strong>PHUCTHO10 (-10%)</strong> &amp; tải miễn phí kho tài liệu thực dưỡng!
            </span>
            <Link href="/thanh-vien/" className="rounded-lg bg-brand px-2.5 py-1 font-bold text-white hover:bg-brand-dark">
              Đăng ký / Đăng nhập →
            </Link>
          </div>
        )}
      </div>

      <input
        name="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Họ và tên *"
        className={input}
      />
      <input
        name="phone"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Số điện thoại *"
        pattern="0\d{9,10}"
        className={input}
      />
      <input
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email (nhận thông báo đơn hàng & tích điểm thành viên)"
        className={`${input} sm:col-span-2`}
      />
      <SearchableSelect
        name="province_code"
        required
        options={provinces}
        value={province}
        onChange={(code) => {
          setProvince(code);
          setWard("");
          setWards([]);
        }}
        placeholder="Chọn Tỉnh/Thành phố *"
        searchPlaceholder="Gõ tên tỉnh/thành (VD: Ho Chi Minh, Ha Noi)..."
      />
      <SearchableSelect
        name="ward_code"
        required
        disabled={!province}
        options={wards}
        value={ward}
        onChange={setWard}
        placeholder={province ? "Chọn Phường/Xã *" : "Vui lòng chọn Tỉnh/Thành trước"}
        searchPlaceholder="Gõ tên phường/xã (VD: Ba Dinh, Tan Binh)..."
      />
      <input name="address" required placeholder="Số nhà, tên đường *" className={`${input} sm:col-span-2`} />
      <textarea name="note" placeholder="Ghi chú giao hàng (tuỳ chọn)" rows={2} className={`${input} sm:col-span-2`} />

      {/* Coupon / Voucher Box */}
      <div className="rounded-xl border border-green-200 bg-green-50/40 p-3.5 sm:col-span-2 space-y-2.5">
        <div className="text-xs font-bold text-brand">🎟️ Mã giảm giá / Voucher ưu đãi</div>
        <div className="flex gap-2">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="Nhập mã giảm giá (VD: PHUCTHO10)..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-mono text-xs uppercase outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => applyCoupon(couponInput)}
            className="rounded-lg bg-brand px-4 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
          >
            Áp dụng
          </button>
        </div>

        {coupons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {coupons.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => applyCoupon(c.code)}
                title={c.description}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${appliedCode === c.code
                  ? "border-brand bg-brand text-white"
                  : "border-green-300 bg-white text-brand hover:bg-green-50"
                  }`}
              >
                🏷️ {c.code} ({c.discount_type === "percent" ? `-${c.discount_value}%` : `-${vnd(c.discount_value)}`})
              </button>
            ))}
          </div>
        )}

        {couponMsg && <p className="text-xs font-semibold text-brand">{couponMsg}</p>}
        {couponErr && <p className="text-xs font-medium text-red-600">{couponErr}</p>}
      </div>

      {/* Payment Method */}
      <fieldset className="space-y-2.5 sm:col-span-2">
        <legend className="mb-1 text-sm font-semibold">Phương thức thanh toán</legend>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 hover:bg-green-50/40">
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={payment === "cod"}
            onChange={() => setPayment("cod")}
            className="mt-1"
          />
          <div className="text-sm">
            <div className="font-semibold text-gray-800">Thanh toán tiền mặt khi nhận hàng (COD)</div>
            <p className="mt-0.5 text-xs text-gray-500">
              Quý khách được đồng kiểm sản phẩm với nhân viên giao hàng (hoặc trong vòng 30 phút từ khi nhận hàng) và thanh toán trực tiếp theo hóa đơn.
            </p>
          </div>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 hover:bg-green-50/40">
          <input
            type="radio"
            name="payment"
            value="bank"
            checked={payment === "bank"}
            onChange={() => setPayment("bank")}
            className="mt-1"
          />
          <div className="flex-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-gray-800">Chuyển khoản nhanh 24/7 qua mã VietQR động</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Tự điền số tiền &amp; nội dung
              </span>
            </div>
            {payment === "bank" && (
              <div className="mt-3 grid gap-3 rounded-xl border border-green-200 bg-green-50/70 p-3.5 text-xs text-gray-700 sm:grid-cols-[140px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-xl border bg-white p-2 shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vietQrUrl}
                    alt="Mã VietQR thanh toán đơn hàng Thực Dưỡng Phúc Thọ"
                    className="h-32 w-32 object-contain"
                  />
                  <span className="mt-1 text-[10px] font-semibold text-brand">Quét bằng mọi App Ngân hàng</span>
                </div>
                <div className="space-y-1.5">
                  <div><strong>Ngân hàng:</strong> BIDV (Ngân hàng Đầu tư &amp; Phát triển VN)</div>
                  <div className="flex items-center gap-2">
                    <span><strong>Số tài khoản:</strong> <span className="font-mono text-sm font-bold text-accent">8610312888</span></span>
                    <button
                      type="button"
                      onClick={() => copyBankText("8610312888", "stk")}
                      className="rounded border border-brand/30 bg-white px-2 py-0.5 text-[10px] font-bold text-brand hover:bg-brand hover:text-white"
                    >
                      {copiedBankField === "stk" ? "✓ Đã chép" : "Sao chép STK"}
                    </button>
                  </div>
                  <div><strong>Chủ tài khoản:</strong> HO KINH DOANH CUA HANG PHUC THO</div>
                  <div>
                    <strong>Số tiền tự động khớp:</strong>{" "}
                    <span className="font-bold text-brand">{vnd(finalTotal)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span><strong>Nội dung CK:</strong> <code className="rounded bg-white px-1.5 py-0.5 font-mono font-bold">{transferMemo}</code></span>
                    <button
                      type="button"
                      onClick={() => copyBankText(transferMemo, "memo")}
                      className="rounded border border-brand/30 bg-white px-2 py-0.5 text-[10px] font-bold text-brand hover:bg-brand hover:text-white"
                    >
                      {copiedBankField === "memo" ? "✓ Đã chép" : "Chép nội dung"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </label>
      </fieldset>

      {/* ClaudePayFlow Feature 1: Auto-Refill Subscription (Giao hàng Thực dưỡng định kỳ) */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-3.5 sm:col-span-2 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold text-gray-900">
              🔄 Đặt lịch Giao định kỳ Thực dưỡng (Auto-Refill)
            </div>
            <p className="text-[11px] text-gray-500">
              Tự động nhắc lịch &amp; ưu tiên giữ lô hàng mới nhất cho Gạo lứt, Trà dưỡng sinh, Tương Tamari hàng tháng.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoRefillEnabled}
            onClick={() => setAutoRefillEnabled(!autoRefillEnabled)}
            className={`h-5 w-9 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
              autoRefillEnabled ? "bg-brand justify-end" : "bg-gray-300 justify-start"
            }`}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow-2xs" />
          </button>
        </div>
        {autoRefillEnabled && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-gray-700">Chu kỳ nhắc giao lại:</span>
            {(["15", "30", "45"] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setAutoRefillCycleDays(days)}
                className={`rounded-lg border px-3 py-1 text-xs font-bold transition cursor-pointer ${
                  autoRefillCycleDays === days
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-brand"
                }`}
              >
                Mỗi {days} ngày
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ClaudePayFlow Feature 2: Business Tax ID (VAT) & Affiliate Referral Code */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 sm:col-span-2 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-800 cursor-pointer">
            <input
              type="checkbox"
              checked={needVatInvoice}
              onChange={(e) => setNeedVatInvoice(e.target.checked)}
              className="accent-brand"
            />
            <span>🏢 Yêu cầu xuất hóa đơn Thuế Doanh nghiệp (Business Tax ID / VAT)</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500">Mã CTV/Giới thiệu:</span>
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="VD: PT-0001"
              className="w-28 rounded-md border border-gray-300 bg-white px-2 py-1 font-mono text-xs uppercase outline-none focus:border-brand"
            />
          </div>
        </div>
        {needVatInvoice && (
          <div className="grid gap-2.5 pt-1 sm:grid-cols-2">
            <input
              value={businessTaxId}
              onChange={(e) => setBusinessTaxId(e.target.value)}
              placeholder="Mã số thuế doanh nghiệp (VD: 0312345678)"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 font-mono text-xs outline-none focus:border-brand"
            />
            <input
              value={businessCompanyName}
              onChange={(e) => setBusinessCompanyName(e.target.value)}
              placeholder="Tên công ty / Đơn vị nhận hóa đơn"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand"
            />
          </div>
        )}
      </div>

      {subtotal > 0 && discount > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-3 text-xs sm:col-span-2 space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính:</span>
            <span>{vnd(subtotal)}</span>
          </div>
          <div className="flex justify-between font-semibold text-brand">
            <span>Ưu đãi ({appliedTitle || appliedCode}):</span>
            <span>-{vnd(discount)}</span>
          </div>
          <div className="flex justify-between border-t border-orange-200 pt-1 text-sm font-bold text-accent">
            <span>Tổng thanh toán sau giảm:</span>
            <span>{vnd(finalTotal)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-accent sm:col-span-2">{error}</p>}
      <button
        disabled={busy}
        className="rounded-xl bg-accent py-3 font-bold text-white shadow hover:opacity-95 disabled:opacity-50 sm:col-span-2"
      >
        {busy ? "Đang xử lý..." : discount > 0 ? `Đặt hàng ngay (${vnd(finalTotal)})` : "Đặt hàng"}
      </button>
    </form>
  );
}
