"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { vnd } from "@/lib/site";
import LoyaltyRewardsSection from "./LoyaltyRewardsSection";

export type MemberProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  tier: "bronze" | "silver" | "gold";
  points: number;
  created_at: string;
};

export type MemberCoupon = {
  id: number;
  code: string;
  title: string;
  description: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  max_discount: number;
  member_only: number;
};

export type MemberOrder = {
  id: number;
  code: string;
  total: number;
  discount_amount: number;
  coupon_code: string;
  status: string;
  created_at: string;
};

export type MemberDoc = {
  id: number;
  title: string;
  folder_path: string;
  doc_type: string;
  pages: number;
  file_size: string;
  drive_url: string;
};

const TIER_INFO = {
  bronze: {
    name: "Thành viên Đồng",
    badge: "bg-amber-700 text-white",
    cardBg: "from-brand-dark via-brand to-emerald-700",
    extraDiscount: "0%",
    nextTier: "Hạng Bạc (500 điểm)",
    nextTarget: 500,
  },
  silver: {
    name: "Thành viên Bạc (Thân thiết)",
    badge: "bg-slate-600 text-white",
    cardBg: "from-slate-800 via-slate-700 to-teal-800",
    extraDiscount: "Giảm thêm 3% mọi đơn",
    nextTier: "Hạng Vàng VIP (1.500 điểm)",
    nextTarget: 1500,
  },
  gold: {
    name: "Thành viên Vàng (Tri Ân VIP)",
    badge: "bg-amber-500 text-gray-900",
    cardBg: "from-amber-700 via-yellow-600 to-emerald-800",
    extraDiscount: "Giảm thêm 5% mọi đơn",
    nextTier: "Đã đạt hạng cao nhất",
    nextTarget: 1500,
  },
};

