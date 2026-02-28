"use client";

import { useEffect, useState } from "react";
import { getBookings, getSpaces, cancelBooking, Booking, Space } from "@/lib/api";
import { XCircle } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

const STATUSES = ["", "pending", "confirmed", "checked_in", "completed", "cancelled"];

const STATUS_MAP: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-blue-50 text-blue-700",
  checked_in: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = async () => {
    setLoading(true);
    try {
      const [b, s] = await Promise.all([
        getBookings({ status: status || undefined, limit, offset }),
        getSpaces(),
      ]);
      setBookings(b);
      setSpaces(s);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status, offset]);

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this booking?")) return;
    try {
      await cancelBooking(id);
      toast.success("Booking cancelled");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  const spaceName = (id: number) => spaces.find((s) => s.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">All reservations across spaces</p>
        </div>
        <select
          className="input w-44"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setOffset(0); }}
        >
          <option value="">All statuses</option>
          {STATUSES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg" />)}
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No bookings found.</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Space</th>
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Start</th>
                    <th className="px-6 py-3">End</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/60">
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">#{b.id}</td>
                      <td className="px-6 py-3 text-gray-700">{spaceName(b.space_id)}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs">User #{b.user_id}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{new Date(b.start_time).toLocaleString()}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{new Date(b.end_time).toLocaleString()}</td>
                      <td className="px-6 py-3">
                        <span className={clsx("badge", STATUS_MAP[b.status] || "bg-gray-100 text-gray-600")}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-700">${b.amount_usd.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right">
                        {!["completed", "cancelled"].includes(b.status) && (
                          <button
                            onClick={() => handleCancel(b.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="btn-ghost text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Showing {offset + 1} – {offset + bookings.length}</span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={bookings.length < limit}
                className="btn-ghost text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
