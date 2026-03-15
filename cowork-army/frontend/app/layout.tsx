import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "COWORK.ARMY — Command Center",
  description: "AI Agent Army Control Center v5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-[#060710] text-[#e2e8f0] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
