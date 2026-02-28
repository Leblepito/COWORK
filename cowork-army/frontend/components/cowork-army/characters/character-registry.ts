// Character definitions for all 12 COWORK.ARMY agents

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
    | "briefcase";

export interface AccessoryDef {
    type: AccessoryType;
    position: [number, number, number];
    scale: number;
}

export interface CharacterDef {
    id: string;
    bodyShape: BodyShape;
    headShape: HeadShape;
    bodyScale: [number, number, number]; // radiusTop/Bottom, height, segments mapped per shape
    headScale: number;
    accessories: AccessoryDef[];
    legStyle: "standard" | "wide_stance" | "guard_stance";
    emissiveIntensity: number;
}

export const CHARACTER_REGISTRY: Record<string, CharacterDef> = {
    commander: {
        id: "commander",
        bodyShape: "tall",
        headShape: "sphere",
        bodyScale: [0.14, 0.5, 0.14],
        headScale: 1.1,
        accessories: [{ type: "crown", position: [0, 0.52, 0], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.3,
    },
    supervisor: {
        id: "supervisor",
        bodyShape: "standard",
        headShape: "box",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "magnifying_glass", position: [0.2, 0.25, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.15,
    },
    "med-health": {
        id: "med-health",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "medical_cross", position: [0, 0.18, 0.08], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "travel-agent": {
        id: "travel-agent",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "wings", position: [0, 0.2, -0.1], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "trade-engine": {
        id: "trade-engine",
        bodyShape: "wide",
        headShape: "dodecahedron",
        bodyScale: [0.18, 0.35, 0.18],
        headScale: 1.2,
        accessories: [{ type: "antenna", position: [0, 0.55, 0], scale: 1 }],
        legStyle: "wide_stance",
        emissiveIntensity: 0.4,
    },
    "alpha-scout": {
        id: "alpha-scout",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "binoculars", position: [0, 0.38, 0.12], scale: 0.7 }],
        legStyle: "standard",
        emissiveIntensity: 0.15,
    },
    "tech-analyst": {
        id: "tech-analyst",
        bodyShape: "angular",
        headShape: "octahedron",
        bodyScale: [0.2, 0.35, 0.2],
        headScale: 1.0,
        accessories: [{ type: "compass", position: [0.22, 0.3, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "risk-sentinel": {
        id: "risk-sentinel",
        bodyShape: "wide",
        headShape: "sphere",
        bodyScale: [0.16, 0.35, 0.16],
        headScale: 1.0,
        accessories: [{ type: "shield", position: [0, 0.15, 0.18], scale: 1 }],
        legStyle: "guard_stance",
        emissiveIntensity: 0.25,
    },
    "quant-lab": {
        id: "quant-lab",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "flask", position: [0.2, 0.2, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.15,
    },
    "growth-ops": {
        id: "growth-ops",
        bodyShape: "dynamic",
        headShape: "sphere",
        bodyScale: [0.1, 0.4, 0.1],
        headScale: 1.0,
        accessories: [{ type: "rocket_fins", position: [0, 0.05, -0.1], scale: 0.9 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "web-dev": {
        id: "web-dev",
        bodyShape: "standard",
        headShape: "box",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "laptop", position: [0, 0.12, 0.16], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    finance: {
        id: "finance",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.13, 0.33, 0.13],
        headScale: 1.0,
        accessories: [{ type: "briefcase", position: [0.2, 0.05, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.1,
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
    "binoculars", "rocket_fins", "shield",
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
