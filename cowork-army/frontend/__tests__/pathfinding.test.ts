/**
 * Tests for pathfinding.ts — Path Calculation & Interpolation
 * Direct paths, detours, position interpolation, facing angle.
 */
import { describe, it, expect } from "vitest";
import * as THREE from "three";

import {
    calculatePath,
    getPositionOnPath,
    getFacingAngle,
    type MovementPath,
} from "@/components/cowork-army/movement/pathfinding";

// ═══════════════════════════════════════════════════════════
//  CALCULATE PATH
// ═══════════════════════════════════════════════════════════

describe("calculatePath", () => {
    it("returns direct path when no desk blocks the way", () => {
        // Far from any desk
        const path = calculatePath([20, 0, 20], [22, 0, 20]);
        expect(path.points).toHaveLength(2);
        expect(path.totalDistance).toBeCloseTo(2, 1);
    });

    it("returns path with start and end points", () => {
        const path = calculatePath([0, 0, 0], [10, 0, 10]);
        expect(path.points[0].x).toBe(0);
        expect(path.points[0].z).toBe(0);
        const last = path.points[path.points.length - 1];
        expect(last.x).toBe(10);
        expect(last.z).toBe(10);
    });

    it("total distance is positive", () => {
        const path = calculatePath([0, 0, 0], [5, 0, 5]);
        expect(path.totalDistance).toBeGreaterThan(0);
    });

    it("path between known desks may have detour", () => {
        // Path from commander desk to trade-engine passes through some desks
        const path = calculatePath([-8, 0, -6], [0, 0, -4]);
        // May have 2 or 3 points
        expect(path.points.length).toBeGreaterThanOrEqual(2);
        // Detour distance should be >= direct distance
        const directDist = new THREE.Vector3(-8, 0, -6).distanceTo(new THREE.Vector3(0, 0, -4));
        expect(path.totalDistance).toBeGreaterThanOrEqual(directDist - 0.01);
    });

    it("y coordinate is always 0", () => {
        const path = calculatePath([-8, 0, -6], [8, 0, -6]);
        for (const pt of path.points) {
            expect(pt.y).toBe(0);
        }
    });
});

// ═══════════════════════════════════════════════════════════
//  POSITION INTERPOLATION
// ═══════════════════════════════════════════════════════════

describe("getPositionOnPath", () => {
    it("progress 0 returns start", () => {
        const path = calculatePath([0, 0, 0], [10, 0, 0]);
        const pos = getPositionOnPath(path, 0);
        expect(pos.x).toBeCloseTo(0);
        expect(pos.z).toBeCloseTo(0);
    });

    it("progress 1 returns end", () => {
        const path = calculatePath([0, 0, 0], [10, 0, 0]);
        const pos = getPositionOnPath(path, 1);
        expect(pos.x).toBeCloseTo(10);
        expect(pos.z).toBeCloseTo(0);
    });

    it("progress 0.5 returns midpoint for 2-point path", () => {
        const path: MovementPath = {
            points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)],
            totalDistance: 10,
        };
        const pos = getPositionOnPath(path, 0.5);
        expect(pos.x).toBeCloseTo(5);
    });

    it("clamps progress below 0", () => {
        const path = calculatePath([0, 0, 0], [10, 0, 0]);
        const pos = getPositionOnPath(path, -0.5);
        expect(pos.x).toBeCloseTo(0);
    });

    it("clamps progress above 1", () => {
        const path = calculatePath([0, 0, 0], [10, 0, 0]);
        const pos = getPositionOnPath(path, 1.5);
        expect(pos.x).toBeCloseTo(10);
    });

    it("works with multi-point path", () => {
        const path: MovementPath = {
            points: [
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(5, 0, 5),
                new THREE.Vector3(10, 0, 0),
            ],
            totalDistance: Math.SQRT2 * 5 * 2,
        };
        // At halfway should be near the middle waypoint
        const pos = getPositionOnPath(path, 0.5);
        expect(pos.x).toBeCloseTo(5, 0);
        expect(pos.z).toBeCloseTo(5, 0);
    });
});

// ═══════════════════════════════════════════════════════════
//  FACING ANGLE
// ═══════════════════════════════════════════════════════════

describe("getFacingAngle", () => {
    it("facing positive X returns ~π/2", () => {
        const angle = getFacingAngle(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(1, 0, 0),
        );
        expect(angle).toBeCloseTo(Math.PI / 2, 1);
    });

    it("facing positive Z returns 0", () => {
        const angle = getFacingAngle(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 1),
        );
        expect(angle).toBeCloseTo(0, 1);
    });

    it("facing negative X returns ~-π/2", () => {
        const angle = getFacingAngle(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(-1, 0, 0),
        );
        expect(angle).toBeCloseTo(-Math.PI / 2, 1);
    });

    it("facing negative Z returns ~π", () => {
        const angle = getFacingAngle(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1),
        );
        expect(Math.abs(angle)).toBeCloseTo(Math.PI, 1);
    });
});
