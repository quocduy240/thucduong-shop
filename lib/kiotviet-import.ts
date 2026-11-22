import "server-only";
import zlib from "node:zlib";
import { all, batch, one, run } from "./db";
import type {
  KiotVietApplyResult,
  KiotVietImportOptions,
  KiotVietPreviewItem,
  KiotVietPreviewResult,
} from "./kiotviet-import-types";
import { ensureRetailOpsSchema } from "./retail-ops";
import { slugify } from "./uploads";

export type {
  KiotVietApplyResult,
  KiotVietImportOptions,
  KiotVietPreviewItem,
  KiotVietPreviewResult,
} from "./kiotviet-import-types";

export type KiotVietRawRow = {
  rowNum: number;
  loaiHang: string;
  nhomHang: string;
  maHang: string;
  maVach: string;
  tenHang: string;
  thuongHieu: string;
  giaBan: number;
  giaVon: number;
  tonKhoRaw: number;
  tonNhoNhat: number;
  tonLonNhat: number;
  donViTinh: string;
  hinhAnh: string[];
  trongLuong: number;
  viTri: string;
  dangKinhDoanh: boolean;
  moTa: string;
  mauGhiChu: string;
};

const ORIGIN_BRANDS = new Set([
  "việt nam",
  "viet nam",
  "hàn quốc",
  "han quoc",
  "nhật bản",
  "nhat ban",
  "nhập khẩu",
  "nhap khau",
  "no",
  "không",
]);

const CATEGORY_ALIASES: Record<string, { slug: string; name: string }> = {
  "gao sach huu co": { slug: "gao-sach-huu-co", name: "Gạo Sạch Hữu Cơ" },
  "bun pho mi": { slug: "bun-pho-mi-hu-tiu-kho", name: "Bún Phở Mì Hủ Tíu Khô" },
  "gia vi thuc duong": { slug: "gia-vi-tu-nhien", name: "Gia Vị Tự Nhiên" },
  "thuc uong thuc duong": { slug: "thuc-uong-duong-sinh", name: "Thức Uống Dưỡng Sinh" },
  "ngu coc": { slug: "ngu-coc-dau-hat-sach-huu-co", name: "Ngũ Cốc - Đậu Hạt Sạch Hữu Cơ" },
  "thuc an thuc duong": {
    slug: "thuc-pham-dinh-duong-an-lien",
    name: "Thực Phẩm Dinh Dưỡng Ăn Liền (Cháo, Súp, Bún ăn liền…)",
  },
  "ngu coc>>ngu coc thuc duong": { slug: "ngu-coc-thuc-duong", name: "Ngũ Cốc Thực Dưỡng" },
  "thuc uong thuc duong>>tra thuc duong": { slug: "tra-thuc-duong", name: "Trà Thực Dưỡng" },
  "thuc uong thuc duong>>tra thuoc duong": { slug: "tra-thuc-duong", name: "Trà Thực Dưỡng" },
  "thuc an thuc duong>>hang nhat": { slug: "hang-nhat-thuc-duong", name: "Hàng Nhật Thực Dưỡng" },
  "banh>>nguyen lieu lam banh": { slug: "nguyen-lieu-lam-banh", name: "Nguyên Liệu Làm Bánh" },
  "hang dai loan": { slug: "hang-dai-loan", name: "Hàng Đài Loan" },
  "dung cu y khoa": { slug: "dung-cu-y-khoa", name: "Dụng Cụ Y Khoa" },
  "linh tinh": { slug: "san-pham-khac", name: "Sản Phẩm Khác" },
  "sach tai lieu": { slug: "sach", name: "Sách" },
};

export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9>]+/g, " ")
    .trim();
}

