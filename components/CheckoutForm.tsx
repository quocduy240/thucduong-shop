"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Opt = { code: string; name: string };

/** Province/ward pickers use /api/v2/province and /api/v2/province/ward; submit goes to /api/data-checkout. */
export default function CheckoutForm() {
  const router = useRouter();
  const [provinces, setProvinces] = useState<Opt[]>([]);
  const [wards, setWards] = useState<Opt[]>([]);
  const [province, setProvince] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/v2/province").then((r) => r.json()).then((d) => setProvinces(d.items));
  }, []);

  useEffect(() => {
    if (!province) return;
    fetch(`/api/v2/province/ward?province=${province}`).then((r) => r.json()).then((d) => setWards(d.items));
  }, [province]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = Object.fromEntries(new FormData(e.currentTarget));
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

  const input = "w-full rounded border px-3 py-2 outline-none focus:border-brand";
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input name="name" required placeholder="Họ và tên*" className={input} />
      <input name="phone" required placeholder="Số điện thoại*" pattern="0\d{9,10}" className={input} />
      <input name="email" type="email" placeholder="Email" className={`${input} sm:col-span-2`} />
      <select name="province_code" required value={province} onChange={(e) => (setProvince(e.target.value), setWards([]))} className={input}>
        <option value="">Chọn Tỉnh/Thành phố*</option>
        {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
      </select>
      <select name="ward_code" required className={input} disabled={!province}>
        <option value="">Chọn Phường/Xã*</option>
        {wards.map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
      </select>
      <input name="address" required placeholder="Số nhà, tên đường*" className={`${input} sm:col-span-2`} />
      <textarea name="note" placeholder="Ghi chú" rows={3} className={`${input} sm:col-span-2`} />
      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="mb-1 font-semibold">Phương thức thanh toán</legend>
        <label className="flex gap-2"><input type="radio" name="payment" value="cod" defaultChecked /> Thanh toán khi nhận hàng (COD)</label>
        <label className="flex gap-2"><input type="radio" name="payment" value="bank" /> Chuyển khoản ngân hàng</label>
      </fieldset>
      {error && <p className="text-sm text-accent sm:col-span-2">{error}</p>}
      <button disabled={busy} className="rounded-lg bg-accent py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2">
        {busy ? "Đang xử lý..." : "Đặt hàng"}
      </button>
    </form>
  );
}
