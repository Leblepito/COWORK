"use client";

/**
 * Agent Life System — gives agents autonomous life on campus.
 *
 * Based on REAL-TIME data from events and statuses:
 * - Idle agents wander the campus, visit social spots, take breaks
 * - Working agents stay at desks with occasional stretches
 * - Agents who interact in events meet at social spots
 * - Cargo agent delivers to departments mentioned in events
 *
 * This replaces/augments the basic MovementSystem with richer behaviors.
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AutonomousEvent, AgentStatus } from "@/lib/cowork-api";
import {
    DESK_POSITIONS,
    DEFAULT_POSITION,
    AGENT_WALK_SPEED,
    WANDER_WAYPOINTS,
    SOCIAL_SPOTS,
    AGENT_DEPARTMENT,
    CARGO_DOCKS,
    CARGO_WALK_SPEED,
} from "../scene-constants";
import { calculatePath, getPositionOnPath, getFacingAngle } from "./pathfinding";
import type { AgentMovementState } from "../AgentAvatar";

export type LifeActivity =
    | "working_at_desk"     // actively working, small animations
    | "idle_at_desk"        // sitting idle, may decide to wander
    | "wandering"           // strolling around campus
    | "socializing"         // meeting another agent at a social spot
    | "walking_to_social"   // heading to meet someone
    | "returning_to_desk"   // walking back
    | "delivering"          // cargo agent delivering
    | "returning_delivery"; // cargo coming back

export interface AgentLifeState extends AgentMovementState {
    activity: LifeActivity;
    /** Who this agent is socializing with (null if none) */
    socialPartner: string | null;
    /** Social spot index where meeting happens */
    socialSpotIndex: number;
    /** Time spent in current activity */
    activityDuration: number;
}

interface InternalLifeState {
    activity: LifeActivity;
    progress: number;
    walkCyclePhase: number;
    facingAngle: number;
    currentPosition: THREE.Vector3;
    homePosition: THREE.Vector3;
    path: ReturnType<typeof calculatePath> | null;
    socialPartner: string | null;
    socialSpotIndex: number;
    activityDuration: number;
    lastWanderTime: number;
    wanderCooldown: number; // random 8-20s between wanders
}

/** Detect which department is most active from recent events */
function detectActiveDepartment(events: AutonomousEvent[]): string | null {
    const recentEvents = events.slice(0, 5); // most recent 5
    const deptMentions: Record<string, number> = {};

    for (const ev of recentEvents) {
        const msg = (ev.message || "").toLowerCase();
        for (const [agentId, dept] of Object.entries(AGENT_DEPARTMENT)) {
            if (agentId === "cargo") continue;
            if (msg.includes(agentId) || msg.includes(dept)) {
                deptMentions[dept] = (deptMentions[dept] || 0) + 1;
            }
        }
    }

    let maxDept: string | null = null;
    let maxCount = 0;
    for (const [dept, count] of Object.entries(deptMentions)) {
        if (count > maxCount) { maxCount = count; maxDept = dept; }
    }
    return maxDept;
}

/** Detect agent pairs that should socialize based on event mentions */
function detectSocialPairs(
    events: AutonomousEvent[],
    agentIds: string[],
    now: number,
): { agentA: string; agentB: string; spotIndex: number }[] {
    const pairs: { agentA: string; agentB: string; spotIndex: number }[] = [];
    const recent = events.filter(ev => now - new Date(ev.timestamp).getTime() < 10000);
    const used = new Set<string>();

    for (const ev of recent) {
        if (!ev.agent_id || used.has(ev.agent_id)) continue;
        const msg = (ev.message || "").toLowerCase();

        for (const otherId of agentIds) {
            if (otherId === ev.agent_id || otherId === "cargo" || used.has(otherId)) continue;
            if (msg.includes(otherId)) {
                const spotIndex = Math.abs(hashStr(ev.agent_id + otherId)) % SOCIAL_SPOTS.length;
                pairs.push({ agentA: ev.agent_id, agentB: otherId, spotIndex });
                used.add(ev.agent_id);
                used.add(otherId);
                break;
            }
        }
        if (pairs.length >= 3) break; // max 3 social pairs
    }
    return pairs;
}

