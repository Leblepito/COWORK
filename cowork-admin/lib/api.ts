/**
 * COWORK Admin — API client
 * All requests go to cowork-api (FastAPI, port 8080).
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const TOKEN_KEY = "cowork_admin_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts?.headers as Record<string, string> || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

/* ─── Types ─── */

export interface Space {
  id: number;
  name: string;
  space_type: string;
  capacity: number;
  hourly_rate_usd: number | null;
  floor: string | null;
  amenities: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: number;
  user_id: number;
  space_id: number;
  start_time: string;
  end_time: string;
  status: string;
  amount_usd: number;
  notes: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  created_at: string;
}

export interface Member {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface OccupancyStat {
  date: string;
  avg_occupancy: number;
}

export interface RevenueStat {
  month: string;
  total_usd: number;
}

export interface MemberStat {
  month: string;
  new_members: number;
  total_members: number;
}

/* ─── Spaces ─── */

export const getSpaces = (active?: boolean) => {
  const qs = active !== undefined ? `?active_only=${active}` : "";
  return apiFetch<Space[]>(`/api/spaces${qs}`);
};

export const getSpace = (id: number) => apiFetch<Space>(`/api/spaces/${id}`);

export const createSpace = (body: Partial<Space>) =>
  apiFetch<Space>("/api/spaces", { method: "POST", body: JSON.stringify(body) });

export const updateSpace = (id: number, body: Partial<Space>) =>
  apiFetch<Space>(`/api/spaces/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteSpace = (id: number) =>
  apiFetch<{ detail: string }>(`/api/spaces/${id}`, { method: "DELETE" });

/* ─── Bookings ─── */

export const getBookings = (params?: { status?: string; limit?: number; offset?: number }) => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return apiFetch<Booking[]>(`/api/bookings${q ? `?${q}` : ""}`);
};

export const cancelBooking = (id: number) =>
  apiFetch<Booking>(`/api/bookings/${id}/cancel`, { method: "POST" });

/* ─── Analytics ─── */

export const getOccupancy = (days = 30) =>
  apiFetch<OccupancyStat[]>(`/api/analytics/occupancy?days=${days}`);

export const getRevenue = (months = 6) =>
  apiFetch<RevenueStat[]>(`/api/analytics/revenue?months=${months}`);

export const getMemberStats = (months = 6) =>
  apiFetch<MemberStat[]>(`/api/analytics/members?months=${months}`);

/* ─── Members (via auth endpoint or admin list) ─── */

export const getMembers = () => apiFetch<Member[]>("/auth/me").then(() => []).catch(() => []);
