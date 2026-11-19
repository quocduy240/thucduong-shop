import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "@/lib/gemini-key";
import { canAccessAdminPath } from "@/lib/rbac";

type StylePreset = "expert_east_west" | "seo_sales" | "senior_friendly";

type CleanOptions = {
  stripPhones: boolean;
  stripBuyButtons: boolean;
  stripExternalDomains: boolean;
  stripOldImages: boolean;
  blockedDomains: string[];
};

type CleanStats = {
  removedPhones: number;
  removedButtons: number;
  removedDomains: number;
  removedImages: number;
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
  stripFormatting = true,
): { cleanedHtml: string; plainText: string; stats: CleanStats } {
  const stats: CleanStats = {
    removedPhones: 0,
    removedButtons: 0,
    removedDomains: 0,
    removedImages: 0,
  };
  let html = String(rawHtml || "");

  // Remove unsafe/irrelevant embedded blocks
  html = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "");

  // 1. Strip ALL old images / figures / pictures if enabled
  if (opts.stripOldImages) {
    html = html.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, () => {
      stats.removedImages++;
      return "";
    });
    html = html.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, () => {
      stats.removedImages++;
      return "";
    });
    html = html.replace(/<img\b[^>]*>/gi, () => {
      stats.removedImages++;
      return "";
    });
  }

  // 2. Remove buy/order buttons & CTA blocks from source site
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
    html = html.replace(
      /<(?:p|div|span)\b([^>]*)>([\s\S]*?)<\/(?:p|div|span)>/gi,
      (full, attrs: string, inner: string) => {
        if (/<(?:p|h[1-6]|ul|ol|table|img)\b/i.test(inner)) return full;
        const txt = stripTags(inner);
        const clsMatch = attrs.match(/\bclass=["']([^"']*)["']/i);
        const cls = (clsMatch?.[1] || "").toLowerCase();
        if (
          /\b(btn-buy|add-to-cart|buy-now|hotline|zalo-box)\b/i.test(cls) ||
          (txt.length > 0 && txt.length <= 60 && BUY_BUTTON_REGEX.test(txt))
        ) {
          stats.removedButtons++;
          return "";
        }
        return full;
      },
    );
  }

  // 3. Remove external links
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

  // 4. Remove tel: links
  if (opts.stripPhones) {
    html = html.replace(/<a\b[^>]*href=["']tel:[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, () => {
      stats.removedPhones++;
      return "";
    });
  }

  // 5. Strip old HTML/CSS formatting attributes & wrapper tags when pre-cleaning input
  if (stripFormatting) {
    html = html
      .replace(/\s(?:style|class|id|width|height|bgcolor|align|valign|border|cellpadding|cellspacing|data-[a-z0-9_-]+)=["'][^"']*["']/gi, "")
      .replace(/<\/?(?:font|span|section|article|header|footer|aside|nav|div)\b[^>]*>/gi, "\n");
  }

  // 6. Strip phone numbers & labels in text
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

  // 7. Strip blocked domain strings & bare external URLs
  if (opts.stripExternalDomains) {
    for (const domain of opts.blockedDomains) {
      if (!domain || OWN_SAFE_DOMAINS.has(domain)) continue;
      const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${escaped}(?:\\/[^\\s<"']*)?`, "gi");
      html = html.replace(re, () => {
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

  html = html.replace(/<(p|span|li)\b[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>/gi, "");

  return {
    cleanedHtml: html.trim(),
    plainText: stripTags(html),
    stats,
  };
}

function buildStylePrompt(style: StylePreset): string {
  if (style === "seo_sales") {
    return "Viết theo phong cách chuẩn SEO thương mại điện tử và tối ưu chuyển đổi: mở đầu đánh trúng nhu cầu sức khoẻ, trình bày các lợi ích nổi bật, bảng thông số hoặc hướng dẫn sử dụng rõ ràng, lời khuyên chọn mua chính hãng tại Thực Dưỡng Phúc Thọ (KHÔNG chèn nút mua hàng HTML hay số điện thoại).";
  }
  if (style === "senior_friendly") {
    return "Viết theo phong cách ân cần, câu ngắn, cỡ chữ thoáng, mạch lạc dễ đọc cho người lớn tuổi và gia đình Việt; chia từng bước cách dùng cụ thể và lưu ý bảo quản rõ ràng.";
  }
  return "Viết theo phong cách Chuyên gia Thực dưỡng hiện đại (Đông – Tây Y kết hợp): giải thích cơ chế dinh dưỡng/thực dưỡng khách quan, có dẫn chứng khoa học chừng mực, tuân thủ nghiêm ngặt Nghị định 15/2018/NĐ-CP và Google YMYL (tuyệt đối không khẳng định thuốc chữa/trị dứt bệnh).";
}

function buildRichStyledFallbackHtml(
  productName: string,
  brand: string,
  origin: string,
  unit: string,
  plainText: string,
): string {
  const specsRows = [
    brand ? `<tr><td style="padding:8px 12px;border:1px solid #d1fae5;font-weight:700;color:#166534;">Thương hiệu</td><td style="padding:8px 12px;border:1px solid #d1fae5;">${brand}</td></tr>` : "",
    origin ? `<tr><td style="padding:8px 12px;border:1px solid #d1fae5;font-weight:700;color:#166534;">Xuất xứ</td><td style="padding:8px 12px;border:1px solid #d1fae5;">${origin}</td></tr>` : "",
    unit ? `<tr><td style="padding:8px 12px;border:1px solid #d1fae5;font-weight:700;color:#166534;">Quy cách</td><td style="padding:8px 12px;border:1px solid #d1fae5;">${unit}</td></tr>` : "",
  ]
    .filter(Boolean)
    .join("");

  const excerptBody = plainText
    ? `<p style="line-height:1.75;color:#374151;">${plainText.slice(0, 1200)}</p>`
    : `<p style="line-height:1.75;color:#374151;">Sản phẩm giữ trọn dưỡng chất tự nhiên, an toàn sử dụng hàng ngày theo chế độ ăn uống quân bình.</p>`;

  return [
    `<div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:12px;padding:16px;margin-bottom:18px;">`,
    `  <p style="margin:0;color:#166534;font-weight:600;line-height:1.7;">🌿 <strong>${productName}</strong> là sản phẩm thực dưỡng chọn lọc phân phối chính hãng tại <strong style="color:#15803d;">Thực Dưỡng Phúc Thọ</strong>, hỗ trợ cân bằng dinh dưỡng tự nhiên và chăm sóc sức khoẻ chủ động mỗi ngày.</p>`,
    `</div>`,
    specsRows
      ? `<h2 style="color:#15803d;font-size:20px;font-weight:800;margin-top:20px;margin-bottom:10px;">📋 Thông tin sản phẩm</h2><table style="width:100%;border-collapse:collapse;margin-bottom:18px;"><thead><tr style="background-color:#ecfdf5;"><th style="padding:8px 12px;border:1px solid #d1fae5;text-align:left;color:#166534;">Thuộc tính</th><th style="padding:8px 12px;border:1px solid #d1fae5;text-align:left;color:#166534;">Chi tiết</th></tr></thead><tbody>${specsRows}</tbody></table>`
      : "",
    `<h2 style="color:#15803d;font-size:20px;font-weight:800;margin-top:20px;margin-bottom:10px;">✨ Đặc điểm &amp; Giá trị dinh dưỡng</h2>`,
    excerptBody,
    `<div style="background-color:#fffbeb;border:1px solid #fde68a;border-left:4px solid #d97706;border-radius:12px;padding:14px;margin-top:18px;color:#92400e;">`,
    `  <p style="margin:0;line-height:1.65;"><strong>🛡️ Lưu ý chuyên môn:</strong> Sản phẩm là thực phẩm dinh dưỡng thực dưỡng, không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh. Đọc kỹ hướng dẫn trên bao bì và bảo quản nơi khô ráo, thoáng mát.</p>`,
    `</div>`,
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
      stripOldImages?: boolean;
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
      stripOldImages: body.stripOldImages !== false,
      blockedDomains: Array.from(blockedSet),
    };

    // Strip ALL old formatting, old images, and traces from source HTML before AI
    const preCleaned = cleanProductDescriptionHtml(rawHtml, cleanOpts, true);
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
      const prompt = [
        `Bạn là Chuyên gia Biên tập Nội dung & Thiết kế Trình bày Bài viết Sản phẩm Thực Dưỡng cho website Thực Dưỡng Phúc Thọ.`,
        `Nhiệm vụ: Viết lại hoàn toàn nội dung mô tả sản phẩm "${productName}" thành bài viết ĐỘC BẢN, tự định dạng CSS inline tinh tế, trang trí khối màu, icon, màu chữ nhấn và phân cấp font rõ ràng, phù hợp ngữ cảnh và trọng tâm bài viết.`,
        ``,
        `THÔNG TIN SẢN PHẨM:`,
        `- Tên sản phẩm: ${productName}`,
        brand ? `- Thương hiệu: ${brand}` : "",
        origin ? `- Xuất xứ: ${origin}` : "",
        unit ? `- Quy cách: ${unit}` : "",
        ``,
        `PHONG CÁCH NỘI DUNG:`,
        `- ${buildStylePrompt(stylePreset)}`,
        body.customInstruction?.trim() ? `- Yêu cầu riêng của quản trị viên: ${body.customInstruction.trim()}` : "",
        ``,
        `QUY TẮC TRANG TRÍ & ĐỊNH DẠNG CSS CHUẨN AI MỚI (BẮT BUỘC):`,
        `- 1. KHỐI MỞ ĐẦU NỔI BẬT (Hero Callout): Mở đầu bài bằng 1 hộp <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-left:4px solid #16a34a;border-radius:12px;padding:16px;margin-bottom:18px;"> nhấn mạnh giá trị cốt lõi của sản phẩm với <strong style="color:#15803d;">.`,
        `- 2. TIÊU ĐỀ PHÂN CẤP KÈM ICON NGỮ CẢNH: Các thẻ <h2 style="color:#15803d;font-size:20px;font-weight:800;margin-top:22px;margin-bottom:10px;"> và <h3 style="color:#166534;font-size:16px;font-weight:700;margin-top:16px;margin-bottom:8px;"> phải tự động gắn 1 icon phù hợp ngữ cảnh (VD: 🌿, ✨, 🔬, 📋, 🥣, 💡, 🎯, 🛡️).`,
        `- 3. BẢNG THÔNG SỐ / HƯỚNG DẪN SỬ DỤNG: Nếu có thông số, thành phần hoặc hướng dẫn pha chế/sử dụng, hãy trình bày bằng <table style="width:100%;border-collapse:collapse;margin:14px 0;"> với header nền #ecfdf5, viền #d1fae5.`,
        `- 4. NHẤN MÀU CHỮ & TRỌNG TÂM: Dùng <p style="line-height:1.75;color:#374151;margin-bottom:10px;">, danh sách <ul><li> rõ ý với icon ✓ ở đầu ý chính, tô màu nhấn <strong style="color:#15803d;"> hoặc <strong style="color:#b45309;"> cho từ khoá trọng tâm (giữ tối đa 2-3 tông màu hài hoà: xanh lá thực dưỡng, hổ phách ấm, xám đậm).`,
        `- 5. KHỐI LƯU Ý & BẢO QUẢN CUỐI BÀI: Kết thúc bằng hộp <div style="background-color:#fffbeb;border:1px solid #fde68a;border-left:4px solid #d97706;border-radius:12px;padding:14px;margin-top:18px;color:#92400e;"> nêu lưu ý sử dụng/bảo quản và tuân thủ YMYL.`,
        ``,
        `QUY TẮC LÀM SẠCH TUYỆT ĐỐI:`,
        cleanOpts.stripOldImages ? `- TUYỆT ĐỐI KHÔNG chèn bất kỳ thẻ <img>, <figure> hay link ảnh cũ nào vào bài viết.` : "",
        cleanOpts.stripPhones ? `- TUYỆT ĐỐI KHÔNG chứa bất kỳ số điện thoại, hotline, Zalo nào.` : "",
        cleanOpts.stripBuyButtons ? `- TUYỆT ĐỐI KHÔNG chèn nút bấm mua hàng, nút đặt hàng hay lời kêu gọi bấm nút.` : "",
        cleanOpts.stripExternalDomains
          ? `- TUYỆT ĐỐI KHÔNG nhắc tên miền, URL, tên cửa hàng hay liên kết của bất kỳ trang web nào khác${cleanOpts.blockedDomains.length ? ` (cấm: ${cleanOpts.blockedDomains.join(", ")})` : ""}.`
          : "",
        `- Tuân thủ Luật Quảng cáo & Nghị định 15/2018/NĐ-CP Việt Nam + Google YMYL: không dùng từ khẳng định 'chữa khỏi', 'đặc trị', 'thay thế thuốc'.`,
        ``,
        `NỘI DUNG THÔ ĐÃ TẨY ĐỊNH DẠNG CŨ ĐỂ THAM KHẢO:`,
        preCleaned.plainText.slice(0, 12000),
        ``,
        `CHỈ TRẢ VỀ MÃ HTML SẠCH (không dùng markdown \`\`\`html, không <html>/<body>/<script>).`,
      ]
        .filter(Boolean)
        .join("\n");

      const res = await callGeminiGenerateContent(apiKey, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
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
      rewrittenHtml = buildRichStyledFallbackHtml(
        productName,
        brand,
        origin,
        unit,
        preCleaned.plainText,
      );
    }

    // Post-sanitize preserving AI's new inline CSS styling while ensuring 0 old images/phones/buttons/domains
    const postCleaned = cleanProductDescriptionHtml(rewrittenHtml, cleanOpts, false);

    return NextResponse.json({
      ok: true,
      usedAi,
      html: postCleaned.cleanedHtml || rewrittenHtml,
      stats: {
        removedImages: preCleaned.stats.removedImages + postCleaned.stats.removedImages,
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
