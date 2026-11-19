import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingConsultWidget from "@/components/FloatingConsultWidget";
import FrontendAdminProvider from "@/components/FrontendAdminProvider";
import MiniCartDrawer from "@/components/MiniCartDrawer";
import MobileBottomBar from "@/components/MobileBottomBar";
import { getSite, getWidgetSettings } from "@/lib/settings";
import { getThemeSettings } from "@/lib/theme-settings";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: { default: `${site.name}. ${site.tagline}`, template: `%s | ${site.name}` },
    description: site.tagline,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [widgetCfg, themeCfg] = await Promise.all([
    getWidgetSettings(),
    getThemeSettings(),
  ]);
  const themeBootScript = `(function(){try{var c=${JSON.stringify(themeCfg)};var s=localStorage.getItem('td_theme_id');if(!s){var m=document.cookie.match(/(?:^|;\\s*)td_theme_id=([^;]+)/);s=m?decodeURIComponent(m[1]):'';}var p=c.presets.find(function(x){return x.id===s;})||c.presets.find(function(x){return x.id===c.defaultThemeId;})||c.presets[0];if(p){var r=document.documentElement;r.style.setProperty('--background',p.background);r.style.setProperty('--foreground',p.foreground);r.style.setProperty('--brand',p.brand);r.style.setProperty('--brand-dark',p.brandDark);r.style.setProperty('--accent',p.accent);r.style.fontSize=p.fontSizePx+'px';r.dataset.themeId=p.id;}}catch(e){}})();`;

  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <FrontendAdminProvider>
          <Header />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <Footer />
          <FloatingConsultWidget config={widgetCfg} />
          <MiniCartDrawer />
          <MobileBottomBar />
        </FrontendAdminProvider>
      </body>
    </html>
  );
}
