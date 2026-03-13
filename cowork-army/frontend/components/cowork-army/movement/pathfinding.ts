import * as THREE from "three";
import {
    DESK_POSITIONS,
    DESK_COLLISION_RADIUS,
    PATHFINDING_DETOUR_OFFSET,
    BUILDING_COLLIDERS,
    type BuildingCollider,
} from "../scene-constants";

export interface MovementPath {
    points: THREE.Vector3[];
    totalDistance: number;
}

/**
 * Calculate a path from A to B, detouring around desks AND buildings.
 */
export function calculatePath(
    from: [number, number, number],
    to: [number, number, number],
): MovementPath {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);

    // 1) Check if path crosses a building → detour around it
    const blockingBuilding = findBlockingBuilding(start, end);
    if (blockingBuilding) {
        const waypoints = buildBuildingDetour(start, end, blockingBuilding);
        let totalDist = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
            totalDist += waypoints[i].distanceTo(waypoints[i + 1]);
        }
        return { points: waypoints, totalDistance: totalDist };
    }

    // 2) Check if direct line passes near any desk
    const deskBlocked = findBlockingDesk(start, end, from, to);
    if (deskBlocked) {
        const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        const perp = new THREE.Vector3(-dir.z, 0, dir.x);
        const waypoint = mid.clone().addScaledVector(perp, PATHFINDING_DETOUR_OFFSET);
        waypoint.y = 0;

        const d1 = start.distanceTo(waypoint);
        const d2 = waypoint.distanceTo(end);
        return {
            points: [start, waypoint, end],
            totalDistance: d1 + d2,
        };
    }

    return {
        points: [start, end],
        totalDistance: start.distanceTo(end),
    };
}

/**
 * Get interpolated position along a path given progress 0→1.
 */
export function getPositionOnPath(path: MovementPath, progress: number): THREE.Vector3 {
    const p = Math.max(0, Math.min(1, progress));
    if (path.points.length === 2) {
        return new THREE.Vector3().lerpVectors(path.points[0], path.points[1], p);
    }

    const segments: number[] = [];
    let total = 0;
    for (let i = 0; i < path.points.length - 1; i++) {
        const d = path.points[i].distanceTo(path.points[i + 1]);
        segments.push(d);
        total += d;
    }

    let traveled = p * total;
    for (let i = 0; i < segments.length; i++) {
        if (traveled <= segments[i]) {
            const localP = traveled / segments[i];
            return new THREE.Vector3().lerpVectors(path.points[i], path.points[i + 1], localP);
        }
        traveled -= segments[i];
    }

    return path.points[path.points.length - 1].clone();
}

/**
 * Calculate Y-axis rotation to face from → to direction.
 */
export function getFacingAngle(from: THREE.Vector3, to: THREE.Vector3): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    return Math.atan2(dx, dz);
}

// ── Building collision ──

function findBlockingBuilding(start: THREE.Vector3, end: THREE.Vector3): BuildingCollider | null {
    for (const b of BUILDING_COLLIDERS) {
        if (isInsideBuilding(start, b) || isInsideBuilding(end, b)) continue; // start/end inside the building (agent's own office)
        if (segmentIntersectsAABB(start.x, start.z, end.x, end.z, b)) {
            return b;
        }
    }
    return null;
}

function isInsideBuilding(pos: THREE.Vector3, b: BuildingCollider): boolean {
    return Math.abs(pos.x - b.center[0]) < b.halfSize[0] &&
           Math.abs(pos.z - b.center[1]) < b.halfSize[1];
}

/** Simple AABB-line segment intersection in 2D (XZ plane) */
function segmentIntersectsAABB(
    x1: number, z1: number, x2: number, z2: number,
    b: BuildingCollider,
): boolean {
    const minX = b.center[0] - b.halfSize[0];
    const maxX = b.center[0] + b.halfSize[0];
    const minZ = b.center[1] - b.halfSize[1];
    const maxZ = b.center[1] + b.halfSize[1];

    // Cohen-Sutherland style: check if line segment fully outside on any axis
    let tMin = 0, tMax = 1;
    const dx = x2 - x1;
    const dz = z2 - z1;

    // X slab
    if (Math.abs(dx) > 1e-6) {
        const t1 = (minX - x1) / dx;
        const t2 = (maxX - x1) / dx;
        const tLo = Math.min(t1, t2);
        const tHi = Math.max(t1, t2);
        tMin = Math.max(tMin, tLo);
        tMax = Math.min(tMax, tHi);
        if (tMin > tMax) return false;
    } else {
        if (x1 < minX || x1 > maxX) return false;
    }

    // Z slab
    if (Math.abs(dz) > 1e-6) {
        const t1 = (minZ - z1) / dz;
        const t2 = (maxZ - z1) / dz;
        const tLo = Math.min(t1, t2);
        const tHi = Math.max(t1, t2);
        tMin = Math.max(tMin, tLo);
        tMax = Math.min(tMax, tHi);
        if (tMin > tMax) return false;
    } else {
        if (z1 < minZ || z1 > maxZ) return false;
    }

    return true;
}

/** Build a 3-point detour path around a building */
function buildBuildingDetour(start: THREE.Vector3, end: THREE.Vector3, b: BuildingCollider): THREE.Vector3[] {
    const cx = b.center[0];
    const cz = b.center[1];
    const hw = b.halfSize[0] + 2; // margin
    const hd = b.halfSize[1] + 2;

    // 4 corners of the building (with margin)
    const corners = [
        new THREE.Vector3(cx - hw, 0, cz - hd),
        new THREE.Vector3(cx + hw, 0, cz - hd),
        new THREE.Vector3(cx + hw, 0, cz + hd),
        new THREE.Vector3(cx - hw, 0, cz + hd),
    ];

    // Pick the corner closest to the midpoint of start→end that isn't blocked itself
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    corners.sort((a, c) => a.distanceTo(mid) - c.distanceTo(mid));

    // Use 2 closest corners as waypoints to go around
    return [start, corners[0], corners[1], end];
}

// ── Desk collision ──

function findBlockingDesk(
    start: THREE.Vector3,
    end: THREE.Vector3,
    fromPos: [number, number, number],
    toPos: [number, number, number],
): boolean {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    dir.normalize();

    for (const [, pos] of Object.entries(DESK_POSITIONS)) {
        if (pos[0] === fromPos[0] && pos[2] === fromPos[2]) continue;
        if (pos[0] === toPos[0] && pos[2] === toPos[2]) continue;

        const deskPos = new THREE.Vector3(pos[0], 0, pos[2]);
        const toDesk = new THREE.Vector3().subVectors(deskPos, start);
        const proj = toDesk.dot(dir);

        if (proj < 0 || proj > len) continue;

        const closest = start.clone().addScaledVector(dir, proj);
        const dist = closest.distanceTo(deskPos);

        if (dist < DESK_COLLISION_RADIUS) return true;
    }
    return false;
}
