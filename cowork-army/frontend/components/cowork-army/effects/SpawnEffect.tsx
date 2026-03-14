"use client";

/**
 * Spawn/Despawn particle effects for agents.
 * - Spawn: particles converge inward with a flash
 * - Despawn: particles explode outward and fade
 * - Celebrate: golden spiraling particles
 * - Alert: pulsing red ring
 * - PowerUp: ascending energy column
 */

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SpawnEffectProps {
    position: [number, number, number];
    type: "spawn" | "despawn" | "celebrate" | "alert" | "power_up" | "shake";
    color: string;
    onComplete?: () => void;
}

const PARTICLE_COUNT = 16;
const EFFECT_DURATION = 2.0; // seconds

export default function SpawnEffect({ position, type, color, onComplete }: SpawnEffectProps) {
    const groupRef = useRef<THREE.Group>(null);
    const flashRef = useRef<THREE.Mesh>(null);
    const [startTime, setStartTime] = useState<number | null>(null);

    useEffect(() => {
        setStartTime(null); // reset on type change
    }, [type]);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (startTime === null) {
            setStartTime(t);
            return;
        }

        const elapsed = t - startTime;
        const progress = Math.min(elapsed / EFFECT_DURATION, 1);

        if (progress >= 1) {
            onComplete?.();
            return;
        }

        if (!groupRef.current) return;

        // Flash effect
        if (flashRef.current) {
            const flashMat = flashRef.current.material as THREE.MeshStandardMaterial;
            if (type === "spawn") {
                const flashPhase = Math.max(0, 1 - progress * 3);
                flashRef.current.scale.setScalar(flashPhase * 3);
                flashMat.opacity = flashPhase * 0.8;
            } else if (type === "despawn") {
                const flashPhase = progress < 0.2 ? progress * 5 : Math.max(0, 1 - (progress - 0.2) * 1.5);
                flashRef.current.scale.setScalar(flashPhase * 2);
                flashMat.opacity = flashPhase * 0.6;
            } else if (type === "celebrate") {
                flashRef.current.scale.setScalar(0.5 + Math.sin(progress * Math.PI * 4) * 0.3);
                flashMat.opacity = (1 - progress) * 0.3;
            } else {
                flashRef.current.scale.setScalar(0);
                flashMat.opacity = 0;
            }
        }

        // Particle animation
        groupRef.current.children.forEach((child, i) => {
            if (child === flashRef.current) return;
            const mesh = child as THREE.Mesh;
            const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
            const mat = mesh.material as THREE.MeshStandardMaterial;

            switch (type) {
                case "spawn": {
                    // Particles converge inward
                    const radius = (1 - progress) * 3;
                    const yOffset = (1 - progress) * 2 + Math.sin(progress * Math.PI) * 1;
                    mesh.position.set(
                        Math.cos(angle + progress * 3) * radius,
                        yOffset + 0.8,
                        Math.sin(angle + progress * 3) * radius,
                    );
                    mesh.scale.setScalar(0.3 + progress * 0.5);
                    mat.opacity = Math.min(progress * 2, 1 - Math.max(0, progress - 0.8) * 5);
                    break;
                }
                case "despawn": {
                    // Particles explode outward
                    const radius = progress * 4;
                    const yOffset = progress * 3 - progress * progress * 2;
                    mesh.position.set(
                        Math.cos(angle) * radius,
                        yOffset + 0.8,
                        Math.sin(angle) * radius,
                    );
                    mesh.scale.setScalar(Math.max(0, 0.6 - progress * 0.6));
                    mat.opacity = 1 - progress;
                    break;
                }
                case "celebrate": {
                    // Spiraling upward golden particles
                    const spiralAngle = angle + progress * Math.PI * 4;
                    const spiralRadius = 0.5 + Math.sin(progress * Math.PI) * 1.5;
                    mesh.position.set(
                        Math.cos(spiralAngle) * spiralRadius,
                        progress * 4 + Math.sin(progress * Math.PI * 6 + i) * 0.3,
                        Math.sin(spiralAngle) * spiralRadius,
                    );
                    mesh.scale.setScalar(0.3 + Math.sin(progress * Math.PI) * 0.4);
                    mat.opacity = Math.sin(progress * Math.PI);
                    mat.emissiveIntensity = 2 + Math.sin(progress * Math.PI * 8) * 1;
                    break;
                }
                case "alert": {
                    // Pulsing ring expands and contracts
                    const pulsePhase = Math.sin(progress * Math.PI * 6);
                    const radius2 = 1.5 + pulsePhase * 0.5;
                    mesh.position.set(
                        Math.cos(angle) * radius2,
                        0.8 + Math.sin(progress * Math.PI * 3 + i * 0.5) * 0.2,
                        Math.sin(angle) * radius2,
                    );
                    mesh.scale.setScalar(0.2 + Math.abs(pulsePhase) * 0.3);
                    mat.opacity = (1 - progress) * 0.9;
                    break;
                }
                case "power_up": {
                    // Ascending energy column
                    const colAngle = angle + progress * 2;
                    const colRadius = 0.3 + (i / PARTICLE_COUNT) * 0.5;
                    const yPos = (i / PARTICLE_COUNT) * 3 * progress + Math.sin(progress * Math.PI * 4 + i) * 0.2;
                    mesh.position.set(
                        Math.cos(colAngle) * colRadius,
                        yPos + 0.5,
                        Math.sin(colAngle) * colRadius,
                    );
                    mesh.scale.setScalar(0.15 + Math.sin(progress * Math.PI) * 0.2);
                    mat.opacity = Math.sin(progress * Math.PI) * 0.9;
                    mat.emissiveIntensity = 1.5 + progress * 2;
                    break;
                }
                case "shake": {
                    // Vibrating particles close to body
                    const shakeX = Math.sin(progress * 40 + i * 2) * 0.3 * (1 - progress);
                    const shakeZ = Math.cos(progress * 40 + i * 3) * 0.3 * (1 - progress);
                    mesh.position.set(
                        Math.cos(angle) * 0.5 + shakeX,
                        0.8 + Math.sin(progress * Math.PI * 2 + i) * 0.5,
                        Math.sin(angle) * 0.5 + shakeZ,
                    );
                    mesh.scale.setScalar(Math.max(0, 0.3 - progress * 0.3));
                    mat.opacity = 1 - progress;
                    break;
                }
            }
        });
    });

    const particleColor = type === "celebrate" ? "#fbbf24"
        : type === "alert" ? "#ef4444"
        : type === "power_up" ? "#22d3ee"
        : color;

    return (
        <group position={position}>
            <group ref={groupRef}>
                {/* Central flash */}
                <mesh ref={flashRef}>
                    <sphereGeometry args={[0.5, 12, 12]} />
                    <meshStandardMaterial
                        color={particleColor}
                        emissive={particleColor}
                        emissiveIntensity={2}
                        transparent
                        opacity={0}
                    />
                </mesh>

                {/* Particles */}
                {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                    <mesh key={i}>
                        <octahedronGeometry args={[0.06]} />
                        <meshStandardMaterial
                            color={particleColor}
                            emissive={particleColor}
                            emissiveIntensity={1.5}
                            transparent
                            opacity={0}
                        />
                    </mesh>
                ))}
            </group>

            {/* Ground ring for spawn/despawn */}
            {(type === "spawn" || type === "despawn" || type === "power_up") && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                    <ringGeometry args={[0.8, 1.2, 24]} />
                    <meshStandardMaterial
                        color={particleColor}
                        emissive={particleColor}
                        emissiveIntensity={1}
                        transparent
                        opacity={0.4}
                    />
                </mesh>
            )}
        </group>
    );
}
