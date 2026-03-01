import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COWORK.ARMY — Command Center",
  description: "AI Agent Army Control Center v5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-[#060710] text-[#e2e8f0] antialiased">{children}</body>
    </html>
  );
}
