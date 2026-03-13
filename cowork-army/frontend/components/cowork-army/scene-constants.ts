/** COWORK.ARMY — 3D Scene Constants (v8 — Silicon Valley Campus) */

export interface ZoneDefinition {
  id: string;
  label: string;
  color: string;
  center: [number, number, number];
  size: [number, number];
  agents: string[];
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
  "trade-master": "trade",
  "chart-eye": "trade",
  "risk-guard": "trade",
  "quant-brain": "trade",
  "clinic-director": "medical",
  "patient-care": "medical",
  "hotel-manager": "hotel",
  "travel-planner": "hotel",
  "concierge": "hotel",
  "tech-lead": "software",
  "full-stack": "software",
  "data-ops": "software",
  "cargo": "cargo",
};

/* ── Campus Layout ──
 *
 *  Campus is ~80x80 units, centered at origin.
 *  4 department buildings arranged around a central plaza.
 *  Each building has individual offices for its agents.
 *
 *         N (-Z)
 *    ┌──────────────────────┐
 *    │  TRADE    │  MEDICAL │
 *    │  [-20,-18]│  [20,-18]│
 *    │───────────┼──────────│
 *    │     CARGO HUB [0,0]  │
 *    │───────────┼──────────│
 *    │  HOTEL    │ SOFTWARE │
 *    │  [-20,18] │  [20,18] │
 *    └──────────────────────┘
 *         S (+Z)
 */

/* ── Building Definitions ── */
export interface BuildingDef {
  label: string;
  icon: string;
  color: string;
  center: [number, number, number];
  /** [width, depth] of the building footprint */
  footprint: [number, number];
  /** Building height (stories) */
  height: number;
  /** Office positions relative to building center */
  offices: { agentId: string; offset: [number, number, number] }[];
}

export const BUILDINGS: Record<string, BuildingDef> = {
  trade: {
    label: "TRADE CENTER",
    icon: "📊",
    color: "#f59e0b",
    center: [-22, 0, -20],
    footprint: [16, 14],
    height: 6,
    offices: [
      { agentId: "trade-master", offset: [-3, 0, -3] },
      { agentId: "chart-eye",    offset: [3, 0, -3] },
      { agentId: "risk-guard",   offset: [-3, 0, 3] },
      { agentId: "quant-brain",  offset: [3, 0, 3] },
    ],
  },
  medical: {
    label: "MEDICAL LAB",
    icon: "🏥",
    color: "#22d3ee",
    center: [22, 0, -20],
    footprint: [14, 12],
    height: 5,
    offices: [
      { agentId: "clinic-director", offset: [-3, 0, 0] },
      { agentId: "patient-care",    offset: [3, 0, 0] },
    ],
  },
  hotel: {
    label: "HOTEL & TRAVEL",
    icon: "🏨",
    color: "#ec4899",
    center: [-22, 0, 20],
    footprint: [16, 14],
    height: 5.5,
    offices: [
      { agentId: "hotel-manager",  offset: [-3, 0, -3] },
      { agentId: "travel-planner", offset: [3, 0, -3] },
      { agentId: "concierge",      offset: [0, 0, 3] },
    ],
  },
  software: {
    label: "SOFTWARE HQ",
    icon: "💻",
    color: "#a855f7",
    center: [22, 0, 20],
    footprint: [16, 14],
    height: 7,
    offices: [
      { agentId: "tech-lead",  offset: [-3, 0, -3] },
      { agentId: "full-stack", offset: [3, 0, -3] },
      { agentId: "data-ops",   offset: [0, 0, 3] },
    ],
  },
};

export const CARGO_BUILDING = {
  label: "CARGO HUB",
  icon: "📦",
  color: "#f59e0b",
  center: [0, 0, 0] as [number, number, number],
  radius: 5,
  height: 4,
};

