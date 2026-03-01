/** COWORK.ARMY v7.0 — Character Registry
 *  13 agents: 4 departments × 3 + 1 cargo
 */

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
    bodyScale: [number, number, number];
    headScale: number;
    accessories: AccessoryDef[];
    legStyle: "standard" | "wide_stance" | "guard_stance";
    emissiveIntensity: number;
}

export const CHARACTER_REGISTRY: Record<string, CharacterDef> = {
    // ═══ TRADE DEPARTMENT ═══
    "school-game": {
        id: "school-game",
        bodyShape: "dynamic",
        headShape: "sphere",
        bodyScale: [0.12, 0.4, 0.12],
        headScale: 1.0,
        accessories: [{ type: "compass", position: [0.22, 0.3, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.25,
    },
    indicator: {
        id: "indicator",
        bodyShape: "angular",
        headShape: "octahedron",
        bodyScale: [0.15, 0.35, 0.15],
        headScale: 1.0,
        accessories: [{ type: "antenna", position: [0, 0.55, 0], scale: 0.9 }],
        legStyle: "standard",
        emissiveIntensity: 0.3,
    },
    "algo-bot": {
        id: "algo-bot",
        bodyShape: "wide",
        headShape: "dodecahedron",
        bodyScale: [0.16, 0.35, 0.16],
        headScale: 1.1,
        accessories: [{ type: "flask", position: [0.2, 0.2, 0], scale: 0.8 }],
        legStyle: "wide_stance",
        emissiveIntensity: 0.35,
    },

    // ═══ MEDICAL DEPARTMENT ═══
    clinic: {
        id: "clinic",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.13, 0.35, 0.13],
        headScale: 1.0,
        accessories: [{ type: "medical_cross", position: [0, 0.18, 0.08], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "health-tourism": {
        id: "health-tourism",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.12, 0.38, 0.12],
        headScale: 1.0,
        accessories: [{ type: "wings", position: [0, 0.2, -0.1], scale: 1 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    manufacturing: {
        id: "manufacturing",
        bodyShape: "wide",
        headShape: "box",
        bodyScale: [0.16, 0.33, 0.16],
        headScale: 1.0,
        accessories: [{ type: "shield", position: [0, 0.15, 0.18], scale: 1 }],
        legStyle: "guard_stance",
        emissiveIntensity: 0.2,
    },

    // ═══ HOTEL & TRAVEL DEPARTMENT ═══
    hotel: {
        id: "hotel",
        bodyShape: "tall",
        headShape: "sphere",
        bodyScale: [0.13, 0.45, 0.13],
        headScale: 1.0,
        accessories: [{ type: "crown", position: [0, 0.52, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.25,
    },
    flight: {
        id: "flight",
        bodyShape: "dynamic",
        headShape: "sphere",
        bodyScale: [0.11, 0.38, 0.11],
        headScale: 1.0,
        accessories: [{ type: "wings", position: [0, 0.2, -0.1], scale: 1.1 }],
        legStyle: "standard",
        emissiveIntensity: 0.25,
    },
    rental: {
        id: "rental",
        bodyShape: "standard",
        headShape: "sphere",
        bodyScale: [0.13, 0.35, 0.13],
        headScale: 1.0,
        accessories: [{ type: "compass", position: [0.22, 0.3, 0], scale: 0.8 }],
        legStyle: "wide_stance",
        emissiveIntensity: 0.15,
    },

    // ═══ SOFTWARE DEPARTMENT ═══
    fullstack: {
        id: "fullstack",
        bodyShape: "standard",
        headShape: "box",
        bodyScale: [0.12, 0.35, 0.12],
        headScale: 1.0,
        accessories: [{ type: "laptop", position: [0, 0.12, 0.16], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "app-builder": {
        id: "app-builder",
        bodyShape: "dynamic",
        headShape: "sphere",
        bodyScale: [0.11, 0.38, 0.11],
        headScale: 1.0,
        accessories: [{ type: "rocket_fins", position: [0, 0.05, -0.1], scale: 0.9 }],
        legStyle: "standard",
        emissiveIntensity: 0.2,
    },
    "prompt-engineer": {
        id: "prompt-engineer",
        bodyShape: "angular",
        headShape: "dodecahedron",
        bodyScale: [0.14, 0.35, 0.14],
        headScale: 1.1,
        accessories: [{ type: "flask", position: [0.2, 0.2, 0], scale: 0.8 }],
        legStyle: "standard",
        emissiveIntensity: 0.3,
    },

    // ═══ CARGO AGENT ═══
    cargo: {
        id: "cargo",
        bodyShape: "wide",
        headShape: "sphere",
        bodyScale: [0.18, 0.4, 0.18],
        headScale: 1.2,
        accessories: [{ type: "briefcase", position: [0.2, 0.05, 0], scale: 1.0 }],
        legStyle: "guard_stance",
        emissiveIntensity: 0.35,
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

export function getCharacterDef(agentId: string): CharacterDef {
    return CHARACTER_REGISTRY[agentId] || generateCharacterDef(agentId);
}