function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
    return h;
}

function randomWanderTarget(excludePos: THREE.Vector3): [number, number, number] {
    const candidates = WANDER_WAYPOINTS.filter(wp =>
        Math.abs(wp[0] - excludePos.x) > 3 || Math.abs(wp[2] - excludePos.z) > 3
    );
    const wp = candidates[Math.floor(Math.random() * candidates.length)] || WANDER_WAYPOINTS[0];
    return wp;
}

/**
 * Main hook — manages life for all agents.
 */
export function useAgentLifeSystem(
    agentIds: string[],
    statuses: Record<string, AgentStatus>,
    events: AutonomousEvent[],
): Record<string, AgentLifeState> {
    const statesRef = useRef<Record<string, InternalLifeState>>({});
    const outputRef = useRef<Record<string, AgentLifeState>>({});
    const lastSocialCheckRef = useRef(0);
    const activeSocialPairsRef = useRef<{ agentA: string; agentB: string; spotIndex: number }[]>([]);
    const lastCargoDeliveryRef = useRef(0);
    const cargoTargetDeptRef = useRef<string | null>(null);

    // Initialize
    for (const id of agentIds) {
        if (!statesRef.current[id]) {
            const home = DESK_POSITIONS[id] || DEFAULT_POSITION;
            statesRef.current[id] = {
                activity: "idle_at_desk",
                progress: 0,
                walkCyclePhase: 0,
                facingAngle: 0,
                currentPosition: new THREE.Vector3(home[0], 0, home[2]),
                homePosition: new THREE.Vector3(home[0], 0, home[2]),
                path: null,
                socialPartner: null,
                socialSpotIndex: -1,
                activityDuration: 0,
                lastWanderTime: Date.now() - Math.random() * 10000, // stagger starts
                wanderCooldown: 10 + Math.random() * 15,
            };
        }
    }

    useFrame((_, delta) => {
        const now = Date.now();

        // ── Social pair detection every 2s ──
        if (now - lastSocialCheckRef.current > 2000) {
            lastSocialCheckRef.current = now;
            activeSocialPairsRef.current = detectSocialPairs(events, agentIds, now);

            // Cargo delivery detection
            if (now - lastCargoDeliveryRef.current > 8000) {
                const dept = detectActiveDepartment(events);
                if (dept && dept !== cargoTargetDeptRef.current) {
                    cargoTargetDeptRef.current = dept;
                    lastCargoDeliveryRef.current = now;
                }
            }
        }

        // ── Social triggering ──
        const socialAgents = new Set<string>();
        for (const pair of activeSocialPairsRef.current) {
            socialAgents.add(pair.agentA);
            socialAgents.add(pair.agentB);

            for (const agentId of [pair.agentA, pair.agentB]) {
                const s = statesRef.current[agentId];
                if (!s) continue;
                if (s.activity === "idle_at_desk" || s.activity === "wandering") {
                    const spot = SOCIAL_SPOTS[pair.spotIndex];
                    const from: [number, number, number] = [s.currentPosition.x, 0, s.currentPosition.z];
                    s.activity = "walking_to_social";
                    s.progress = 0;
                    s.path = calculatePath(from, spot.pos);
                    s.socialPartner = agentId === pair.agentA ? pair.agentB : pair.agentA;
                    s.socialSpotIndex = pair.spotIndex;
                }
            }
        }

        // ── Per-agent life tick ──
        for (const id of agentIds) {
            const s = statesRef.current[id];
            if (!s) continue;

            const status = statuses[id]?.status || "idle";
            const isWorking = ["working", "thinking", "coding", "searching", "planning"].includes(status);

            s.activityDuration += delta;

            // ── Cargo agent special handling ──
            if (id === "cargo") {
                handleCargoLife(s, delta, cargoTargetDeptRef.current);
                buildOutput(id, s);
                continue;
            }

            switch (s.activity) {
                case "idle_at_desk": {
                    // If agent starts working → switch to working_at_desk
                    if (isWorking) {
                        s.activity = "working_at_desk";
                        s.activityDuration = 0;
                        break;
                    }
                    // Maybe start wandering after cooldown
                    const elapsed = (now - s.lastWanderTime) / 1000;
                    if (elapsed > s.wanderCooldown && !socialAgents.has(id)) {
                        const target = randomWanderTarget(s.currentPosition);
                        const from: [number, number, number] = [s.currentPosition.x, 0, s.currentPosition.z];
                        s.path = calculatePath(from, target);
                        s.activity = "wandering";
                        s.progress = 0;
                        s.activityDuration = 0;
                    }
                    break;
                }

                case "working_at_desk": {
                    // Stay at desk while working
                    if (!isWorking) {
                        s.activity = "idle_at_desk";
                        s.activityDuration = 0;
                    }
                    // Keep at home position
                    s.currentPosition.copy(s.homePosition);
                    break;
                }

                case "wandering": {
                    if (!s.path) { s.activity = "idle_at_desk"; break; }

                    // If started working mid-wander → return immediately
                    if (isWorking) {
                        const from: [number, number, number] = [s.currentPosition.x, 0, s.currentPosition.z];
                        const home: [number, number, number] = [s.homePosition.x, 0, s.homePosition.z];
                        s.path = calculatePath(from, home);
                        s.activity = "returning_to_desk";
                        s.progress = 0;
                        break;
                    }

                    const speed = AGENT_WALK_SPEED / s.path.totalDistance;
                    s.progress = Math.min(s.progress + delta * speed, 1);
                    s.currentPosition = getPositionOnPath(s.path, s.progress);
                    s.walkCyclePhase += delta * 8;

                    const nextP = Math.min(s.progress + 0.05, 1);
                    const nextPos = getPositionOnPath(s.path, nextP);
                    s.facingAngle = getFacingAngle(s.currentPosition, nextPos);

                    if (s.progress >= 1) {
                        // Arrived at wander target → pause then return
                        if (s.activityDuration > 3) { // lingered enough
                            const from: [number, number, number] = [s.currentPosition.x, 0, s.currentPosition.z];
                            const home: [number, number, number] = [s.homePosition.x, 0, s.homePosition.z];
                            s.path = calculatePath(from, home);
                            s.activity = "returning_to_desk";
                            s.progress = 0;
                            s.activityDuration = 0;
                        }
                    }
                    break;
                }

                case "walking_to_social": {
                    if (!s.path) { s.activity = "idle_at_desk"; break; }

                    const speed = AGENT_WALK_SPEED / s.path.totalDistance;
                    s.progress = Math.min(s.progress + delta * speed, 1);
                    s.currentPosition = getPositionOnPath(s.path, s.progress);
                    s.walkCyclePhase += delta * 8;

                    const nextP = Math.min(s.progress + 0.05, 1);
                    const nextPos = getPositionOnPath(s.path, nextP);
                    s.facingAngle = getFacingAngle(s.currentPosition, nextPos);

                    if (s.progress >= 1) {
                        s.activity = "socializing";
                        s.activityDuration = 0;
                    }
                    break;
                }

                case "socializing": {
                    // Face partner
                    const partner = s.socialPartner ? statesRef.current[s.socialPartner] : null;
                    if (partner) {
                        s.facingAngle = getFacingAngle(s.currentPosition, partner.currentPosition);
                    }
                    // Socialize for 6 seconds then return
                    if (s.activityDuration > 6) {
                        const from: [number, number, number] = [s.currentPosition.x, 0, s.currentPosition.z];
                        const home: [number, number, number] = [s.homePosition.x, 0, s.homePosition.z];
                        s.path = calculatePath(from, home);
                        s.activity = "returning_to_desk";
                        s.progress = 0;
                        s.activityDuration = 0;
                        s.socialPartner = null;
                        s.socialSpotIndex = -1;
                    }
                    break;
                }

                case "returning_to_desk": {
                    if (!s.path) {
                        s.activity = "idle_at_desk";
                        s.currentPosition.copy(s.homePosition);
                        break;
                    }

                    const speed = AGENT_WALK_SPEED / s.path.totalDistance;
                    s.progress = Math.min(s.progress + delta * speed, 1);
                    s.currentPosition = getPositionOnPath(s.path, s.progress);
                    s.walkCyclePhase += delta * 8;

                    const nextP = Math.min(s.progress + 0.05, 1);
                    const nextPos = getPositionOnPath(s.path, nextP);
                    s.facingAngle = getFacingAngle(s.currentPosition, nextPos);

                    if (s.progress >= 1) {
                        s.activity = "idle_at_desk";
                        s.progress = 0;
                        s.activityDuration = 0;
                        s.lastWanderTime = now;
                        s.wanderCooldown = 10 + Math.random() * 15; // new random cooldown
                        s.currentPosition.copy(s.homePosition);
                        s.path = null;
                    }
                    break;
                }
            }

            buildOutput(id, s);
        }
    });

    function buildOutput(id: string, s: InternalLifeState) {
        outputRef.current[id] = {
            isMoving: ["wandering", "walking_to_social", "returning_to_desk", "delivering", "returning_delivery"].includes(s.activity),
            currentPosition: s.currentPosition.clone(),
            progress: s.progress,
            facingAngle: s.facingAngle,
            walkCyclePhase: s.walkCyclePhase,
            activity: s.activity,
            socialPartner: s.socialPartner,
            socialSpotIndex: s.socialSpotIndex,
            activityDuration: s.activityDuration,
        };
    }

    return outputRef.current;
}

