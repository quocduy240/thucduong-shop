import { currentAdmin } from "@/lib/auth";
import { run } from "@/lib/db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "@/lib/gemini-key";
import { saveMediaAsset } from "@/lib/media-assets";

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
    ? originalUrl
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
  const admin = await currentAdmin();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await req.json()) as {
      originalUrl?: string;
      presets?: string[];
      customPrompt?: string;
      newName?: string;
      contextTitle?: string;
      replaceEverywhere?: boolean;
      geminiApiKey?: string;
    };

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

    // Free Fallback Pipeline (0đ, no Billing required):
    // 1. Use Gemini Vision (free tier text/vision) to analyze the original image & craft an English Flux prompt.
    // 2. Generate the new image via Pollinations.ai Flux (100% free, no API key required).
    if (!outBase64) {
      let fluxPrompt = `${contextTitle || "organic macrobiotic health product"}, ${presets.join(", ")}, ${customPrompt}, commercial studio photography, high resolution`;

      if (apiKey) {
        try {
          const visionRes = await callGeminiGenerateContent(apiKey, {
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { mimeType: origMime, data: origB64 } },
                  {
                    text: `Analyze this product/article image and write ONE concise, vivid English image-generation prompt (max 65 words) to recreate an upgraded, ultra-clean commercial studio photograph of the exact same subject.\nContext: "${contextTitle}".\nStyle requests: ${presets.join("; ")}. ${customPrompt}\nReturn ONLY the English prompt text, no quotes.`,
                  },
                ],
              },
            ],
            generationConfig: { temperature: 0.4 },
          });
          if (visionRes.ok) {
            const vData = (await visionRes.json()) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            const crafted = vData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (crafted) fluxPrompt = crafted;
          }
        } catch {
          /* fallback to deterministic prompt */
        }
      }

      const seed = Math.floor(Math.random() * 999999);
      const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fluxPrompt.slice(0, 450))}?width=900&height=900&nologo=true&seed=${seed}`;
      const pRes = await fetch(pollUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (pRes.ok) {
        const buf = await pRes.arrayBuffer();
        if (buf.byteLength > 1000) {
          outBase64 = arrayBufferToBase64(buf);
          outMime = (pRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
          engineUsed = "free-gemini-vision-flux";
        }
      }
    }

    if (!outBase64) {
      return Response.json(
        { error: lastError || "Chưa tạo được ảnh mới lúc này. Vui lòng thử lại sau vài giây." },
        { status: 502 },
      );
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
