import FrontendEditButton from "@/components/FrontendEditButton";
import QuickConsultClient from "@/components/QuickConsultClient";
import { getExpertProfileConfig } from "@/lib/quick-consult";
import { getSite, getWidgetSettings } from "@/lib/settings";

export const metadata = {
  title: "Tư Vấn Nhanh Thực Dưỡng AI | Thực Dưỡng Phúc Thọ",
  description:
    "Khai báo nhu cầu và tình trạng sức khoẻ để nhận bài tư vấn chuyên gia thực dưỡng AI, bộ sản phẩm, video và tài liệu phù hợp.",
};

export default async function QuickConsultPage() {
  const [site, widget, expertCfg] = await Promise.all([
    getSite(),
    getWidgetSettings(),
    getExpertProfileConfig(),
  ]);
  const hotline = [widget.widget_hotline, widget.widget_hotline_2].filter(Boolean).join(" - ") || site.hotline || "0767.518.592 - 0858.816.070";
  const zaloUrl = widget.widget_zalo || "";

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:py-7 space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-brand to-emerald-700 p-5 text-white shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
            🌿 Trợ Lý Chuyên Gia Thực Dưỡng AI · 3 Bước Nhanh
          </span>
          <FrontendEditButton
            resource="quick_consult"
            href="/admin/quick-consult/"
            label="Quản lý Tư vấn AI"
            variant="pill"
          />
        </div>
        <h1 className="mt-2 text-xl font-bold md:text-2xl">
          Tư Vấn Nhanh Thực Dưỡng Cá Nhân Hoá
        </h1>
        <p className="mt-1.5 max-w-3xl text-xs md:text-sm text-emerald-50">
          Hoàn thành 3 bước ngắn để nhận bài tư vấn chuyên sâu từ Hội đồng AI Thực dưỡng kèm video, tài liệu và bộ sản phẩm phù hợp nhất.
        </p>
      </div>

      <QuickConsultClient
        hotline={hotline}
        zaloUrl={zaloUrl}
        disclaimerConfig={{
          disclaimerStyle: expertCfg.disclaimerStyle,
          disclaimerPosition: expertCfg.disclaimerPosition,
          disclaimerCustomText: expertCfg.disclaimerCustomText,
        }}
      />
    </div>
  );
}