function normalizeProductName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeUnit(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (!s) return "";
  const map: Record<string, string> = {
    goi: "Gói",
    "gói": "Gói",
    tui: "Túi",
    "túi": "Túi",
    hop: "Hộp",
    "hộp": "Hộp",
    chai: "Chai",
    bich: "Bịch",
    "bịch": "Bịch",
    hu: "Hũ",
    "hũ": "Hũ",
    "hủ": "Hũ",
    quyen: "Quyển",
    "quyển": "Quyển",
    lo: "Lọ",
    "lọ": "Lọ",
    vi: "Vỉ",
    "vỉ": "Vỉ",
    vien: "Viên",
    "viên": "Viên",
    ly: "Ly",
    bo: "Bộ",
    "bộ": "Bộ",
    cai: "Cái",
    "cái": "Cái",
    day: "Dây",
    "dây": "Dây",
    tuyp: "Tuýp",
    "tuýp": "Tuýp",
    tuyt: "Tuýp",
    "tuýt": "Tuýp",
    bao: "Bao",
    may: "Máy",
    "máy": "Máy",
    cay: "Cây",
    "cây": "Cây",
    kg: "Kg",
  };
  const key = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  return map[s] ?? map[key] ?? raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase();
}

function cleanBrandOrigin(rawBrand: string): { brand: string; origin: string } {
  const b = rawBrand.trim();
  if (!b) return { brand: "", origin: "" };
  const lower = b.toLowerCase();
  if (ORIGIN_BRANDS.has(lower)) {
    if (lower === "no" || lower === "không") return { brand: "", origin: "" };
    if (lower.includes("nhập khẩu") || lower.includes("nhap khau")) return { brand: "", origin: "Nhập khẩu" };
    if (lower.includes("việt nam") || lower.includes("viet nam")) return { brand: "", origin: "Việt Nam" };
    if (lower.includes("hàn quốc") || lower.includes("han quoc")) return { brand: "", origin: "Hàn Quốc" };
    return { brand: "", origin: b };
  }
  let origin = "";
  if (/\b(mỹ|usa|us)\b/i.test(b)) origin = "Mỹ";
  else if (/\b(úc|aust|australia)\b/i.test(b)) origin = "Úc";
  else if (/\b(nhật|muso|japan)\b/i.test(b)) origin = "Nhật Bản";
  else if (/\b(đài loan|kingkung)\b/i.test(b)) origin = "Đài Loan";
  else if (/\b(hàn quốc|han quoc)\b/i.test(b)) origin = "Hàn Quốc";
  else if (/\b(đức|germany)\b/i.test(b)) origin = "Đức";
  else if (/\b(ý|italy)\b/i.test(b)) origin = "Ý";
  return { brand: b, origin };
}

function mapCategoryName(rawGroup: string): { slug: string; name: string } {
  const clean = rawGroup.trim();
  if (!clean) return { slug: "chua-phan-loai", name: "Chưa Phân Loại" };
  const normKey = clean
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/\s*>>\s*/g, ">>")
    .trim();

  if (CATEGORY_ALIASES[normKey]) return CATEGORY_ALIASES[normKey];

  const leaf = clean.includes(">>") ? clean.split(">>").pop()!.trim() : clean;
  const formatted =
    leaf === leaf.toUpperCase() && leaf.length > 4
      ? leaf
          .toLowerCase()
          .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
      : leaf.charAt(0).toUpperCase() + leaf.slice(1);
  return { slug: slugify(formatted) || "khac", name: formatted };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainTextToHtml(raw: string): string {
  const lines = raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  return lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("");
}

// ---- Minimal pure-TS ZIP/XLSX + CSV reader (Cloudflare Workers compatible) ----
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function extractZipEntries(buf: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const files = new Map<string, Uint8Array>();
  // Locate End of Central Directory (PK\x05\x06)
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("File XLSX không hợp lệ (không tìm thấy EOCD).");
  const cdOffset = view.getUint32(eocd + 16, true);
  const totalEntries = view.getUint16(eocd + 10, true);
  let ptr = cdOffset;
  const dec = new TextDecoder("utf-8");

  for (let i = 0; i < totalEntries; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) break;
    const method = view.getUint16(ptr + 10, true);
    const compSize = view.getUint32(ptr + 20, true);
    const nameLen = view.getUint16(ptr + 28, true);
    const extraLen = view.getUint16(ptr + 30, true);
    const commentLen = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const name = dec.decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (view.getUint32(localOffset, true) !== 0x04034b50) continue;
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const compData = buf.subarray(dataStart, dataStart + compSize);
    if (method === 0) {
      files.set(name, compData);
    } else if (method === 8) {
      files.set(name, zlib.inflateRawSync(compData));
    }
  }
  return files;
}

