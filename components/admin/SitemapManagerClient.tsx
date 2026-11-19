"use client";

import { useState } from "react";
import type { ChangeFreq, SitemapConfig, SitemapEntry, SitemapGroupKey } from "@/lib/sitemaps";

const GROUP_LABELS: Record<SitemapGroupKey, { title: string; desc: string }> = {
  home: { title: "Trang chủ", desc: "URL gốc /" },
  special: { title: "Trang chức năng nổi bật", desc: "/san-pham/, /canh-duong-sinh/, /tu-van-nhanh/, /thanh-vien/, /so-do-trang.html" },
  product_categories: { title: "Danh mục sản phẩm", desc: "Các trang /san-pham/<danh-muc>/" },
  products: { title: "Sản phẩm chi tiết", desc: "Toàn bộ trang sản phẩm .html" },
  post_categories: { title: "Chuyên mục bài viết", desc: "Các trang mục lục kiến thức" },
  posts: { title: "Bài viết kiến thức", desc: "Toàn bộ bài viết thực dưỡng .html" },
  pages: { title: "Trang tĩnh & Chính sách", desc: "Giới thiệu, liên hệ, chính sách bán hàng" },
};

const FREQS: ChangeFreq[] = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"];

export default function SitemapManagerClient({
  initialConfig,
  initialCounts,
  initialTotal,
  sampleUrls,
}: {
  initialConfig: SitemapConfig;
  initialCounts: Record<SitemapGroupKey | "custom", number>;
  initialTotal: number;
  sampleUrls: SitemapEntry[];
}) {
  const [cfg, setCfg] = useState<SitemapConfig>(initialConfig);
  const [counts, setCounts] = useState(initialCounts);
  const [total, setTotal] = useState(initialTotal);
  const [customText, setCustomText] = useState(
    initialConfig.customUrls.map((c) => `${c.path} | ${c.priority} | ${c.changefreq}`).join("\n"),
  );
  const [excludedText, setExcludedText] = useState(initialConfig.excludedPaths.join("\n"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function save() {
    setSaving(true);
    setMsg("");
    try {
      const customUrls = customText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [p, prio, freq] = line.split("|").map((s) => s.trim());
          return {
            path: p.startsWith("/") ? p : `/${p}`,
            priority: Math.min(1, Math.max(0.1, Number(prio) || 0.6)),
            changefreq: (FREQS.includes(freq as ChangeFreq) ? freq : "weekly") as ChangeFreq,
          };
        });

      const excludedPaths = excludedText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/sitemaps", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfg, customUrls, excludedPaths }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Lưu thất bại.");
      } else {
        setCfg(data.config);
        setCounts(data.counts);
        setTotal(data.totalUrls);
        setMsg("✓ Đã lưu cấu hình Sitemap & làm mới /sitemap.xml!");
      }
    } finally {
      setSaving(false);
    }
  }

  function copySitemapUrl() {
    const full = `${cfg.baseUrl}/sitemap.xml`;
    navigator.clipboard?.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">🗺️ Quản lý Sitemaps & SEO Index</h1>
          <p className="mt-1 text-xs text-gray-500">
            Quản lý toàn bộ URL xuất hiện trên <code className="text-brand">/sitemap.xml</code>,{" "}
            <code className="text-brand">/robots.txt</code> và trang <code className="text-brand">/so-do-trang.html</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copySitemapUrl}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            {copied ? "✓ Đã copy URL" : "📋 Copy /sitemap.xml"}
          </button>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-brand/30 bg-emerald-50 px-3 py-2 text-xs font-bold text-brand hover:bg-emerald-100"
          >
            Xem XML ↗
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            robots.txt ↗
          </a>
          <a
            href="/so-do-trang.html"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            HTML Sitemap ↗
          </a>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "💾 Lưu cấu hình"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
          {msg}
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Tổng URL đang index</div>
          <div className="mt-1 text-2xl font-extrabold text-brand">{total}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Sản phẩm</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{counts.products}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Bài viết Kiến thức</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">{counts.posts}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-xs text-gray-500">Danh mục & Trang tĩnh</div>
          <div className="mt-1 text-2xl font-extrabold text-gray-900">
            {counts.product_categories + counts.post_categories + counts.pages + counts.special}
          </div>
        </div>
      </div>

      {/* Global Settings */}
      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">⚙️ Cấu hình chung</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Domain chính (Base URL)</label>
            <input
              type="url"
              value={cfg.baseUrl}
              onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input
              id="sm-enabled"
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
              className="h-4 w-4 accent-brand"
            />
            <label htmlFor="sm-enabled" className="text-sm font-medium text-gray-800">
              Kích hoạt xuất Sitemap XML công khai (<code className="text-xs">/sitemap.xml</code>)
            </label>
          </div>
        </div>
      </div>

      {/* Group Controls */}
      <div className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b bg-gray-50 px-5 py-3">
          <h2 className="text-sm font-bold text-gray-800">📂 Cấu hình từng nhóm URL</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50/70 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nhóm URL</th>
                <th className="px-4 py-3 text-center">Số lượng</th>
                <th className="px-4 py-3 text-center">Bật</th>
                <th className="px-4 py-3">Mức ưu tiên (Priority)</th>
                <th className="px-4 py-3">Tần suất quét (Changefreq)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(Object.keys(GROUP_LABELS) as SitemapGroupKey[]).map((key) => {
                const g = cfg.groups[key];
                const meta = GROUP_LABELS[key];
                return (
                  <tr key={key} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{meta.title}</div>
                      <div className="text-xs text-gray-400">{meta.desc}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-brand">{counts[key]}</td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={g.enabled}
                        onChange={(e) =>
                          setCfg({
                            ...cfg,
                            groups: { ...cfg.groups, [key]: { ...g, enabled: e.target.checked } },
                          })
                        }
                        className="h-4 w-4 accent-brand"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={g.priority}
                        onChange={(e) =>
                          setCfg({
                            ...cfg,
                            groups: { ...cfg.groups, [key]: { ...g, priority: Number(e.target.value) } },
                          })
                        }
                        className="w-20 rounded-lg border border-gray-300 px-2.5 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={g.changefreq}
                        onChange={(e) =>
                          setCfg({
                            ...cfg,
                            groups: {
                              ...cfg.groups,
                              [key]: { ...g, changefreq: e.target.value as ChangeFreq },
                            },
                          })
                        }
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-sm"
                      >
                        {FREQS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom & Excluded Paths */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 space-y-2">
          <h3 className="text-sm font-bold text-gray-800">➕ URL bổ sung thủ công</h3>
          <p className="text-xs text-gray-500">
            Mỗi dòng 1 URL theo định dạng: <code>/duong-dan | 0.8 | weekly</code>
          </p>
          <textarea
            rows={5}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="/khuyen-mai-tet/ | 0.9 | daily"
            className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs outline-none focus:border-brand"
          />
        </div>

        <div className="rounded-2xl border bg-white p-5 space-y-2">
          <h3 className="text-sm font-bold text-gray-800">🚫 URL loại trừ khỏi Sitemap</h3>
          <p className="text-xs text-gray-500">Mỗi dòng 1 đường dẫn bắt đầu bằng <code>/</code> cần ẩn khỏi Google index.</p>
          <textarea
            rows={5}
            value={excludedText}
            onChange={(e) => setExcludedText(e.target.value)}
            placeholder="/trang-nhap/"
            className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Sample Preview */}
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-gray-800">🔍 Xem trước 15 URL đầu tiên trong /sitemap.xml</h3>
        <div className="max-h-64 overflow-auto rounded-xl border bg-gray-50 p-3 text-xs font-mono space-y-1">
          {sampleUrls.map((u) => (
            <div key={u.loc} className="flex items-center justify-between gap-4 border-b border-gray-200/70 py-1 last:border-0">
              <a href={u.loc} target="_blank" rel="noreferrer" className="truncate text-brand hover:underline">
                {u.loc}
              </a>
              <span className="shrink-0 text-gray-500">
                prio {u.priority.toFixed(1)} · {u.changefreq}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
