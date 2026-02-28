"use client";

import { Html } from "@react-three/drei";
import type { CoworkAgent } from "@/lib/cowork-api";
import { TIER_COLORS } from "./scene-constants";

interface AgentDeskProps {
    agent: CoworkAgent;
    position: [number, number, number];
}

const LEG_OFFSETS: [number, number, number][] = [
    [-0.5, 0.25, -0.3],
    [0.5, 0.25, -0.3],
    [-0.5, 0.25, 0.3],
    [0.5, 0.25, 0.3],
];

export default function AgentDesk({ agent, position }: AgentDeskProps) {
    const tierColor = TIER_COLORS[agent.tier] || TIER_COLORS.WORKER;

    return (
        <group position={position}>
            {/* Desk surface */}
            <mesh position={[0, 0.5, 0]} castShadow>
                <boxGeometry args={[1.2, 0.05, 0.8]} />
                <meshStandardMaterial color={agent.color} roughness={0.6} />
            </mesh>
            {/* Desk legs */}
            {LEG_OFFSETS.map(([x, y, z], i) => (
                <mesh key={i} position={[x, y, z]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
                    <meshStandardMaterial color="#2a2a3e" />
                </mesh>
            ))}
            {/* Monitor */}
            <mesh position={[0, 0.75, -0.15]}>
                <boxGeometry args={[0.4, 0.3, 0.02]} />
                <meshStandardMaterial color="#1a1a2e" emissive={agent.color} emissiveIntensity={0.3} />
            </mesh>
            {/* Agent icon on monitor — HTML overlay */}
            <Html position={[0, 0.78, -0.13]} center distanceFactor={8} style={{ pointerEvents: "none" }}>
                <span style={{ fontSize: "16px" }}>{agent.icon}</span>
            </Html>
            {/* Agent name + tier below desk — HTML overlay */}
            <Html position={[0, 0.15, 0.55]} center distanceFactor={10} style={{ pointerEvents: "none" }}>
                <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: "9px", fontWeight: 600, color: tierColor }}>{agent.name}</div>
                    <div style={{ fontSize: "7px", color: tierColor, opacity: 0.7 }}>{agent.tier}</div>
                </div>
            </Html>
        </group>
    );
}
