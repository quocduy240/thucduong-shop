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

  useEffect(() => {
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

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand";
  const finalTotal = Math.max(0, subtotal - discount);

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
            <div className="font-semibold text-gray-800">Chuyển khoản ngân hàng</div>
            {payment === "bank" && (
              <div className="mt-2 space-y-1 rounded-lg border border-green-200 bg-green-50/70 p-3 text-xs text-gray-700">
                <div><strong>Ngân hàng:</strong> BIDV</div>
                <div><strong>Số tài khoản (STK):</strong> <span className="font-mono font-bold text-accent">8610312888</span></div>
                <div><strong>Chủ tài khoản:</strong> HO KINH DOANH CUA HANG PHUC THO</div>
                <div><strong>Nội dung chuyển khoản:</strong> Mã đơn hàng - Tên khách hàng</div>
              </div>
            )}
          </div>
        </label>
      </fieldset>

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
