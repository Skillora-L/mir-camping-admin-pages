import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-sc";
import "./globals.css";
import "./russian.css";
import "./language-switch.css";
import "./brand-finish.css";
import "./type-motion.css"; // Scoped typography and interaction polish.

import "./readability.css";
import "./product-banners.css";

export const metadata: Metadata = {
  title: "Mir Camping | 专业户外露营装备工厂",
  description:
    "Mir Camping 面向经销商展示帐篷、折叠椅、睡袋、炉具、厨具、野餐包与OEM/ODM定制服务。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
