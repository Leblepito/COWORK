"use client";

import { AuthProvider } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
