import Link from "next/link";
import { redirect } from "next/navigation";
import { cartLines, readCart } from "@/lib/cart";
import { vnd } from "@/lib/site";
import { Breadcrumb } from "@/components/ui";
import CheckoutForm from "@/components/CheckoutForm";

export const metadata = { title: "Thanh toán" };

function classifyMacrobioticPolarity(name: string): {
  type: "yang" | "balanced" | "yin";
  label: string;
  badge: string;
} {
  const n = name.toLowerCase();
  if (
    n.includes("tamari") ||
    n.includes("miso") ||
    n.includes("mơ muối") ||
    n.includes("umeboshi") ||
    n.includes("tekka") ||
    n.includes("bancha") ||
    n.includes("củ sen") ||
    n.includes("muối mè") ||
    n.includes("sắn dây") ||
    n.includes("canh dưỡng sinh") ||
    n.includes("dentie") ||
    n.includes("ngưu bàng")
  ) {
    return {
      type: "yang",
      label: "☀️ Dương ấm · Kiềm hóa",
      badge: "bg-amber-100 text-amber-800 border-amber-200",
    };
  }
  if (
    n.includes("mật ong") ||
    n.includes("đường") ||
    n.includes("trái cây") ||
    n.includes("nước ép") ||
    n.includes("sữa hạt")
  ) {
    return {
      type: "yin",
      label: "🌙 Âm mát · Thanh nhiệt",
      badge: "bg-sky-100 text-sky-800 border-sky-200",
    };
  }
  return {
    type: "balanced",
    label: "☯️ Quân bình trung hòa",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
}

export default async function CheckoutPage() {
  const { lines, total } = await cartLines(await readCart());
  if (lines.length === 0) redirect("/cart");

  let yangQty = 0;
  let balancedQty = 0;
  let yinQty = 0;
  const enrichedLines = lines.map((l) => {
    const polarity = classifyMacrobioticPolarity(l.product.name);
    if (polarity.type === "yang") yangQty += l.qty;
    else if (polarity.type === "yin") yinQty += l.qty;
    else balancedQty += l.qty;
    return { ...l, polarity };
  });
  const totalQty = Math.max(1, yangQty + balancedQty + yinQty);
  const balanceScore = Math.min(100, Math.max(60, Math.round(78 + ((balancedQty + Math.min(yangQty, yinQty) * 2) / totalQty) * 20)));

  return (
    <>
      <Breadcrumb items={[{ label: "Giỏ hàng", href: "/cart" }, { label: "Thanh toán" }]} />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_410px]">
        <div className="rounded-2xl border bg-white p-5 shadow-sm md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Thông tin giao hàng &amp; Thanh toán</h1>
              <p className="text-xs text-gray-500">
                Giao diện thanh toán nhanh 1 trang chuẩn ClaudePayFlow · Hỗ trợ VietQR động &amp; Đặt lịch định kỳ
              </p>
            </div>
            <Link href="/cart" className="text-xs font-semibold text-brand hover:underline">
              ← Sửa giỏ hàng
            </Link>
          </div>
          <CheckoutForm subtotal={total} />
        </div>
        <aside className="space-y-4 h-fit">
          {/* Purchase Summary Card */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-3 font-bold text-gray-900">Đơn hàng ({lines.length} sản phẩm)</h2>
            <ul className="space-y-2.5 text-sm">
              {enrichedLines.map((l) => (
                <li key={l.product.id} className="border-b border-dashed border-gray-100 pb-2 last:border-b-0 last:pb-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-800">{l.product.name} × {l.qty}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{vnd(l.subtotal)}</span>
                  </div>
                  <div className="mt-1">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${l.polarity.badge}`}>
                      {l.polarity.label}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between border-t pt-3 text-lg">
              <span>Tổng cộng tạm tính</span>
              <span className="font-bold text-accent tabular-nums">{vnd(total)}</span>
            </div>
          </div>

          {/* Yin-Yang Macrobiotic Cart Balance Meter (Pillar 3) */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/60 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-brand">☯️ Chỉ số Quân bình Thực dưỡng Giỏ hàng</span>
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                {balanceScore}/100 điểm
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 flex">
              <div
                style={{ width: `${Math.round((yangQty / totalQty) * 100)}%` }}
                className="bg-amber-500 transition-all"
                title="Nhóm Dương ấm / Kiềm hóa"
              />
              <div
                style={{ width: `${Math.round((balancedQty / totalQty) * 100)}%` }}
                className="bg-emerald-600 transition-all"
                title="Nhóm Quân bình trung hòa"
              />
              <div
                style={{ width: `${Math.round((yinQty / totalQty) * 100)}%` }}
                className="bg-sky-500 transition-all"
                title="Nhóm Âm mát"
              />
            </div>
            <div className="flex justify-between text-[11px] font-semibold text-gray-600">
              <span>☀️ Dương ấm: {yangQty}</span>
              <span>☯️ Quân bình: {balancedQty}</span>
              <span>🌙 Âm mát: {yinQty}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-600">
              {yangQty === 0
                ? "💡 Gợi ý dưỡng sinh: Giỏ hàng hiện chưa có nhóm gia vị Dương tính kiềm hóa (như Tương Tamari lâu năm, Mơ muối Umeboshi hoặc Trà Bancha) để hỗ trợ tiêu hóa tốt hơn."
                : "✓ Giỏ hàng của quý khách có sự phối hợp hài hòa giữa ngũ cốc quân bình và thực phẩm kiềm hóa tự nhiên."}
            </p>
            <div className="pt-0.5">
              <Link
                href="/tu-van-nhanh/"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
              >
                🧘 Xem gợi ý Thực đơn Thực dưỡng 7 ngày theo thể trạng →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-green-200 bg-green-50/60 p-4 text-xs text-gray-700 space-y-2">
            <div className="text-sm font-bold text-brand">Quyền lợi &amp; Chính sách khách hàng</div>
            <ul className="space-y-1.5">
              <li>
                🚚 <strong>Vận chuyển:</strong> Nội thành TP.HCM giao trong <strong>1 – 2 ngày</strong>; các khu vực khác <strong>3 – 4 ngày</strong> (nguyên đai, nguyên kiện).{" "}
                <Link href="/chinh-sach/chinh-sach-van-chuyen.html" className="text-brand underline">Chi tiết</Link>
              </li>
              <li>
                📦 <strong>Kiểm hàng:</strong> Chấp nhận đồng kiểm với nhân viên giao hàng hoặc trong vòng <strong>30 phút</strong> từ khi nhận (quý khách vui lòng quay video lúc mở thùng).{" "}
                <Link href="/chinh-sach/chinh-sach-kiem-hang.html" className="text-brand underline">Chi tiết</Link>
              </li>
              <li>
                🔄 <strong>Đổi trả - Hoàn tiền:</strong> Thông báo trong <strong>48h</strong> và gửi trả trong <strong>7 ngày</strong> nếu sai mẫu mã, thiếu số lượng hoặc rách/vỡ bao bì.{" "}
                <Link href="/chinh-sach/chinh-sach-doi-tra-hoan-tien.html" className="text-brand underline">Chi tiết</Link>
              </li>
              <li>
                🔒 <strong>Bảo mật thông tin:</strong> Cam kết chỉ dùng thông tin để xác nhận &amp; giao đơn hàng; giải quyết khiếu nại trong vòng <strong>24h</strong>.{" "}
                <Link href="/chinh-sach/chinh-sach-bao-mat-thong-tin.html" className="text-brand underline">Chi tiết</Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}
