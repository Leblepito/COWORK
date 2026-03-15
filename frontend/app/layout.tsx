import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "COWORK.ARMY — Command Center",
  description: "AI Agent Army Control Center v7 — 4 Departments, 13 Agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-[#060710] text-[#e2e8f0] antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
