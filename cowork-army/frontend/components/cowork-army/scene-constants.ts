/** COWORK.ARMY — 3D Scene Constants (v7 — 4 departments + cargo hub) */

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

/* ── Department Colors ── */
export const DEPT_COLORS: Record<string, string> = {
  trade: "#f59e0b",
  medical: "#22d3ee",
  hotel: "#ec4899",
  software: "#a855f7",
  cargo: "#f59e0b",
};

/* ── Agent → Department mapping ── */
export const AGENT_DEPARTMENT: Record<string, string> = {
  // Trade
  "trade-master": "trade",
  "chart-eye": "trade",
  "risk-guard": "trade",
  "quant-brain": "trade",
  // Medical
  "clinic-director": "medical",
  "patient-care": "medical",
  // Hotel
  "hotel-manager": "hotel",
  "travel-planner": "hotel",
  "concierge": "hotel",
  // Software
  "tech-lead": "software",
  "full-stack": "software",
  "data-ops": "software",
  // Cargo
  "cargo": "cargo",
};

/* ── Department Definitions ── */
export const DEPARTMENTS: Record<string, { label: string; icon: string; color: string; center: [number, number, number] }> = {
  trade:    { label: "TRADE",    icon: "📊", color: "#f59e0b", center: [-12, 0, -8] },
  medical:  { label: "MEDICAL",  icon: "🏥", color: "#22d3ee", center: [12, 0, -8] },
  hotel:    { label: "HOTEL",    icon: "🏨", color: "#ec4899", center: [-12, 0, 8] },
  software: { label: "SOFTWARE", icon: "💻", color: "#a855f7", center: [12, 0, 8] },
};

/* ── Desk Positions (14 base agents) ── */
export const DESK_POSITIONS: Record<string, [number, number, number]> = {
  // Trade department (top-left quadrant)
  "trade-master": [-14, 0, -10],
  "chart-eye":    [-10, 0, -10],
  "risk-guard":   [-14, 0, -6],
  "quant-brain":  [-10, 0, -6],
  // Medical department (top-right quadrant)
  "clinic-director": [10, 0, -10],
  "patient-care":    [14, 0, -10],
  // Hotel department (bottom-left quadrant)
  "hotel-manager":  [-14, 0, 6],
  "travel-planner": [-10, 0, 6],
  "concierge":      [-12, 0, 10],
  // Software department (bottom-right quadrant)
  "tech-lead":  [10, 0, 6],
  "full-stack": [14, 0, 6],
  "data-ops":   [12, 0, 10],
  // Cargo hub (center)
  "cargo": [0, 0, 0],
};

/* ── Cargo Hub ── */
export const CARGO_HUB: { position: [number, number, number]; radius: number } = {
  position: [0, 0, 0],
  radius: 3,
};

/* ── Cargo Docks — 4 directional targets for deliveries ── */
export const CARGO_DOCKS: Record<string, [number, number, number]> = {
  trade:    [-6, 0, -4],
  medical:  [6, 0, -4],
  hotel:    [-6, 0, 4],
  software: [6, 0, 4],
};

/* ── Zone data (for zone borders) ── */
const _ZONE_DATA = [
  {
    id: "trade",
    label: "TRADE DEPARTMENT",
    color: "#f59e0b",
    center: [-12, 0, -8] as [number, number, number],
    size: [8, 8] as [number, number],
    agents: ["trade-master", "chart-eye", "risk-guard", "quant-brain"],
  },
  {
    id: "medical",
    label: "MEDICAL DEPARTMENT",
    color: "#22d3ee",
    center: [12, 0, -8] as [number, number, number],
    size: [8, 4] as [number, number],
    agents: ["clinic-director", "patient-care"],
  },
  {
    id: "hotel",
    label: "HOTEL DEPARTMENT",
    color: "#ec4899",
    center: [-12, 0, 8] as [number, number, number],
    size: [8, 8] as [number, number],
    agents: ["hotel-manager", "travel-planner", "concierge"],
  },
  {
    id: "software",
    label: "SOFTWARE DEPARTMENT",
    color: "#a855f7",
    center: [12, 0, 8] as [number, number, number],
    size: [8, 8] as [number, number],
    agents: ["tech-lead", "full-stack", "data-ops"],
  },
  {
    id: "cargo",
    label: "CARGO HUB",
    color: "#f59e0b",
    center: [0, 0, 0] as [number, number, number],
    size: [6, 6] as [number, number],
    agents: ["cargo"],
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
export const CARGO_WALK_SPEED = 4.5;

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
  delivering: "#f59e0b",
};

/* ── Dynamic Agent Positioning ── */

const DYN_START_X = -2;
const DYN_START_Z = 16;
const DYN_COLS = 3;
const DYN_SPACING = 2.5;

/** Calculate desk position for a dynamic agent by its index. */
export function calculateDynamicDeskPosition(index: number): [number, number, number] {
  const col = index % DYN_COLS;
  const row = Math.floor(index / DYN_COLS);
  return [DYN_START_X + col * DYN_SPACING, 0, DYN_START_Z + row * DYN_SPACING];
}

/** Build a complete desk position map: base agents use DESK_POSITIONS, others get dynamic positions. */
export function buildAllDeskPositions(agentIds: string[]): Record<string, [number, number, number]> {
  const result: Record<string, [number, number, number]> = {};
  let dynIndex = 0;
  for (const id of agentIds) {
    if (DESK_POSITIONS[id]) {
      result[id] = DESK_POSITIONS[id];
    } else {
      result[id] = calculateDynamicDeskPosition(dynIndex);
      dynIndex++;
    }
  }
  return result;
}

/** Get a zone definition for dynamic agents. Returns null if no dynamic agents. */
export function getDynamicZone(dynamicIds: string[]): ZoneDefinition | null {
  if (dynamicIds.length === 0) return null;
  const rows = Math.ceil(dynamicIds.length / DYN_COLS);
  const width = DYN_COLS * DYN_SPACING;
  const height = rows * DYN_SPACING;
  const cx = DYN_START_X + (width - DYN_SPACING) / 2;
  const cz = DYN_START_Z + (height - DYN_SPACING) / 2;
  return {
    id: "dynamic",
    label: "DYNAMIC AGENTS",
    color: "#64748b",
    center: [cx, 0, cz],
    size: [width, height],
    agents: dynamicIds,
    bounds: [cx - width / 2, cz - height / 2, cx + width / 2, cz + height / 2],
  };
}
