import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GlobalOverlay } from "@/components/layout/GlobalOverlay";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "任意门 · AI 旅行规划",
  description: "告诉 AI 你想去哪、怎么玩，一键生成专属旅行计划",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} h-full antialiased`}>
      <head>
        {/* Leaflet CSS — 海外地图瓦片必需 */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AntdRegistry>
          <div id="main-content" className="flex flex-col flex-1">
            {children}
          </div>
          <GlobalOverlay />
        </AntdRegistry>
        <SpeedInsights />
      </body>
    </html>
  );
}
