"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RotatingHotline from "./RotatingHotline";

export type CdsProductInfo = {
  id: number;
  name: string;
  price: number;
  sale_price: number | null;
  image: string | null;
  href: string;
};

const INGREDIENTS = [
  {
    name: "Cà rốt hữu cơ",
    img: "/uploads/cds/cds-carrot.jpg",
    desc: "Giàu Beta-carotene, vitamin A & chất chống oxy hoá bảo vệ tế bào và thị lực.",
  },
  {
    name: "Củ cải trắng",
    img: "/uploads/cds/cds-cu-cai-trang.jpg",
    desc: "Thanh nhiệt, hỗ trợ tiêu hoá, giảm đầy hơi và giúp kiềm hoá máu tự nhiên.",
  },
  {
    name: "Nấm đông cô",
    img: "/uploads/cds/cds-nam-dong-co.jpg",
    desc: "Tăng cường miễn dịch tự nhiên, bổ sung khoáng chất và acid amin thiết yếu.",
  },
  {
    name: "Ngưu báng (Burdock)",
    img: "/uploads/cds/cds-nguu-bang.jpg",
    desc: "Thảo mộc quý trong thực dưỡng giúp lọc máu, giải độc gan và ổn định đường huyết.",
  },
  {
    name: "Lá củ cải trắng",
    img: "/uploads/cds/cds-la-cu-cai-trang.jpg",
    desc: "Chứa hàm lượng canxi, sắt, diệp lục và chất xơ dồi dào giúp cân bằng Âm – Dương.",
  },
];

const BENEFITS = [
  {
    title: "Giải rượu, bia & độc tố gan",
    img: "/uploads/cds/cds-say-ruou-bia.jpg",
    desc: "Trung hoà acid dư thừa, giảm mệt mỏi và giúp cơ thể nhẹ nhàng nhanh chóng.",
  },
  {
    title: "Hỗ trợ giảm triệu chứng Gout",
    img: "/uploads/cds/cds-benh-gout.jpg",
    desc: "Hỗ trợ đào thải acid uric, kiềm hoá nội môi và làm dịu sưng đau khớp.",
  },
  {
    title: "Viêm loét dạ dày & Khuẩn HP",
    img: "/uploads/cds/cds-dau-bao-tu.jpg",
    desc: "Làm dịu niêm mạc dạ dày, giảm trào ngược và cân bằng môi trường tiêu hoá.",
  },
  {
    title: "Cảm, ho, sổ mũi, viêm họng",
    img: "/uploads/cds/cds-cam-cum.jpg",
    desc: "Nâng cao sức đề kháng, giảm nhanh triệu chứng cảm cúm thông thường khi uống ấm.",
  },
  {
    title: "Hỗ trợ Viêm gan siêu vi",
    img: "/uploads/cds/cds-viem-gan.jpg",
    desc: "Bồi bổ chức năng gan, giảm men gan, cải thiện mụn nhọt, nám da và táo bón.",
  },
];

function formatVnd(n: number) {
  return `${new Intl.NumberFormat("vi-VN").format(n)}đ`;
}

