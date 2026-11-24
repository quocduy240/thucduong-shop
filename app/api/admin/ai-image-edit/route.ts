import { currentAdminForPath } from "@/lib/auth";
import { run } from "@/lib/db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "@/lib/gemini-key";
import { saveMediaAsset } from "@/lib/media-assets";
import { assertSafePublicHttpUrl } from "@/lib/security";

function slugifyName(raw: string): string {
  return (
    raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "ai-image"
  );
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchOriginalImageAsBase64(originalUrl: string, reqUrl: string): Promise<{
  base64: string;
  mimeType: string;
}> {
  if (originalUrl.startsWith("data:")) {
    const m = originalUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (m) return { mimeType: m[1], base64: m[2] };
  }

  const resolved = originalUrl.startsWith("http")
    ? assertSafePublicHttpUrl(originalUrl).toString()
    : new URL(originalUrl.startsWith("/") ? originalUrl : `/${originalUrl}`, reqUrl).toString();

  const res = await fetch(resolved, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`Không thể tải ảnh gốc (${res.status}) từ ${originalUrl}`);
  }
  const mimeType = (res.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  const buf = await res.arrayBuffer();
  return { base64: arrayBufferToBase64(buf), mimeType };
}

async function syncImageUrlAcrossDatabase(oldUrl: string, newUrl: string): Promise<number> {
  if (!oldUrl || oldUrl === newUrl || oldUrl.startsWith("data:")) return 0;
  let updated = 0;

  const queries: [string, unknown[]][] = [
    [`UPDATE products SET image = ? WHERE image = ?`, [newUrl, oldUrl]],
    [`UPDATE products SET gallery = REPLACE(gallery, ?, ?) WHERE gallery LIKE ?`, [oldUrl, newUrl, `%${oldUrl}%`]],
    [`UPDATE products SET description = REPLACE(description, ?, ?) WHERE description LIKE ?`, [oldUrl, newUrl, `%${oldUrl}%`]],
    [`UPDATE posts SET cover = ? WHERE cover = ?`, [newUrl, oldUrl]],
    [`UPDATE posts SET content = REPLACE(content, ?, ?) WHERE content LIKE ?`, [oldUrl, newUrl, `%${oldUrl}%`]],
    [`UPDATE reusable_blocks SET content = REPLACE(content, ?, ?) WHERE content LIKE ?`, [oldUrl, newUrl, `%${oldUrl}%`]],
    [`UPDATE pages SET content = REPLACE(content, ?, ?) WHERE content LIKE ?`, [oldUrl, newUrl, `%${oldUrl}%`]],
  ];

  for (const [sql, params] of queries) {
    try {
      const r = await run(sql, ...params);
      updated += r.changes;
    } catch {
      /* ignore if a table doesn't exist yet */
    }
  }
  return updated;
}

export async function POST(req: Request) {
  const admin = await currentAdminForPath("/admin/posts/", "/admin/products/", "/admin/blocks/", "/admin/pages/");
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      action?: "sync_url";
      oldUrl?: string;
      newUrl?: string;
      originalUrl?: string;
      presets?: string[];
      customPrompt?: string;
      newName?: string;
      contextTitle?: string;
      replaceEverywhere?: boolean;
      geminiApiKey?: string;
    };

    if (body.action === "sync_url" && body.oldUrl && body.newUrl) {
      const syncedRows =
        body.replaceEverywhere !== false
          ? await syncImageUrlAcrossDatabase(body.oldUrl, body.newUrl)
          : 0;
      return Response.json({ ok: true, syncedRows });
    }

    const originalUrl = String(body.originalUrl ?? "").trim();
    if (!originalUrl) {
      return Response.json({ error: "Thiếu đường dẫn ảnh gốc." }, { status: 400 });
    }

    const apiKey = await resolveGeminiApiKey(body.geminiApiKey).catch(() => "");

    const { base64: origB64, mimeType: origMime } = await fetchOriginalImageAsBase64(originalUrl, req.url);
    const presets = Array.isArray(body.presets) ? body.presets.filter(Boolean) : [];
    const customPrompt = String(body.customPrompt ?? "").trim();
    const contextTitle = String(body.contextTitle ?? "").trim();

    const instructions = [
      "Analyze the provided original product/article image carefully.",
      "Regenerate and enhance it into the most visually appealing, crisp, studio-grade, commercial-ready photograph possible while preserving the authentic subject, packaging identity, and product text/label accuracy from the original image.",
      contextTitle ? `Product/Article context: "${contextTitle}".` : "",
      presets.length ? `Apply these visual enhancements:\n- ${presets.join("\n- ")}` : "",
      customPrompt ? `Additional user instruction: ${customPrompt}` : "",
      "Return the newly generated high-resolution image.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const models = ["gemini-3.1-flash-image", "gemini-3-pro-image", "gemini-2.5-flash-image"];
    let outBase64 = "";
    let outMime = "image/png";
    let engineUsed = "gemini-image";
    let lastError = "";

    if (apiKey) {
      for (const model of models) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    role: "user",
                    parts: [
                      { inlineData: { mimeType: origMime, data: origB64 } },
                      { text: instructions },
                    ],
                  },
                ],
                generationConfig: {
                  responseModalities: ["TEXT", "IMAGE"],
                },
              }),
            },
          );

          if (!res.ok) {
            lastError = `Model ${model} lỗi (${res.status})`;
            continue;
          }

          const data = (await res.json()) as {
            candidates?: {
              content?: {
                parts?: { inlineData?: { mimeType?: string; data?: string }; text?: string }[];
              };
            }[];
          };

          const parts = data.candidates?.[0]?.content?.parts ?? [];
          const imgPart = parts.find((pt) => pt.inlineData?.data);
          if (imgPart?.inlineData?.data) {
            outBase64 = imgPart.inlineData.data;
            outMime = imgPart.inlineData.mimeType || "image/png";
            break;
          }
        } catch (e) {
          lastError = (e as Error).message;
        }
      }
    }

    // Free Original-Preserving Pipeline (0đ, 100% keeps the exact original product & label):
    // Analyze the original image with Gemini Vision (free tier) and return tailored Studio Enhancement parameters
    // for client-side high-res Canvas Unsharp-Mask sharpening + studio lighting tone mapping.
    if (!outBase64) {
      const wantWarm = presets.some((p) => p.includes("macrobiotic") || p.includes("warm")) ||
        /ấm|gỗ|nắng|warm/i.test(customPrompt);
      const wantVibrant = presets.some((p) => p.includes("Rich balanced") || p.includes("e-commerce"));

      let tuning = {
        brightness: 1.07,
        contrast: 1.12,
        saturate: wantVibrant ? 1.18 : 1.1,
        warmth: wantWarm ? 0.08 : 0.02,
        sharpen: 0.45,
        studioFrame: presets.some((p) => p.includes("studio") || p.includes("minimalist")),
        analysisNote:
          "Đã phân tích ảnh gốc: giữ nguyên 100% sản phẩm/nhãn mác thật, tăng độ sắc nét (Unsharp Mask), cân bằng ánh sáng studio và độ rực màu tự nhiên.",
      };

      if (apiKey) {
        try {
          const visionRes = await callGeminiGenerateContent(apiKey, {
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: origMime, data: origB64 } },
                  {
                    text: `Analyze this product/article photo and recommend subtle, natural photo-enhancement parameters so it looks crisp, bright, and commercial-studio quality WITHOUT altering the product itself.
Requests: ${presets.join("; ")}. ${customPrompt}
Return ONLY valid JSON:
{"brightness": 1.02-1.15, "contrast": 1.05-1.22, "saturate": 1.05-1.25, "warmth": 0.0-0.12, "sharpen": 0.3-0.7, "analysisNote": "1 short Vietnamese sentence explaining what was improved"}`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          });
          if (visionRes.ok) {
            const vData = (await visionRes.json()) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            const rawJson = vData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
            if (rawJson) {
              const parsed = JSON.parse(rawJson.replace(/^```json\s*|\s*```$/g, "")) as Partial<typeof tuning>;
              tuning = {
                ...tuning,
                brightness: Math.min(1.25, Math.max(0.95, Number(parsed.brightness) || tuning.brightness)),
                contrast: Math.min(1.3, Math.max(0.95, Number(parsed.contrast) || tuning.contrast)),
                saturate: Math.min(1.35, Math.max(0.95, Number(parsed.saturate) || tuning.saturate)),
                warmth: Math.min(0.18, Math.max(0, Number(parsed.warmth) ?? tuning.warmth)),
                sharpen: Math.min(0.85, Math.max(0.15, Number(parsed.sharpen) || tuning.sharpen)),
                analysisNote: parsed.analysisNote || tuning.analysisNote,
              };
            }
          }
        } catch {
          /* keep smart default tuning */
        }
      }

      return Response.json({
        ok: true,
        mode: "client-studio-enhance",
        tuning,
      });
    }

    const ext = outMime.includes("jpeg") ? "jpg" : outMime.includes("webp") ? "webp" : "png";
    const baseName = slugifyName(body.newName || contextTitle || "ai-enhanced");
    const slug = `${baseName}-${Date.now().toString(36)}.${ext}`;
    const newUrl = await saveMediaAsset(slug, outMime, outBase64);

    const syncedRows =
      body.replaceEverywhere !== false ? await syncImageUrlAcrossDatabase(originalUrl, newUrl) : 0;

    return Response.json({
      ok: true,
      newUrl,
      slug,
      syncedRows,
      engineUsed,
    });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "Không thể xử lý tạo ảnh AI." },
      { status: 500 },
    );
  }
}
