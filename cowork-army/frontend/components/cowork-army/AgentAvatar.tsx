"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CharacterBuilder from "./characters/CharacterBuilder";
import { getCharacterDef } from "./characters/character-registry";

export interface AgentMovementState {
    isMoving: boolean;
    currentPosition: THREE.Vector3;
    progress: number;
    facingAngle: number;
    walkCyclePhase: number;
}

interface AgentAvatarProps {
    agentId: string;
    position: [number, number, number];
    color: string;
    status: string;
    movementState?: AgentMovementState | null;
    isCollaborating?: boolean;
}

export default function AgentAvatar({
    agentId,
    position,
    color,
    status,
    movementState,
    isCollaborating,
}: AgentAvatarProps) {
    const groupRef = useRef<THREE.Group>(null);
    const charGroupRef = useRef<THREE.Group>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const errorFlashRef = useRef(0);

    const charDef = getCharacterDef(agentId);

    const isMoving = movementState?.isMoving ?? false;
    const effectiveStatus = isMoving ? "walking" : status;
    const walkPhase = movementState?.walkCyclePhase ?? 0;
    const facingAngle = movementState?.facingAngle ?? 0;

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.elapsedTime;

        if (isMoving && movementState) {
            groupRef.current.position.set(
                movementState.currentPosition.x,
                position[1] + 0.8 + Math.sin(walkPhase * 12) * 0.03,
                movementState.currentPosition.z
            );
            groupRef.current.rotation.y = facingAngle;
        } else {
            switch (status) {
                case "working":
                case "searching":
                    groupRef.current.position.set(position[0], position[1] + 0.8, position[2] - 0.3);
                    groupRef.current.rotation.y = t * 2;
                    break;
                case "thinking":
                case "planning":
                    groupRef.current.position.set(position[0], position[1] + 0.8, position[2] - 0.3);
                    groupRef.current.rotation.y = isCollaborating ? facingAngle : 0;
                    if (charGroupRef.current) {
                        const s = 1 + Math.sin(t * 2) * 0.05;
                        charGroupRef.current.scale.setScalar(s);
                    }
                    break;
                case "coding":
                    groupRef.current.position.set(position[0], position[1] + 0.8, position[2] - 0.3);
                    groupRef.current.rotation.y = t * 1;
                    break;
                case "error":
                    errorFlashRef.current += 1;
                    groupRef.current.position.set(position[0], position[1] + 0.8, position[2] - 0.3);
                    if (charGroupRef.current) {
                        charGroupRef.current.scale.setScalar(
                            Math.floor(errorFlashRef.current / 10) % 2 === 0 ? 1 : 0.9
                        );
                    }
                    break;
                default:
                    groupRef.current.position.set(
                        position[0],
                        position[1] + 0.8 + Math.sin(t * 1.5) * 0.05,
                        position[2] - 0.3
                    );
                    groupRef.current.rotation.y = isCollaborating ? facingAngle : 0;
                    if (charGroupRef.current) charGroupRef.current.scale.setScalar(1);
                    break;
            }
        }

        // Collaboration glow ring
        if (glowRef.current) {
            if (isCollaborating && !isMoving) {
                glowRef.current.visible = true;
                glowRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.1);
                glowRef.current.rotation.z = t * 0.5;
            } else {
                glowRef.current.visible = false;
            }
        }
    });

    return (
        <group ref={groupRef} position={[position[0], position[1] + 0.8, position[2] - 0.3]}>
            <group ref={charGroupRef}>
                <CharacterBuilder
                    characterDef={charDef}
                    color={color}
                    status={effectiveStatus}
                    facingAngle={facingAngle}
                    walkPhase={walkPhase}
                />
            </group>

            {/* Collaboration glow ring */}
            <mesh ref={glowRef} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
                <torusGeometry args={[0.25, 0.015, 8, 24]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.6}
                />
            </mesh>
        </group>
    );
}
