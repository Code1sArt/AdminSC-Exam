import type { Metadata } from "next";
import { headers } from "next/headers";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:5173";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: "SC Exam — ผู้ดูแลระบบ",
    description: "ระบบบริหารจัดการแพลตฟอร์มวัดผลการเรียนรู้ด้วย AI",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "SC Exam — AI Assessment Platform",
      description: "วัดผลอย่างเข้าใจผู้เรียนด้วยระบบข้อสอบและการวิเคราะห์ด้วย AI",
      images: [{ url: `${origin}/og.png`, width: 1733, height: 909, alt: "SC Exam AI Assessment Platform" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "SC Exam — AI Assessment Platform",
      description: "วัดผลอย่างเข้าใจผู้เรียนด้วยระบบข้อสอบและการวิเคราะห์ด้วย AI",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
