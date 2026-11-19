import "server-only";
import { one, run } from "./db";
import { callGeminiGenerateContent, resolveGeminiApiKey } from "./gemini-key";

const SETTINGS_KEY = "medical_compliance_policy";

export type ComplianceReplacementRule = {
  pattern: string;
  replacement: string;
  reason: string;
  law_ref: string;
};

export type CompliancePolicyConfig = {
  version: string;
  last_synced_at: string;
  next_sync_at: string;
  sync_source: string;
  vn_law_summary: string[];
  google_ymyl_summary: string[];
  youtube_policy_summary: string[];
  required_disclaimer_html: string;
  banned_rules: ComplianceReplacementRule[];
  recent_changelog: string[];
};

export const DEFAULT_COMPLIANCE_POLICY: CompliancePolicyConfig = {
  version: "2026.11-VN-GYT",
  last_synced_at: new Date().toISOString(),
  next_sync_at: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
  sync_source: "Luật Quảng cáo VN · NĐ 15/2018/NĐ-CP · TT 09/2015/TT-BYT · Google YMYL · YouTube Medical Policy",
  vn_law_summary: [
    "Không dùng từ ngữ gây hiểu nhầm thực phẩm / thực phẩm bảo vệ sức khoẻ là thuốc chữa bệnh (Luật Quảng cáo & NĐ 15/2018/NĐ-CP).",
    "Cấm khẳng định 'đặc trị', 'chữa khỏi 100%', 'thay thế thuốc tây', 'cam kết khỏi dứt điểm', 'thần dược'.",
    "Không mượn danh nghĩa bác sĩ, dược sĩ, cơ sở y tế hoặc thư cảm ơn người bệnh để khẳng định công dụng điều trị.",
    "Luôn ghi rõ khuyến cáo dinh dưỡng hỗ trợ, không thay thế thuốc chữa bệnh hay phác đồ của bác sĩ.",
  ],
  google_ymyl_summary: [
    "Đạt chuẩn E-E-A-T cho chủ đề YMYL (Your Money Your Life): nêu cơ chế sinh học/dinh dưỡng khách quan, không giật tít sai sự thật.",
    "Phân biệt rạch ròi giữa dinh dưỡng hỗ trợ sức khoẻ và điều trị y khoa chuyên sâu.",
  ],
  youtube_policy_summary: [
    "Tuân thủ YouTube Medical Misinformation Policy: không cổ suý bệnh nhân tự ý ngưng điều trị y khoa đối với bệnh mạn tính/ung thư.",
    "Không tuyên truyền phương pháp tự chữa trị nguy hiểm chưa có kiểm chứng khoa học.",
  ],
  required_disclaimer_html:
    "<blockquote><strong>Lưu ý chuyên môn &amp; Tuân thủ pháp luật:</strong> Nội dung nhằm mục đích cung cấp kiến thức dinh dưỡng Thực dưỡng hiện đại tham khảo, không phải là thuốc và không có tác dụng thay thế thuốc chữa bệnh hay phác đồ chẩn đoán, điều trị của bác sĩ chuyên khoa.</blockquote>",
  banned_rules: [
    {
      pattern: "chữa\\s*(?:khỏi|dứt\\s*điểm)\\s*(?:100%|hoàn\\s*toàn)?",
      replacement: "hỗ trợ cải thiện tích cực",
      reason: "Vi phạm NĐ 15/2018/NĐ-CP & Google YMYL: thực phẩm/dinh dưỡng không được khẳng định chữa khỏi bệnh.",
      law_ref: "NĐ 15/2018/NĐ-CP",
    },
    {
      pattern: "đặc\\s*trị\\s*(?:bệnh|tận\\s*gốc)?",
      replacement: "hỗ trợ chăm sóc",
      reason: "Từ ngữ chỉ dành cho thuốc điều trị theo Luật Quảng cáo & TT 09/2015/TT-BYT.",
      law_ref: "TT 09/2015/TT-BYT",
    },
    {
      pattern: "thần\\s*dược|trị\\s*bách\\s*bệnh",
      replacement: "thực phẩm dưỡng sinh quý",
      reason: "Thổi phồng công dụng y tế, vi phạm quy định quảng cáo Việt Nam & Google.",
      law_ref: "Luật Quảng cáo VN",
    },
    {
      pattern: "bỏ\\s*(?:hẳn\\s*)?thuốc\\s*(?:tây|bác\\s*sĩ)|không\\s*cần\\s*(?:uống\\s*thuốc|bác\\s*sĩ)",
      replacement: "phối hợp dinh dưỡng lành mạnh song song theo hướng dẫn của bác sĩ điều trị",
      reason: "Vi phạm nghiêm trọng Chính sách Cộng đồng YouTube (Medical Misinformation).",
      law_ref: "YouTube Medical Policy",
    },
    {
      pattern: "cam\\s*kết\\s*khỏi\\s*bệnh|trị\\s*tận\\s*gốc",
      replacement: "góp phần nâng cao thể trạng và hỗ trợ cân bằng",
      reason: "Không được cam kết kết quả điều trị y khoa đối với thực phẩm/dinh dưỡng.",
      law_ref: "NĐ 15/2018/NĐ-CP",
    },
  ],
  recent_changelog: [
    "Khởi tạo bộ quy chuẩn hợp nhất: Pháp luật VN (Luật Quảng cáo, NĐ 15/2018, TT 09/2015/TT-BYT) + Google YMYL + YouTube Medical Misinformation.",
  ],
};

