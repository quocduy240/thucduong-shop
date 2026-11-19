import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "@/lib/gemini-key";
import { canAccessAdminPath } from "@/lib/rbac";

type StylePreset = "expert_east_west" | "seo_sales" | "senior_friendly";

type CleanOptions = {
  stripPhones: boolean;
  stripBuyButtons: boolean;
  stripExternalDomains: boolean;
  blockedDomains: string[];
};

type CleanStats = {
  removedPhones: number;
  removedButtons: number;
  removedDomains: number;
};

const OWN_SAFE_DOMAINS = new Set([
  "thucduongshop.duyvo.win",
  "thucduongphuctho.com",
  "www.thucduongphuctho.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
]);

const BUY_BUTTON_REGEX =
  /\b(mua\s*ngay|đặt\s*hàng|đặt\s*mua|thêm\s*vào\s*giỏ|cho\s*vào\s*giỏ|giỏ\s*hàng|add\s*to\s*cart|buy\s*now|liên\s*hệ\s*(?:đặt\s*)?mua|tư\s*vấn\s*ngay|chat\s*zalo|nhận\s*báo\s*giá|đăng\s*ký\s*mua|mua\s*qua\s*zalo|gọi\s*ngay)\b/i;

const PHONE_REGEX =
  /(?:\+?84|0)(?:[\s.\-]*\d){8,10}\b|\b(?:1900|1800)[\s.\-]?\d{4,6}\b/g;

function extractDomain(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  try {
    const url = s.includes("://") ? new URL(s) : new URL(`https://${s}`);
    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return s
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#\s]/)[0]
      .toLowerCase();
  }
}

