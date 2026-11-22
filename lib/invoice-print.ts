export type InvoicePaperSize = "A5_portrait" | "A5_landscape" | "A4" | "K80";
export type InvoiceFontSize = "sm" | "md" | "lg";

export type InvoicePrintConfig = {
  paperSize: InvoicePaperSize;
  fontSize: InvoiceFontSize;
  // Block 1: Store Header
  showLogo: boolean;
  showShopInfo: boolean;
  showWebQr: boolean;
  shopHeaderTitle: string;
  shopHeaderHotline: string;
  shopHeaderAddress: string;
  // Block 2: Invoice Title & Metadata
  invoiceTitle: string;
  showInvoiceBarcode: boolean;
  showCashierAndChannel: boolean;
  // Block 3: Customer & Shipping
  showCustomerBlock: boolean;
  showShippingBlock: boolean;
  // Block 4: Item Table Columns (8-column KiotViet Phuc Tho standard)
  showColStt: boolean;
  showColSku: boolean;
  showColUnit: boolean;
  showColDiscount: boolean;
  // Block 5: Totals, Amount in Words & VietQR
  showTotalQty: boolean;
  showAmountInWords: boolean;
  showVietQr: boolean;
  bankBin: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  // Block 6: Return Policy, Thank You & Signatures
  showReturnPolicy: boolean;
  returnPolicyText: string;
  showThankYou: boolean;
  thankYouText: string;
  showSignatures: boolean;
  showShipperSignature: boolean;
};

export const DEFAULT_INVOICE_PRINT_CONFIG: InvoicePrintConfig = {
  paperSize: "A5_portrait",
  fontSize: "md",
  showLogo: true,
  showShopInfo: true,
  showWebQr: true,
  shopHeaderTitle: "CỬA HÀNG PHÚC THỌ",
  shopHeaderHotline: "0858.816.070 - 0767.518.592",
  shopHeaderAddress: "",
  invoiceTitle: "HÓA ĐƠN BÁN HÀNG",
  showInvoiceBarcode: true,
  showCashierAndChannel: true,
  showCustomerBlock: true,
  showShippingBlock: true,
  showColStt: true,
  showColSku: true,
  showColUnit: true,
  showColDiscount: true,
  showTotalQty: true,
  showAmountInWords: true,
  showVietQr: true,
  bankBin: "970418",
  bankName: "BIDV",
  bankAccountNo: "8610312888",
  bankAccountName: "THUC DUONG PHUC THO",
  showReturnPolicy: true,
  returnPolicyText:
    "Lưu ý: Hàng được đổi trả trong vòng 5 ngày kể từ ngày khách nhận hàng ! Hàng đổi trả phải còn nguyên vẹn bao bì, niêm phong, không bị hư hao và được bảo quản đúng cách !",
  showThankYou: true,
  thankYouText: "Xin Cảm Ơn Quý Khách Đã Ủng Hộ Và Hẹn Gặp Lại Quý Khách !",
  showSignatures: true,
  showShipperSignature: false,
};

export const PAPER_SIZE_META: Record<
  InvoicePaperSize,
  { label: string; shortLabel: string; cssPageSize: string; containerClass: string; desc: string }
> = {
  A5_portrait: {
    label: "📄 Khổ A5 Dọc (148 × 210 mm — Chuẩn KiotViet)",
    shortLabel: "A5 Dọc",
    cssPageSize: "A5 portrait",
    containerClass: "max-w-[148mm]",
    desc: "Phù hợp đơn từ 1–12 mặt hàng, tiết kiệm 50% giấy so với A4.",
  },
  A5_landscape: {
    label: "📄 Khổ A5 Ngang (210 × 148 mm — 1/2 tờ A4 ngang)",
    shortLabel: "A5 Ngang",
    cssPageSize: "A5 landscape",
    containerClass: "max-w-[210mm]",
    desc: "Bề ngang rộng bằng tờ A4, bảng 8 cột hiển thị cực thoáng.",
  },
  A4: {
    label: "📄 Khổ A4 Dọc (210 × 297 mm)",
    shortLabel: "Khổ A4",
    cssPageSize: "A4 portrait",
    containerClass: "max-w-[210mm]",
    desc: "Dành cho đơn hàng sỉ hoặc nhiều mặt hàng.",
  },
  K80: {
    label: "🧾 Khổ K80 Hóa đơn nhiệt (80 mm)",
    shortLabel: "Khổ K80",
    cssPageSize: "80mm auto",
    containerClass: "max-w-[80mm]",
    desc: "Máy in bill cuộn nhiệt tại quầy thu ngân POS.",
  },
};

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];

function readTriple(n: number, full: boolean): string {
  const hundred = Math.floor(n / 100);
  const ten = Math.floor((n % 100) / 10);
  const unit = n % 10;
  const parts: string[] = [];

  if (full || hundred > 0) {
    parts.push(`${DIGITS[hundred]} trăm`);
  }

  if (ten > 1) {
    parts.push(`${DIGITS[ten]} mươi`);
    if (unit === 1) parts.push("mốt");
    else if (unit === 4) parts.push("tư");
    else if (unit === 5) parts.push("lăm");
    else if (unit > 0) parts.push(DIGITS[unit]);
  } else if (ten === 1) {
    parts.push("mười");
    if (unit === 5) parts.push("lăm");
    else if (unit > 0) parts.push(DIGITS[unit]);
  } else if (ten === 0 && unit > 0) {
    if (full || hundred > 0) parts.push("lẻ");
    parts.push(DIGITS[unit]);
  }

  return parts.join(" ");
}

/**
 * Convert a VND number into Vietnamese words for KiotViet `{Tong_Cong_Bang_Chu}` token.
 * Example: 625000 -> "Sáu trăm hai mươi lăm nghìn đồng chẵn"
 */
export function vndToVietnameseWords(amount: number): string {
  const clean = Math.max(0, Math.round(amount || 0));
  if (clean === 0) return "Không đồng";

  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  const groups: number[] = [];
  let rem = clean;
  while (rem > 0) {
    groups.push(rem % 1000);
    rem = Math.floor(rem / 1000);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    const isFirst = i === groups.length - 1;
    const text = readTriple(g, !isFirst);
    words.push(units[i] ? `${text} ${units[i]}` : text);
  }

  const joined = words.join(" ").trim();
  const capitalized = joined.charAt(0).toUpperCase() + joined.slice(1);
  return `${capitalized} đồng chẵn`;
}
