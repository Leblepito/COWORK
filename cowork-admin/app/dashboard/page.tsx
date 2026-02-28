"use client";

import { useEffect, useState } from "react";
import { getSpaces, getBookings, Space, Booking } from "@/lib/api";
import { Building2, CalendarDays, DollarSign, Users } from "lucide-react";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, b] = await Promise.all([
          getSpaces().catch(() => []),
          getBookings({ limit: 200 }).catch(() => []),
        ]);
        setSpaces(s);
        setBookings(b);
      } catch (e) {
        toast.error("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeSpaces = spaces.filter((s) => s.is_active).length;
  const todayBookings = bookings.filter(
    (b) => b.status !== "cancelled" && new Date(b.start_time).toDateString() === new Date().toDateString()
  ).length;
  const totalRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((s, b) => s + (b.amount_usd || 0), 0);
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed").length;

  if (loading)
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-7 w-40 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-24" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Coworking space overview</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Active Spaces" value={activeSpaces} color="indigo" />
        <StatCard icon={CalendarDays} label="Today's Bookings" value={todayBookings} color="emerald" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} color="amber" />
        <StatCard icon={Users} label="Confirmed" value={confirmedBookings} color="blue" />
      </div>

      {/* Recent bookings */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Bookings</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Space</th>
                  <th className="px-6 py-3">Start</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.slice(0, 10).map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">#{b.id}</td>
                    <td className="px-6 py-3 text-gray-700">
                      {spaces.find((s) => s.id === b.space_id)?.name || `Space #${b.space_id}`}
                    </td>
                    <td className="px-6 py-3 text-gray-600 text-xs">
                      {new Date(b.start_time).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-6 py-3 text-right text-gray-700">${b.amount_usd.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

const COLORS: Record<string, { bg: string; icon: string }> = {
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600" },
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  const c = COLORS[color] || COLORS.indigo;
  return (
    <div className="stat-card flex-row items-center gap-4">
      <div className={`${c.bg} p-2.5 rounded-xl`}>
        <Icon size={20} className={c.icon} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

const STATUS_MAP: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  checked_in: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_MAP[status] || "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