function isBlockedExternalUrl(href: string, blockedDomains: string[]): boolean {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#")) return false;
  const host = extractDomain(href);
  if (!host) return false;
  if (OWN_SAFE_DOMAINS.has(host)) return false;
  if (blockedDomains.length > 0 && blockedDomains.some((d) => host === d || host.endsWith(`.${d}`))) {
    return true;
  }
  return /^https?:\/\//i.test(href) && host.includes(".");
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanProductDescriptionHtml(
  rawHtml: string,
  opts: CleanOptions,
): { cleanedHtml: string; plainText: string; images: { src: string; alt: string }[]; stats: CleanStats } {
  const stats: CleanStats = { removedPhones: 0, removedButtons: 0, removedDomains: 0 };
  let html = String(rawHtml || "");

  // Remove unsafe/irrelevant embedded blocks
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "");

  // 1. Remove buy/order buttons & CTA blocks from source site
  if (opts.stripBuyButtons) {
    html = html.replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, () => {
      stats.removedButtons++;
      return "";
    });
    html = html.replace(/<input\b[^>]*type=["']?(?:button|submit)["']?[^>]*>/gi, () => {
      stats.removedButtons++;
      return "";
    });
    html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs: string, inner: string) => {
      const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
      const hrefMatch = attrs.match(/\bhref=["']([^"']*)["']/i);
      const cls = (clsMatch?.[1] || "").toLowerCase();
      const href = (hrefMatch?.[1] || "").toLowerCase();
      const txt = stripTags(inner);
      const isBuyHref =
        href.includes("cart") ||
        href.includes("checkout") ||
        href.includes("dat-hang") ||
        href.includes("zalo.me") ||
        href.startsWith("tel:");
      const isBuyCls = /\b(btn|button|buy|cart|hotline|zalo)\b/i.test(cls);
      const isShortCta = txt.length > 0 && txt.length <= 60 && BUY_BUTTON_REGEX.test(txt);
      if (isBuyHref || isBuyCls || isShortCta) {
        stats.removedButtons++;
        return "";
      }
      return full;
    });
    html = html.replace(/<(?:p|div|span)\b([^>]*)>([\s\S]*?)<\/(?:p|div|span)>/gi, (full, attrs: string, inner: string) => {
      if (/<(?:p|h[1-6]|ul|ol|table|img)\b/i.test(inner)) return full;
      const txt = stripTags(inner);
      const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
      const cls = (clsMatch?.[1] || "").toLowerCase();
      if (
        (/\b(btn-buy|add-to-cart|buy-now|hotline|zalo-box)\b/i.test(cls)) ||
        (txt.length > 0 && txt.length <= 60 && BUY_BUTTON_REGEX.test(txt))
      ) {
        stats.removedButtons++;
        return "";
      }
      return full;
    });
  }

  // 2. Remove external links
  if (opts.stripExternalDomains) {
    html = html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (full, attrs: string, inner: string) => {
      const hrefMatch = attrs.match(/\bhref=["']([^"']*)["']/i);
      const href = (hrefMatch?.[1] || "").trim();
      if (!isBlockedExternalUrl(href, opts.blockedDomains)) return full;
      stats.removedDomains++;
      const text = stripTags(inner);
      if (!text || /https?:\/\/|www\.|\.[a-z]{2,6}\b/i.test(text) || BUY_BUTTON_REGEX.test(text)) {
        return "";
      }
      return text;
    });
  }

  // 3. Remove tel: links
  if (opts.stripPhones) {
    html = html.replace(/<a\b[^>]*href=["']tel:[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, () => {
      stats.removedPhones++;
      return "";
    });
  }

  // 4. Collect clean product images & strip button-like images
  const images: { src: string; alt: string }[] = [];
  const seenImg = new Set<string>();
  html = html.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    const altMatch = attrs.match(/\balt=["']([^"']*)["']/i);
    const src = (srcMatch?.[1] || "").trim();
    const alt = (altMatch?.[1] || "").trim();
    if (!src || src.startsWith("data:")) return full;
    if (opts.stripBuyButtons && /buy|cart|zalo|hotline|icon|button/i.test(`${src} ${alt}`)) {
      stats.removedButtons++;
      return "";
    }
    if (!seenImg.has(src)) {
      seenImg.add(src);
      images.push({ src, alt });
    }
    return full;
  });

  // 5. Strip phone numbers & labels in text
  if (opts.stripPhones) {
    html = html.replace(PHONE_REGEX, () => {
      stats.removedPhones++;
      return "";
    });
    html = html.replace(
      /(?:hotline|sđt|điện\s*thoại|zalo|liên\s*hệ)\s*[:\-–]?\s*(?=<\/|[\n\r]|$)/gi,
      "",
    );
  }

  // 6. Strip blocked domain strings & bare external URLs outside HTML attributes
  if (opts.stripExternalDomains) {
    for (const domain of opts.blockedDomains) {
      if (!domain || OWN_SAFE_DOMAINS.has(domain)) continue;
      const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${escaped}(?:\\/[^\\s<"']*)?`, "gi");
      html = html.replace(re, (m, offset: number, whole: string) => {
        // Preserve src="..." of clean <img>
        const before = whole.slice(Math.max(0, offset - 8), offset);
        if (/src=["']$/i.test(before)) return m;
        stats.removedDomains++;
        return "";
      });
    }
    html = html.replace(/(^|[\s(>])https?:\/\/[^\s<"')]+/gi, (full, prefix: string) => {
      const urlOnly = full.slice(prefix.length).trim();
      if (isBlockedExternalUrl(urlOnly, opts.blockedDomains)) {
        stats.removedDomains++;
        return prefix;
      }
      return full;
    });
  }

  // Remove empty paragraphs/spans left over after stripping
  html = html.replace(/<(p|span|li)\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi, "");

  return {
    cleanedHtml: html.trim(),
    plainText: stripTags(html),
    images,
    stats,
  };
}

function buildStylePrompt(style: StylePreset): string {
  if (style === "seo_sales") {
    return "Viết theo phong cách chuẩn SEO thương mại điện tử và tối ưu chuyển đổi: mở đầu đánh trúng nhu cầu sức khoẻ, trình bày bullet lợi ích nổi bật, bảng hoặc danh sách thông số rõ ràng, lời khuyên chọn mua tại Thực Dưỡng Phúc Thọ (KHÔNG tự chèn nút mua hàng HTML hay số điện thoại).";
  }
  if (style === "senior_friendly") {
    return "Viết theo phong cách ân cần, câu ngắn, mạch lạc, dễ hiểu cho người lớn tuổi và gia đình Việt; chia từng bước cách dùng cụ thể, lưu ý bảo quản rõ ràng.";
  }
  return "Viết theo phong cách Chuyên gia Thực dưỡng hiện đại (Đông – Tây Y kết hợp): giải thích cơ chế dinh dưỡng/thực dưỡng khách quan, có dẫn chứng khoa học chừng mực, tuân thủ nghiêm ngặt Nghị định 15/2018/NĐ-CP và Google YMYL (tuyệt đối không khẳng định thuốc chữa/trị dứt bệnh).";
}

function buildFallbackHtml(
  productName: string,
  brand: string,
  origin: string,
  unit: string,
  cleanedHtml: string,
  images: { src: string; alt: string }[],
): string {
  const specs = [
    brand ? `<li><strong>Thương hiệu:</strong> ${brand}</li>` : "",
    origin ? `<li><strong>Xuất xứ:</strong> ${origin}</li>` : "",
    unit ? `<li><strong>Quy cách:</strong> ${unit}</li>` : "",
  ]
    .filter(Boolean)
    .join("");

  const imgHtml = images[0]
    ? `<figure class="my-4"><img src="${images[0].src}" alt="${images[0].alt || productName}" class="w-full rounded-xl" /></figure>`
    : "";

  return [
    `<h2>Tổng quan về ${productName}</h2>`,
    `<p><strong>${productName}</strong> là sản phẩm thực dưỡng chọn lọc được phân phối chính hãng tại <strong>Thực Dưỡng Phúc Thọ</strong>, phù hợp cho người ăn thực dưỡng, người muốn cân bằng dinh dưỡng tự nhiên và chăm sóc sức khỏe chủ động mỗi ngày.</p>`,
    specs ? `<h3>Thông tin sản phẩm</h3><ul>${specs}</ul>` : "",
    imgHtml,
    `<h3>Đặc điểm &amp; Giá trị dinh dưỡng</h3>`,
    cleanedHtml || `<p>Sản phẩm giữ trọn dưỡng chất tự nhiên, an toàn sử dụng hàng ngày theo chế độ ăn uống quân bình.</p>`,
    `<h3>Lưu ý sử dụng</h3>`,
    `<p>Sản phẩm là thực phẩm dinh dưỡng thực dưỡng, không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh. Vui lòng đọc kỹ hướng dẫn trên bao bì trước khi sử dụng.</p>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: Request) {
  const admin = await currentAdmin();
  if (!admin || !canAccessAdminPath(admin.role, "/admin/products/")) {
    return NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
  }

  try {
    const body = (await req.json()) as {
      productName?: string;
      brand?: string;
      origin?: string;
      unit?: string;
      html?: string;
      sourceUrl?: string;
      stylePreset?: StylePreset;
      customInstruction?: string;
      stripPhones?: boolean;
      stripBuyButtons?: boolean;
      stripExternalDomains?: boolean;
      extraBlockedDomains?: string;
    };

    const productName = String(body.productName ?? "").trim() || "Sản phẩm Thực Dưỡng";
    const brand = String(body.brand ?? "").trim();
    const origin = String(body.origin ?? "").trim();
    const unit = String(body.unit ?? "").trim();
    const rawHtml = String(body.html ?? "");
    const stylePreset: StylePreset =
      body.stylePreset === "seo_sales" || body.stylePreset === "senior_friendly"
        ? body.stylePreset
        : "expert_east_west";

    const blockedSet = new Set<string>();
    const sourceDomain = extractDomain(String(body.sourceUrl ?? ""));
    if (sourceDomain && !OWN_SAFE_DOMAINS.has(sourceDomain)) {
      blockedSet.add(sourceDomain);
    }
    const extraRaw = String(body.extraBlockedDomains ?? "");
    for (const part of extraRaw.split(/[\s,;|\n\r]+/)) {
      const d = extractDomain(part);
      if (d && !OWN_SAFE_DOMAINS.has(d)) blockedSet.add(d);
    }

    const cleanOpts: CleanOptions = {
      stripPhones: body.stripPhones !== false,
      stripBuyButtons: body.stripBuyButtons !== false,
      stripExternalDomains: body.stripExternalDomains !== false,
      blockedDomains: Array.from(blockedSet),
    };

    const preCleaned = cleanProductDescriptionHtml(rawHtml, cleanOpts);
    if (!preCleaned.plainText && !rawHtml.trim()) {
      return NextResponse.json(
        { error: "Mô tả sản phẩm đang trống. Hãy nhập hoặc dán nội dung gốc trước khi viết lại." },
        { status: 400 },
      );
    }

    const apiKey = await resolveGeminiApiKey();
    let rewrittenHtml = "";
    let usedAi = false;

    if (apiKey) {
      const imageListText = preCleaned.images
        .slice(0, 5)
        .map((img, i) => `- Ảnh ${i + 1}: src="${img.src}" alt="${img.alt || productName}"`)
        .join("\n");

      const prompt = [
        `Bạn là Chuyên gia Biên tập Nội dung Sản phẩm Thực Dưỡng & SEO YMYL cho website Thực Dưỡng Phúc Thọ.`,
        `Nhiệm vụ: Viết lại hoàn toàn nội dung mô tả cho sản phẩm "${productName}" thành bài viết mới 100%, chuẩn xác, thuyết phục và sạch sẽ.`,
        ``,
        `THÔNG TIN SẢN PHẨM:`,
        `- Tên sản phẩm: ${productName}`,
        brand ? `- Thương hiệu: ${brand}` : "",
        origin ? `- Xuất xứ: ${origin}` : "",
        unit ? `- Quy cách: ${unit}` : "",
        ``,
        `CÁCH VIẾT YÊU CẦU:`,
        `- ${buildStylePrompt(stylePreset)}`,
        body.customInstruction?.trim() ? `- Yêu cầu riêng của quản trị viên: ${body.customInstruction.trim()}` : "",
        ``,
        `QUY TẮC LÀM SẠCH TUYỆT ĐỐI (BẮT BUỘC):`,
        cleanOpts.stripPhones ? `- TUYỆT ĐỐI KHÔNG chứa bất kỳ số điện thoại, hotline, Zalo nào.` : "",
        cleanOpts.stripBuyButtons ? `- TUYỆT ĐỐI KHÔNG chèn nút bấm mua hàng, nút đặt hàng, nút thêm giỏ hàng hay lời kêu gọi bấm nút.` : "",
        cleanOpts.stripExternalDomains
          ? `- TUYỆT ĐỐI KHÔNG nhắc tên miền, URL, tên cửa hàng hay liên kết của bất kỳ trang web nào khác${cleanOpts.blockedDomains.length ? ` (đặc biệt cấm: ${cleanOpts.blockedDomains.join(", ")})` : ""}.`
          : "",
        `- Tuân thủ Luật Quảng cáo & Nghị định 15/2018/NĐ-CP Việt Nam + Google YMYL: không dùng từ khẳng định 'chữa khỏi', 'đặc trị', 'thay thế thuốc'.`,
        imageListText
          ? `- Hãy chèn lại các ảnh sản phẩm sạch sau vào đúng các mục thích hợp bằng thẻ <figure class="my-4"><img src="..." alt="..." class="w-full rounded-xl" /></figure>:\n${imageListText}`
          : "",
        ``,
        `NỘI DUNG GỐC ĐÃ LỌC SƠ BỘ ĐỂ THAM KHẢO THÔNG TIN:`,
        preCleaned.plainText.slice(0, 12000),
        ``,
        `CHỈ TRẢ VỀ ĐOẠN MÃ HTML SẠCH (chỉ dùng h2, h3, p, ul, li, strong, table, figure, img; không markdown \`\`\`html, không <html>/<body>).`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await callGeminiGenerateContent(apiKey, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 4096 },
      });

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const rawOut =
          data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? "")
            .join("")
            .trim() ?? "";
        const cleanedFence = rawOut
          .replace(/^```(?:html)?\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim();
        if (cleanedFence.length >= 60) {
          rewrittenHtml = cleanedFence;
          usedAi = true;
        }
      }
    }

    if (!rewrittenHtml) {
      rewrittenHtml = buildFallbackHtml(
        productName,
        brand,
        origin,
        unit,
        preCleaned.cleanedHtml,
        preCleaned.images,
      );
    }

    const postCleaned = cleanProductDescriptionHtml(rewrittenHtml, cleanOpts);

    return NextResponse.json({
      ok: true,
      usedAi,
      html: postCleaned.cleanedHtml || rewrittenHtml,
      stats: {
        removedPhones: preCleaned.stats.removedPhones + postCleaned.stats.removedPhones,
        removedButtons: preCleaned.stats.removedButtons + postCleaned.stats.removedButtons,
        removedDomains: preCleaned.stats.removedDomains + postCleaned.stats.removedDomains,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Không thể viết lại mô tả sản phẩm lúc này." },
      { status: 500 },
    );
  }
}
