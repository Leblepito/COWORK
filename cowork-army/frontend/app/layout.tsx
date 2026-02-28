import type { Metadata } from "next";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
    title: "COWORK.ARMY — Agent Kontrol Merkezi",
    description: "AntiGravity Ventures Agent Ordusu Kontrol Paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="tr" className="dark">
            <body className="bg-[#0a0a1a] text-white antialiased min-h-screen">
                <ToastProvider>{children}</ToastProvider>
            </body>
        </html>
    );
}
