"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/spaces", label: "Spaces", icon: Building2 },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/members", label: "Members", icon: Users },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isLogin = pathname.startsWith("/auth/");

  useEffect(() => {
    if (!loading && !user && !isLogin) router.replace("/auth/login");
  }, [loading, user, isLogin, router]);

  if (isLogin) return <>{children}</>;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-100 flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-50">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">CW</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">COWORK</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Admin</p>
          </div>
          <button className="lg:hidden ml-auto text-gray-400" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={clsx("sidebar-link", active && "active")}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 space-y-1">
          <button onClick={logout} className="sidebar-link w-full text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-6">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-500">
            <Menu size={20} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-gray-700">{user.full_name || user.email}</p>
            <span className={clsx(
              "badge",
              user.role === "super_admin" ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600"
            )}>
              {user.role}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
