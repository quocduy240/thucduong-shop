"use client";

import { useState } from "react";
import { saveInvoicePrintConfigAction } from "@/app/admin/actions";
import {
  PAPER_SIZE_META,
  vndToVietnameseWords,
  type InvoiceFontSize,
  type InvoicePaperSize,
  type InvoicePrintConfig,
} from "@/lib/invoice-print";
import { vnd } from "@/lib/site";

export type PrintableOrderItem = {
  product_id: number;
  name: string;
  price: number;
  qty: number;
  sku: string;
  unit: string;
};

export type PrintableOrderData = {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  fullAddress: string;
  note: string;
  payment: string;
  total: number;
  status: string;
  statusLabel: string;
  created_at: string;
  shipping_carrier: string;
  tracking_code: string;
  shipping_fee: number;
  cod_amount: number;
  kiotviet_code: string;
};

export default function KiotVietInvoicePrintStudio({
  initialConfig,
  order,
  items,
  siteName,
  siteHotline,
  siteAddress,
}: {
  initialConfig: InvoicePrintConfig;
  order: PrintableOrderData;
  items: PrintableOrderItem[];
  siteName: string;
  siteHotline: string;
  siteAddress: string;
}) {
  const [cfg, setCfg] = useState<InvoicePrintConfig>(initialConfig);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(false);

  const itemsSubtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0);
  const paperMeta = PAPER_SIZE_META[cfg.paperSize] ?? PAPER_SIZE_META.A5_portrait;
  const isK80 = cfg.paperSize === "K80";

  const fontSizeClass =
    cfg.fontSize === "sm"
      ? "text-[11px]"
      : cfg.fontSize === "lg"
        ? "text-[14.5px]"
        : "text-[12.5px]";

  const effectiveShopTitle = cfg.shopHeaderTitle.trim() || siteName || "CỬA HÀNG PHÚC THỌ";
  const effectiveHotline = cfg.shopHeaderHotline.trim() || siteHotline || "0858.816.070 - 0767.518.592";
  const effectiveAddress = cfg.shopHeaderAddress.trim() || siteAddress;

  const amountToPay = order.cod_amount > 0 ? order.cod_amount : order.total;
  const vietQrUrl =
    cfg.showVietQr && cfg.bankBin && cfg.bankAccountNo && amountToPay > 0
      ? `https://img.vietqr.io/image/${encodeURIComponent(cfg.bankBin)}-${encodeURIComponent(cfg.bankAccountNo)}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(order.code)}&accountName=${encodeURIComponent(cfg.bankAccountName)}`
      : "";

  const paymentLabel =
    order.payment === "bank"
      ? "Chuyển khoản NH"
      : order.payment === "cash"
        ? "Tiền mặt tại quầy"
        : order.payment === "kiotviet"
          ? "Theo KiotViet"
          : "Thu hộ khi giao hàng (COD)";

  function updateField<K extends keyof InvoicePrintConfig>(key: K, val: InvoicePrintConfig[K]) {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }

  // Count how many columns are visible in the items table
  const visibleExtraCols =
    (cfg.showColStt && !isK80 ? 1 : 0) +
    (cfg.showColSku && !isK80 ? 1 : 0) +
    (cfg.showColUnit && !isK80 ? 1 : 0) +
    (cfg.showColDiscount && !isK80 ? 1 : 0);
  const summaryLabelColSpan = 2 + visibleExtraCols; // Tên hàng + Đơn giá + extra cols

  const invoiceSheet = (
    <div
      className={`mx-auto bg-white text-black leading-snug ${fontSizeClass} ${
        isK80 ? "w-[78mm] p-2" : "w-full p-4 print:p-0"
      }`}
    >
      {/* BLOCK 1: STORE HEADER */}
      {(cfg.showLogo || cfg.showShopInfo || cfg.showWebQr) && (
        <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-2.5">
          <div className="flex items-start gap-2.5">
            {cfg.showLogo && !isK80 && (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-black font-extrabold text-sm">
                PT
              </div>
            )}
            {cfg.showShopInfo && (
              <div>
                <div className="text-base font-extrabold uppercase tracking-tight">
                  {effectiveShopTitle}
                </div>
                <div className="font-semibold">Sđt: {effectiveHotline}</div>
                {effectiveAddress && <div>Đ/c: {effectiveAddress}</div>}
                <div>Website: thucduongshop.duyvo.win</div>
              </div>
            )}
          </div>

          {/* Right side of Block 1 / Block 2 Title */}
          <div className="flex items-start gap-3 text-right">
            <div>
              <div className="text-lg font-extrabold uppercase tracking-tight">
                {cfg.invoiceTitle || "HÓA ĐƠN BÁN HÀNG"}
              </div>
              <div className="font-mono font-bold">Số HĐ: {order.code}</div>
              {order.kiotviet_code && (
                <div className="font-mono text-[11px]">Mã KV: {order.kiotviet_code}</div>
              )}
              {cfg.showInvoiceBarcode && !isK80 && (
                <div
                  aria-label="Barcode"
                  className="mt-0.5 inline-block border border-black px-2 py-0.5 font-mono text-[10px] tracking-[0.22em]"
                >
                  ||| | |||| || | |||
                </div>
              )}
              <div className="mt-0.5 text-[11px]">Ngày: {order.created_at}</div>
            </div>

            {cfg.showWebQr && !isK80 && (
              <div className="flex flex-col items-center border border-black p-1 text-[9px]">
                <svg viewBox="0 0 21 21" className="h-11 w-11 fill-black">
                  <path d="M0 0h7v7H0V0zm1 1v5h5V1H1zm1 1h3v3H2V2zm12-2h7v7h-7V0zm1 1v5h5V1h-5zm1 1h3v3h-3V2zM0 14h7v7H0v-7zm1 1v5h5v-5H1zm1 1h3v3H2v-3zM9 1h2v2H9V1zm3 2h1v3h-1V3zM9 5h2v2H9V5zm0 4h3v2H9V9zm4-1h2v3h-2V8zM1 9h3v2H1V9zm5 1h2v2H6v-2zm8 2h3v2h-3v-2zm4 1h2v3h-2v-3zm-9 2h3v2H9v-2zm5 2h2v3h-2v-3zm3 2h3v2h-3v-2z" />
                </svg>
                <span className="mt-0.5 font-mono">QR Web</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOCK 3: CUSTOMER & SHIPPING INFO */}
      {(cfg.showCustomerBlock || cfg.showShippingBlock || cfg.showCashierAndChannel) && (
        <div className={`my-2.5 grid gap-3 ${isK80 ? "grid-cols-1" : "grid-cols-2"}`}>
          {cfg.showCustomerBlock && (
            <div className="space-y-0.5">
              <div>
                <strong>Khách hàng:</strong> {order.name}
              </div>
              <div>
                <strong>Số điện thoại:</strong> {order.phone}
              </div>
              <div>
                <strong>Địa chỉ giao:</strong> {order.fullAddress || "Mua trực tiếp tại cửa hàng"}
              </div>
              {order.note && (
                <div>
                  <strong>Ghi chú:</strong> {order.note}
                </div>
              )}
            </div>
          )}
          <div className={`space-y-0.5 ${isK80 ? "" : "text-right"}`}>
            <div>
              <strong>Hình thức TT:</strong> {paymentLabel}
            </div>
            {cfg.showCashierAndChannel && (
              <div>
                <strong>Chi nhánh:</strong> Chi nhánh trung tâm · <strong>Trạng thái:</strong> {order.statusLabel}
              </div>
            )}
            {cfg.showShippingBlock && order.shipping_carrier && (
              <div>
                <strong>Đối tác GH:</strong> {order.shipping_carrier}
              </div>
            )}
            {cfg.showShippingBlock && order.tracking_code && (
              <div>
                <strong>Mã vận đơn:</strong> <span className="font-mono font-bold">{order.tracking_code}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BLOCK 4: ITEMIZED PRODUCTS TABLE (8-COLUMN KIOTVIET PHUC THO STANDARD) */}
      <table className="w-full border-collapse border border-black">
        <thead>
          <tr className="bg-gray-100">
            {cfg.showColStt && !isK80 && (
              <th className="border border-black px-1.5 py-1 text-center w-9">STT</th>
            )}
            {cfg.showColSku && !isK80 && (
              <th className="border border-black px-1.5 py-1 text-left w-22">Mã hàng</th>
            )}
            <th className="border border-black px-1.5 py-1 text-left">Tên Hàng</th>
            {cfg.showColUnit && !isK80 && (
              <th className="border border-black px-1.5 py-1 text-center w-14">ĐVT</th>
            )}
            <th className="border border-black px-1.5 py-1 text-right w-11">SL</th>
            <th className="border border-black px-1.5 py-1 text-right w-22">Đơn giá</th>
            {cfg.showColDiscount && !isK80 && (
              <th className="border border-black px-1.5 py-1 text-right w-18">Chiết khấu</th>
            )}
            <th className="border border-black px-1.5 py-1 text-right w-24">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={`${i.product_id}-${idx}`}>
              {cfg.showColStt && !isK80 && (
                <td className="border border-black px-1.5 py-1 text-center">{idx + 1}</td>
              )}
              {cfg.showColSku && !isK80 && (
                <td className="border border-black px-1.5 py-1 font-mono text-[11px]">
                  {i.sku || `#${i.product_id}`}
                </td>
              )}
              <td className="border border-black px-1.5 py-1 font-medium">{i.name}</td>
              {cfg.showColUnit && !isK80 && (
                <td className="border border-black px-1.5 py-1 text-center">{i.unit || "SP"}</td>
              )}
              <td className="border border-black px-1.5 py-1 text-right font-semibold">{i.qty}</td>
              <td className="border border-black px-1.5 py-1 text-right">{vnd(i.price)}</td>
              {cfg.showColDiscount && !isK80 && (
                <td className="border border-black px-1.5 py-1 text-right">0đ</td>
              )}
              <td className="border border-black px-1.5 py-1 text-right font-semibold">
                {vnd(i.price * i.qty)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {cfg.showTotalQty && (
            <tr>
              <td
                colSpan={Math.max(1, summaryLabelColSpan - 1)}
                className="border border-black px-1.5 py-1 text-right font-bold"
              >
                Tổng số lượng: {totalQty} SP · Tổng tiền hàng:
              </td>
              <td colSpan={2} className="border border-black px-1.5 py-1 text-right font-bold">
                {vnd(itemsSubtotal)}
              </td>
            </tr>
          )}
          {itemsSubtotal !== order.total && (
            <tr>
              <td
                colSpan={Math.max(1, summaryLabelColSpan - 1)}
                className="border border-black px-1.5 py-1 text-right"
              >
                {order.total > itemsSubtotal ? "Phí giao hàng / Phụ thu:" : "Giảm giá hóa đơn:"}
              </td>
              <td colSpan={2} className="border border-black px-1.5 py-1 text-right">
                {order.total > itemsSubtotal
                  ? `+${vnd(order.total - itemsSubtotal)}`
                  : `-${vnd(itemsSubtotal - order.total)}`}
              </td>
            </tr>
          )}
          <tr className="bg-gray-100">
            <td
              colSpan={Math.max(1, summaryLabelColSpan - 1)}
              className="border border-black px-1.5 py-1.5 text-right font-extrabold uppercase"
            >
              Tổng thanh toán:
            </td>
            <td colSpan={2} className="border border-black px-1.5 py-1.5 text-right text-sm font-extrabold">
              {vnd(order.total)}
            </td>
          </tr>
          {order.cod_amount > 0 && (
            <tr>
              <td
                colSpan={Math.max(1, summaryLabelColSpan - 1)}
                className="border border-black px-1.5 py-1 text-right font-bold"
              >
                Còn lại cần thu hộ (COD):
              </td>
              <td colSpan={2} className="border border-black px-1.5 py-1 text-right font-bold">
                {vnd(order.cod_amount)}
              </td>
            </tr>
          )}
        </tfoot>
      </table>

      {/* BLOCK 5: AMOUNT IN WORDS & VIETQR */}
      {cfg.showAmountInWords && (
        <div className="mt-2 text-xs italic">
          <strong>Viết bằng chữ:</strong> {vndToVietnameseWords(order.total)}.
        </div>
      )}

      {/* BLOCK 6: RETURN POLICY, VIETQR & SIGNATURES */}
      <div className="mt-2.5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 space-y-1.5">
          {cfg.showReturnPolicy && cfg.returnPolicyText && (
            <div className="rounded border border-black/60 p-2 text-[11px] leading-snug">
              {cfg.returnPolicyText}
            </div>
          )}
          {cfg.showThankYou && cfg.thankYouText && (
            <div className="text-center font-bold italic text-[11.5px] pt-1">
              {cfg.thankYouText}
            </div>
          )}
        </div>

        {vietQrUrl && !isK80 && (
          <div className="flex shrink-0 flex-col items-center rounded border border-black p-1.5 text-center text-[10px]">
            <div className="font-bold">Quét VietQR Thanh Toán</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={vietQrUrl} alt="VietQR" className="my-1 h-24 w-24 object-contain" />
            <div className="font-mono font-semibold">
              {cfg.bankName}: {cfg.bankAccountNo}
            </div>
            <div className="text-[9px]">{cfg.bankAccountName}</div>
          </div>
        )}
      </div>

      {cfg.showSignatures && !isK80 && (
        <div
          className={`mt-4 grid text-center text-xs ${
            cfg.showShipperSignature ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          <div>
            <div className="font-bold uppercase">Người mua hàng</div>
            <div className="text-[10.5px] italic">(Ký, ghi rõ họ tên)</div>
            <div className="h-14" />
            <div className="font-semibold">{order.name}</div>
          </div>
          {cfg.showShipperSignature && (
            <div>
              <div className="font-bold uppercase">Người giao hàng</div>
              <div className="text-[10.5px] italic">(Ký, ghi rõ họ tên)</div>
              <div className="h-14" />
              <div className="font-semibold">{order.shipping_carrier || "ĐVVC"}</div>
            </div>
          )}
          <div>
            <div className="font-bold uppercase">Người bán hàng</div>
            <div className="text-[10.5px] italic">(Ký, ghi rõ họ tên)</div>
            <div className="h-14" />
            <div className="font-semibold">{effectiveShopTitle}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Dynamic @page rule so browser print dialog uses the selected paper size (A5 portrait / A5 landscape / A4 / K80) */}
      <style>{`
        @media print {
          @page {
            size: ${paperMeta.cssPageSize};
            margin: ${isK80 ? "3mm" : "8mm"};
          }
        }
      `}</style>

      {/* 1. Actual Print-Only Sheet */}
      <div className="hidden print:block">{invoiceSheet}</div>

      {/* 2. Interactive Screen Control Bar & KiotViet Template Configurator */}
      <div className="mb-4 rounded-2xl border-2 border-emerald-200 bg-white p-4 shadow-xs print:hidden space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wide text-brand">
              🖨️ In Hóa đơn KiotViet:
            </span>
            {(["A5_portrait", "A5_landscape", "A4", "K80"] as InvoicePaperSize[]).map((ps) => (
              <button
                key={ps}
                type="button"
                onClick={() => updateField("paperSize", ps)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  cfg.paperSize === ps
                    ? "bg-brand text-white shadow-2xs"
                    : "border bg-gray-50 text-gray-700 hover:border-brand hover:text-brand"
                }`}
              >
                {PAPER_SIZE_META[ps].shortLabel}
              </button>
            ))}

            <select
              value={cfg.fontSize}
              onChange={(e) => updateField("fontSize", e.target.value as InvoiceFontSize)}
              className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-gray-700"
              title="Cỡ chữ trang in"
            >
              <option value="sm">Cỡ chữ: Nhỏ (11px)</option>
              <option value="md">Cỡ chữ: Chuẩn KiotViet (13px)</option>
              <option value="lg">Cỡ chữ: Lớn dễ đọc (15px)</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLivePreview((v) => !v)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                showLivePreview
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              👁️ {showLivePreview ? "Ẩn Xem trước" : `Xem trước bản in (${paperMeta.shortLabel})`}
            </button>
            <button
              type="button"
              onClick={() => setShowConfigDrawer((v) => !v)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                showConfigDrawer
                  ? "border-amber-500 bg-amber-50 text-amber-900"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              ⚙️ Cấu hình Block hiển thị trên trang in
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white shadow-xs hover:bg-brand-dark cursor-pointer"
            >
              🖨️ In Hóa đơn ({paperMeta.shortLabel})
            </button>
          </div>
        </div>

        {/* Collapsible Template Configuration Drawer (#/Settings?SettingType=print-template) */}
        {showConfigDrawer && (
          <form
            action={saveInvoicePrintConfigAction}
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-4 text-xs"
          >
            <input type="hidden" name="return_to" value={`/admin/orders/${order.id}/`} />
            <input type="hidden" name="paperSize" value={cfg.paperSize} />
            <input type="hidden" name="fontSize" value={cfg.fontSize} />

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-amber-950">
                  ⚙️ Cấu hình Mẫu In Hóa Đơn Chuẩn KiotViet ({paperMeta.label})
                </h3>
                <p className="text-[11px] text-gray-600">
                  Tích chọn hoặc bỏ chọn các Block thông tin và cột dữ liệu dưới đây. Khi bấm &quot;Lưu làm mẫu mặc định&quot;, cấu hình sẽ áp dụng cho mọi đơn hàng.
                </p>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-800 cursor-pointer"
              >
                💾 Lưu làm Mẫu in mặc định
              </button>
            </div>

            {/* 6 Block Toggle Groups */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Group 1 & 2 */}
              <div className="rounded-xl border bg-white p-3.5 space-y-2">
                <div className="font-extrabold text-brand">1. Block Header Cửa hàng &amp; Tiêu đề</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showLogo"
                    value="1"
                    checked={cfg.showLogo}
                    onChange={(e) => updateField("showLogo", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Hiển thị Logo cửa hàng</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showShopInfo"
                    value="1"
                    checked={cfg.showShopInfo}
                    onChange={(e) => updateField("showShopInfo", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Hiển thị Tên shop, Hotline &amp; Địa chỉ</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showWebQr"
                    value="1"
                    checked={cfg.showWebQr}
                    onChange={(e) => updateField("showWebQr", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Hiển thị Mã QR Website ở góc phải</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showInvoiceBarcode"
                    value="1"
                    checked={cfg.showInvoiceBarcode}
                    onChange={(e) => updateField("showInvoiceBarcode", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Hiển thị Mã vạch Hóa đơn</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showCashierAndChannel"
                    value="1"
                    checked={cfg.showCashierAndChannel}
                    onChange={(e) => updateField("showCashierAndChannel", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Hiển thị Chi nhánh &amp; Trạng thái đơn</span>
                </label>
                <div className="pt-1 space-y-1.5">
                  <input
                    name="shopHeaderTitle"
                    value={cfg.shopHeaderTitle}
                    onChange={(e) => updateField("shopHeaderTitle", e.target.value)}
                    placeholder="Tên cửa hàng trên mẫu in"
                    className="w-full rounded border px-2.5 py-1.5 text-xs font-bold"
                  />
                  <input
                    name="shopHeaderHotline"
                    value={cfg.shopHeaderHotline}
                    onChange={(e) => updateField("shopHeaderHotline", e.target.value)}
                    placeholder="Số điện thoại Hotline"
                    className="w-full rounded border px-2.5 py-1.5 text-xs"
                  />
                  <input
                    name="shopHeaderAddress"
                    value={cfg.shopHeaderAddress}
                    onChange={(e) => updateField("shopHeaderAddress", e.target.value)}
                    placeholder="Địa chỉ cửa hàng (để trống = lấy mặc định)"
                    className="w-full rounded border px-2.5 py-1.5 text-xs"
                  />
                  <input
                    name="invoiceTitle"
                    value={cfg.invoiceTitle}
                    onChange={(e) => updateField("invoiceTitle", e.target.value)}
                    placeholder="Tiêu đề phiếu (HÓA ĐƠN BÁN HÀNG)"
                    className="w-full rounded border px-2.5 py-1.5 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Group 3 & 4 */}
              <div className="rounded-xl border bg-white p-3.5 space-y-2">
                <div className="font-extrabold text-brand">2. Block Khách hàng &amp; Cột Bảng hàng</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showCustomerBlock"
                    value="1"
                    checked={cfg.showCustomerBlock}
                    onChange={(e) => updateField("showCustomerBlock", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Block Thông tin Khách hàng &amp; Ghi chú</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showShippingBlock"
                    value="1"
                    checked={cfg.showShippingBlock}
                    onChange={(e) => updateField("showShippingBlock", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Block Đối tác giao hàng &amp; Mã vận đơn</span>
                </label>
                <div className="border-t pt-2 font-bold text-gray-800">Các cột trong Bảng Hàng hóa:</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showColStt"
                    value="1"
                    checked={cfg.showColStt}
                    onChange={(e) => updateField("showColStt", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Cột STT (Số thứ tự)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showColSku"
                    value="1"
                    checked={cfg.showColSku}
                    onChange={(e) => updateField("showColSku", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Cột Mã hàng (SKU)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showColUnit"
                    value="1"
                    checked={cfg.showColUnit}
                    onChange={(e) => updateField("showColUnit", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Cột ĐVT (Đơn vị tính)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showColDiscount"
                    value="1"
                    checked={cfg.showColDiscount}
                    onChange={(e) => updateField("showColDiscount", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Cột Chiết khấu trên đơn giá</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showTotalQty"
                    value="1"
                    checked={cfg.showTotalQty}
                    onChange={(e) => updateField("showTotalQty", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Dòng Tổng số lượng &amp; Tổng tiền hàng</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showAmountInWords"
                    value="1"
                    checked={cfg.showAmountInWords}
                    onChange={(e) => updateField("showAmountInWords", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Dòng &quot;Viết bằng chữ: ... đồng&quot;</span>
                </label>
              </div>

              {/* Group 5 & 6 */}
              <div className="rounded-xl border bg-white p-3.5 space-y-2">
                <div className="font-extrabold text-brand">3. Block VietQR, Đổi trả &amp; Chữ ký</div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showVietQr"
                    value="1"
                    checked={cfg.showVietQr}
                    onChange={(e) => updateField("showVietQr", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>In Mã QR Chuyển khoản Ngân hàng (VietQR)</span>
                </label>
                {cfg.showVietQr && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      name="bankName"
                      value={cfg.bankName}
                      onChange={(e) => updateField("bankName", e.target.value)}
                      placeholder="Tên NH (VD: BIDV)"
                      className="rounded border px-2 py-1 text-xs"
                    />
                    <input
                      name="bankBin"
                      value={cfg.bankBin}
                      onChange={(e) => updateField("bankBin", e.target.value)}
                      placeholder="Mã BIN (970418)"
                      className="rounded border px-2 py-1 text-xs font-mono"
                    />
                    <input
                      name="bankAccountNo"
                      value={cfg.bankAccountNo}
                      onChange={(e) => updateField("bankAccountNo", e.target.value)}
                      placeholder="Số tài khoản"
                      className="rounded border px-2 py-1 text-xs font-mono"
                    />
                    <input
                      name="bankAccountName"
                      value={cfg.bankAccountName}
                      onChange={(e) => updateField("bankAccountName", e.target.value)}
                      placeholder="Chủ tài khoản"
                      className="rounded border px-2 py-1 text-xs"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    name="showReturnPolicy"
                    value="1"
                    checked={cfg.showReturnPolicy}
                    onChange={(e) => updateField("showReturnPolicy", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Block Lưu ý chính sách đổi trả (5 ngày)</span>
                </label>
                <textarea
                  name="returnPolicyText"
                  rows={2}
                  value={cfg.returnPolicyText}
                  onChange={(e) => updateField("returnPolicyText", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-[11px]"
                />

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="showThankYou"
                    value="1"
                    checked={cfg.showThankYou}
                    onChange={(e) => updateField("showThankYou", e.target.checked)}
                    className="accent-brand"
                  />
                  <span>Lời cảm ơn cuối hóa đơn</span>
                </label>
                <input
                  name="thankYouText"
                  value={cfg.thankYouText}
                  onChange={(e) => updateField("thankYouText", e.target.value)}
                  className="w-full rounded border px-2 py-1 text-[11px]"
                />

                <div className="flex flex-wrap gap-3 pt-1">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="showSignatures"
                      value="1"
                      checked={cfg.showSignatures}
                      onChange={(e) => updateField("showSignatures", e.target.checked)}
                      className="accent-brand"
                    />
                    <span>Chữ ký Mua / Bán</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      name="showShipperSignature"
                      value="1"
                      checked={cfg.showShipperSignature}
                      onChange={(e) => updateField("showShipperSignature", e.target.checked)}
                      className="accent-brand"
                    />
                    <span>+ Chữ ký Giao hàng</span>
                  </label>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Live On-Screen Preview of Selected Paper Size (A5 / A4 / K80) */}
        {showLivePreview && (
          <div className="mt-3 rounded-xl border-2 border-dashed border-indigo-300 bg-gray-100 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-indigo-900">
              <span className="font-bold">
                👁️ Bản xem trước trực tiếp — {paperMeta.label} ({paperMeta.desc})
              </span>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg bg-indigo-700 px-3 py-1 font-bold text-white hover:bg-indigo-800 cursor-pointer"
              >
                🖨️ In ngay theo mẫu này
              </button>
            </div>
            <div className={`mx-auto rounded-lg border bg-white shadow-md ${paperMeta.containerClass}`}>
              {invoiceSheet}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
