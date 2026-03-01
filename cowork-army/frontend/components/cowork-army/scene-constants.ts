/** COWORK.ARMY — 3D Scene Constants */

export interface ZoneDefinition {
  id: string;
  label: string;
  color: string;
  center: [number, number, number];
  size: [number, number];
  agents: string[];
  /** Computed bounds: [minX, minZ, maxX, maxZ] */
  bounds: [number, number, number, number];
}

export const DESK_POSITIONS: Record<string, [number, number, number]> = {
  // Yönetim (sol üst)
  commander:      [-8, 0, -6],
  supervisor:     [-6, 0, -6],
  // Medikal & Seyahat (sol alt)
  "med-health":   [-8, 0, -2],
  "travel-agent": [-6, 0, -2],
  // Trading Swarm (orta)
  "trade-engine": [ 0, 0, -4],
  "alpha-scout":  [-2, 0, -2],
  "tech-analyst": [ 2, 0, -2],
  "risk-sentinel":[-2, 0, -6],
  "quant-lab":    [ 2, 0, -6],
  // Operasyon (sağ)
  "growth-ops":   [ 6, 0, -6],
  "web-dev":      [ 8, 0, -6],
  "finance":      [ 6, 0, -4],
};

/** Raw zone data (before bounds computation) */
const _ZONE_DATA = [
  {
    id: "management",
    label: "YÖNETIM",
    color: "#fbbf24",
    center: [-7, 0, -6] as [number, number, number],
    size: [4, 2] as [number, number],
    agents: ["commander", "supervisor"],
  },
  {
    id: "medical",
    label: "MEDİKAL & SEYAHAT",
    color: "#22d3ee",
    center: [-7, 0, -2] as [number, number, number],
    size: [4, 2] as [number, number],
    agents: ["med-health", "travel-agent"],
  },
  {
    id: "trading",
    label: "TRADING SWARM",
    color: "#a78bfa",
    center: [0, 0, -4] as [number, number, number],
    size: [6, 6] as [number, number],
    agents: ["trade-engine", "alpha-scout", "tech-analyst", "risk-sentinel", "quant-lab"],
  },
  {
    id: "operations",
    label: "OPERASYON",
    color: "#22c55e",
    center: [7, 0, -5] as [number, number, number],
    size: [4, 4] as [number, number],
    agents: ["growth-ops", "web-dev", "finance"],
  },
];

/** Zones with computed bounds [minX, minZ, maxX, maxZ] */
export const ZONES: ZoneDefinition[] = _ZONE_DATA.map((z) => ({
  ...z,
  bounds: [
    z.center[0] - z.size[0] / 2,
    z.center[2] - z.size[1] / 2,
    z.center[0] + z.size[0] / 2,
    z.center[2] + z.size[1] / 2,
  ] as [number, number, number, number],
}));

/* ── Pathfinding ── */
export const DESK_COLLISION_RADIUS = 2.5;
export const PATHFINDING_DETOUR_OFFSET = 3.5;

/* ── Movement ── */
export const DEFAULT_POSITION: [number, number, number] = [0, 0, 0];
export const AGENT_WALK_SPEED = 3.0;

/* ── Collaboration ── */
export const TIER_PRIORITY: Record<string, number> = {
  COMMANDER: 5,
  SUPERVISOR: 4,
  DIRECTOR: 3,
  WORKER: 1,
};
export const COLLAB_DURATION_MS = 5000;
export const COLLAB_MAX_SIMULTANEOUS = 4;
export const COLLAB_DETECT_WINDOW_MS = 2000;

export const TIER_COLORS: Record<string, string> = {
  COMMANDER: "#fbbf24",
  SUPERVISOR: "#f43f5e",
  DIRECTOR: "#a78bfa",
  WORKER: "#64748b",
};

export const STATUS_COLORS: Record<string, string> = {
  idle: "#64748b",
  working: "#22c55e",
  searching: "#f59e0b",
  thinking: "#8b5cf6",
  coding: "#3b82f6",
  planning: "#f97316",
  error: "#ef4444",
  done: "#22c55e",
};
