/**
 * Tests for scene-constants.ts — Scene Layout & Helpers (v7)
 * Desk positions, zones, departments, cargo hub, dynamic desk calculation.
 */
import { describe, it, expect } from "vitest";

import {
    DESK_POSITIONS,
    ZONES,
    TIER_COLORS,
    STATUS_COLORS,
    TIER_PRIORITY,
    DEPT_COLORS,
    AGENT_DEPARTMENT,
    DEPARTMENTS,
    CARGO_HUB,
    CARGO_DOCKS,
    calculateDynamicDeskPosition,
    buildAllDeskPositions,
    getDynamicZone,
} from "@/components/cowork-army/scene-constants";

// ═══════════════════════════════════════════════════════════
//  STATIC DATA
// ═══════════════════════════════════════════════════════════

describe("Static Data", () => {
    it("has 13 desk positions for base agents", () => {
        expect(Object.keys(DESK_POSITIONS)).toHaveLength(13);
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

    it("has 5 zones", () => {
        expect(ZONES).toHaveLength(5);
    });

    it("zones cover all 13 base agents", () => {
        const allZoneAgents = ZONES.flatMap((z) => z.agents);
        expect(allZoneAgents).toHaveLength(13);
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
        const expected = ["idle", "working", "searching", "thinking", "coding", "planning", "error", "done", "delivering"];
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
//  DEPARTMENTS
// ═══════════════════════════════════════════════════════════

describe("Departments", () => {
    it("has 4 department definitions", () => {
        expect(Object.keys(DEPARTMENTS)).toHaveLength(4);
    });

    it("department colors defined for all depts + cargo", () => {
        expect(DEPT_COLORS).toHaveProperty("trade");
        expect(DEPT_COLORS).toHaveProperty("medical");
        expect(DEPT_COLORS).toHaveProperty("hotel");
        expect(DEPT_COLORS).toHaveProperty("software");
        expect(DEPT_COLORS).toHaveProperty("cargo");
    });

    it("agent department mapping covers all 13 agents", () => {
        expect(Object.keys(AGENT_DEPARTMENT)).toHaveLength(13);
    });

    it("trade department has 4 agents", () => {
        const trade = Object.entries(AGENT_DEPARTMENT)
            .filter(([, dept]) => dept === "trade")
            .map(([id]) => id);
        expect(trade).toHaveLength(4);
        expect(trade).toContain("trade-master");
        expect(trade).toContain("chart-eye");
    });

    it("cargo hub is at center", () => {
        expect(CARGO_HUB.position).toEqual([0, 0, 0]);
        expect(CARGO_HUB.radius).toBeGreaterThan(0);
    });

    it("cargo docks defined for 4 departments", () => {
        expect(Object.keys(CARGO_DOCKS)).toHaveLength(4);
        expect(CARGO_DOCKS).toHaveProperty("trade");
        expect(CARGO_DOCKS).toHaveProperty("medical");
        expect(CARGO_DOCKS).toHaveProperty("hotel");
        expect(CARGO_DOCKS).toHaveProperty("software");
    });

    it("zone IDs match departments + cargo", () => {
        const zoneIds = ZONES.map((z) => z.id);
        expect(zoneIds).toContain("trade");
        expect(zoneIds).toContain("medical");
        expect(zoneIds).toContain("hotel");
        expect(zoneIds).toContain("software");
        expect(zoneIds).toContain("cargo");
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
        expect(pos[0]).toBe(-2); // DYN_START_X
        expect(pos[2]).toBe(16); // DYN_START_Z
    });

    it("wraps to next row after 3 columns", () => {
        const pos3 = calculateDynamicDeskPosition(3);
        expect(pos3[0]).toBe(-2); // Back to first column
        expect(pos3[2]).toBeGreaterThan(16); // New row
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
        expect(Object.keys(result)).toHaveLength(13);
        expect(result["cargo"]).toEqual(DESK_POSITIONS["cargo"]);
    });

    it("adds dynamic agents", () => {
        const ids = [...Object.keys(DESK_POSITIONS), "dynamic-1", "dynamic-2"];
        const result = buildAllDeskPositions(ids);
        expect(Object.keys(result)).toHaveLength(15);
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