function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(xml))) {
    let text = "";
    let tm: RegExpExecArray | null;
    tRe.lastIndex = 0;
    while ((tm = tRe.exec(m[1]))) {
      text += decodeXmlEntities(tm[1]);
    }
    out.push(text);
  }
  return out;
}

function colLettersToIndex(col: string): number {
  let n = 0;
  for (let i = 0; i < col.length; i++) {
    n = n * 26 + (col.charCodeAt(i) - 64);
  }
  return n - 1;
}

function parseXlsxRows(buf: Uint8Array): string[][] {
  const entries = extractZipEntries(buf);
  const dec = new TextDecoder("utf-8");
  const ssBytes = entries.get("xl/sharedStrings.xml");
  const shared = ssBytes ? parseSharedStrings(dec.decode(ssBytes)) : [];

  const sheetEntry =
    entries.get("xl/worksheets/sheet1.xml") ??
    Array.from(entries.entries()).find(([k]) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))?.[1];
  if (!sheetEntry) throw new Error("Không tìm thấy sheet dữ liệu trong file XLSX.");

  const xml = dec.decode(sheetEntry);
  const rows: string[][] = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
  let rm: RegExpExecArray | null;

  while ((rm = rowRe.exec(xml))) {
    const rowArr: string[] = [];
    cellRe.lastIndex = 0;
    let cm: RegExpExecArray | null;
    while ((cm = cellRe.exec(rm[1]))) {
      const attrs = cm[1];
      const body = cm[2];
      const refM = attrs.match(/\br="([A-Z]+)\d+"/);
      const colIdx = refM ? colLettersToIndex(refM[1]) : rowArr.length;
      const typeM = attrs.match(/\bt="([^"]+)"/);
      const cellType = typeM ? typeM[1] : "";

      let val = "";
      if (cellType === "s") {
        const vm = body.match(/<v>(\d+)<\/v>/);
        if (vm) val = shared[Number(vm[1])] ?? "";
      } else if (cellType === "inlineStr") {
        const tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
        let tm: RegExpExecArray | null;
        while ((tm = tRe.exec(body))) val += decodeXmlEntities(tm[1]);
      } else {
        const vm = body.match(/<v>([\s\S]*?)<\/v>/);
        if (vm) val = decodeXmlEntities(vm[1]);
      }
      rowArr[colIdx] = val;
    }
    if (rowArr.some((v) => v !== undefined && v !== "")) {
      rows.push(rowArr);
    }
  }
  return rows;
}

function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n") {
      row.push(cur);
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
      cur = "";
    } else if (ch !== "\r") {
      cur += ch;
    }
  }
  row.push(cur);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