/* ── Department Definitions (kept for compatibility) ── */
export const DEPARTMENTS: Record<string, { label: string; icon: string; color: string; center: [number, number, number] }> = {
  trade:    { label: "TRADE",    icon: "📊", color: "#f59e0b", center: [-22, 0, -20] },
  medical:  { label: "MEDICAL",  icon: "🏥", color: "#22d3ee", center: [22, 0, -20] },
  hotel:    { label: "HOTEL",    icon: "🏨", color: "#ec4899", center: [-22, 0, 20] },
  software: { label: "SOFTWARE", icon: "💻", color: "#a855f7", center: [22, 0, 20] },
};

/* ── Desk Positions (computed from buildings) ── */
export const DESK_POSITIONS: Record<string, [number, number, number]> = {};
for (const [, bldg] of Object.entries(BUILDINGS)) {
  for (const office of bldg.offices) {
    DESK_POSITIONS[office.agentId] = [
      bldg.center[0] + office.offset[0],
      0,
      bldg.center[2] + office.offset[2],
    ];
  }
}
DESK_POSITIONS["cargo"] = [0, 0, 0];

/* ── Cargo Hub ── */
export const CARGO_HUB: { position: [number, number, number]; radius: number } = {
  position: [0, 0, 0],
  radius: 5,
};

/* ── Cargo Docks — near each building entrance ── */
export const CARGO_DOCKS: Record<string, [number, number, number]> = {
  trade:    [-12, 0, -12],
  medical:  [12, 0, -12],
  hotel:    [-12, 0, 12],
  software: [12, 0, 12],
};

