"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DESK_POSITIONS, CARGO_DOCKS, CARGO_WALK_SPEED } from "../scene-constants";
import type { AgentMovementState } from "../AgentAvatar";

type CargoPhase = "idle" | "departing" | "arriving" | "delivering" | "returning";

interface InternalCargoState {
    phase: CargoPhase;
    progress: number;
    walkCyclePhase: number;
    facingAngle: number;
    currentPosition: THREE.Vector3;
    targetDept: string | null;
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
}

/**
 * Hook that manages cargo agent movement between hub and department docks.
 * Triggered by collaboration events involving the cargo agent.
 */
export function useCargoMovement(
    cargoAgentId: string,
    activeDepartment: string | null,
): AgentMovementState {
    const stateRef = useRef<InternalCargoState>({
        phase: "idle",
        progress: 0,
        walkCyclePhase: 0,
        facingAngle: 0,
        currentPosition: new THREE.Vector3(
            DESK_POSITIONS[cargoAgentId]?.[0] ?? 0,
            0,
            (DESK_POSITIONS[cargoAgentId]?.[2] ?? 0) - 0.3
        ),
        targetDept: null,
        startPos: new THREE.Vector3(),
        endPos: new THREE.Vector3(),
    });

    const outputRef = useRef<AgentMovementState>({
        isMoving: false,
        currentPosition: stateRef.current.currentPosition.clone(),
        progress: 0,
        facingAngle: 0,
        walkCyclePhase: 0,
    });

    // Trigger new delivery
    if (activeDepartment && stateRef.current.phase === "idle" && stateRef.current.targetDept !== activeDepartment) {
        const home = DESK_POSITIONS[cargoAgentId] || [0, 0, 0];
        const dock = CARGO_DOCKS[activeDepartment];
        if (dock) {
            const s = stateRef.current;
            s.phase = "departing";
            s.progress = 0;
            s.targetDept = activeDepartment;
            s.startPos.set(home[0], 0, home[2] - 0.3);
            s.endPos.set(dock[0], 0, dock[2]);
            s.currentPosition.copy(s.startPos);
        }
    }

    useFrame((_, delta) => {
        const s = stateRef.current;

        switch (s.phase) {
            case "departing": {
                const dist = s.startPos.distanceTo(s.endPos);
                if (dist < 0.1) { s.phase = "delivering"; break; }
                const speed = CARGO_WALK_SPEED / dist;
                s.progress = Math.min(s.progress + delta * speed, 1);
                s.currentPosition.lerpVectors(s.startPos, s.endPos, s.progress);
                s.walkCyclePhase += delta * 10;

                // Facing
                const dir = new THREE.Vector3().subVectors(s.endPos, s.startPos).normalize();
                s.facingAngle = Math.atan2(dir.x, dir.z);

                if (s.progress >= 1) {
                    s.phase = "delivering";
                    s.progress = 0;
                }
                break;
            }
            case "delivering": {
                // Stay at dock for a moment
                s.progress += delta;
                if (s.progress >= 1.5) {
                    // Start return
                    s.phase = "returning";
                    s.progress = 0;
                    const home = DESK_POSITIONS[cargoAgentId] || [0, 0, 0];
                    s.startPos.copy(s.currentPosition);
                    s.endPos.set(home[0], 0, home[2] - 0.3);
                }
                break;
            }
            case "returning": {
                const dist = s.startPos.distanceTo(s.endPos);
                if (dist < 0.1) { s.phase = "idle"; s.targetDept = null; break; }
                const speed = CARGO_WALK_SPEED / dist;
                s.progress = Math.min(s.progress + delta * speed, 1);
                s.currentPosition.lerpVectors(s.startPos, s.endPos, s.progress);
                s.walkCyclePhase += delta * 10;

                const dir = new THREE.Vector3().subVectors(s.endPos, s.startPos).normalize();
                s.facingAngle = Math.atan2(dir.x, dir.z);

                if (s.progress >= 1) {
                    s.phase = "idle";
                    s.progress = 0;
                    s.targetDept = null;
                    const home = DESK_POSITIONS[cargoAgentId] || [0, 0, 0];
                    s.currentPosition.set(home[0], 0, home[2] - 0.3);
                }
                break;
            }
        }

        outputRef.current = {
            isMoving: s.phase === "departing" || s.phase === "returning",
            currentPosition: s.currentPosition.clone(),
            progress: s.progress,
            facingAngle: s.facingAngle,
            walkCyclePhase: s.walkCyclePhase,
        };
    });

    return outputRef.current;
}
