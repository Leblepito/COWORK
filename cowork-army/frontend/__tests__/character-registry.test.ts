/**
 * Tests for character-registry.ts — Character Definitions
 * Base characters, dynamic generation, determinism.
 */
import { describe, it, expect } from "vitest";

import {
    CHARACTER_REGISTRY,
    getCharacterDef,
    type CharacterDef,
} from "@/components/cowork-army/characters/character-registry";

// ═══════════════════════════════════════════════════════════
//  BASE CHARACTER REGISTRY
// ═══════════════════════════════════════════════════════════

describe("CHARACTER_REGISTRY", () => {
    it("has 12 base characters", () => {
        expect(Object.keys(CHARACTER_REGISTRY)).toHaveLength(12);
    });

    const expectedIds = [
        "commander", "supervisor", "med-health", "travel-agent",
        "trade-engine", "alpha-scout", "tech-analyst", "risk-sentinel",
        "quant-lab", "growth-ops", "web-dev", "finance",
    ];

    it.each(expectedIds)("has definition for %s", (id) => {
        const def = CHARACTER_REGISTRY[id];
        expect(def).toBeDefined();
        expect(def.id).toBe(id);
    });

    it("all characters have required properties", () => {
        for (const [id, def] of Object.entries(CHARACTER_REGISTRY)) {
            expect(def.bodyShape).toBeTruthy();
            expect(def.headShape).toBeTruthy();
            expect(def.bodyScale).toHaveLength(3);
            expect(def.headScale).toBeGreaterThan(0);
            expect(def.accessories.length).toBeGreaterThanOrEqual(1);
            expect(def.legStyle).toBeTruthy();
            expect(def.emissiveIntensity).toBeGreaterThanOrEqual(0);
        }
    });

    it("commander has crown accessory", () => {
        expect(CHARACTER_REGISTRY["commander"].accessories[0].type).toBe("crown");
    });

    it("supervisor has magnifying glass", () => {
        expect(CHARACTER_REGISTRY["supervisor"].accessories[0].type).toBe("magnifying_glass");
    });

    it("med-health has medical cross", () => {
        expect(CHARACTER_REGISTRY["med-health"].accessories[0].type).toBe("medical_cross");
    });

    it("trade-engine has wide body", () => {
        expect(CHARACTER_REGISTRY["trade-engine"].bodyShape).toBe("wide");
    });

    it("risk-sentinel has guard stance", () => {
        expect(CHARACTER_REGISTRY["risk-sentinel"].legStyle).toBe("guard_stance");
    });
});

// ═══════════════════════════════════════════════════════════
//  DYNAMIC CHARACTER GENERATION
// ═══════════════════════════════════════════════════════════

describe("getCharacterDef", () => {
    it("returns base character for known IDs", () => {
        const def = getCharacterDef("commander");
        expect(def).toBe(CHARACTER_REGISTRY["commander"]);
    });

    it("generates character for unknown IDs", () => {
        const def = getCharacterDef("my-custom-agent");
        expect(def).toBeDefined();
        expect(def.id).toBe("my-custom-agent");
    });

    it("generated characters have valid properties", () => {
        const def = getCharacterDef("random-agent-xyz");
        expect(["standard", "tall", "wide", "angular", "dynamic"]).toContain(def.bodyShape);
        expect(["sphere", "box", "octahedron", "dodecahedron"]).toContain(def.headShape);
        expect(def.bodyScale).toHaveLength(3);
        expect(def.accessories).toHaveLength(1);
        expect(["standard", "wide_stance", "guard_stance"]).toContain(def.legStyle);
    });

    it("generation is deterministic — same ID yields same character", () => {
        const def1 = getCharacterDef("test-agent-abc");
        const def2 = getCharacterDef("test-agent-abc");
        expect(def1.bodyShape).toBe(def2.bodyShape);
        expect(def1.headShape).toBe(def2.headShape);
        expect(def1.accessories[0].type).toBe(def2.accessories[0].type);
        expect(def1.legStyle).toBe(def2.legStyle);
    });

    it("different IDs yield different characters (usually)", () => {
        const chars = ["agent-a", "agent-b", "agent-c", "agent-d", "agent-e"];
        const bodyShapes = new Set(chars.map((id) => getCharacterDef(id).bodyShape));
        // With 5 options and 5 agents, at least 2 different shapes should appear
        expect(bodyShapes.size).toBeGreaterThanOrEqual(2);
    });
});
