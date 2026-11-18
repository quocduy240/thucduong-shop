import Link from "next/link";
import { getPages, getPostCategories, getPostSections, getProductCategories, url } from "@/lib/data";
import { getSite } from "@/lib/settings";
import { getThemeSettings } from "@/lib/theme-settings";
import HeaderAccountCart from "./HeaderAccountCart";
import MobileNavDrawer from "./MobileNavDrawer";
import SearchBox from "./SearchBox";
import ThemeSwitcher from "./ThemeSwitcher";

type MenuItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; featured?: boolean }[];
};

export default async function Header() {
  const [site, sections, postCats, productCats, policyPages, themeConfig] = await Promise.all([
    getSite(),
    getPostSections(),
    getPostCategories(),
    getProductCategories(),
    getPages("chinh-sach"),
    getThemeSettings(),
  ]);

  const menu: MenuItem[] = [
    { label: "Trang chủ", href: "/" },
    { label: "Giới thiệu", href: url.page({ grp: "", slug: "gioi-thieu" }) },
    {
      label: "Sản phẩm",
      href: "/san-pham/",
      children: [
        { label: "🌿 Canh Dưỡng Sinh King Kung", href: "/canh-duong-sinh/", featured: true },
        ...productCats.map((c) => ({ label: c.name, href: url.productCategory(c) })),
      ],
    },
    ...sections.map((s) => ({
      label: s.name,
      href: url.postSection(s.slug),
      children: postCats.filter((c) => c.section_slug === s.slug).map((c) => ({ label: c.name, href: url.postCategory(c) })),
    })),
    ...(policyPages.length
      ? [
          {
            label: "Chính sách",
            href: url.page(policyPages[0]),
            children: policyPages.map((p) => ({ label: p.title, href: url.page(p) })),
          },
        ]
      : []),
    { label: "Tư vấn nhanh AI", href: "/tu-van-nhanh/" },
    { label: "Liên hệ", href: url.page({ grp: "", slug: "lien-he" }) },
  ];

  return (
    <header className="z-40 bg-white shadow-sm md:sticky md:top-0">
      <div className="bg-brand-dark text-xs text-white">
        <div className="mx-auto flex max-w-6xl justify-between px-4 py-1.5">
          <span>Hotline: {site.hotline}</span>
          <span className="hidden sm:inline">{site.email}</span>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2.5 gap-y-2.5 px-3 py-2.5 md:flex-nowrap md:gap-4 md:px-4 md:py-3">
        <div className="flex items-center gap-2 min-w-0">
          <MobileNavDrawer menu={menu} siteName={site.name} hotline={site.hotline} />
          <Link href="/" className="shrink-0">
            <div className="text-lg font-bold text-brand sm:text-xl">{site.name}</div>
            <div className="hidden text-xs text-gray-500 sm:block">{site.tagline}</div>
          </Link>
        </div>

        <div className="order-last w-full md:order-none md:w-auto md:flex-1">
          <SearchBox />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitcher config={themeConfig} />
          <HeaderAccountCart />
        </div>
      </div>

      <nav className="bg-brand text-white">
        {/* Mobile: one scrollable row (dropdowns are desktop-only; add a drawer menu later) */}
        <ul className="mx-auto flex max-w-6xl overflow-x-auto whitespace-nowrap px-2 text-sm font-medium md:flex-wrap md:overflow-visible">
          {menu.map((m) => (
            <li key={m.label} className="group relative">
              <Link href={m.href} className="block px-3 py-2.5 uppercase hover:bg-brand-dark">
                {m.label}
                {m.children && <span className="ml-1 text-[10px]">▼</span>}
              </Link>
              {m.children && (
                <ul className="invisible absolute left-0 top-full z-50 min-w-60 bg-white py-1 text-gray-800 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                  {m.children.map((c) => (
                    <li key={c.href}>
                      <Link
                        href={c.href}
                        className={
                          c.featured
                            ? "flex items-center justify-between gap-2 border-b border-emerald-200 bg-gradient-to-r from-emerald-50 via-green-50 to-amber-50 px-4 py-2.5 font-bold text-brand hover:from-emerald-100 hover:to-amber-100"
                            : "block px-4 py-2 hover:bg-green-50 hover:text-brand"
                        }
                      >
                        <span>{c.label}</span>
                        {c.featured && (
                          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-2xs">
                            Nổi bật
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