export function parseKiotVietSpreadsheet(buffer: Uint8Array, filename: string): KiotVietRawRow[] {
  const lower = filename.toLowerCase();
  const table = lower.endsWith(".csv")
    ? parseCsvRows(new TextDecoder("utf-8").decode(buffer))
    : parseXlsxRows(buffer);

  if (table.length < 2) throw new Error("File không có dữ liệu sản phẩm.");
  const header = table[0].map((h) => (h ?? "").trim());
  const col = (names: string[]) => header.findIndex((h) => names.some((n) => h.toLowerCase() === n.toLowerCase()));

  const idxLoai = col(["Loại hàng"]);
  const idxNhom = col(["Nhóm hàng(3 Cấp)", "Nhóm hàng"]);
  const idxMa = col(["Mã hàng"]);
  const idxVach = col(["Mã vạch"]);
  const idxTen = col(["Tên hàng"]);
  const idxBrand = col(["Thương hiệu"]);
  const idxGiaBan = col(["Giá bán"]);
  const idxGiaVon = col(["Giá vốn"]);
  const idxTon = col(["Tồn kho"]);
  const idxMin = col(["Tồn nhỏ nhất"]);
  const idxMax = col(["Tồn lớn nhất"]);
  const idxDvt = col(["ĐVT"]);
  const idxImg = col(["Hình ảnh (url1,url2...)", "Hình ảnh"]);
  const idxWeight = col(["Trọng lượng"]);
  const idxLoc = col(["Vị trí"]);
  const idxActive = col(["Đang kinh doanh"]);
  const idxDesc = col(["Mô tả"]);
  const idxNote = col(["Mẫu ghi chú"]);

  if (idxMa < 0 || idxTen < 0) {
    throw new Error("Thiếu cột 'Mã hàng' hoặc 'Tên hàng' đúng chuẩn file export KiotViet.");
  }

  const out: KiotVietRawRow[] = [];
  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    const get = (idx: number) => (idx >= 0 ? String(r[idx] ?? "").trim() : "");
    const maHang = get(idxMa);
    const tenHang = get(idxTen);
    if (!maHang || !tenHang) continue;

    const numVal = (idx: number) => {
      const n = Number(get(idx).replace(/,/g, ""));
      return Number.isFinite(n) ? n : 0;
    };

    const rawImgs = get(idxImg)
      .split(",")
      .map((u) => u.trim())
      .filter((u) => /^https?:\/\//i.test(u));

    out.push({
      rowNum: i + 1,
      loaiHang: get(idxLoai) || "Hàng hóa",
      nhomHang: get(idxNhom),
      maHang,
      maVach: get(idxVach),
      tenHang,
      thuongHieu: get(idxBrand),
      giaBan: Math.max(0, Math.round(numVal(idxGiaBan))),
      giaVon: Math.max(0, Math.round(numVal(idxGiaVon))),
      tonKhoRaw: numVal(idxTon),
      tonNhoNhat: Math.max(0, Math.round(numVal(idxMin))),
      tonLonNhat: idxMax >= 0 && get(idxMax) !== "" ? Math.max(0, Math.round(numVal(idxMax))) : 999999999,
      donViTinh: get(idxDvt),
      hinhAnh: rawImgs,
      trongLuong: Math.max(0, Math.round(numVal(idxWeight))),
      viTri: get(idxLoc),
      dangKinhDoanh: get(idxActive) !== "0",
      moTa: get(idxDesc),
      mauGhiChu: get(idxNote),
    });
  }
  return out;
}

export async function ensureKiotVietProductColumn() {
  await ensureRetailOpsSchema();
  await run("CREATE INDEX IF NOT EXISTS idx_products_kv_code ON products(kv_code)");
  await run("CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)");
}

async function loadExistingMaps() {
  await ensureKiotVietProductColumn();
  const [cats, prods] = await Promise.all([
    all<{ id: number; slug: string; name: string }>("SELECT id, slug, name FROM product_categories"),
    all<{ id: number; slug: string; name: string; sku: string; kv_code: string; stock: number; description: string; image: string | null }>(
      "SELECT id, slug, name, sku, COALESCE(kv_code, '') AS kv_code, stock, description, image FROM products",
    ),
  ]);
  const catBySlug = new Map(cats.map((c) => [c.slug, c]));
  const prodByKv = new Map<string, (typeof prods)[number]>();
  const prodBySku = new Map<string, (typeof prods)[number]>();
  const prodByNormName = new Map<string, (typeof prods)[number]>();
  const usedSlugs = new Set<string>();

  for (const p of prods) {
    usedSlugs.add(p.slug);
    if (p.kv_code) prodByKv.set(p.kv_code.trim().toLowerCase(), p);
    if (p.sku) prodBySku.set(p.sku.trim().toLowerCase(), p);
    const nn = normalizeProductName(p.name);
    if (nn && !prodByNormName.has(nn)) prodByNormName.set(nn, p);
  }
  return { catBySlug, prodByKv, prodBySku, prodByNormName, usedSlugs };
}

