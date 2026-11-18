import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingConsultWidget from "@/components/FloatingConsultWidget";
import { getSite, getWidgetSettings } from "@/lib/settings";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: { default: `${site.name}. ${site.tagline}`, template: `%s | ${site.name}` },
    description: site.tagline,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const widgetCfg = await getWidgetSettings();
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingConsultWidget config={widgetCfg} />
      </body>
    </html>
  );
}