/** Handle cargo agent: deliver to active department */
function handleCargoLife(s: InternalLifeState, delta: number, targetDept: string | null) {
    switch (s.activity) {
        case "idle_at_desk": {
            if (targetDept) {
                const dock = CARGO_DOCKS[targetDept];
                if (dock) {
                    const from: [number, number, number] = [s.currentPosition.x, 0, s.currentPosition.z];
                    s.path = calculatePath(from, dock);
                    s.activity = "delivering";
                    s.progress = 0;
                    s.activityDuration = 0;
                }
            }
            break;
        }
        case "delivering": {
            if (!s.path) { s.activity = "idle_at_desk"; break; }
            const speed = CARGO_WALK_SPEED / s.path.totalDistance;
            s.progress = Math.min(s.progress + delta * speed, 1);
            s.currentPosition = getPositionOnPath(s.path, s.progress);
            s.walkCyclePhase += delta * 10;

            const nextP = Math.min(s.progress + 0.05, 1);
            const nextPos = getPositionOnPath(s.path, nextP);
            s.facingAngle = getFacingAngle(s.currentPosition, nextPos);

            if (s.progress >= 1) {
                // Arrived at dock — pause 2s then return
                s.activity = "returning_delivery";
                s.progress = 0;
                s.activityDuration = 0;
            }
            break;
        }
        case "returning_delivery": {
            if (s.activityDuration < 2) break; // wait at dock
            if (!s.path || s.progress === 0) {
                const from: [number, number, number] = [s.currentPosition.x, 0, s.currentPosition.z];
                const home: [number, number, number] = [s.homePosition.x, 0, s.homePosition.z];
                s.path = calculatePath(from, home);
                s.progress = 0.001;
            }
            const speed = CARGO_WALK_SPEED / s.path!.totalDistance;
            s.progress = Math.min(s.progress + delta * speed, 1);
            s.currentPosition = getPositionOnPath(s.path!, s.progress);
            s.walkCyclePhase += delta * 10;

            const nextP = Math.min(s.progress + 0.05, 1);
            const nextPos = getPositionOnPath(s.path!, nextP);
            s.facingAngle = getFacingAngle(s.currentPosition, nextPos);

            if (s.progress >= 1) {
                s.activity = "idle_at_desk";
                s.progress = 0;
                s.currentPosition.copy(s.homePosition);
                s.path = null;
                s.activityDuration = 0;
            }
            break;
        }
        default: {
            // If in another state, reset to idle
            s.activity = "idle_at_desk";
            s.currentPosition.copy(s.homePosition);
        }
    }
}