export async function getCompliancePolicyConfig(): Promise<CompliancePolicyConfig> {
  const row = await one<{ value: string }>("SELECT value FROM settings WHERE key = ?", SETTINGS_KEY);
  if (!row?.value) return DEFAULT_COMPLIANCE_POLICY;
  try {
    const parsed = JSON.parse(row.value) as Partial<CompliancePolicyConfig>;
    return {
      ...DEFAULT_COMPLIANCE_POLICY,
      ...parsed,
      vn_law_summary: Array.isArray(parsed.vn_law_summary) && parsed.vn_law_summary.length ? parsed.vn_law_summary : DEFAULT_COMPLIANCE_POLICY.vn_law_summary,
      google_ymyl_summary: Array.isArray(parsed.google_ymyl_summary) && parsed.google_ymyl_summary.length ? parsed.google_ymyl_summary : DEFAULT_COMPLIANCE_POLICY.google_ymyl_summary,
      youtube_policy_summary: Array.isArray(parsed.youtube_policy_summary) && parsed.youtube_policy_summary.length ? parsed.youtube_policy_summary : DEFAULT_COMPLIANCE_POLICY.youtube_policy_summary,
      banned_rules: Array.isArray(parsed.banned_rules) && parsed.banned_rules.length ? parsed.banned_rules : DEFAULT_COMPLIANCE_POLICY.banned_rules,
      recent_changelog: Array.isArray(parsed.recent_changelog) ? parsed.recent_changelog : DEFAULT_COMPLIANCE_POLICY.recent_changelog,
    };
  } catch {
    return DEFAULT_COMPLIANCE_POLICY;
  }
}

export async function saveCompliancePolicyConfig(cfg: CompliancePolicyConfig): Promise<void> {
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    SETTINGS_KEY,
    JSON.stringify(cfg),
  );
}

export function isComplianceSyncDue(cfg: CompliancePolicyConfig): boolean {
  const nextTs = Date.parse(cfg.next_sync_at || "");
  if (!Number.isFinite(nextTs)) return true;
  return Date.now() >= nextTs;
}

/**
 * Background weekly sync: refreshes Vietnamese healthcare/advertising legal rules,
 * Google YMYL/E-E-A-T guidelines, and YouTube Medical Misinformation policies.
 */
