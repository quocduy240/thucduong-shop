import CanhDuongSinhLanding from "@/components/CanhDuongSinhLanding";
import { getProducts, url } from "@/lib/data";
import { getSite, getWidgetSettings } from "@/lib/settings";

export const metadata = {
  title: "Canh Dưỡng Sinh King Kung Chính Hãng | Thực Dưỡng Phúc Thọ",
  description:
    "Canh Dưỡng Sinh King Kung Đài Loan dạng bột hòa tan 60 gói và túi lọc 90 gói — nguyên liệu rau củ hữu cơ giúp kiềm hoá, giải độc gan, hỗ trợ dạ dày, Gout và tăng đề kháng.",
};

export default async function CanhDuongSinhPage() {
  const [products, site, widget] = await Promise.all([
    getProducts(200),
    getSite(),
    getWidgetSettings(),
  ]);

  const instant =
    products.find((p) => p.slug === "chiet-xuat-rau-cu-hon-hop-vegetable-drink-canh-duong-sinh-hoa-tan-h-60-goi") ??
    products.find((p) => p.slug === "canh-duong-sinh-dang-bot-hoa-tan") ??
    products.find((p) => p.name.toLowerCase().includes("canh dưỡng sinh") && p.name.toLowerCase().includes("hòa tan")) ??
    null;

  const teaBag =
    products.find((p) => p.slug === "tra-rau-cu-tui-loc-canh-duong-sinh-tui-loc") ??
    products.find((p) => p.slug === "canh-duong-sinh-dang-tui-loc-90-goi-x-15g-genuine-vegetable-drink") ??
    products.find((p) => p.name.toLowerCase().includes("canh dưỡng sinh") && p.name.toLowerCase().includes("túi lọc")) ??
    null;

  return (
    <CanhDuongSinhLanding
      instantProd={
        instant
          ? {
              id: instant.id,
              name: instant.name,
              price: instant.price,
              sale_price: instant.sale_price,
              image: instant.image,
              href: url.product(instant),
            }
          : null
      }
      teaBagProd={
        teaBag
          ? {
              id: teaBag.id,
              name: teaBag.name,
              price: teaBag.price,
              sale_price: teaBag.sale_price,
              image: teaBag.image,
              href: url.product(teaBag),
            }
          : null
      }
      hotline={widget.widget_hotline || site.hotline || "0909 000 000"}
      zaloUrl={widget.widget_zalo || ""}
    />
  );
}