export default function MemberPortal({
  initialMember,
  coupons,
  orders,
  documents,
}: {
  initialMember: MemberProfile | null;
  coupons: MemberCoupon[];
  orders: MemberOrder[];
  documents: MemberDoc[];
}) {
  const router = useRouter();
  const [authTab, setAuthTab] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref) setReferralCode(ref.trim().toUpperCase());
    }
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload =
        authTab === "register"
          ? { action: "register", name, email, phone, password, referralCode }
          : { action: "login", identifier, password };
      const res = await fetch("/api/member/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? " thao tác thất bại.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/member/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    router.refresh();
  }

  function copyCode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2500);
  }

  if (!initialMember) {
    return (
      <div className="space-y-8">
        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-emerald-700 p-6 text-white shadow-md md:p-8">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            Cộng đồng Thực Dưỡng Phúc Thọ
          </span>
          <h1 className="mt-2 text-2xl font-bold md:text-3xl">
            Đăng ký Thành viên — Nhận Tài liệu Miễn phí &amp; Ưu đãi Đặc quyền
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-green-50/95">
            Trở thành Thành viên chính thức của <strong>Thực Dưỡng Phúc Thọ</strong> để mở khóa kho tài liệu PDF/Slide/Ebook miễn phí, nhận ngay bộ Voucher giảm giá khi mua hàng và tích điểm nâng hạng VIP.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          {/* Left: 4 Member Benefits + Tier Policy */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">
              🎁 4 Đặc quyền dành riêng cho Thành viên
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                <div className="text-2xl">📚</div>
                <h3 className="mt-2 font-bold text-brand">1. Mở khóa 100% Tài liệu &amp; Ebook</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Tự động mở khóa và tải miễn phí toàn bộ Cẩm nang Thực dưỡng, Phác đồ bệnh lý, 72 công thức nấu ăn và Sổ tay tra cứu mà không cần điền khảo sát từng bài.
                </p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                <div className="text-2xl">🎟️</div>
                <h3 className="mt-2 font-bold text-brand">2. Tặng ngay Bộ Mã giảm giá</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Nhận ngay mã <strong>PHUCTHO10 (-10%)</strong> chào mừng thành viên mới, cùng các mã giảm <strong>30.000₫</strong>, <strong>60.000₫</strong> và hỗ trợ phí giao hàng.
                </p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                <div className="text-2xl">👑</div>
                <h3 className="mt-2 font-bold text-brand">3. Tích điểm &amp; Chiết khấu Hạng VIP</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Tặng ngay <strong>100 điểm thưởng</strong> khi đăng ký. Mỗi 10.000₫ mua hàng tích lũy 1 điểm để nâng hạng <strong>Bạc (-3% mọi đơn)</strong> và <strong>Vàng VIP (-5% mọi đơn)</strong>.
                </p>
              </div>
              <div className="rounded-2xl border border-green-200 bg-white p-5 shadow-sm">
                <div className="text-2xl">🧘</div>
                <h3 className="mt-2 font-bold text-brand">4. Tư vấn Thực dưỡng &amp; Bản tin</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Nhận bản tin thực đơn dưỡng sinh hàng tuần qua email và được ưu tiên hỗ trợ tư vấn thực dưỡng phù hợp thể trạng qua Hotline/Zalo.
                </p>
              </div>
            </div>

            {/* Tier Comparison Table */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-bold text-gray-900">Bảng chính sách Hạng Thành Viên</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-2.5">Hạng thành viên</th>
                      <th className="p-2.5">Điều kiện</th>
                      <th className="p-2.5">Chiết khấu thêm</th>
                      <th className="p-2.5">Quyền lợi đặc biệt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-2.5 font-bold text-amber-800">🥉 Hạng Đồng</td>
                      <td className="p-2.5">Đăng ký miễn phí (Tặng 100 điểm)</td>
                      <td className="p-2.5">Mã giảm 10% (PHUCTHO10)</td>
                      <td className="p-2.5">Mở khóa tải miễn phí kho tài liệu thực dưỡng</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-700">🥈 Hạng Bạc</td>
                      <td className="p-2.5">Tích lũy ≥ 500 điểm</td>
                      <td className="p-2.5 font-bold text-brand">Giảm thêm 3% mọi đơn</td>
                      <td className="p-2.5">Cộng dồn với mã Voucher + Quà tặng dưỡng sinh</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-amber-600">👑 Hạng Vàng VIP</td>
                      <td className="p-2.5">Tích lũy ≥ 1.500 điểm</td>
                      <td className="p-2.5 font-bold text-accent">Giảm thêm 5% mọi đơn</td>
                      <td className="p-2.5">Cộng dồn Voucher + Tặng Sổ tay VIP + Tư vấn 1-1</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Register / Login Form Card */}
          <div className="h-fit rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
            <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1 text-sm font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("register");
                  setError("");
                }}
                className={`rounded-lg py-2 transition ${
                  authTab === "register" ? "bg-brand text-white shadow-sm" : "text-gray-600 hover:text-brand"
                }`}
              >
                Đăng ký Thành viên
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("login");
                  setError("");
                }}
                className={`rounded-lg py-2 transition ${
                  authTab === "login" ? "bg-brand text-white shadow-sm" : "text-gray-600 hover:text-brand"
                }`}
              >
                Đăng nhập
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-3.5">
              {authTab === "register" ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Họ và tên *</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Nguyễn Văn An"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Địa chỉ Email *</label>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value.replace(/\s+/g, ""))}
                      onBlur={() => setEmail((v) => v.trim().toLowerCase())}
                      pattern="^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
                      title="Vui lòng nhập đúng định dạng email (VD: tenban@gmail.com)"
                      placeholder="VD: tenban@gmail.com"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                    />
                    {email && !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(email.trim()) && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        ⚠️ Định dạng email chưa đúng (VD: tenban@gmail.com)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Số điện thoại Zalo *</label>
                    <input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xxxxxxxx"
                      pattern="0\d{9,10}"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Mật khẩu (tối thiểu 6 ký tự) *</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    ✓ Khi đăng ký, bạn nhận ngay <strong>100 điểm thưởng</strong>, mã giảm giá <strong>PHUCTHO10 (-10%)</strong> và quyền tải miễn phí toàn bộ tài liệu thực dưỡng.
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Email hoặc Số điện thoại *</label>
                    <input
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Nhập Email hoặc SĐT đã đăng ký"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Mật khẩu *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-brand"
                    />
                  </div>
                </>
              )}

              {error && <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-600">{error}</p>}

              <button
                disabled={busy}
                className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow hover:bg-brand-dark disabled:opacity-50"
              >
                {busy
                  ? "Đang xử lý..."
                  : authTab === "register"
                    ? "🎁 Đăng ký Thành viên & Nhận Ưu đãi ngay"
                    : "Đăng nhập tài khoản Thành viên"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // LOGGED IN MEMBER DASHBOARD
  const tMeta = TIER_INFO[initialMember.tier] ?? TIER_INFO.bronze;
  const progressPct = Math.min(100, Math.round((initialMember.points / tMeta.nextTarget) * 100));

  return (
    <div className="space-y-8">
      {/* Digital Member Card */}
      <div className={`rounded-2xl bg-gradient-to-r ${tMeta.cardBg} p-6 text-white shadow-lg md:p-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${tMeta.badge}`}>
                👑 {tMeta.name}
              </span>
              <span className="text-xs text-green-100">
                Mã TV: #PT-{String(initialMember.id).padStart(4, "0")}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">{initialMember.name}</h1>
            <p className="mt-1 text-xs text-green-100">
              ✉️ {initialMember.email} {initialMember.phone ? `· 📞 ${initialMember.phone}` : ""}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="rounded-xl bg-white/15 px-4 py-2.5 text-right backdrop-blur-sm">
              <div className="text-xs uppercase opacity-80">Điểm tích lũy</div>
              <div className="text-2xl font-extrabold text-amber-300">{initialMember.points} điểm</div>
              <div className="text-[11px] text-green-100">{tMeta.extraDiscount}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-white/30 px-3 py-1 text-xs font-medium text-white hover:bg-white/15"
            >
              Đăng xuất
            </button>
          </div>
        </div>

        {/* Tier Progress Bar */}
        <div className="mt-5 max-w-xl">
          <div className="mb-1 flex justify-between text-xs text-green-100">
            <span>Tiến trình nâng hạng: {tMeta.nextTier}</span>
            <span>{initialMember.points} / {tMeta.nextTarget} điểm</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/25">
            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* Loyalty Rewards, Check-in, Referral & Ledger */}
      <LoyaltyRewardsSection />

      {/* Section 1: Member Voucher Wallet */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">🎟️ Ví Mã Giảm Giá Độc Quyền Của Bạn</h2>
          <Link href="/san-pham/" className="text-xs font-semibold text-brand hover:underline">
            Mua sắm &amp; Dùng mã ngay →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coupons.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl border-2 border-dashed border-brand/40 bg-green-50/40 p-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-brand px-2.5 py-1 font-mono text-xs font-bold text-white">
                    {c.code}
                  </span>
                  <span className="text-xs font-bold text-accent">
                    {c.discount_type === "percent" ? `-${c.discount_value}%` : `-${vnd(c.discount_value)}`}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-bold text-gray-900">{c.title}</h3>
                <p className="mt-1 text-xs text-gray-600">{c.description}</p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-green-200/70 pt-2.5 text-xs">
                <span className="text-[11px] text-gray-500">
                  {c.min_order > 0 ? `Đơn từ ${vnd(c.min_order)}` : "Mọi đơn hàng"}
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(c.code)}
                  className="rounded-lg bg-white px-2.5 py-1 font-bold text-brand shadow-sm ring-1 ring-brand/30 hover:bg-brand hover:text-white"
                >
                  {copiedCode === c.code ? "✓ Đã chép" : "Sao chép mã"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Unlocked Member Document Library */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              📚 Kho Tài Liệu &amp; Sổ Tay Thực Dưỡng Miễn Phí Cho Thành Viên
            </h2>
            <p className="text-xs text-gray-500">
              Với tư cách Thành viên, bạn được mở khóa tải trực tiếp toàn bộ {documents.length} tài liệu bên dưới mà không cần làm khảo sát.
            </p>
          </div>
          <Link
            href="/thu-vien/tai-lieu-thuc-duong/"
            className="rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-dark"
          >
            Mở Thư viện đầy đủ »
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((d) => (
            <div key={d.id} className="flex flex-col justify-between rounded-xl border p-3.5 hover:border-brand/40">
              <div>
                <div className="text-[11px] font-medium text-brand">📁 {d.folder_path}</div>
                <div className="mt-1 line-clamp-2 text-sm font-bold text-gray-900">{d.title}</div>
                <div className="mt-1 text-[11px] text-gray-500">
                  <span className="uppercase font-semibold">{d.doc_type}</span> · {d.pages} trang · {d.file_size}
                </div>
              </div>
              <a
                href={d.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-50 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white transition"
              >
                ⬇️ Tải miễn phí (Đặc quyền TV) ↗
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Member Order History */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-bold text-gray-900">🧾 Lịch sử Đơn hàng của bạn</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-500">
            Bạn chưa có đơn hàng nào. Hãy sử dụng mã giảm giá <strong>PHUCTHO10</strong> cho đơn hàng đầu tiên nhé!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-3">Mã đơn</th>
                  <th className="p-3">Ngày đặt</th>
                  <th className="p-3">Mã ưu đãi</th>
                  <th className="p-3">Giảm giá</th>
                  <th className="p-3">Tổng thanh toán</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="p-3 font-mono font-bold text-brand">{o.code}</td>
                    <td className="p-3 text-xs text-gray-500">{o.created_at.slice(0, 16)}</td>
                    <td className="p-3 font-mono text-xs">{o.coupon_code || "—"}</td>
                    <td className="p-3 text-xs text-green-700">
                      {o.discount_amount > 0 ? `-${vnd(o.discount_amount)}` : "—"}
                    </td>
                    <td className="p-3 font-bold text-accent">{vnd(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
