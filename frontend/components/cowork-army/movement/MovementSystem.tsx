"use client";

import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DESK_POSITIONS, DEFAULT_POSITION, AGENT_WALK_SPEED } from "../scene-constants";
import { calculatePath, getPositionOnPath, getFacingAngle } from "./pathfinding";
import type { AgentMovementState } from "../AgentAvatar";

export interface CollaborationPair {
    agentA: string; // stays at desk
    agentB: string; // walks over
    message: string;
    startedAt: number;
    expiresAt: number;
    type: "delegation" | "data_exchange" | "review" | "generic";
}

type MovePhase = "at_desk" | "walking_to" | "at_target" | "returning";

interface InternalMoveState {
    phase: MovePhase;
    progress: number;
    walkCyclePhase: number;
    facingAngle: number;
    currentPosition: THREE.Vector3;
    targetAgentId: string | null;
    pathForward: ReturnType<typeof calculatePath> | null;
    pathReturn: ReturnType<typeof calculatePath> | null;
}

/**
 * Hook that manages movement for all agents. Returns a map of AgentMovementState
 * keyed by agent ID. Must be called inside a R3F Canvas context.
 */
export function useMovementSystem(
    agentIds: string[],
    collaborations: CollaborationPair[],
): Record<string, AgentMovementState> {
    const statesRef = useRef<Record<string, InternalMoveState>>({});
    const outputRef = useRef<Record<string, AgentMovementState>>({});

    // Initialize missing agents
    for (const id of agentIds) {
        if (!statesRef.current[id]) {
            const home = DESK_POSITIONS[id] || DEFAULT_POSITION;
            statesRef.current[id] = {
                phase: "at_desk",
                progress: 0,
                walkCyclePhase: 0,
                facingAngle: 0,
                currentPosition: new THREE.Vector3(home[0], 0, home[2] - 0.3),
                targetAgentId: null,
                pathForward: null,
                pathReturn: null,
            };
        }
    }

    // Check for new collaborations and trigger walking
    const activeCollabAgents = new Set<string>();
    for (const collab of collaborations) {
        activeCollabAgents.add(collab.agentB); // walker
        const state = statesRef.current[collab.agentB];
        if (state && state.phase === "at_desk") {
            const fromPos = DESK_POSITIONS[collab.agentB] || DEFAULT_POSITION;
            const toPos = DESK_POSITIONS[collab.agentA] || DEFAULT_POSITION;
            // Offset target slightly so they stand next to the desk, not on it
            const target: [number, number, number] = [toPos[0] + 0.8, toPos[1], toPos[2]];
            state.phase = "walking_to";
            state.progress = 0;
            state.targetAgentId = collab.agentA;
            state.pathForward = calculatePath(
                [fromPos[0], fromPos[1], fromPos[2] - 0.3],
                target,
            );
            state.pathReturn = null;
        }
    }

    // Check for expired collaborations — trigger return
    for (const id of agentIds) {
        const state = statesRef.current[id];
        if (!state) continue;
        if (state.phase === "at_target" && !activeCollabAgents.has(id)) {
            const homePos = DESK_POSITIONS[id] || DEFAULT_POSITION;
            const currentArr: [number, number, number] = [
                state.currentPosition.x, 0, state.currentPosition.z,
            ];
            state.phase = "returning";
            state.progress = 0;
            state.pathReturn = calculatePath(currentArr, [homePos[0], homePos[1], homePos[2] - 0.3]);
        }
    }

    useFrame((_, delta) => {
        for (const id of agentIds) {
            const state = statesRef.current[id];
            if (!state) continue;

            switch (state.phase) {
                case "walking_to": {
                    if (!state.pathForward) break;
                    const speed = AGENT_WALK_SPEED / state.pathForward.totalDistance;
                    state.progress = Math.min(state.progress + delta * speed, 1);
                    state.currentPosition = getPositionOnPath(state.pathForward, state.progress);
                    state.walkCyclePhase += delta * 8;

                    // Update facing
                    const nextP = Math.min(state.progress + 0.05, 1);
                    const nextPos = getPositionOnPath(state.pathForward, nextP);
                    state.facingAngle = getFacingAngle(state.currentPosition, nextPos);

                    if (state.progress >= 1) {
                        state.phase = "at_target";
                        state.progress = 0;
                    }
                    break;
                }
                case "returning": {
                    if (!state.pathReturn) break;
                    const speed = AGENT_WALK_SPEED / state.pathReturn.totalDistance;
                    state.progress = Math.min(state.progress + delta * speed, 1);
                    state.currentPosition = getPositionOnPath(state.pathReturn, state.progress);
                    state.walkCyclePhase += delta * 8;

                    const nextP = Math.min(state.progress + 0.05, 1);
                    const nextPos = getPositionOnPath(state.pathReturn, nextP);
                    state.facingAngle = getFacingAngle(state.currentPosition, nextPos);

                    if (state.progress >= 1) {
                        state.phase = "at_desk";
                        state.progress = 0;
                        state.targetAgentId = null;
                        state.pathForward = null;
                        state.pathReturn = null;
                        // Reset to home
                        const home = DESK_POSITIONS[id] || DEFAULT_POSITION;
                        state.currentPosition.set(home[0], 0, home[2] - 0.3);
                    }
                    break;
                }
                // at_desk and at_target: no position update needed
            }

            // Build output
            outputRef.current[id] = {
                isMoving: state.phase === "walking_to" || state.phase === "returning",
                currentPosition: state.currentPosition.clone(),
                progress: state.progress,
                facingAngle: state.facingAngle,
                walkCyclePhase: state.walkCyclePhase,
            };
        }
    });

    return outputRef.current;
}
