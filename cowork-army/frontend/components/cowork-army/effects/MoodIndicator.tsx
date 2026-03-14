"use client";

/**
 * Visual mood/emotion indicators that float above agents.
 *
 * Moods:
 * - neutral: subtle ambient ring
 * - happy: bouncing yellow star
 * - focused: spinning blue gear
 * - stressed: jittering red particles
 * - excited: rapid multicolor sparkles
 * - tired: slow-pulsing dim light
 * - celebrating: golden confetti burst
 *
 * Also shows energy level as a small arc/bar.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type AgentMood = "neutral" | "happy" | "focused" | "stressed" | "excited" | "tired" | "celebrating";

interface MoodIndicatorProps {
    position: THREE.Vector3;
    mood: AgentMood;
    energy: number; // 0-100
    color: string;
}

const MOOD_COLORS: Record<AgentMood, string> = {
    neutral: "#94a3b8",
    happy: "#fbbf24",
    focused: "#3b82f6",
    stressed: "#ef4444",
    excited: "#a855f7",
    tired: "#64748b",
    celebrating: "#fbbf24",
};

export default function MoodIndicator({ position, mood, energy, color }: MoodIndicatorProps) {
    const groupRef = useRef<THREE.Group>(null);
    const moodColor = MOOD_COLORS[mood] || color;

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;

        const children = groupRef.current.children;

        switch (mood) {
            case "happy": {
                // Bouncing star
                children.forEach((child, i) => {
                    if (i >= 3) return; // 3 star particles
                    const angle = t * 2 + i * (Math.PI * 2 / 3);
                    const r = 0.25;
                    child.position.set(
                        Math.cos(angle) * r,
                        2.8 + Math.abs(Math.sin(t * 3 + i)) * 0.3,
                        Math.sin(angle) * r,
                    );
                    child.scale.setScalar(0.08 + Math.sin(t * 4 + i) * 0.03);
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    mat.emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.5;
                });
                break;
            }
            case "focused": {
                // Spinning gear-like ring
                children.forEach((child, i) => {
                    if (i >= 4) return;
                    const angle = t * 3 + i * (Math.PI / 2);
                    const r = 0.3;
                    child.position.set(
                        Math.cos(angle) * r,
                        2.6,
                        Math.sin(angle) * r,
                    );
                    child.rotation.set(t * 2, t * 3, 0);
                    child.scale.setScalar(0.05);
                });
                break;
            }
            case "stressed": {
                // Jittering particles
                children.forEach((child, i) => {
                    if (i >= 4) return;
                    const jitter = Math.sin(t * 15 + i * 3) * 0.15;
                    const jitterZ = Math.cos(t * 12 + i * 5) * 0.15;
                    child.position.set(
                        jitter,
                        2.6 + Math.sin(t * 8 + i) * 0.1,
                        jitterZ,
                    );
                    child.scale.setScalar(0.04 + Math.abs(Math.sin(t * 10 + i)) * 0.03);
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    mat.emissiveIntensity = 2 + Math.sin(t * 8) * 1;
                });
                break;
            }
            case "excited": {
                // Rapid sparkles
                children.forEach((child, i) => {
                    if (i >= 5) return;
                    const angle = t * 5 + i * (Math.PI * 2 / 5);
                    const r = 0.2 + Math.sin(t * 3 + i) * 0.15;
                    child.position.set(
                        Math.cos(angle) * r,
                        2.7 + Math.sin(t * 6 + i * 0.8) * 0.3,
                        Math.sin(angle) * r,
                    );
                    child.scale.setScalar(0.03 + Math.abs(Math.sin(t * 8 + i * 2)) * 0.04);
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    mat.emissiveIntensity = 2 + Math.sin(t * 10 + i) * 1.5;
                });
                break;
            }
            case "tired": {
                // Slow dim pulse
                children.forEach((child, i) => {
                    if (i >= 2) return;
                    child.position.set(0, 2.5 + i * 0.15, 0);
                    const pulse = 0.3 + Math.sin(t * 0.5 + i) * 0.2;
                    child.scale.setScalar(pulse * 0.15);
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    mat.opacity = 0.3 + pulse * 0.3;
                    mat.emissiveIntensity = 0.3 + pulse * 0.5;
                });
                break;
            }
            case "celebrating": {
                // Golden confetti burst
                children.forEach((child, i) => {
                    if (i >= 6) return;
                    const angle = t * 4 + i * (Math.PI * 2 / 6);
                    const r = 0.3 + Math.sin(t * 2 + i) * 0.2;
                    const risePhase = (t * 2 + i * 0.5) % (Math.PI * 2);
                    child.position.set(
                        Math.cos(angle) * r,
                        2.5 + Math.abs(Math.sin(risePhase)) * 1.2,
                        Math.sin(angle) * r,
                    );
                    child.rotation.set(t * 3 + i, t * 2, t + i);
                    child.scale.setScalar(0.04 + Math.sin(t * 5 + i) * 0.02);
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    mat.emissiveIntensity = 2 + Math.sin(t * 6 + i) * 1;
                });
                break;
            }
            default: {
                // Neutral — subtle ambient ring
                children.forEach((child, i) => {
                    if (i >= 2) return;
                    child.position.set(0, 2.4 + i * 0.1, 0);
                    child.scale.setScalar(0.03 + Math.sin(t * 0.8 + i) * 0.01);
                    const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                    mat.opacity = 0.15 + Math.sin(t + i) * 0.05;
                });
            }
        }
    });

    const particleCount = mood === "celebrating" ? 6
        : mood === "excited" ? 5
        : mood === "stressed" ? 4
        : mood === "focused" ? 4
        : mood === "happy" ? 3
        : 2;

    const geom = mood === "celebrating" || mood === "excited"
        ? <octahedronGeometry args={[0.04]} />
        : mood === "focused"
        ? <boxGeometry args={[0.05, 0.05, 0.05]} />
        : <sphereGeometry args={[0.04, 6, 6]} />;

    return (
        <group position={[position.x, position.y, position.z]}>
            <group ref={groupRef}>
                {Array.from({ length: particleCount }).map((_, i) => (
                    <mesh key={i}>
                        {geom}
                        <meshStandardMaterial
                            color={moodColor}
                            emissive={moodColor}
                            emissiveIntensity={1.5}
                            transparent
                            opacity={0.7}
                        />
                    </mesh>
                ))}
            </group>

            {/* Energy bar (small arc below mood indicator) */}
            <EnergyBar position={[0, 2.3, 0]} energy={energy} color={color} />
        </group>
    );
}

/** Small energy arc indicator */
function EnergyBar({ position, energy, color }: { position: [number, number, number]; energy: number; color: string }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        const energyColor = energy > 60 ? "#22c55e" : energy > 30 ? "#f59e0b" : "#ef4444";
        mat.color.set(energyColor);
        mat.emissive.set(energyColor);
        mat.emissiveIntensity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.1;
    });

    const arcLength = (energy / 100) * Math.PI;

    return (
        <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.015, 4, 12, arcLength]} />
            <meshStandardMaterial
                color="#22c55e"
                emissive="#22c55e"
                emissiveIntensity={0.3}
                transparent
                opacity={0.6}
            />
        </mesh>
    );
}