/* ── Zone data ── */
const _ZONE_DATA = [
  {
    id: "trade",
    label: "TRADE CENTER",
    color: "#f59e0b",
    center: [-22, 0, -20] as [number, number, number],
    size: [16, 14] as [number, number],
    agents: ["trade-master", "chart-eye", "risk-guard", "quant-brain"],
  },
  {
    id: "medical",
    label: "MEDICAL LAB",
    color: "#22d3ee",
    center: [22, 0, -20] as [number, number, number],
    size: [14, 12] as [number, number],
    agents: ["clinic-director", "patient-care"],
  },
  {
    id: "hotel",
    label: "HOTEL & TRAVEL",
    color: "#ec4899",
    center: [-22, 0, 20] as [number, number, number],
    size: [16, 14] as [number, number],
    agents: ["hotel-manager", "travel-planner", "concierge"],
  },
  {
    id: "software",
    label: "SOFTWARE HQ",
    color: "#a855f7",
    center: [22, 0, 20] as [number, number, number],
    size: [16, 14] as [number, number],
    agents: ["tech-lead", "full-stack", "data-ops"],
  },
  {
    id: "cargo",
    label: "CARGO HUB",
    color: "#f59e0b",
    center: [0, 0, 0] as [number, number, number],
    size: [10, 10] as [number, number],
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

/* ── Building Colliders (for pathfinding) ── */
export interface BuildingCollider {
  center: [number, number];  // [x, z]
  halfSize: [number, number]; // [halfWidth, halfDepth]
}

export const BUILDING_COLLIDERS: BuildingCollider[] = [
  ...Object.values(BUILDINGS).map(b => ({
    center: [b.center[0], b.center[2]] as [number, number],
    halfSize: [b.footprint[0] / 2 + 1, b.footprint[1] / 2 + 1] as [number, number],
  })),
  // Cargo hub (circular → approximate as square)
  { center: [0, 0], halfSize: [CARGO_BUILDING.radius + 0.5, CARGO_BUILDING.radius + 0.5] },
];

/* ── Agent Life — social spots where agents can meet ── */
export const SOCIAL_SPOTS: { pos: [number, number, number]; label: string }[] = [
  { pos: [-8, 0, -8], label: "bench-nw" },
  { pos: [8, 0, -8], label: "bench-ne" },
  { pos: [-8, 0, 8], label: "bench-sw" },
  { pos: [8, 0, 8], label: "bench-se" },
  { pos: [0, 0, -10], label: "fountain-n" },
  { pos: [0, 0, 10], label: "fountain-s" },
  { pos: [-10, 0, 0], label: "garden-w" },
  { pos: [10, 0, 0], label: "garden-e" },
];

/** Wandering waypoints — agents stroll through campus when idle */
export const WANDER_WAYPOINTS: [number, number, number][] = [
  // Ring road points
  [8, 0, 0], [6, 0, 6], [0, 0, 8], [-6, 0, 6],
  [-8, 0, 0], [-6, 0, -6], [0, 0, -8], [6, 0, -6],
  // Near buildings
  [-14, 0, -13], [14, 0, -13], [-14, 0, 13], [14, 0, 13],
  // Social spots
  [-8, 0, -8], [8, 0, -8], [-8, 0, 8], [8, 0, 8],
];

/* ── Campus Environment ── */

/** Road paths connecting buildings to central plaza */
export const CAMPUS_ROADS: { from: [number, number, number]; to: [number, number, number]; width: number }[] = [
  // Trade → Center
  { from: [-14, 0, -13], to: [-6, 0, -6], width: 2 },
  // Medical → Center
  { from: [14, 0, -13], to: [6, 0, -6], width: 2 },
  // Hotel → Center
  { from: [-14, 0, 13], to: [-6, 0, 6], width: 2 },
  // Software → Center
  { from: [14, 0, 13], to: [6, 0, 6], width: 2 },
];

/** Tree positions around the campus */
export const CAMPUS_TREES: [number, number, number][] = [
  // Along north edge
  [-35, 0, -32], [-25, 0, -32], [-15, 0, -32], [0, 0, -30], [15, 0, -32], [25, 0, -32], [35, 0, -32],
  // Along south edge
  [-35, 0, 32], [-25, 0, 32], [-15, 0, 32], [0, 0, 30], [15, 0, 32], [25, 0, 32], [35, 0, 32],
  // Along east edge
  [35, 0, -20], [35, 0, -10], [35, 0, 0], [35, 0, 10], [35, 0, 20],
  // Along west edge
  [-35, 0, -20], [-35, 0, -10], [-35, 0, 0], [-35, 0, 10], [-35, 0, 20],
  // Between buildings
  [-8, 0, -20], [8, 0, -20], [-8, 0, 20], [8, 0, 20],
  // Near center
  [-10, 0, 0], [10, 0, 0], [0, 0, -10], [0, 0, 10],
];

/** Bench positions */
export const CAMPUS_BENCHES: { pos: [number, number, number]; rot: number }[] = [
  { pos: [-8, 0, -8], rot: Math.PI / 4 },
  { pos: [8, 0, -8], rot: -Math.PI / 4 },
  { pos: [-8, 0, 8], rot: -Math.PI / 4 },
  { pos: [8, 0, 8], rot: Math.PI / 4 },
];

/* ── Dynamic Agent Positioning ── */
const DYN_START_X = -5;
const DYN_START_Z = 34;
const DYN_COLS = 4;
const DYN_SPACING = 3;

export function calculateDynamicDeskPosition(index: number): [number, number, number] {
  const col = index % DYN_COLS;
  const row = Math.floor(index / DYN_COLS);
  return [DYN_START_X + col * DYN_SPACING, 0, DYN_START_Z + row * DYN_SPACING];
}

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

export function getDynamicZone(dynamicIds: string[]): ZoneDefinition | null {
  if (dynamicIds.length === 0) return null;
  const rows = Math.ceil(dynamicIds.length / DYN_COLS);
  const width = DYN_COLS * DYN_SPACING;
  const height = rows * DYN_SPACING;
  const cx = DYN_START_X + (width - DYN_SPACING) / 2;
  const cz = DYN_START_Z + (height - DYN_SPACING) / 2;
  return {
    id: "dynamic",
    label: "STARTUP GARAGE",
    color: "#64748b",
    center: [cx, 0, cz],
    size: [width + 4, height + 4],
    agents: dynamicIds,
    bounds: [cx - width / 2 - 2, cz - height / 2 - 2, cx + width / 2 + 2, cz + height / 2 + 2],
  };
}
