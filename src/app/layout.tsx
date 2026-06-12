import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const notoSansKr = Noto_Sans_KR({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "주식 노드 그래프 — KR Stock Galaxy",
  description: "한국 주식 자동 수집 및 Obsidian 스타일 노드 그래프 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={cn("dark h-full antialiased font-sans", notoSansKr.variable, geistMono.variable)}
    >
      <body className="h-full overflow-hidden">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