export async function buildKiotVietPreview(
  rows: KiotVietRawRow[],
  opts: KiotVietImportOptions,
): Promise<KiotVietPreviewResult> {
  const { catBySlug, prodByKv, prodBySku, prodByNormName } = await loadExistingMaps();
  const newCatCounts = new Map<string, { name: string; slug: string; count: number }>();

  let goodsCount = 0;
  let serviceCount = 0;
  let createCount = 0;
  let updateCount = 0;
  let skipCount = 0;
  let negativeStockCount = 0;
  let zeroPriceCount = 0;
  let missingImageCount = 0;
  const items: KiotVietPreviewItem[] = [];

  for (const r of rows) {
    const isService = r.loaiHang.toLowerCase() !== "hàng hóa" && r.loaiHang.toLowerCase() !== "hang hoa";
    if (isService) serviceCount++;
    else goodsCount++;

    const mappedCat = mapCategoryName(r.nhomHang);
    const isNewCategory = !catBySlug.has(mappedCat.slug);

    if (isService && opts.skipServices) {
      skipCount++;
      items.push({
        rowNum: r.rowNum,
        action: "skip",
        reason: "Dịch vụ / phí (không bán online)",
        kvCode: r.maHang,
        name: r.tenHang,
        kvGroup: r.nhomHang,
        targetCategoryName: mappedCat.name,
        targetCategorySlug: mappedCat.slug,
        isNewCategory: false,
        price: r.giaBan,
        costPrice: r.giaVon,
        stock: 0,
        negativeStockAdjusted: false,
        brand: "",
        origin: "",
        unit: "",
        imagesCount: 0,
      });
      continue;
    }

    if (isNewCategory) {
      const cur = newCatCounts.get(mappedCat.slug) ?? { name: mappedCat.name, slug: mappedCat.slug, count: 0 };
      cur.count++;
      newCatCounts.set(mappedCat.slug, cur);
    }

    const kvLower = r.maHang.toLowerCase();
    const matched =
      prodByKv.get(kvLower) ??
      prodBySku.get(kvLower) ??
      prodByNormName.get(normalizeProductName(r.tenHang));
    const matchedBy = prodByKv.has(kvLower)
      ? "kv_code"
      : prodBySku.has(kvLower)
        ? "sku"
        : matched
          ? "name"
          : undefined;

    if (matched) updateCount++;
    else createCount++;

    const neg = r.tonKhoRaw < 0;
    const stock = Math.max(0, Math.round(r.tonKhoRaw));
    if (neg) negativeStockCount++;
    if (r.giaBan === 0) zeroPriceCount++;
    if (r.hinhAnh.length === 0 && !matched?.image) missingImageCount++;

    const { brand, origin } = cleanBrandOrigin(r.thuongHieu);
    items.push({
      rowNum: r.rowNum,
      action: matched ? "update" : "create",
      kvCode: r.maHang,
      name: r.tenHang,
      kvGroup: r.nhomHang,
      targetCategoryName: mappedCat.name,
      targetCategorySlug: mappedCat.slug,
      isNewCategory,
      price: r.giaBan,
      costPrice: r.giaVon,
      stock,
      negativeStockAdjusted: neg,
      brand,
      origin,
      unit: normalizeUnit(r.donViTinh),
      imagesCount: r.hinhAnh.length,
      matchedProductId: matched?.id,
      matchedBy,
    });
  }

  return {
    totalRows: rows.length,
    goodsCount,
    serviceCount,
    createCount,
    updateCount,
    skipCount,
    negativeStockCount,
    zeroPriceCount,
    missingImageCount,
    newCategories: Array.from(newCatCounts.values())
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ ...c, showInMenu: c.count >= 5 })),
    sample: items.slice(0, 60),
  };
}

