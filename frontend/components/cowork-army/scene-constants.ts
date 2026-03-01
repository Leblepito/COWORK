/** COWORK.ARMY v7.0 — 3D Scene Constants
 *  4 departments × 3 agents + 1 cargo = 13 agents
 */

export interface ZoneDefinition {
  id: string;
  label: string;
  color: string;
  center: [number, number, number];
  size: [number, number];
  agents: string[];
  bounds: [number, number, number, number];
}

// ═══ DEPARTMENT INFO ═══
export const DEPARTMENT_META: Record<string, { icon: string; color: string; scene_type: string }> = {
  trade:    { icon: "📈", color: "#a78bfa", scene_type: "trade_floor" },
  medical:  { icon: "🏥", color: "#22d3ee", scene_type: "hospital_hall" },
  hotel:    { icon: "🏨", color: "#f59e0b", scene_type: "hotel_lobby" },
  software: { icon: "💻", color: "#22c55e", scene_type: "digital_office" },
};

// ═══ OVERVIEW DESK POSITIONS (all departments visible) ═══
export const DESK_POSITIONS: Record<string, [number, number, number]> = {
  // Trade (top-left quadrant)
  "school-game": [-7, 0, -7],
  "indicator":   [-5, 0, -7],
  "algo-bot":    [-3, 0, -7],
  // Medical (bottom-left quadrant)
  "clinic":          [-7, 0, -1],
  "health-tourism":  [-5, 0, -1],
  "manufacturing":   [-3, 0, -1],
  // Hotel (top-right quadrant)
  "hotel":  [3, 0, -7],
  "flight": [5, 0, -7],
  "rental": [7, 0, -7],
  // Software (bottom-right quadrant)
  "fullstack":        [3, 0, -1],
  "app-builder":      [5, 0, -1],
  "prompt-engineer":  [7, 0, -1],
  // Cargo (center)
  "cargo": [0, 0, -4],
};

// ═══ DEPARTMENT-SCENE LOCAL POSITIONS (3 agents per scene) ═══
export const DEPT_DESK_POSITIONS: Record<string, Record<string, [number, number, number]>> = {
  trade: {
    "school-game": [-4, 0, -1],
    "indicator":   [0, 0, -3],
    "algo-bot":    [4, 0, -1],
  },
  medical: {
    "clinic":         [-4, 0, -1],
    "health-tourism": [0, 0, -3],
    "manufacturing":  [4, 0, -1],
  },
  hotel: {
    "hotel":  [-4, 0, -1],
    "flight": [0, 0, -3],
    "rental": [4, 0, -1],
  },
  software: {
    "fullstack":       [-4, 0, -1],
    "app-builder":     [0, 0, -3],
    "prompt-engineer": [4, 0, -1],
  },
};

const _ZONE_DATA = [
  {
    id: "trade",
    label: "TRADE",
    color: "#a78bfa",
    center: [-5, 0, -7] as [number, number, number],
    size: [6, 2] as [number, number],
    agents: ["school-game", "indicator", "algo-bot"],
  },
  {
    id: "medical",
    label: "MEDICAL",
    color: "#22d3ee",
    center: [-5, 0, -1] as [number, number, number],
    size: [6, 2] as [number, number],
    agents: ["clinic", "health-tourism", "manufacturing"],
  },
  {
    id: "hotel",
    label: "HOTEL & TRAVEL",
    color: "#f59e0b",
    center: [5, 0, -7] as [number, number, number],
    size: [6, 2] as [number, number],
    agents: ["hotel", "flight", "rental"],
  },
  {
    id: "software",
    label: "SOFTWARE",
    color: "#22c55e",
    center: [5, 0, -1] as [number, number, number],
    size: [6, 2] as [number, number],
    agents: ["fullstack", "app-builder", "prompt-engineer"],
  },
  {
    id: "cargo",
    label: "CARGO",
    color: "#f472b6",
    center: [0, 0, -4] as [number, number, number],
    size: [3, 3] as [number, number],
    agents: ["cargo"],
  },
];

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
  DIRECTOR: "#f472b6",
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
