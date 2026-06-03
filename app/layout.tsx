import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GameHub",
  description: "Game forum login and message board system"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
