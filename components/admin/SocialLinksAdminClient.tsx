"use client";

import { useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  buildChannelOutboundUrl,
  PLATFORM_META,
  renderSocialBlockHtml,
  safeSocialUrl,
  type SocialChannel,
  type SocialGroup,
  type SocialLinksConfig,
  type SocialPlatform,
  type SocialStyle,
} from "@/lib/social-links-shared";

const PLATFORMS = Object.keys(PLATFORM_META) as SocialPlatform[];

const STYLES: { id: SocialStyle; label: string; desc: string }[] = [
  { id: "cards", label: "Thẻ nổi bật (Cards)", desc: "Trang chủ, cuối bài viết, BlockZone" },
  { id: "pills", label: "Nút viên thuốc (Pills)", desc: "Giữa bài viết, trang sản phẩm" },
  { id: "sidebar", label: "Danh sách dọc (Sidebar)", desc: "Cột phải bài viết / sản phẩm" },
  { id: "icons", label: "Icon tối giản (Icons)", desc: "Footer, thanh gọn nhẹ" },
];

export default function SocialLinksAdminClient({
  initialConfig,
}: {
  initialConfig: SocialLinksConfig;
}) {
  const [config, setConfig] = useState<SocialLinksConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [previewStyle, setPreviewStyle] = useState<SocialStyle>(initialConfig.defaultStyle);
  const [previewGroup, setPreviewGroup] = useState<"all" | SocialGroup>("all");
  const [qrModal, setQrModal] = useState<{ name: string; url: string; dataUrl: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState("");

  const totalClicks = useMemo(
    () => config.channels.reduce((sum, c) => sum + (c.clicks || 0), 0),
    [config.channels],
  );

  const previewHtml = useMemo(
    () =>
      renderSocialBlockHtml(config, {
        style: previewStyle,
        group: previewGroup,
        trackClicks: false,
      }),
    [config, previewStyle, previewGroup],
  );

  function updateChannel(id: string, patch: Partial<SocialChannel>) {
    setConfig((prev) => ({
      ...prev,
      channels: prev.channels.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }

  function moveChannel(idx: number, dir: -1 | 1) {
    setConfig((prev) => {
      const list = [...prev.channels].sort((a, b) => a.sort - b.sort);
      const target = idx + dir;
      if (target < 0 || target >= list.length) return prev;
      [list[idx], list[target]] = [list[target], list[idx]];
      return {
        ...prev,
        channels: list.map((c, i) => ({ ...c, sort: i + 1 })),
      };
    });
  }

  function addChannel(platform: SocialPlatform = "facebook") {
    const meta = PLATFORM_META[platform];
    const nextSort = config.channels.length + 1;
    const newItem: SocialChannel = {
      id: `${platform}-${Date.now().toString(36)}`,
      platform,
      group: meta.defaultGroup,
      name: meta.label,
      handle: "",
      url: "",
      badge: meta.defaultGroup === "marketplace" ? "Chính hãng" : "",
      ctaLabel: meta.defaultCta,
      enabled: true,
      sort: nextSort,
      clicks: 0,
    };
    setConfig((prev) => ({
      ...prev,
      channels: [...prev.channels, newItem],
    }));
  }

  function removeChannel(id: string) {
    setConfig((prev) => ({
      ...prev,
      channels: prev.channels
        .filter((c) => c.id !== id)
        .map((c, i) => ({ ...c, sort: i + 1 })),
    }));
  }

  async function saveConfig() {
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/social-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Lưu cấu hình thất bại.");
        return;
      }
      setConfig(d.config);
      setMsg("✓ Đã lưu cấu hình Liên kết Mạng xã hội & Sàn TMĐT.");
    } finally {
      setSaving(false);
    }
  }

  async function resetClicks() {
    if (!confirm("Đặt lại số lượt click của tất cả kênh về 0?")) return;
    setSaving(true);
    setMsg("");
    setErr("");
    try {
      const res = await fetch("/api/admin/social-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_clicks" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error ?? "Không thể đặt lại thống kê.");
        return;
      }
      setConfig(d.config);
      setMsg("✓ Đã đặt lại thống kê lượt click.");
    } finally {
      setSaving(false);
    }
  }

  async function openQr(ch: SocialChannel) {
    const url = buildChannelOutboundUrl(ch, config.autoUtm);
    if (!url) {
      setErr("Vui lòng nhập URL hợp lệ (https://...) trước khi tạo QR.");
      return;
    }
    const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2 });
    setQrModal({ name: ch.name, url, dataUrl });
  }

  function copyShortcode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 1800);
  }

  const sortedChannels = useMemo(
    () => [...config.channels].sort((a, b) => a.sort - b.sort),
    [config.channels],
  );

  return (
    <div className="space-y-6">
      {(msg || err) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            err
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {err || msg}
        </div>
      )}

      {/* Top stats + Save bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-gray-500">Kênh đang bật:</span>{" "}
            <strong className="text-brand">
              {config.channels.filter((c) => c.enabled && safeSocialUrl(c.url)).length}/{config.channels.length}
            </strong>
          </div>
          <div>
            <span className="text-gray-500">Tổng lượt click qua web:</span>{" "}
            <strong className="text-gray-900">{totalClicks.toLocaleString("vi-VN")}</strong>
          </div>
          <button
            type="button"
            onClick={resetClicks}
            disabled={saving || totalClicks === 0}
            className="cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            ↺ Reset click
          </button>
        </div>
        <button
          type="button"
          onClick={saveConfig}
          disabled={saving}
          className="cursor-pointer rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "💾 Lưu cấu hình"}
        </button>
      </div>

      {/* General settings */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">⚙️ Cấu hình hiển thị &amp; Chống thất thoát đơn</h2>
            <p className="text-xs text-gray-500">
              Cấu hình 1 lần — nhúng được ở Footer, trang Sản phẩm, Bài viết hoặc bất kỳ vị trí Block nào.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-emerald-50/70 px-3 py-1.5 text-xs font-bold text-emerald-900">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((p) => ({ ...p, enabled: e.target.checked }))}
              className="h-4 w-4 accent-brand"
            />
            Bật module Liên kết MXH &amp; Sàn
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Tiêu đề khối Block</label>
            <input
              value={config.title}
              onChange={(e) => setConfig((p) => ({ ...p, title: e.target.value }))}
              placeholder="Kết nối Cộng đồng & Gian hàng Chính hãng"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">Kiểu hiển thị mặc định cho [[social]]</label>
            <select
              value={config.defaultStyle}
              onChange={(e) => setConfig((p) => ({ ...p, defaultStyle: e.target.value as SocialStyle }))}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-brand"
            >
              {STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} — {s.desc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-gray-700">Mô tả phụ (hiển thị dưới tiêu đề)</label>
          <input
            value={config.subtitle}
            onChange={(e) => setConfig((p) => ({ ...p, subtitle: e.target.value }))}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-950">
            <input
              type="checkbox"
              checked={config.showDirectBuyNotice}
              onChange={(e) => setConfig((p) => ({ ...p, showDirectBuyNotice: e.target.checked }))}
              className="h-4 w-4 accent-brand"
            />
            Hiển thị thông báo giữ khách mua trực tiếp tại Web (khi có link Sàn TMĐT)
          </label>
          <input
            value={config.directBuyNotice}
            onChange={(e) => setConfig((p) => ({ ...p, directBuyNotice: e.target.value }))}
            placeholder="🎁 Đặt trực tiếp tại Web để được tích điểm đổi quà..."
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs outline-none focus:border-brand"
          />
        </div>

        <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold text-gray-700">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={config.showInFooter}
              onChange={(e) => setConfig((p) => ({ ...p, showInFooter: e.target.checked }))}
              className="h-4 w-4 accent-brand"
            />
            Tự động hiển thị các nút icon ở Footer
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={config.showOnProductPage}
              onChange={(e) => setConfig((p) => ({ ...p, showOnProductPage: e.target.checked }))}
              className="h-4 w-4 accent-brand"
            />
            Tự động hiển thị kênh Sàn TMĐT ở trang Chi tiết sản phẩm
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={config.autoUtm}
              onChange={(e) => setConfig((p) => ({ ...p, autoUtm: e.target.checked }))}
              className="h-4 w-4 accent-brand"
            />
            Tự động gắn UTM đo lường nguồn truy cập
          </label>
        </div>
      </section>

      {/* Channels List */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              🌐 Danh sách tài khoản Mạng xã hội &amp; Sàn TMĐT
            </h2>
            <p className="text-xs text-gray-500">
              Nhập link thật của shop cho từng kênh và bật công tắc hiển thị.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["facebook", "youtube", "tiktok", "zalo", "shopee", "lazada"] as SocialPlatform[]).map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => addChannel(pf)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-brand hover:bg-emerald-50 hover:text-brand"
              >
                + {PLATFORM_META[pf].label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {sortedChannels.map((ch, idx) => {
            const meta = PLATFORM_META[ch.platform] || PLATFORM_META.website;
            return (
              <div
                key={ch.id}
                className={`rounded-xl border p-4 transition ${
                  ch.enabled ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50/70 opacity-75"
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold">
                      <input
                        type="checkbox"
                        checked={ch.enabled}
                        onChange={(e) => updateChannel(ch.id, { enabled: e.target.checked })}
                        className="h-4 w-4 accent-brand"
                      />
                      {ch.enabled ? "Đang bật" : "Đang tắt"}
                    </label>
                    <select
                      value={ch.platform}
                      onChange={(e) => {
                        const pf = e.target.value as SocialPlatform;
                        updateChannel(ch.id, {
                          platform: pf,
                          group: PLATFORM_META[pf].defaultGroup,
                        });
                      }}
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-bold"
                    >
                      {PLATFORMS.map((pf) => (
                        <option key={pf} value={pf}>
                          {PLATFORM_META[pf].label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={ch.group}
                      onChange={(e) => updateChannel(ch.id, { group: e.target.value as SocialGroup })}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                    >
                      <option value="social">Nhóm: Mạng xã hội</option>
                      <option value="marketplace">Nhóm: Sàn TMĐT</option>
                    </select>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                    >
                      👆 {(ch.clicks || 0).toLocaleString("vi-VN")} click
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => openQr(ch)}
                      className="cursor-pointer rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      📱 QR Code
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveChannel(idx, -1)}
                      className="cursor-pointer rounded border px-2 py-1 font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      title="Lên"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={idx === sortedChannels.length - 1}
                      onClick={() => moveChannel(idx, 1)}
                      className="cursor-pointer rounded border px-2 py-1 font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                      title="Xuống"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeChannel(ch.id)}
                      className="cursor-pointer rounded border border-red-200 px-2 py-1 font-semibold text-red-600 hover:bg-red-50"
                    >
                      Xoá
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-gray-600">Tên hiển thị *</label>
                    <input
                      value={ch.name}
                      onChange={(e) => updateChannel(ch.id, { name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-[11px] font-bold text-gray-600">Đường dẫn URL (https://...) *</label>
                    <input
                      type="url"
                      value={ch.url}
                      onChange={(e) => updateChannel(ch.id, { url: e.target.value })}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-gray-600">Mô tả / @Handle</label>
                    <input
                      value={ch.handle}
                      onChange={(e) => updateChannel(ch.id, { handle: e.target.value })}
                      placeholder="VD: 4.9★ · Chính hãng"
                      className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-brand"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-gray-600">Nhãn Badge</label>
                      <input
                        value={ch.badge}
                        onChange={(e) => updateChannel(ch.id, { badge: e.target.value })}
                        placeholder="Chính hãng"
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-gray-600">Nút CTA</label>
                      <input
                        value={ch.ctaLabel}
                        onChange={(e) => updateChannel(ch.id, { ctaLabel: e.target.value })}
                        placeholder="Xem kênh"
                        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Shortcode helper + Live Preview */}
      <section className="rounded-2xl border bg-white p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              🧩 Mã nhúng Block bất kỳ đâu &amp; Xem trước (Live Preview)
            </h2>
            <p className="text-xs text-gray-500">
              Dán mã bên dưới vào nội dung Bài viết, Mô tả sản phẩm, Trang tĩnh hoặc Block Thường Dùng (<code>BlockZone</code>).
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "[[social]]",
              "[[social:cards]]",
              "[[social:pills]]",
              "[[social:sidebar]]",
              "[[social:marketplace]]",
              "[[social:social]]",
            ].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => copyShortcode(code)}
                className="cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-[11px] font-bold text-gray-800 hover:border-brand hover:bg-emerald-50"
              >
                {copiedCode === code ? "✓ Đã copy!" : code}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-gray-600">Xem thử kiểu:</span>
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPreviewStyle(s.id)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold ${
                previewStyle === s.id
                  ? "bg-brand text-white"
                  : "border bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s.label.split(" (")[0]}
            </button>
          ))}
          <span className="ml-2 font-bold text-gray-600">Nhóm:</span>
          {(
            [
              ["all", "Tất cả"],
              ["social", "Chỉ Mạng xã hội"],
              ["marketplace", "Chỉ Sàn TMĐT"],
            ] as const
          ).map(([g, label]) => (
            <button
              key={g}
              type="button"
              onClick={() => setPreviewGroup(g)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-bold ${
                previewGroup === g
                  ? "bg-gray-900 text-white"
                  : "border bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 p-4">
          {previewHtml ? (
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          ) : (
            <p className="py-6 text-center text-xs text-gray-500">
              Chưa có kênh nào đang bật &amp; có URL hợp lệ trong nhóm này.
            </p>
          )}
        </div>
      </section>

      {/* QR Code Modal */}
      {qrModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setQrModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-gray-900">📱 QR Code: {qrModal.name}</h3>
            <p className="break-all text-[11px] text-gray-500">{qrModal.url}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrModal.dataUrl} alt={qrModal.name} className="mx-auto h-56 w-56 rounded-xl border p-2" />
            <div className="flex justify-center gap-2 pt-2">
              <a
                href={qrModal.dataUrl}
                download={`qr-${qrModal.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-dark"
              >
                ⬇️ Tải ảnh PNG in ấn
              </a>
              <button
                type="button"
                onClick={() => setQrModal(null)}
                className="cursor-pointer rounded-xl border px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
