// Desk positions for all 12 agents (v4.3 consolidated)
export const DESK_POSITIONS: Record<string, [number, number, number]> = {
    // Management (top-left)
    "commander":     [-8, 0, -6],
    "supervisor":    [-6, 0, -6],
    // Medical & Travel (bottom-left)
    "med-health":    [-8, 0, -2],
    "travel-agent":  [-6, 0, -2],
    // Trading Swarm (center)
    "trade-engine":  [0, 0, -4],   // Orchestrator — center
    "alpha-scout":   [-2, 0, -2],
    "tech-analyst":  [2, 0, -2],
    "risk-sentinel": [-2, 0, -6],
    "quant-lab":     [2, 0, -6],
    // Operations (right)
    "growth-ops":    [6, 0, -6],
    "web-dev":       [8, 0, -6],
    "finance":       [6, 0, -4],
};

// Zone definitions
export interface ZoneDefinition {
    id: string;
    label: string;
    color: string;
    agents: string[];
    bounds: [number, number, number, number]; // [minX, minZ, maxX, maxZ]
}

export const ZONES: ZoneDefinition[] = [
    {
        id: "management",
        label: "MANAGEMENT",
        color: "#fbbf24",
        agents: ["commander", "supervisor"],
        bounds: [-9.5, -7.5, -5, -5],
    },
    {
        id: "medical",
        label: "MEDICAL & TRAVEL",
        color: "#06b6d4",
        agents: ["med-health", "travel-agent"],
        bounds: [-9.5, -3.5, -5, -0.5],
    },
    {
        id: "trading",
        label: "TRADING SWARM",
        color: "#8b5cf6",
        agents: ["trade-engine", "alpha-scout", "tech-analyst", "risk-sentinel", "quant-lab"],
        bounds: [-3.5, -7.5, 3.5, -0.5],
    },
    {
        id: "operations",
        label: "OPERATIONS",
        color: "#22c55e",
        agents: ["growth-ops", "web-dev", "finance"],
        bounds: [4.5, -7.5, 9.5, -3],
    },
];

// Tier badge colors
export const TIER_COLORS: Record<string, string> = {
    COMMANDER:  "#fbbf24",
    SUPERVISOR: "#f43f5e",
    DIRECTOR:   "#8b5cf6",
    WORKER:     "#9ca3af",
};

// Status LED colors
export const STATUS_COLORS: Record<string, string> = {
    idle:      "#6b7280",
    working:   "#22c55e",
    searching: "#22c55e",
    thinking:  "#3b82f6",
    coding:    "#a855f7",
    planning:  "#f59e0b",
    error:     "#ef4444",
    done:      "#ffffff",
};

// Default fallback position for unknown agents
export const DEFAULT_POSITION: [number, number, number] = [0, 0, 2];

/**
 * Calculate desk position for a dynamic agent not in DESK_POSITIONS.
 * Places agents in a "Dynamic Zone" area below operations.
 */
export function calculateDynamicDeskPosition(
    dynamicIndex: number,
): [number, number, number] {
    const COLUMNS = 3;
    const COL_SPACING = 2.5;
    const ROW_SPACING = 2.5;
    const START_X = -2;
    const START_Z = 2;

    const col = dynamicIndex % COLUMNS;
    const row = Math.floor(dynamicIndex / COLUMNS);

    return [
        START_X + col * COL_SPACING,
        0,
        START_Z + row * ROW_SPACING,
    ];
}

/**
 * Build a complete positions map including dynamic agents.
 */
export function buildAllDeskPositions(
    agentIds: string[],
): Record<string, [number, number, number]> {
    const positions: Record<string, [number, number, number]> = { ...DESK_POSITIONS };
    let dynamicIndex = 0;
    for (const id of agentIds) {
        if (!DESK_POSITIONS[id]) {
            positions[id] = calculateDynamicDeskPosition(dynamicIndex);
            dynamicIndex++;
        }
    }
    return positions;
}

/**
 * Get dynamic zone definition if there are dynamic agents.
 */
export function getDynamicZone(dynamicAgentIds: string[]): ZoneDefinition | null {
    if (dynamicAgentIds.length === 0) return null;
    const rows = Math.ceil(dynamicAgentIds.length / 3);
    return {
        id: "dynamic",
        label: "DYNAMIC AGENTS",
        color: "#f97316",
        agents: dynamicAgentIds,
        bounds: [-3.5, 1, 3.5 + Math.max(0, (rows - 1)) * 2.5, 1 + rows * 2.5 + 1],
    };
}

// Movement constants
export const AGENT_WALK_SPEED = 2.0;
export const DESK_COLLISION_RADIUS = 0.8;
export const PATHFINDING_DETOUR_OFFSET = 1.5;

// Collaboration constants
export const COLLAB_DURATION_MS = 15_000;
export const COLLAB_MAX_SIMULTANEOUS = 4;
export const COLLAB_DETECT_WINDOW_MS = 5_000;

// Tier priority — lower tier walks to higher tier
export const TIER_PRIORITY: Record<string, number> = {
    WORKER: 0,
    DIRECTOR: 1,
    SUPERVISOR: 2,
    COMMANDER: 3,
};
