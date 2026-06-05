import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "爆款研究所 | Viral Research Lab",
  description: "面向自媒体创作者的 AI 工具平台"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
