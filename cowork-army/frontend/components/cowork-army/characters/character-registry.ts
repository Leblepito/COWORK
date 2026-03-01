// Character definitions for all 14 COWORK.ARMY v7 agents

export type BodyShape = "standard" | "tall" | "wide" | "angular" | "dynamic";
export type HeadShape = "sphere" | "box" | "octahedron" | "dodecahedron";

export type AccessoryType =
    | "crown"
    | "magnifying_glass"
    | "medical_cross"
    | "wings"
    | "antenna"
    | "binoculars"
    | "compass"
    | "shield"
    | "flask"
    | "rocket_fins"
    | "laptop"
    | "briefcase"
    | "gamepad"
    | "chart_screen"
    | "terminal"
    | "stethoscope"
    | "globe"
    | "gear"
    | "key_card"
    | "wrench"
    | "monitor_stack"
    | "phone"
    | "brain"
    | "package";

export interface AccessoryDef {
    type: AccessoryType;
    position: [number, number, number];
    scale: number;
}

export interface CharacterDef {
    id: string;
    bodyShape: BodyShape;
    headShape: HeadShape;
    bodyScale: [number, number, number];
    headScale: number;
    accessories: AccessoryDef[];
    legStyle: "standard" | "wide_stance" | "guard_stance";
    emissiveIntensity: number;
}

export const CHARACTER_REGISTRY: Record<string, CharacterDef> = {
    // ═══ CARGO ═══
    cargo: {
        id: "cargo",
        bodyShape: "wide",
        headShape: "box",
        bodyScale: [0.16, 0.35, 0.16],
        headScale: 1.1,
        accessories: [{ type: "package", position: [0, 0.5, 0], scale: 1 }],
        legStyle: "wide_stance",
        emissiveIntensity: 0.3,
    },

    // ═══ TRADE DEPARTMENT ═══
    "trade-master": {
        id: "trade-master",
        bodyShape: "tall",
        headShape: "dodecahedron",
        bodyScale: [0.14, 0.5, 0.14],
        headScale: 1.2,
        accessories: [{ type: "chart_screen", position: [0, 0.55, 0], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.4,
    },
    "chart-eye": {
        id: "chart-eye",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "binoculars", position: [0, 0.38, 0.12], scale: 0.7 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "risk-guard": {
        id: "risk-guard",
        bodyShape: "wide",
        headShape: "sphere",
        bodyScale: [0.16, 0.35, 0.16],
        headScale: 1.0,
        accessories: [{ type: "shield", position: [0, 0.15, 0.18], scale: 1 }],
        legStyle: "guard_stance",
        emissiveIntensity: 0.25,
    },
    "quant-brain": {
        id: "quant-brain",
        bodyShape: "angular",
        headShape: "octahedron",
        bodyScale: [0.2, 0.35, 0.2],
        headScale: 1.0,
        accessories: [{ type: "brain", position: [0, 0.52, 0], scale: 0.9 }],
        legStyle: "standard",
        emissiveIntensity: 0.3,
    },

    // ═══ MEDICAL DEPARTMENT ═══
    "clinic-director": {
        id: "clinic-director",
        bodyShape: "tall",
        headShape: "sphere",
        bodyScale: [0.14, 0.45, 0.14],
        headScale: 1.1,
        accessories: [{ type: "stethoscope", position: [0, 0.2, 0.1], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.25,
    },
    "patient-care": {
        id: "patient-care",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "medical_cross", position: [0, 0.18, 0.08], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },

    // ═══ HOTEL DEPARTMENT ═══
    "hotel-manager": {
        id: "hotel-manager",
        bodyShape: "tall",
        headShape: "sphere",
        bodyScale: [0.14, 0.45, 0.14],
        headScale: 1.1,
        accessories: [{ type: "key_card", position: [0.22, 0.3, 0], scale: 0.9 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "travel-planner": {
        id: "travel-planner",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "globe", position: [0, 0.5, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    concierge: {
        id: "concierge",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "phone", position: [0.2, 0.25, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.15,
    },

    // ═══ SOFTWARE DEPARTMENT ═══
    "tech-lead": {
        id: "tech-lead",
        bodyShape: "tall",
        headShape: "box",
        bodyScale: [0.14, 0.45, 0.14],
        headScale: 1.1,
        accessories: [{ type: "monitor_stack", position: [0, 0.18, 0.14], scale: 0.9 }],
        legStyle: "standard",
        emissiveIntensity: 0.3,
    },
    "full-stack": {
        id: "full-stack",
        bodyShape: "dynamic",
        headShape: "sphere",
        bodyScale: [0.1, 0.4, 0.1],
        headScale: 1.0,
        accessories: [{ type: "terminal", position: [0, 0.12, 0.16], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.25,
    },
    "data-ops": {
        id: "data-ops",
        bodyShape: "standard",
        headShape: "octahedron",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "gear", position: [0.22, 0.3, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
};

// ── Dynamic Character Generation ──────────────────────

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

const BODY_SHAPES: BodyShape[] = ["standard", "tall", "wide", "angular", "dynamic"];
const HEAD_SHAPES: HeadShape[] = ["sphere", "box", "octahedron", "dodecahedron"];
const ACCESSORY_TYPES: AccessoryType[] = [
    "antenna", "compass", "flask", "laptop", "briefcase",
    "binoculars", "rocket_fins", "shield", "gear", "globe",
];
const LEG_STYLES: ("standard" | "wide_stance" | "guard_stance")[] = [
    "standard", "wide_stance", "guard_stance",
];

function generateCharacterDef(agentId: string): CharacterDef {
    const h = simpleHash(agentId);
    const bodyShape = BODY_SHAPES[h % BODY_SHAPES.length];
    const headShape = HEAD_SHAPES[(h >> 4) % HEAD_SHAPES.length];
    const accessoryType = ACCESSORY_TYPES[(h >> 8) % ACCESSORY_TYPES.length];
    const legStyle = LEG_STYLES[(h >> 12) % LEG_STYLES.length];

    return {
        id: agentId,
        bodyShape,
        headShape,
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{
            type: accessoryType,
            position: [0.2, 0.2, 0] as [number, number, number],
            scale: 0.8,
        }],
        legStyle,
        emissiveIntensity: 0.2,
    };
}

/**
 * Get CharacterDef for any agent — base or dynamic.
 */
export function getCharacterDef(agentId: string): CharacterDef {
    return CHARACTER_REGISTRY[agentId] || generateCharacterDef(agentId);
}
