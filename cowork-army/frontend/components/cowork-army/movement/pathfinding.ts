import * as THREE from "three";
import { DESK_POSITIONS, DESK_COLLISION_RADIUS, PATHFINDING_DETOUR_OFFSET } from "../scene-constants";

export interface MovementPath {
    points: THREE.Vector3[];
    totalDistance: number;
}

/**
 * Calculate a simple path from A to B, detouring around desks if needed.
 */
export function calculatePath(
    from: [number, number, number],
    to: [number, number, number],
): MovementPath {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);

    // Check if direct line passes near any desk
    const blocked = findBlockingDesk(start, end, from, to);

    if (blocked) {
        // Create a single waypoint that detours around the blocking desk
        const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
        const dir = new THREE.Vector3().subVectors(end, start).normalize();
        // Perpendicular in XZ plane
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

    // Multi-point: find which segment we're on
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

// Check if any desk blocks the straight line between start and end
function findBlockingDesk(
    start: THREE.Vector3,
    end: THREE.Vector3,
    fromPos: [number, number, number],
    toPos: [number, number, number],
): boolean {
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = dir.length();
    dir.normalize();

    for (const [id, pos] of Object.entries(DESK_POSITIONS)) {
        // Skip source and target desks
        if (pos[0] === fromPos[0] && pos[2] === fromPos[2]) continue;
        if (pos[0] === toPos[0] && pos[2] === toPos[2]) continue;

        const deskPos = new THREE.Vector3(pos[0], 0, pos[2]);
        const toDesk = new THREE.Vector3().subVectors(deskPos, start);
        const proj = toDesk.dot(dir);

        if (proj < 0 || proj > len) continue; // desk is behind or beyond path

        const closest = start.clone().addScaledVector(dir, proj);
        const dist = closest.distanceTo(deskPos);

        if (dist < DESK_COLLISION_RADIUS) return true;
    }
    return false;
}