export async function applyKiotVietImport(
  rows: KiotVietRawRow[],
  opts: KiotVietImportOptions,
): Promise<KiotVietApplyResult> {
  const { catBySlug, prodByKv, prodBySku, prodByNormName, usedSlugs } = await loadExistingMaps();

  // Count goods per category to decide show_in_menu for newly created categories
  const catCounts = new Map<string, { name: string; slug: string; count: number }>();
  for (const r of rows) {
    const isService = r.loaiHang.toLowerCase() !== "hàng hóa" && r.loaiHang.toLowerCase() !== "hang hoa";
    if (isService && opts.skipServices) continue;
    const mapped = mapCategoryName(r.nhomHang);
    const entry = catCounts.get(mapped.slug) ?? { ...mapped, count: 0 };
    entry.count++;
    catCounts.set(mapped.slug, entry);
  }

  let createdCategories = 0;
  if (opts.createCategories) {
    let sortBase = 20;
    for (const c of Array.from(catCounts.values()).sort((a, b) => b.count - a.count)) {
      if (catBySlug.has(c.slug)) continue;
      const show = c.count >= 5 ? 1 : 0;
      const res = await run(
        `INSERT INTO product_categories (slug, name, sort, show_in_menu, show_in_home, show_in_footer, is_active, seo_title, description)
         VALUES (?, ?, ?, ?, ?, ?, 1, '', '')`,
        c.slug,
        c.name,
        sortBase++,
        show,
        show,
        show,
      );
      catBySlug.set(c.slug, { id: res.lastInsertRowid, slug: c.slug, name: c.name });
      createdCategories++;
    }
  }

  const fallbackCat = catBySlug.get("chua-phan-loai") ?? Array.from(catBySlug.values())[0];
  if (!fallbackCat) throw new Error("Chưa có danh mục sản phẩm nào trong hệ thống.");

  const stmts: { sql: string; params: unknown[] }[] = [];
  let createdProducts = 0;
  let updatedProducts = 0;
  let skippedRows = 0;
  const warnings: string[] = [];

  for (const r of rows) {
    const isService = r.loaiHang.toLowerCase() !== "hàng hóa" && r.loaiHang.toLowerCase() !== "hang hoa";
    if (isService && opts.skipServices) {
      skippedRows++;
      continue;
    }

    const mappedCat = mapCategoryName(r.nhomHang);
    const cat = catBySlug.get(mappedCat.slug) ?? fallbackCat;
    const kvLower = r.maHang.toLowerCase();
    const matched =
      prodByKv.get(kvLower) ??
      prodBySku.get(kvLower) ??
      prodByNormName.get(normalizeProductName(r.tenHang));

    const { brand, origin } = cleanBrandOrigin(r.thuongHieu);
    const unit = normalizeUnit(r.donViTinh);
    const stock = Math.max(0, Math.round(r.tonKhoRaw));
    const mainImage = r.hinhAnh[0] ?? null;
    const gallery = r.hinhAnh.join("\n");
    const descHtml = plainTextToHtml(r.moTa);
    const summary = r.mauGhiChu;
    const pub = opts.publishImported && r.dangKinhDoanh ? 1 : 0;

    if (matched) {
      updatedProducts++;
      if (opts.overwritePriceStock) {
        stmts.push({
          sql: `UPDATE products
                SET kv_code = ?, sku = ?, barcode = CASE WHEN ? <> '' THEN ? ELSE COALESCE(barcode, '') END,
                    category_id = ?, price = ?, cost_price = ?, stock = ?,
                    min_stock = ?, max_stock = ?, weight_grams = CASE WHEN ? > 0 THEN ? ELSE COALESCE(weight_grams, 0) END,
                    location = CASE WHEN ? <> '' THEN ? ELSE COALESCE(location, '') END,
                    brand = CASE WHEN ? <> '' THEN ? ELSE brand END,
                    origin = CASE WHEN ? <> '' THEN ? ELSE origin END,
                    unit = CASE WHEN ? <> '' THEN ? ELSE unit END,
                    image = COALESCE(NULLIF(image, ''), ?),
                    gallery = CASE WHEN COALESCE(gallery, '') = '' THEN ? ELSE gallery END,
                    summary = CASE WHEN COALESCE(summary, '') = '' THEN ? ELSE summary END,
                    description = CASE WHEN COALESCE(description, '') = '' THEN ? ELSE description END,
                    is_published = ?, kv_updated_at = datetime('now')
                WHERE id = ?`,
          params: [
            r.maHang,
            r.maHang,
            r.maVach,
            r.maVach,
            cat.id,
            r.giaBan,
            r.giaVon,
            stock,
            r.tonNhoNhat,
            r.tonLonNhat,
            r.trongLuong,
            r.trongLuong,
            r.viTri,
            r.viTri,
            brand,
            brand,
            origin,
            origin,
            unit,
            unit,
            mainImage,
            gallery,
            summary,
            descHtml,
            pub,
            matched.id,
          ],
        });
        if (stock !== matched.stock) {
          stmts.push({
            sql: `INSERT INTO inventory_movements (product_id, change_qty, stock_after, unit_cost, reason, ref_code, note, created_by)
                  VALUES (?, ?, ?, ?, 'kiotviet_sync', ?, 'Đồng bộ tồn kho từ Excel KiotViet', 'kiotviet-excel')`,
            params: [matched.id, stock - matched.stock, stock, r.giaVon, r.maHang],
          });
        }
      } else {
        stmts.push({
          sql: `UPDATE products SET kv_code = ?, sku = ?, category_id = ?, is_published = ?, kv_updated_at = datetime('now') WHERE id = ?`,
          params: [r.maHang, r.maHang, cat.id, pub, matched.id],
        });
      }
      // Prevent matching the same existing product twice in one file
      prodByKv.delete(kvLower);
      prodBySku.delete(kvLower);
    } else {
      createdProducts++;
      let slug = slugify(r.tenHang) || slugify(r.maHang);
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${slugify(r.maHang)}`;
      }
      let counter = 2;
      while (usedSlugs.has(slug)) {
        slug = `${slug}-${counter++}`;
      }
      usedSlugs.add(slug);

      stmts.push({
        sql: `INSERT INTO products
              (slug, category_id, name, price, cost_price, stock, min_stock, max_stock, weight_grams,
               sku, kv_code, barcode, location, brand, origin, unit,
               image, gallery, summary, description, is_published, kv_updated_at, source_note)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
        params: [
          slug,
          cat.id,
          r.tenHang,
          r.giaBan,
          r.giaVon,
          stock,
          r.tonNhoNhat,
          r.tonLonNhat,
          r.trongLuong,
          r.maHang,
          r.maHang,
          r.maVach,
          r.viTri,
          brand,
          origin,
          unit,
          mainImage,
          gallery,
          summary,
          descHtml,
          pub,
          "Imported from KiotViet Excel",
        ],
      });
    }
  }

  // Execute in D1 batch chunks of 40 statements
  for (let i = 0; i < stmts.length; i += 40) {
    await batch(stmts.slice(i, i + 40));
  }

  // Ensure slug uniqueness check note
  const dupNames = rows.filter((r, idx, arr) => arr.findIndex((x) => x.tenHang === r.tenHang) !== idx);
  if (dupNames.length > 0) {
    warnings.push(`Có ${dupNames.length} tên hàng trùng nhau trong file (đã tự tạo slug riêng theo mã hàng).`);
  }

  // Quick check if any products remained unpublished
  const hiddenCount = await one<{ n: number }>("SELECT COUNT(*) AS n FROM products WHERE COALESCE(is_published, 1) = 0");
  if ((hiddenCount?.n ?? 0) > 0) {
    warnings.push(`Còn ${hiddenCount?.n ?? 0} sản phẩm cũ chưa khớp đang giữ ẩn trong 'Chưa Phân Loại'.`);
  }

  return {
    createdCategories,
    createdProducts,
    updatedProducts,
    skippedRows,
    warnings,
  };
}