function ZoomableProductImage({
  src,
  alt,
  className = "",
  wrapperClassName = "",
}: {
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
}) {
  const [zooming, setZooming] = useState(false);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setPos({ x, y });
  }

  return (
    <div
      onMouseEnter={() => setZooming(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => setZooming(false)}
      className={`relative overflow-hidden cursor-zoom-in ${wrapperClassName}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`transition-transform duration-150 ease-out ${className}`}
        style={
          zooming
            ? { transform: "scale(2.3)", transformOrigin: `${pos.x}% ${pos.y}%` }
            : { transform: "scale(1)", transformOrigin: "center center" }
        }
      />
      {!zooming && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] text-white backdrop-blur-sm">
          🔍 Rê chuột để soi chi tiết
        </span>
      )}
    </div>
  );
}

export default function CanhDuongSinhLanding({
  instantProd,
  teaBagProd,
  hotline,
  zaloUrl,
}: {
  instantProd: CdsProductInfo | null;
  teaBagProd: CdsProductInfo | null;
  hotline: string;
  zaloUrl: string;
}) {
  const router = useRouter();
  const [qtyInstant, setQtyInstant] = useState(1);
  const [qtyTeaBag, setQtyTeaBag] = useState(1);
  const [addedKey, setAddedKey] = useState<string>("");
  const [busyKey, setBusyKey] = useState<string>("");

  async function addToCart(prod: CdsProductInfo | null, qty: number, key: string, goCart = false) {
    if (!prod) return;
    setBusyKey(key);
    try {
      const res = await fetch(`/api/v2/add-to-cart/${prod.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty, quantity: qty }),
      });
      if (res.ok) {
        setAddedKey(key);
        if (goCart) router.push("/cart");
        else router.refresh();
      }
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="bg-gradient-to-b from-emerald-50/60 via-white to-amber-50/30">
      {/* 1. Hero Section */}
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <div className="grid items-center gap-8 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:grid-cols-12 md:p-10">
          <div className="space-y-4 md:col-span-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
              🌿 Nguyên liệu tươi đạt chuẩn Hữu Cơ Đài Loan · King Kung
            </span>
            <h1 className="text-3xl font-extrabold leading-tight text-brand md:text-4xl">
              Canh Dưỡng Sinh King Kung
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed md:text-base">
              Công thức <strong>5 loại rau củ hữu cơ vàng</strong> giúp <strong>kiềm hoá cơ thể</strong>, đào thải độc tố nhanh chóng, giảm mệt mỏi, hỗ trợ tiêu hoá, Gout, dạ dày và nâng cao sức khoẻ tổng quát mỗi ngày.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                href="#mua-canh-duong-sinh"
                className="rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-dark"
              >
                🛒 Chọn Mua Canh Dưỡng Sinh
              </a>
              <RotatingHotline
                raw={hotline}
                prefix="📞 Tư vấn: "
                className="rounded-full border border-brand bg-green-50 px-5 py-3 text-sm font-bold text-brand transition hover:bg-brand hover:text-white"
              />
            </div>
          </div>

          <div className="md:col-span-6">
            <ZoomableProductImage
              src="/uploads/cds/cds-products.png"
              alt="Canh Dưỡng Sinh King Kung Hòa Tan & Túi Lọc"
              wrapperClassName="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-amber-50 p-4"
              className="mx-auto max-h-80 w-full object-contain"
            />
          </div>
        </div>
      </section>

      {/* 2. Buy Box: 2 Flagship Variants (Hòa tan 60 gói & Túi lọc 90 gói) */}
      <section id="mua-canh-duong-sinh" className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            2 Phiên Bản Canh Dưỡng Sinh Chính Hãng
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Lựa chọn dạng Bột hòa tan tiện lợi hoặc dạng Túi lọc truyền thống phù hợp nhu cầu của bạn
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: Hòa tan 60 gói */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm transition hover:border-brand">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                    Bán chạy nhất · Pha 30 giây
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-gray-900">Canh dưỡng sinh hòa tan</h3>
                </div>
                {instantProd && (
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-accent">
                      {formatVnd(instantProd.sale_price ?? instantProd.price)}
                    </div>
                    {instantProd.sale_price && instantProd.price > instantProd.sale_price && (
                      <div className="text-xs text-gray-400 line-through">{formatVnd(instantProd.price)}</div>
                    )}
                  </div>
                )}
              </div>

              <ZoomableProductImage
                src={instantProd?.image || "/uploads/products/phuctho/chiet-xuat-rau-cu-hon-hop-vegetable-drink-canh-duong-sinh-hoa-tan-h-60-goi.jpg"}
                alt="Canh dưỡng sinh hòa tan hộp 60 gói"
                wrapperClassName="rounded-xl border bg-gray-50 p-3"
                className="mx-auto h-56 w-full object-contain"
              />

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-emerald-50/60 p-3 text-xs">
                <div>
                  <span className="text-gray-500">Loại:</span>{" "}
                  <strong className="text-gray-900">Bột hòa tan</strong>
                </div>
                <div>
                  <span className="text-gray-500">Quy cách:</span>{" "}
                  <strong className="text-gray-900">Hộp 60 gói</strong>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">Số lượng hộp:</span>
                <div className="inline-flex items-center rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setQtyInstant((q) => Math.max(1, q - 1))}
                    className="px-3 py-1 font-bold hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 font-bold">{qtyInstant}</span>
                  <button
                    type="button"
                    onClick={() => setQtyInstant((q) => q + 1)}
                    className="px-3 py-1 font-bold hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!instantProd || busyKey === "instant"}
                  onClick={() => addToCart(instantProd, qtyInstant, "instant", false)}
                  className="flex-1 rounded-xl border-2 border-brand bg-green-50 px-4 py-2.5 text-xs font-bold text-brand hover:bg-brand hover:text-white cursor-pointer"
                >
                  {addedKey === "instant" ? "✓ Đã thêm vào giỏ" : "🛒 Thêm vào giỏ"}
                </button>
                <button
                  type="button"
                  disabled={!instantProd || busyKey === "instant-buy"}
                  onClick={() => addToCart(instantProd, qtyInstant, "instant-buy", true)}
                  className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer"
                >
                  ⚡ Đặt mua ngay
                </button>
              </div>
              {instantProd && (
                <Link href={instantProd.href} className="block text-center text-xs font-semibold text-gray-500 hover:text-brand hover:underline">
                  Xem chi tiết &amp; soi ảnh sản phẩm →
                </Link>
              )}
            </div>
          </div>

          {/* Card 2: Túi lọc 90 gói */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-sm transition hover:border-brand">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    Truyền thống · Hãm nước sôi
                  </span>
                  <h3 className="mt-2 text-xl font-bold text-gray-900">Canh dưỡng sinh túi lọc</h3>
                </div>
                {teaBagProd && (
                  <div className="text-right">
                    <div className="text-lg font-extrabold text-accent">
                      {formatVnd(teaBagProd.sale_price ?? teaBagProd.price)}
                    </div>
                    {teaBagProd.sale_price && teaBagProd.price > teaBagProd.sale_price && (
                      <div className="text-xs text-gray-400 line-through">{formatVnd(teaBagProd.price)}</div>
                    )}
                  </div>
                )}
              </div>

              <ZoomableProductImage
                src={teaBagProd?.image || "/uploads/products/phuctho/tra-rau-cu-tui-loc-canh-duong-sinh-tui-loc.jpg"}
                alt="Canh dưỡng sinh túi lọc hộp 90 gói"
                wrapperClassName="rounded-xl border bg-gray-50 p-3"
                className="mx-auto h-56 w-full object-contain"
              />

              <div className="grid grid-cols-2 gap-2 rounded-xl bg-emerald-50/60 p-3 text-xs">
                <div>
                  <span className="text-gray-500">Loại:</span>{" "}
                  <strong className="text-gray-900">Túi lọc</strong>
                </div>
                <div>
                  <span className="text-gray-500">Quy cách:</span>{" "}
                  <strong className="text-gray-900">Hộp 90 gói</strong>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-700">Số lượng hộp:</span>
                <div className="inline-flex items-center rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setQtyTeaBag((q) => Math.max(1, q - 1))}
                    className="px-3 py-1 font-bold hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 font-bold">{qtyTeaBag}</span>
                  <button
                    type="button"
                    onClick={() => setQtyTeaBag((q) => q + 1)}
                    className="px-3 py-1 font-bold hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!teaBagProd || busyKey === "teabag"}
                  onClick={() => addToCart(teaBagProd, qtyTeaBag, "teabag", false)}
                  className="flex-1 rounded-xl border-2 border-brand bg-green-50 px-4 py-2.5 text-xs font-bold text-brand hover:bg-brand hover:text-white cursor-pointer"
                >
                  {addedKey === "teabag" ? "✓ Đã thêm vào giỏ" : "🛒 Thêm vào giỏ"}
                </button>
                <button
                  type="button"
                  disabled={!teaBagProd || busyKey === "teabag-buy"}
                  onClick={() => addToCart(teaBagProd, qtyTeaBag, "teabag-buy", true)}
                  className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-dark cursor-pointer"
                >
                  ⚡ Đặt mua ngay
                </button>
              </div>
              {teaBagProd && (
                <Link href={teaBagProd.href} className="block text-center text-xs font-semibold text-gray-500 hover:text-brand hover:underline">
                  Xem chi tiết &amp; soi ảnh sản phẩm →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. 5 Thành Phần Vàng Hữu Cơ */}
      <section className="mx-auto max-w-6xl px-4 py-8 space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            5 Thành Phần Rau Củ Hữu Cơ Đài Loan
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Phối hợp theo tỷ lệ vàng của Tiến sĩ Thạch Lập Hòa giúp kiềm hoá máu và phục hồi tế bào
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
          {INGREDIENTS.map((ing) => (
            <div key={ing.name} className="overflow-hidden rounded-2xl border bg-white shadow-xs transition hover:shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ing.img} alt={ing.name} className="aspect-[4/3] w-full object-cover" />
              <div className="p-3.5">
                <h3 className="text-sm font-bold text-brand">{ing.name}</h3>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">{ing.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Công Dụng Nổi Bật */}
      <section className="mx-auto max-w-6xl px-4 py-8 space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            Công Dụng Đào Thải Độc Tố &amp; Hỗ Trợ Phục Hồi Sức Khoẻ
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Giảm mệt mỏi nhanh chóng, làm cơ thể nhẹ nhàng, hỗ trợ cải thiện nhiều vấn đề sức khoẻ thường gặp
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="overflow-hidden rounded-2xl border bg-white shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.img} alt={b.title} className="aspect-[4/3] w-full object-cover" />
              <div className="p-3.5">
                <h3 className="text-sm font-bold text-gray-900">{b.title}</h3>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Hướng Dẫn Sử Dụng Chuẩn */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid items-center gap-8 rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm md:grid-cols-12 md:p-8">
          <div className="space-y-4 md:col-span-7">
            <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              ☕ Hướng dẫn sử dụng hiệu quả nhất
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Uống ấm 30 phút trước ăn hoặc uống lúc bụng đói
            </h2>
            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <div className="rounded-xl bg-emerald-50/70 p-3.5">
                <strong>• Dạng Bột Hòa Tan (Hộp 60 gói):</strong> Pha 1 gói với 150–200ml nước sôi ấm (70–80°C), khuấy đều cho tan hoàn toàn rồi uống ấm ngay. Ngày dùng 1–3 gói.
              </div>
              <div className="rounded-xl bg-amber-50/70 p-3.5">
                <strong>• Dạng Túi Lọc (Hộp 90 gói):</strong> Cho 1–2 túi lọc vào bình giữ nhiệt hoặc ấm đun với 500–600ml nước sôi, hãm trong 15–20 phút (hoặc đun nhỏ lửa 10 phút) để chiết xuất hết dưỡng chất, uống ấm trong ngày.
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/tu-van-nhanh/"
                className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-dark"
              >
                🌿 Tư vấn liều dùng theo thể trạng (AI)
              </Link>
              {zaloUrl && (
                <a
                  href={zaloUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-blue-500 bg-blue-50 px-5 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  💬 Chat Zalo Chuyên Gia
                </a>
              )}
            </div>
          </div>
          <div className="md:col-span-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uploads/cds/cds-hdsd-right.png"
              alt="Hướng dẫn pha Canh Dưỡng Sinh"
              className="mx-auto max-h-72 w-full rounded-2xl object-contain"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