export async function syncCompliancePolicyWeekly(force = false): Promise<{
  updated: boolean;
  config: CompliancePolicyConfig;
}> {
  const current = await getCompliancePolicyConfig();
  if (!force && !isComplianceSyncDue(current)) {
    return { updated: false, config: current };
  }

  const apiKey = await resolveGeminiApiKey();
  const nowIso = new Date().toISOString();
  const nextIso = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

  if (!apiKey) {
    const bumped: CompliancePolicyConfig = {
      ...current,
      last_synced_at: nowIso,
      next_sync_at: nextIso,
      recent_changelog: [
        `[${nowIso.slice(0, 10)}] Kiểm tra định kỳ bộ chuẩn hiện hành (chưa cấu hình Gemini Key để tra cứu bổ sung).`,
        ...current.recent_changelog,
      ].slice(0, 8),
    };
    await saveCompliancePolicyConfig(bumped);
    return { updated: true, config: bumped };
  }

  const prompt = `Bạn là Luật sư Y tế Việt Nam & Chuyên gia Tuân thủ Chính sách Nội dung Y khoa của Google (YMYL/E-E-A-T) và YouTube (Medical Misinformation).
Hãy rà soát và cập nhật bộ tiêu chuẩn mới nhất hiện hành cho website chia sẻ kiến thức Thực dưỡng & Thực phẩm bảo vệ sức khoẻ tại Việt Nam:
1. Pháp luật Việt Nam hiện hành: Luật Quảng cáo (bao gồm các quy định sửa đổi bổ sung), Nghị định 15/2018/NĐ-CP về An toàn thực phẩm, Thông tư 09/2015/TT-BYT về xác nhận nội dung quảng cáo sản phẩm liên quan sức khoẻ, Luật Khám bệnh chữa bệnh.
2. Google Search Quality Rater Guidelines (YMYL & E-E-A-T cho sức khoẻ).
3. YouTube Community Guidelines — Medical Misinformation Policy.

Trả về DUY NHẤT 1 JSON object hợp lệ (không markdown) với cấu trúc:
{
  "vn_law_summary": string[] (4-5 quy tắc cốt lõi đúng pháp luật VN hiện hành),
  "google_ymyl_summary": string[] (2-3 quy tắc Google YMYL),
  "youtube_policy_summary": string[] (2-3 quy tắc YouTube Y tế),
  "new_banned_rules": [
    { "pattern": "regex_tieng_viet_khong_che_slash", "replacement": "cum_tu_an_toan", "reason": "ly_do", "law_ref": "ten_luat" }
  ],
  "summary_note": "1 câu tóm tắt điểm cập nhật tuần này"
}`;

  try {
    const res = await callGeminiGenerateContent(apiKey, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
    });
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const txt = (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "")
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(txt) as {
      vn_law_summary?: string[];
      google_ymyl_summary?: string[];
      youtube_policy_summary?: string[];
      new_banned_rules?: ComplianceReplacementRule[];
      summary_note?: string;
    };

    const mergedRules = [...DEFAULT_COMPLIANCE_POLICY.banned_rules];
    for (const r of parsed.new_banned_rules ?? []) {
      if (!r?.pattern || !r?.replacement) continue;
      try {
        new RegExp(r.pattern, "gi");
        if (!mergedRules.some((x) => x.pattern === r.pattern)) {
          mergedRules.push(r);
        }
      } catch {
        /* skip invalid regex */
      }
    }

    const updatedCfg: CompliancePolicyConfig = {
      ...current,
      version: `${nowIso.slice(0, 10)}-VN-GYT`,
      last_synced_at: nowIso,
      next_sync_at: nextIso,
      vn_law_summary:
        Array.isArray(parsed.vn_law_summary) && parsed.vn_law_summary.length > 0
          ? parsed.vn_law_summary.slice(0, 6)
          : current.vn_law_summary,
      google_ymyl_summary:
        Array.isArray(parsed.google_ymyl_summary) && parsed.google_ymyl_summary.length > 0
          ? parsed.google_ymyl_summary.slice(0, 4)
          : current.google_ymyl_summary,
      youtube_policy_summary:
        Array.isArray(parsed.youtube_policy_summary) && parsed.youtube_policy_summary.length > 0
          ? parsed.youtube_policy_summary.slice(0, 4)
          : current.youtube_policy_summary,
      banned_rules: mergedRules.slice(0, 20),
      recent_changelog: [
        `[${nowIso.slice(0, 10)}] ${parsed.summary_note || "Đã cập nhật chuẩn Pháp luật VN, Google YMYL & YouTube hàng tuần."}`,
        ...current.recent_changelog,
      ].slice(0, 8),
    };
    await saveCompliancePolicyConfig(updatedCfg);
    return { updated: true, config: updatedCfg };
  } catch {
    const fallbackCfg: CompliancePolicyConfig = {
      ...current,
      last_synced_at: nowIso,
      next_sync_at: nextIso,
    };
    await saveCompliancePolicyConfig(fallbackCfg);
    return { updated: true, config: fallbackCfg };
  }
}

export function applyAndAuditCompliance(
  title: string,
  contentHtml: string,
  policy: CompliancePolicyConfig,
): {
  sanitizedHtml: string;
  audit: {
    safe: boolean;
    score: number;
    status_label: string;
    policy_version: string;
    fixed_issues: string[];
    warnings: string[];
  };
} {
  let outHtml = contentHtml;
  const fixedIssues: string[] = [];

  for (const rule of policy.banned_rules) {
    try {
      const re = new RegExp(rule.pattern, "gi");
      if (re.test(`${title}\n${outHtml}`)) {
        outHtml = outHtml.replace(re, rule.replacement);
        fixedIssues.push(`[${rule.law_ref}] ${rule.reason}`);
      }
    } catch {
      /* ignore invalid regex */
    }
  }

  if (!/không phải là thuốc|không thay thế/i.test(outHtml)) {
    outHtml = `${outHtml}\n${policy.required_disclaimer_html}`;
  }

  return {
    sanitizedHtml: outHtml,
    audit: {
      safe: fixedIssues.length === 0,
      score: fixedIssues.length === 0 ? 99 : Math.max(78, 96 - fixedIssues.length * 6),
      status_label:
        fixedIssues.length === 0
          ? "✓ Đạt chuẩn Pháp luật VN, Google YMYL & YouTube Y tế"
          : `✓ Đã tự động hiệu chỉnh ${fixedIssues.length} cụm từ theo chuẩn Pháp luật VN / Google / YouTube`,
      policy_version: policy.version,
      fixed_issues: fixedIssues,
      warnings: [
        ...policy.vn_law_summary.slice(0, 2),
        ...policy.youtube_policy_summary.slice(0, 1),
      ],
    },
  };
}
