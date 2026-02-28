"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import clsx from "clsx";
import { UserPlus } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cowork_admin_token");
}

async function fetchMembers(): Promise<User[]> {
  const token = getToken();
  // The signup endpoint creates members; we'll use a generic list if available
  // For now, fetch from /auth/me just to test connectivity and show current admin
  // Once a /admin/users endpoint exists, replace.
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch");
  const user = await res.json();
  return [user]; // placeholder — returns current user only
}

export default function MembersPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setMembers(await fetchMembers());
      } catch {
        toast.error("Failed to load members");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">Coworking space members</p>
        </div>
        <button className="btn-primary flex items-center gap-2 opacity-50 cursor-not-allowed" disabled>
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No members found.</p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-3 font-medium text-gray-800">{m.full_name || "—"}</td>
                    <td className="px-6 py-3 text-gray-600">{m.email}</td>
                    <td className="px-6 py-3">
                      <span className={clsx(
                        "badge",
                        m.role === "super_admin" ? "bg-red-50 text-red-600" :
                        m.role === "admin" ? "bg-indigo-50 text-indigo-600" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={clsx("badge", m.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500")}>
                        {m.is_active ? "active" : "inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500">
            Member management will be expanded once the admin user listing endpoint is available in cowork-api.
            Currently displaying the authenticated admin user.
          </p>
        </div>
      </div>
    </div>
  );
}
