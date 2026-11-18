"use client";

import { useEffect, useRef, useState } from "react";

export type MindmapBranchItem = {
  title: string;
  icon: string;
  items: string[];
};

export type MindmapData = {
  centerTitle: string;
  centerSubtitle: string;
  branches: MindmapBranchItem[];
};

type MindmapStyleMode = "simple_white" | "pro_infographic" | "custom";
type MindmapAspect = "16:9" | "1:1" | "9:16" | "auto_full";

type Palette = {
  bgStart: string;
  bgEnd: string;
  dotColor: string;
  centerBgStart: string;
  centerBgEnd: string;
  centerText: string;
  centerSub: string;
  cardBg: string;
  textMain: string;
  textMuted: string;
  watermarkBg: string;
  watermarkText: string;
  branchAccents: { border: string; badgeBg: string; title: string; softBg: string }[];
};

function resolvePalette(styleMode: MindmapStyleMode, customPrompt: string): Palette {
  const p = customPrompt.toLowerCase();

  if (styleMode === "simple_white") {
    return {
      bgStart: "#ffffff",
      bgEnd: "#ffffff",
      dotColor: "#e5e7eb",
      centerBgStart: "#14532d",
      centerBgEnd: "#2f7d32",
      centerText: "#ffffff",
      centerSub: "#dcfce7",
      cardBg: "#ffffff",
      textMain: "#1f2937",
      textMuted: "#4b5563",
      watermarkBg: "rgba(20, 83, 45, 0.08)",
      watermarkText: "#14532d",
      branchAccents: [
        { border: "#16a34a", badgeBg: "#dcfce7", title: "#14532d", softBg: "#f0fdf4" },
        { border: "#d97706", badgeBg: "#fef3c7", title: "#92400e", softBg: "#fffbeb" },
        { border: "#2563eb", badgeBg: "#dbeafe", title: "#1e3a8a", softBg: "#eff6ff" },
        { border: "#0d9488", badgeBg: "#ccfbf1", title: "#115e59", softBg: "#f0fdfa" },
        { border: "#dc2626", badgeBg: "#fee2e2", title: "#991b1b", softBg: "#fef2f2" },
        { border: "#7c3aed", badgeBg: "#ede9fe", title: "#4c1d95", softBg: "#f5f3ff" },
      ],
    };
  }

  if (styleMode === "pro_infographic") {
    return {
      bgStart: "#f0fdf4",
      bgEnd: "#fefce8",
      dotColor: "#cbd5e1",
      centerBgStart: "#064e3b",
      centerBgEnd: "#15803d",
      centerText: "#ffffff",
      centerSub: "#fef08a",
      cardBg: "#ffffff",
      textMain: "#0f172a",
      textMuted: "#334155",
      watermarkBg: "rgba(6, 78, 59, 0.88)",
      watermarkText: "#ffffff",
      branchAccents: [
        { border: "#059669", badgeBg: "#059669", title: "#065f46", softBg: "#ecfdf5" },
        { border: "#d97706", badgeBg: "#d97706", title: "#92400e", softBg: "#fffbeb" },
        { border: "#2563eb", badgeBg: "#2563eb", title: "#1e40af", softBg: "#eff6ff" },
        { border: "#e11d48", badgeBg: "#e11d48", title: "#9f1239", softBg: "#fff1f2" },
        { border: "#7c3aed", badgeBg: "#7c3aed", title: "#5b21b6", softBg: "#f5f3ff" },
        { border: "#0891b2", badgeBg: "#0891b2", title: "#155e75", softBg: "#ecfeff" },
      ],
    };
  }

  // Custom prompt style parsing (dark / vintage warm / ocean / botanical)
  if (p.includes("tối") || p.includes("dark") || p.includes("navy") || p.includes("đêm")) {
    return {
      bgStart: "#0f172a",
      bgEnd: "#1e293b",
      dotColor: "#334155",
      centerBgStart: "#f59e0b",
      centerBgEnd: "#d97706",
      centerText: "#0f172a",
      centerSub: "#1e293b",
      cardBg: "#1e293b",
      textMain: "#f8fafc",
      textMuted: "#cbd5e1",
      watermarkBg: "rgba(245, 158, 11, 0.2)",
      watermarkText: "#fbbf24",
      branchAccents: [
        { border: "#34d399", badgeBg: "#065f46", title: "#6ee7b7", softBg: "#0f172a" },
        { border: "#fbbf24", badgeBg: "#78350f", title: "#fde68a", softBg: "#0f172a" },
        { border: "#60a5fa", badgeBg: "#1e3a8a", title: "#93c5fd", softBg: "#0f172a" },
        { border: "#f472b6", badgeBg: "#831843", title: "#fbcfe8", softBg: "#0f172a" },
      ],
    };
  }

  if (p.includes("cổ điển") || p.includes("giấy") || p.includes("kem") || p.includes("nâu") || p.includes("vintage")) {
    return {
      bgStart: "#fdfbf7",
      bgEnd: "#f5efe6",
      dotColor: "#d6d3d1",
      centerBgStart: "#78350f",
      centerBgEnd: "#92400e",
      centerText: "#fef3c7",
      centerSub: "#fde68a",
      cardBg: "#fffdf9",
      textMain: "#292524",
      textMuted: "#57534e",
      watermarkBg: "rgba(120, 53, 15, 0.12)",
      watermarkText: "#78350f",
      branchAccents: [
        { border: "#92400e", badgeBg: "#fef3c7", title: "#78350f", softBg: "#fffbeb" },
        { border: "#3f6212", badgeBg: "#ecfccb", title: "#365314", softBg: "#f7fee7" },
        { border: "#9a3412", badgeBg: "#ffedd5", title: "#7c2d12", softBg: "#fff7ed" },
        { border: "#115e59", badgeBg: "#ccfbf1", title: "#134e4a", softBg: "#f0fdfa" },
      ],
    };
  }

  return {
    bgStart: "#f0fdf4",
    bgEnd: "#ecfeff",
    dotColor: "#cbd5e1",
    centerBgStart: "#15803d",
    centerBgEnd: "#0d9488",
    centerText: "#ffffff",
    centerSub: "#ccfbf1",
    cardBg: "#ffffff",
    textMain: "#1e293b",
    textMuted: "#475569",
    watermarkBg: "rgba(21, 128, 61, 0.14)",
    watermarkText: "#14532d",
    branchAccents: [
      { border: "#0d9488", badgeBg: "#ccfbf1", title: "#115e59", softBg: "#f0fdfa" },
      { border: "#16a34a", badgeBg: "#dcfce7", title: "#14532d", softBg: "#f0fdf4" },
      { border: "#0284c7", badgeBg: "#e0f2fe", title: "#075985", softBg: "#f0f9ff" },
      { border: "#d97706", badgeBg: "#fef3c7", title: "#92400e", softBg: "#fffbeb" },
    ],
  };
}

function wrapCanvasLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = (text || "").trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export default function MindmapStudio({
  onInsertHtml,
  onSavedBlock,
  defaultTopic = "",
}: {
  onInsertHtml?: (html: string, summaryMsg: string) => void;
  onSavedBlock?: (block: { id: number; slug: string; title: string; shortcode: string }) => void;
  defaultTopic?: string;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // Step 1 state: Deep Research
  const [topic, setTopic] = useState(
    defaultTopic || "Phác đồ Thực Dưỡng Hiện Đại hỗ trợ cân bằng đường huyết & tiêu hóa",
  );
  const [extraContext, setExtraContext] = useState("");
  const [reportText, setReportText] = useState("");

  // Step 2 state: Summarized Mindmap Nodes
  const [mindmapData, setMindmapData] = useState<MindmapData>({
    centerTitle: "Phác Đồ Thực Dưỡng Hiện Đại",
    centerSubtitle: "Cân bằng Âm Dương · Chữa lành tự nhiên từ gốc",
    branches: [
      {
        title: "1. Nguyên lý Quân bình Âm Dương",
        icon: "🔬",
        items: [
          "Duy trì độ pH máu kiềm nhẹ (7.35 – 7.45) giúp tế bào khỏe mạnh",
          "Kích hoạt cơ chế Tự thực tế bào (Autophagy) đào thải độc tố",
        ],
      },
      {
        title: "2. Thực phẩm Toàn phần Chủ đạo",
        icon: "🌾",
        items: [
          "Gạo lứt nguyên cám giàu chất xơ, vitamin nhóm B và GABA",
          "Đậu đỏ Azuki, hạt kê, hạt sen và rau củ hữu cơ theo mùa",
        ],
      },
      {
        title: "3. Kỹ thuật Chế biến & Nhai kỹ",
        icon: "🥣",
        items: [
          "Nhai kỹ 50 – 100 lần mỗi miếng để tiết enzyme Amylase kiềm hóa",
          "Nấu chín cùng muối biển hầm, tương Tamari, Miso lâu năm",
        ],
      },
      {
        title: "4. Trợ phương & Lối sống Tâm An",
        icon: "🧘",
        items: [
          "Trà Bình Minh buổi sáng, Canh dưỡng sinh & Trà Bancha 3 năm",
          "Tập khí công, phơi nắng sớm, ngủ trước 22h30 và giữ tâm an lạc",
        ],
      },
    ],
  });

  // Step 3 state: Photographic Style, Aspect Ratio, Watermark & Block Save
  const [styleMode, setStyleMode] = useState<MindmapStyleMode>("simple_white"); // Default: Đơn giản nền trắng
  const [customStyleDesc, setCustomStyleDesc] = useState("");
  const [aspectRatio, setAspectRatio] = useState<MindmapAspect>("16:9");
  const [watermarkText, setWatermarkText] = useState(
    "🌿 Thực Dưỡng Phúc Thọ · Hotline: 0767.518.592 - 0858.816.070",
  );
  const [blockTitle, setBlockTitle] = useState("");
  const [blockPosition, setBlockPosition] = useState("manual");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Execute Step 1: Deep Research
  async function runStep1DeepResearch(autoChainAll = false) {
    if (!topic.trim()) {
      setErr("Vui lòng nhập chủ đề cần nghiên cứu chuyên sâu (Deep Research).");
      return;
    }
    setBusy(true);
    setErr("");
    setStatusMsg("🔬 Bước 1/3: Đang thực hiện Deep Research chuyên sâu với AI Gemini...");
    try {
      const res = await fetch("/api/admin/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deep_research",
          topic: topic.trim(),
          contextText: extraContext.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Lỗi khi thực hiện Deep Research.");
      setReportText(data.report);
      setBlockTitle(`🧠 Sơ đồ tư duy: ${topic.trim().slice(0, 55)}`);
      setStatusMsg(
        `✓ Hoàn thành Bước 1: Đã tạo báo cáo chuyên sâu Deep Research (${data.report.length.toLocaleString()} ký tự)!`,
      );

      if (autoChainAll) {
        await runStep2SummarizeNodes(data.report, true);
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      if (!autoChainAll) setBusy(false);
    }
  }

  // Execute Step 2: Summarize Report into Mindmap Nodes
  async function runStep2SummarizeNodes(overrideReport?: string, goStep3 = false) {
    const rpt = (overrideReport ?? reportText).trim();
    if (!rpt) {
      setErr("Vui lòng thực hiện Bước 1 (Deep Research) hoặc nhập nội dung báo cáo trước.");
      setBusy(false);
      return;
    }
    setBusy(true);
    setErr("");
    setStatusMsg("📋 Bước 2/3: Đang phân tích báo cáo & tóm tắt các ý chính cho Sơ đồ tư duy...");
    try {
      const res = await fetch("/api/admin/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summarize_nodes",
          topic: topic.trim(),
          reportText: rpt,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.structure) {
        throw new Error(data.error ?? "Không thể tóm tắt các ý chính.");
      }
      setMindmapData(data.structure);
      setBlockTitle(`🧠 Mindmap: ${data.structure.centerTitle}`);
      if (goStep3) {
        setStep(3);
        setStatusMsg(
          "🎨 Hoàn tất cả 3 bước! Sơ đồ tư duy Photographic đã được vẽ kèm Watermark góc dưới bên trái.",
        );
      } else {
        setStep(2);
        setStatusMsg(
          `✓ Hoàn thành Bước 2: Đã tóm tắt ${data.structure.branches.length} nhánh ý chính từ báo cáo Deep Research!`,
        );
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Render Photographic Mindmap onto HTML5 Canvas whenever Step 3 settings or data change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = resolvePalette(styleMode, customStyleDesc);
    const branches = mindmapData.branches.length > 0 ? mindmapData.branches : [];

    // Compute canvas dimensions based on aspectRatio
    let width = 1600;
    let height = 950;
    const isSingleCol = aspectRatio === "9:16";

    if (aspectRatio === "1:1") {
      width = 1360;
      height = 1360;
    } else if (aspectRatio === "9:16") {
      width = 1080;
      height = 1920;
    } else if (aspectRatio === "16:9") {
      width = 1600;
      height = 960;
    }

    // Measure branch card heights so "auto_full" (and any overflow) expands cleanly to fit 100% of points
    ctx.font = "500 18px system-ui, -apple-system, sans-serif";
    const cols = isSingleCol ? 1 : 2;
    const padX = isSingleCol ? 56 : 64;
    const gapX = isSingleCol ? 0 : 90;
    const cardW = Math.floor((width - padX * 2 - gapX * (cols - 1)) / cols);

    const cardMetrics = branches.map((b) => {
      let totalLines = 0;
      const wrappedItems = b.items.map((it) => {
        const lines = wrapCanvasLines(ctx, `• ${it}`, cardW - 44);
        totalLines += lines.length;
        return lines;
      });
      const cardH = 68 + totalLines * 26 + b.items.length * 8 + 18;
      return { wrappedItems, cardH };
    });

    const headerZoneH = 230;
    const footerZoneH = 95;
    let requiredBodyH = 0;
    if (cols === 1) {
      requiredBodyH = cardMetrics.reduce((sum, m) => sum + m.cardH + 24, 0);
    } else {
      const rowCount = Math.ceil(cardMetrics.length / 2);
      for (let r = 0; r < rowCount; r++) {
        const leftH = cardMetrics[r * 2]?.cardH ?? 0;
        const rightH = cardMetrics[r * 2 + 1]?.cardH ?? 0;
        requiredBodyH += Math.max(leftH, rightH) + 32;
      }
    }

    if (aspectRatio === "auto_full") {
      width = 1440;
      height = Math.max(820, headerZoneH + requiredBodyH + footerZoneH);
    } else {
      // Ensure even fixed aspect ratios never clip content if there are many points
      height = Math.max(height, headerZoneH + requiredBodyH + footerZoneH);
    }

    canvas.width = width;
    canvas.height = height;

    // 1. Background Fill & Photographic Lighting
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, palette.bgStart);
    bgGrad.addColorStop(1, palette.bgEnd);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle photographic dot grid
    ctx.fillStyle = palette.dotColor;
    for (let gx = 32; gx < width; gx += 36) {
      for (let gy = 32; gy < height; gy += 36) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (styleMode === "pro_infographic") {
      const glow = ctx.createRadialGradient(width / 2, 130, 30, width / 2, 130, 520);
      glow.addColorStop(0, "rgba(16, 185, 129, 0.14)");
      glow.addColorStop(1, "rgba(16, 185, 129, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Central Hub Node (Top Center)
    const centerW = Math.min(width - 120, 760);
    const centerH = 128;
    const centerX = (width - centerW) / 2;
    const centerY = 48;

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.16)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    const centerGrad = ctx.createLinearGradient(centerX, centerY, centerX + centerW, centerY + centerH);
    centerGrad.addColorStop(0, palette.centerBgStart);
    centerGrad.addColorStop(1, palette.centerBgEnd);
    drawRoundedRect(ctx, centerX, centerY, centerW, centerH, 26);
    ctx.fillStyle = centerGrad;
    ctx.fill();
    ctx.restore();

    // Central Hub text
    ctx.fillStyle = palette.centerSub;
    ctx.font = "700 14px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🧠 SƠ ĐỒ TƯ DUY TỔNG HỢP TỪ BÁO CÁO DEEP RESEARCH", width / 2, centerY + 34);

    ctx.fillStyle = palette.centerText;
    ctx.font = "800 28px system-ui, -apple-system, sans-serif";
    const titleShort =
      mindmapData.centerTitle.length > 54
        ? mindmapData.centerTitle.slice(0, 52) + "..."
        : mindmapData.centerTitle;
    ctx.fillText(titleShort, width / 2, centerY + 74);

    ctx.fillStyle = palette.centerSub;
    ctx.font = "500 16px system-ui, -apple-system, sans-serif";
    const subShort =
      mindmapData.centerSubtitle.length > 80
        ? mindmapData.centerSubtitle.slice(0, 77) + "..."
        : mindmapData.centerSubtitle;
    ctx.fillText(subShort, width / 2, centerY + 105);

    // 3. Position & Draw Branches + Photographic Bezier Connectors
    let cursorY = headerZoneH;
    const totalRows = Math.ceil(branches.length / cols);

    for (let r = 0; r < totalRows; r++) {
      let rowMaxH = 0;
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= branches.length) continue;
        const b = branches[idx];
        const m = cardMetrics[idx];
        const accent = palette.branchAccents[idx % palette.branchAccents.length];

        const cardX = cols === 1 ? padX : c === 0 ? padX : width - padX - cardW;
        const cardY = cursorY;
        rowMaxH = Math.max(rowMaxH, m.cardH);

        // Draw Bezier curve from Central Hub spine to Branch Card
        const spineX = width / 2;
        const startY = centerY + centerH;
        const targetX = cols === 1 ? cardX + cardW / 2 : c === 0 ? cardX + cardW : cardX;
        const targetY = cardY + 36;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(spineX, startY);
        ctx.bezierCurveTo(
          spineX,
          startY + (targetY - startY) * 0.55,
          (spineX + targetX) / 2,
          targetY,
          targetX,
          targetY,
        );
        ctx.strokeStyle = accent.border;
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Connection node dot
        ctx.beginPath();
        ctx.arc(targetX, targetY, 6, 0, Math.PI * 2);
        ctx.fillStyle = accent.border;
        ctx.fill();
        ctx.restore();

        // Draw Branch Card with shadow
        ctx.save();
        ctx.shadowColor = "rgba(15, 23, 42, 0.08)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 5;
        drawRoundedRect(ctx, cardX, cardY, cardW, m.cardH, 20);
        ctx.fillStyle = styleMode === "simple_white" ? "#ffffff" : accent.softBg;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = accent.border;
        ctx.stroke();
        ctx.restore();

        // Branch Header Pill & Title
        ctx.textAlign = "left";
        ctx.fillStyle = accent.border;
        drawRoundedRect(ctx, cardX + 20, cardY + 18, 36, 36, 10);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "700 18px system-ui, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(b.icon || `${idx + 1}`, cardX + 38, cardY + 42);

        ctx.textAlign = "left";
        ctx.fillStyle = accent.title;
        ctx.font = "800 20px system-ui, -apple-system, sans-serif";
        const bTitle = b.title.length > 48 ? b.title.slice(0, 45) + "..." : b.title;
        ctx.fillText(bTitle, cardX + 68, cardY + 43);

        // Divider line inside branch card
        ctx.strokeStyle = accent.border;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 20, cardY + 64);
        ctx.lineTo(cardX + cardW - 20, cardY + 64);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // Branch bullet items
        ctx.fillStyle = palette.textMain;
        ctx.font = "500 17px system-ui, -apple-system, sans-serif";
        let itemY = cardY + 92;
        for (const lines of m.wrappedItems) {
          for (const ln of lines) {
            ctx.fillText(ln, cardX + 22, itemY);
            itemY += 25;
          }
          itemY += 7;
        }
      }
      cursorY += rowMaxH + 30;
    }

    // 4. Bottom-Left Watermark Badge (Required: Góc dưới bên trái ảnh Mindmap)
    if (watermarkText.trim()) {
      ctx.save();
      ctx.font = "700 15px system-ui, -apple-system, sans-serif";
      const wmText = watermarkText.trim();
      const wmWidth = Math.min(width - 80, ctx.measureText(wmText).width + 36);
      const wmX = 36;
      const wmY = height - 62;

      drawRoundedRect(ctx, wmX, wmY, wmWidth, 38, 19);
      ctx.fillStyle = palette.watermarkBg;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#16a34a";
      ctx.stroke();

      ctx.fillStyle = palette.watermarkText;
      ctx.textAlign = "left";
      ctx.fillText(wmText, wmX + 18, wmY + 24);
      ctx.restore();
    }
  }, [mindmapData, styleMode, customStyleDesc, aspectRatio, watermarkText, step]);

  // Build clean HTML5 / SVG-style interactive snippet for direct insertion
  function buildHtml5MindmapSnippet(): string {
    const palette = resolvePalette(styleMode, customStyleDesc);
    const colsGrid =
      aspectRatio === "9:16"
        ? "grid-template-columns:1fr;max-width:560px;"
        : "grid-template-columns:repeat(auto-fit,minmax(290px,1fr));";

    const branchesHtml = mindmapData.branches
      .map((b, idx) => {
        const ac = palette.branchAccents[idx % palette.branchAccents.length];
        const liHtml = b.items
          .map((it) => `<li style="margin-bottom:6px;line-height:1.5;">${it}</li>`)
          .join("");
        return `
      <div style="background:${styleMode === "simple_white" ? "#ffffff" : ac.softBg};border:2px solid ${ac.border};border-radius:16px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.04);">
        <div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid ${ac.border}40;padding-bottom:8px;margin-bottom:10px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:${ac.border};color:#ffffff;font-size:15px;font-weight:700;">${b.icon || idx + 1}</span>
          <strong style="font-size:15px;color:${ac.title};">${b.title}</strong>
        </div>
        <ul style="margin:0;padding-left:18px;font-size:13.5px;color:${palette.textMain};">
          ${liHtml}
        </ul>
      </div>`;
      })
      .join("");

    return `
<div data-mindmap-block="html5" style="position:relative;border:2px solid #86efac;background:linear-gradient(135deg,${palette.bgStart},${palette.bgEnd});border-radius:20px;padding:24px 20px 58px;margin:24px 0;box-shadow:0 6px 20px rgba(15,23,42,0.06);">
  <div style="text-align:center;margin-bottom:20px;">
    <div style="display:inline-block;background:linear-gradient(135deg,${palette.centerBgStart},${palette.centerBgEnd});color:${palette.centerText};padding:14px 26px;border-radius:18px;box-shadow:0 6px 16px rgba(20,83,45,0.18);max-width:680px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${palette.centerSub};">🧠 Sơ Đồ Tư Duy Thực Dưỡng</div>
      <div style="font-size:20px;font-weight:800;margin-top:4px;">${mindmapData.centerTitle}</div>
      <div style="font-size:13px;opacity:0.9;margin-top:3px;color:${palette.centerSub};">${mindmapData.centerSubtitle}</div>
    </div>
  </div>
  <div style="display:grid;${colsGrid}gap:16px;margin:0 auto;">
    ${branchesHtml}
  </div>
  ${
    watermarkText.trim()
      ? `<div style="position:absolute;bottom:14px;left:18px;background:${palette.watermarkBg};color:${palette.watermarkText};border:1px solid #16a34a;padding:4px 14px;border-radius:999px;font-size:11.5px;font-weight:700;">${watermarkText.trim()}</div>`
      : ""
  }
</div>`;
  }

  // Upload compressed photographic WebP/JPEG image from Canvas and insert or return HTML
  async function exportCanvasCompressedImage(insertImmediately: boolean): Promise<string | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    setBusy(true);
    setErr("");
    setStatusMsg("🖼️ Đang nén ảnh Photographic Mindmap (WebP chất lượng cao) & tải lên máy chủ...");
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/webp", 0.9),
      );
      if (!blob) throw new Error("Không thể kết xuất ảnh từ Canvas.");
      const file = new File([blob], `mindmap-${Date.now()}.webp`, { type: "image/webp" });
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload ảnh Mindmap thất bại.");

      const imgHtml = `<figure class="my-6" style="text-align:center;margin:24px 0;"><img src="${data.url}" alt="Sơ đồ tư duy: ${mindmapData.centerTitle}" style="width:100%;max-width:100%;border-radius:16px;border:1px solid #d1fae5;box-shadow:0 6px 18px rgba(0,0,0,0.06);" /><figcaption style="font-size:13px;color:#4b5563;margin-top:8px;">🧠 Sơ đồ tư duy: ${mindmapData.centerTitle}</figcaption></figure>`;

      if (insertImmediately && onInsertHtml) {
        onInsertHtml(
          imgHtml,
          `✓ Đã chèn Sơ đồ tư duy dạng Ảnh nén (${data.url}) kèm Watermark góc dưới bên trái vào bài viết!`,
        );
      }
      setStatusMsg(`✓ Đã tạo & nén ảnh Sơ đồ tư duy thành công: ${data.url}`);
      return imgHtml;
    } catch (e) {
      setErr((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function downloadMindmapImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/webp", 0.92);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindmap-thucduong-${Date.now()}.webp`;
    a.click();
    setStatusMsg("📥 Đã tải file ảnh nén Mindmap (.webp) về máy tính!");
  }

  // Save Mindmap as a Reusable Content Block (`content_blocks`)
  async function saveAsReusableBlock(format: "html5" | "compressed_img", alsoInsert = false) {
    setBusy(true);
    setErr("");
    try {
      let contentHtml = "";
      if (format === "compressed_img") {
        const imgSnippet = await exportCanvasCompressedImage(false);
        if (!imgSnippet) return;
        contentHtml = imgSnippet;
      } else {
        contentHtml = buildHtml5MindmapSnippet();
      }

      const res = await fetch("/api/admin/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_block",
          blockTitle: blockTitle.trim() || `🧠 Mindmap: ${mindmapData.centerTitle}`,
          blockPositions: blockPosition,
          blockContentHtml: contentHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Không thể lưu thành Block thường dùng.");

      if (onSavedBlock) {
        onSavedBlock({
          id: data.blockId,
          slug: data.slug,
          title: data.title,
          shortcode: data.shortcode,
        });
      }
      if (alsoInsert && onInsertHtml) {
        onInsertHtml(
          `<div data-reusable-block="${data.slug}" style="border:2px dashed #2f7d32;background:#f0fdf4;border-radius:12px;padding:12px;margin:14px 0;font-size:13px;color:#14532d;">🧠 <strong>Block Mindmap Đồng Bộ:</strong> ${data.title} <code>${data.shortcode}</code></div><p></p>`,
          `✓ Đã lưu thành Block thường dùng ${data.shortcode} và chèn vào bài viết!`,
        );
      } else {
        setStatusMsg(
          `🧩 Đã lưu Sơ đồ tư duy thành Block thường dùng mới! Mã nhúng đồng bộ: ${data.shortcode}`,
        );
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-white shadow-sm overflow-hidden">
      {/* Header & 3-Step Indicator */}
      <div className="bg-gradient-to-r from-[#14532d] via-[#1f5a22] to-[#15803d] px-5 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-yellow-300 px-3 py-0.5 text-[11px] font-extrabold uppercase text-green-950">
              🧠 AI Mindmap Block Studio · Quy trình 3 Bước
            </div>
            <h3 className="mt-1 text-base md:text-lg font-extrabold">
              Tạo Sơ Đồ Tư Duy (Mindmap) Chuyên Sâu Từ Gemini Deep Research
            </h3>
          </div>

          {/* Step Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { n: 1 as const, label: "Bước 1: Deep Research" },
              { n: 2 as const, label: "Bước 2: Tóm tắt Ý chính" },
              { n: 3 as const, label: "Bước 3: Vẽ Mindmap & Xuất Block" },
            ].map((s) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setStep(s.n)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  step === s.n
                    ? "bg-white text-[#14532d] shadow"
                    : "bg-white/15 text-green-100 hover:bg-white/25"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status / Error Bar */}
      {(statusMsg || err) && (
        <div
          className={`px-5 py-2.5 text-xs font-bold border-b ${
            err ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-900 border-emerald-200"
          }`}
        >
          {err || statusMsg}
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* ================= STEP 1: DEEP RESEARCH ================= */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    🔬 Bước 1: Thực hiện Deep Research cho chủ đề bằng AI Gemini
                  </h4>
                  <p className="text-xs text-gray-600">
                    Nhập chủ đề sức khỏe / thực dưỡng. AI Gemini sẽ phân tích đa chiều tạo báo cáo chuyên sâu làm nền tảng dữ liệu cho sơ đồ tư duy.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runStep1DeepResearch(true)}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-red-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:opacity-95 disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "⏳ Đang xử lý..." : "⚡ Chạy Tự Động Trọn Gói Cả 3 Bước (1 → 2 → 3)"}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Nhập chủ đề (VD: Phác đồ thực dưỡng cho người tiểu đường, Cách nấu canh dưỡng sinh...)"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium outline-none focus:border-brand"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runStep1DeepResearch(false)}
                  className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "⏳ Đang nghiên cứu..." : "🔬 Thực hiện Deep Research (Bước 1)"}
                </button>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Tư liệu hoặc yêu cầu trọng tâm bổ sung cho Deep Research (Tuỳ chọn):
                </label>
                <input
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  placeholder="VD: Tập trung vào thực đơn 7 ngày, cách dùng bột sắn dây và mơ muối lâu năm..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800">
                  📄 Kết quả Báo cáo Chuyên sâu (Deep Research Report — có thể chỉnh sửa thêm nếu muốn):
                </label>
                <button
                  type="button"
                  disabled={busy || !reportText.trim()}
                  onClick={() => runStep2SummarizeNodes()}
                  className="rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-800 disabled:opacity-40 cursor-pointer"
                >
                  ➡️ Tiếp tục sang Bước 2: Tóm tắt các Ý chính
                </button>
              </div>
              <textarea
                rows={10}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Bấm nút 'Thực hiện Deep Research' ở trên để AI Gemini tạo báo cáo chuyên sâu, hoặc dán sẵn báo cáo của bạn vào đây..."
                className="w-full rounded-xl border border-gray-300 bg-gray-50/50 p-3 font-mono text-xs leading-relaxed outline-none focus:border-brand focus:bg-white"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: SUMMARIZE KEY POINTS ================= */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
              <div>
                <h4 className="text-sm font-bold text-blue-950">
                  📋 Bước 2: Tóm tắt &amp; Tinh chỉnh các Ý chính chuẩn bị vẽ Sơ đồ tư duy
                </h4>
                <p className="text-xs text-blue-800">
                  Kiểm tra hoặc điều chỉnh nhanh Chủ đề trung tâm và các Nhánh ý chính đã được trích xuất từ báo cáo Deep Research.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMindmapData((prev) => ({
                      ...prev,
                      branches: [
                        ...prev.branches,
                        {
                          title: `${prev.branches.length + 1}. Nhánh thực hành mới`,
                          icon: "🌿",
                          items: ["Ý chính thực dưỡng bổ sung"],
                        },
                      ],
                    }))
                  }
                  className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-50 cursor-pointer"
                >
                  + Thêm Nhánh
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow hover:bg-brand-dark cursor-pointer"
                >
                  🎨 Sang Bước 3: Vẽ Sơ Đồ Tư Duy Photographic →
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Chủ đề trung tâm (Center Node):</label>
                <input
                  value={mindmapData.centerTitle}
                  onChange={(e) => setMindmapData((p) => ({ ...p, centerTitle: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm font-bold text-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Mô tả phụ dưới Chủ đề trung tâm:</label>
                <input
                  value={mindmapData.centerSubtitle}
                  onChange={(e) => setMindmapData((p) => ({ ...p, centerSubtitle: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {mindmapData.branches.map((branch, bIdx) => (
                <div key={bIdx} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={branch.icon}
                      onChange={(e) => {
                        const next = [...mindmapData.branches];
                        next[bIdx] = { ...branch, icon: e.target.value };
                        setMindmapData((p) => ({ ...p, branches: next }));
                      }}
                      className="w-11 rounded border bg-white px-2 py-1 text-center text-sm"
                      title="Icon nhánh"
                    />
                    <input
                      value={branch.title}
                      onChange={(e) => {
                        const next = [...mindmapData.branches];
                        next[bIdx] = { ...branch, title: e.target.value };
                        setMindmapData((p) => ({ ...p, branches: next }));
                      }}
                      className="flex-1 rounded border bg-white px-2.5 py-1 text-xs font-bold text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = mindmapData.branches.filter((_, i) => i !== bIdx);
                        setMindmapData((p) => ({ ...p, branches: next }));
                      }}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      title="Xoá nhánh"
                    >
                      ✕
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={branch.items.join("\n")}
                    onChange={(e) => {
                      const items = e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      const next = [...mindmapData.branches];
                      next[bIdx] = { ...branch, items };
                      setMindmapData((p) => ({ ...p, branches: next }));
                    }}
                    placeholder="Mỗi dòng là 1 ý chính trong nhánh này..."
                    className="w-full rounded border bg-white p-2 text-xs leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= STEP 3: PHOTOGRAPHIC MINDMAP RENDER & EXPORT ================= */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Configuration Controls: Style + Aspect Ratio + Watermark */}
            <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 lg:grid-cols-3">
              {/* 1. 3 Tuỳ chọn Phong cách Photographic (Mặc định: Đơn giản nền trắng) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-gray-800">
                  1. Phong cách Photographic (Mặc định: Đơn giản nền trắng):
                </label>
                <div className="space-y-1.5">
                  {[
                    {
                      id: "simple_white" as const,
                      label: "⚪ Đơn giản nền trắng (Mặc định)",
                      desc: "Sạch sẽ, rõ nét, chuẩn sách y khoa",
                    },
                    {
                      id: "pro_infographic" as const,
                      label: "✨ Chuyên sâu chuyên nghiệp",
                      desc: "Đổ bóng studio, ánh sáng chuyển sắc",
                    },
                    {
                      id: "custom" as const,
                      label: "🎨 Custom tuỳ chỉnh qua mô tả ngắn",
                      desc: "Phối màu theo mô tả riêng của bạn",
                    },
                  ].map((st) => (
                    <label
                      key={st.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                        styleMode === st.id
                          ? "border-brand bg-white font-bold text-brand shadow-xs"
                          : "border-gray-200 bg-white/70 text-gray-700 hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mm_style"
                        checked={styleMode === st.id}
                        onChange={() => setStyleMode(st.id)}
                        className="accent-brand"
                      />
                      <div>
                        <div>{st.label}</div>
                        <div className="text-[10px] font-normal text-gray-500">{st.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {styleMode === "custom" && (
                  <input
                    value={customStyleDesc}
                    onChange={(e) => setCustomStyleDesc(e.target.value)}
                    placeholder="Mô tả ngắn (VD: Nền giấy cổ điển màu kem ấm, hoặc nền tối navy chữ vàng...)"
                    className="mt-1.5 w-full rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                )}
              </div>

              {/* 2. 4 Tuỳ chọn Kích thước & Triển khai chiều dài */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-gray-800">
                  2. Kích thước &amp; Bố cục ảnh Mindmap:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "16:9" as const, label: "🖥️ Ngang 16:9", sub: "Chuẩn bài viết Web" },
                    { id: "1:1" as const, label: "⬛ Vuông 1:1", sub: "Chuẩn Facebook/Zalo" },
                    { id: "9:16" as const, label: "📱 Dọc 9:16", sub: "Chuẩn Điện thoại" },
                    {
                      id: "auto_full" as const,
                      label: "📜 Dài hết ý chính",
                      sub: "Tự giãn chiều dài",
                    },
                  ].map((ar) => (
                    <button
                      key={ar.id}
                      type="button"
                      onClick={() => setAspectRatio(ar.id)}
                      className={`rounded-lg border p-2 text-left text-xs transition cursor-pointer ${
                        aspectRatio === ar.id
                          ? "border-brand bg-brand text-white font-bold shadow-xs"
                          : "border-gray-200 bg-white text-gray-700 hover:border-brand"
                      }`}
                    >
                      <div>{ar.label}</div>
                      <div className={`text-[10px] ${aspectRatio === ar.id ? "text-green-100" : "text-gray-400"}`}>
                        {ar.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Watermark góc dưới bên trái & Cấu hình Lưu Block */}
              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-xs font-extrabold text-gray-800">
                    3. Watermark (Đóng dấu góc dưới bên trái ảnh):
                  </label>
                  <input
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Nội dung Watermark góc dưới bên trái..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-extrabold text-gray-800">
                    Tên Block khi lưu vào &ldquo;Block thường dùng&rdquo;:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      value={blockTitle}
                      onChange={(e) => setBlockTitle(e.target.value)}
                      placeholder="VD: 🧠 Mindmap Thực Dưỡng Tiểu Đường"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <select
                      value={blockPosition}
                      onChange={(e) => setBlockPosition(e.target.value)}
                      className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs"
                      title="Vị trí Block-Position"
                    >
                      <option value="manual">Chèn thủ công [[block:...]]</option>
                      <option value="post_top">Đầu bài viết</option>
                      <option value="post_middle">Giữa bài viết</option>
                      <option value="post_bottom">Cuối bài viết</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Insert as Compressed Image, Insert as HTML5/Canvas, or Save as Reusable Block */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {onInsertHtml && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void exportCanvasCompressedImage(true)}
                      className="rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-brand-dark disabled:opacity-50 cursor-pointer"
                    >
                      🖼️ Chèn vào bài dạng Ảnh Nén (.webp)
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        const snippet = buildHtml5MindmapSnippet();
                        onInsertHtml(
                          snippet,
                          "✓ Đã chèn Sơ đồ tư duy dạng Khung HTML5 tương tác kèm Watermark góc dưới bên trái!",
                        );
                      }}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-emerald-800 cursor-pointer"
                    >
                      📐 Chèn vào bài dạng Khung HTML5 / Canvas
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveAsReusableBlock("compressed_img", Boolean(onInsertHtml))}
                  className="rounded-xl border-2 border-brand bg-white px-3.5 py-2 text-xs font-extrabold text-brand hover:bg-green-50 cursor-pointer"
                >
                  🧩 Lưu thành Block Thường Dùng (Ảnh nén)
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveAsReusableBlock("html5", Boolean(onInsertHtml))}
                  className="rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 cursor-pointer"
                >
                  🧩 Lưu thành Block Thường Dùng (HTML5)
                </button>
              </div>

              <button
                type="button"
                onClick={downloadMindmapImage}
                className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                📥 Tải ảnh nén (.webp) về máy
              </button>
            </div>

            {/* Live Photographic Canvas Preview */}
            <div className="rounded-xl border bg-stone-100 p-3 text-center overflow-auto">
              <div className="mb-2 flex items-center justify-between text-[11px] text-gray-500 px-1">
                <span>
                  👁️ Xem trước Sơ đồ tư duy Photographic (Tỷ lệ: <strong>{aspectRatio}</strong> · Phong cách:{" "}
                  <strong>
                    {styleMode === "simple_white"
                      ? "Đơn giản nền trắng"
                      : styleMode === "pro_infographic"
                        ? "Chuyên sâu chuyên nghiệp"
                        : "Custom tuỳ chỉnh"}
                  </strong>
                  )
                </span>
                <span>Watermark góc dưới bên trái đã kích hoạt ✓</span>
              </div>
              <canvas
                ref={canvasRef}
                className="mx-auto max-w-full h-auto rounded-xl border border-gray-300 bg-white shadow-md"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
