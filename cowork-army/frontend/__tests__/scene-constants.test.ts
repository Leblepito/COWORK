/**
 * Tests for scene-constants.ts — Scene Layout & Helpers
 * Desk positions, zones, dynamic desk calculation.
 */
import { describe, it, expect } from "vitest";

import {
    DESK_POSITIONS,
    ZONES,
    TIER_COLORS,
    STATUS_COLORS,
    TIER_PRIORITY,
    calculateDynamicDeskPosition,
    buildAllDeskPositions,
    getDynamicZone,
} from "@/components/cowork-army/scene-constants";

// ═══════════════════════════════════════════════════════════
//  STATIC DATA
// ═══════════════════════════════════════════════════════════

describe("Static Data", () => {
    it("has 12 desk positions for base agents", () => {
        expect(Object.keys(DESK_POSITIONS)).toHaveLength(12);
    });

    it("all desk positions are [x, y, z] tuples", () => {
        for (const [id, pos] of Object.entries(DESK_POSITIONS)) {
            expect(pos).toHaveLength(3);
            expect(pos[1]).toBe(0); // y is always 0 (ground level)
        }
    });

    it("no overlapping desk positions", () => {
        const positions = Object.values(DESK_POSITIONS);
        const unique = new Set(positions.map((p) => `${p[0]},${p[2]}`));
        expect(unique.size).toBe(positions.length);
    });

    it("has 4 zones", () => {
        expect(ZONES).toHaveLength(4);
    });

    it("zones cover all 12 base agents", () => {
        const allZoneAgents = ZONES.flatMap((z) => z.agents);
        expect(allZoneAgents).toHaveLength(12);
        for (const id of Object.keys(DESK_POSITIONS)) {
            expect(allZoneAgents).toContain(id);
        }
    });

    it("tier colors defined for all tiers", () => {
        expect(TIER_COLORS).toHaveProperty("COMMANDER");
        expect(TIER_COLORS).toHaveProperty("SUPERVISOR");
        expect(TIER_COLORS).toHaveProperty("DIRECTOR");
        expect(TIER_COLORS).toHaveProperty("WORKER");
    });

    it("status colors defined for all states", () => {
        const expected = ["idle", "working", "searching", "thinking", "coding", "planning", "error", "done"];
        for (const s of expected) {
            expect(STATUS_COLORS).toHaveProperty(s);
        }
    });

    it("tier priority ordering is correct", () => {
        expect(TIER_PRIORITY["COMMANDER"]).toBeGreaterThan(TIER_PRIORITY["SUPERVISOR"]);
        expect(TIER_PRIORITY["SUPERVISOR"]).toBeGreaterThan(TIER_PRIORITY["DIRECTOR"]);
        expect(TIER_PRIORITY["DIRECTOR"]).toBeGreaterThan(TIER_PRIORITY["WORKER"]);
    });
});

// ═══════════════════════════════════════════════════════════
//  DYNAMIC DESK POSITION
// ═══════════════════════════════════════════════════════════

describe("calculateDynamicDeskPosition", () => {
    it("returns 3-element tuple", () => {
        const pos = calculateDynamicDeskPosition(0);
        expect(pos).toHaveLength(3);
        expect(pos[1]).toBe(0); // y = 0
    });

    it("first position is at start coords", () => {
        const pos = calculateDynamicDeskPosition(0);
        expect(pos[0]).toBe(-2); // START_X
        expect(pos[2]).toBe(2);  // START_Z
    });

    it("wraps to next row after 3 columns", () => {
        const pos3 = calculateDynamicDeskPosition(3);
        expect(pos3[0]).toBe(-2); // Back to first column
        expect(pos3[2]).toBeGreaterThan(2); // New row
    });

    it("positions don't overlap with base desks", () => {
        const basePositions = new Set(
            Object.values(DESK_POSITIONS).map((p) => `${p[0]},${p[2]}`)
        );
        for (let i = 0; i < 10; i++) {
            const pos = calculateDynamicDeskPosition(i);
            expect(basePositions.has(`${pos[0]},${pos[2]}`)).toBe(false);
        }
    });
});

// ═══════════════════════════════════════════════════════════
//  BUILD ALL DESK POSITIONS
// ═══════════════════════════════════════════════════════════

describe("buildAllDeskPositions", () => {
    it("includes all base agents", () => {
        const result = buildAllDeskPositions(Object.keys(DESK_POSITIONS));
        expect(Object.keys(result)).toHaveLength(12);
        expect(result["commander"]).toEqual(DESK_POSITIONS["commander"]);
    });

    it("adds dynamic agents", () => {
        const ids = [...Object.keys(DESK_POSITIONS), "dynamic-1", "dynamic-2"];
        const result = buildAllDeskPositions(ids);
        expect(Object.keys(result)).toHaveLength(14);
        expect(result["dynamic-1"]).toBeDefined();
        expect(result["dynamic-2"]).toBeDefined();
    });

    it("dynamic positions are unique", () => {
        const ids = [...Object.keys(DESK_POSITIONS), "d1", "d2", "d3"];
        const result = buildAllDeskPositions(ids);
        const positions = new Set(Object.values(result).map((p) => `${p[0]},${p[2]}`));
        expect(positions.size).toBe(Object.keys(result).length);
    });
});

// ═══════════════════════════════════════════════════════════
//  DYNAMIC ZONE
// ═══════════════════════════════════════════════════════════

describe("getDynamicZone", () => {
    it("returns null for empty list", () => {
        expect(getDynamicZone([])).toBeNull();
    });

    it("returns zone for dynamic agents", () => {
        const zone = getDynamicZone(["d1", "d2"]);
        expect(zone).not.toBeNull();
        expect(zone!.id).toBe("dynamic");
        expect(zone!.label).toBe("DYNAMIC AGENTS");
        expect(zone!.agents).toEqual(["d1", "d2"]);
    });

    it("zone bounds expand with more agents", () => {
        const zone1 = getDynamicZone(["d1"]);
        const zone6 = getDynamicZone(["d1", "d2", "d3", "d4", "d5", "d6"]);
        // More agents = taller zone
        expect(zone6!.bounds[3]).toBeGreaterThan(zone1!.bounds[3]);
    });
});
