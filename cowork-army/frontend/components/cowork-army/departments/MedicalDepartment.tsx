"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Medical Department — Cyan theme
 * Medical cross, IV stands, hospital bed, heartbeat line, cyan glow
 */
export default function MedicalDepartment({ position }: { position: [number, number, number] }) {
    const heartbeatRef = useRef<THREE.Group>(null);
    const crossRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Heartbeat pulse
        if (heartbeatRef.current) {
            const s = 1 + Math.sin(t * 4) * 0.1;
            heartbeatRef.current.scale.set(s, s, s);
        }
        // Cross glow pulse
        if (crossRef.current) {
            crossRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
        }
    });

    return (
        <group position={position}>
            {/* Floor glow */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 4]} />
                <meshStandardMaterial color="#22d3ee" transparent opacity={0.03} emissive="#22d3ee" emissiveIntensity={0.1} />
            </mesh>

            {/* Large medical cross on back wall */}
            <group ref={crossRef} position={[0, 2.5, -1.5]}>
                <mesh>
                    <boxGeometry args={[0.8, 0.25, 0.05]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ef4444" emissiveIntensity={0.6} />
                </mesh>
                <mesh>
                    <boxGeometry args={[0.25, 0.8, 0.05]} />
                    <meshStandardMaterial color="#ffffff" emissive="#ef4444" emissiveIntensity={0.6} />
                </mesh>
            </group>

            {/* IV stand (left) */}
            <group position={[-2, 0, 0]}>
                <mesh position={[0, 1, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 2, 6]} />
                    <meshStandardMaterial color="#9ca3af" metalness={0.6} />
                </mesh>
                {/* IV bag */}
                <mesh position={[0, 1.8, 0]}>
                    <boxGeometry args={[0.15, 0.25, 0.05]} />
                    <meshStandardMaterial color="#22d3ee" transparent opacity={0.4} emissive="#22d3ee" emissiveIntensity={0.3} />
                </mesh>
                {/* Drip tube */}
                <mesh position={[0, 1.2, 0]}>
                    <cylinderGeometry args={[0.005, 0.005, 1, 4]} />
                    <meshStandardMaterial color="#22d3ee" transparent opacity={0.5} />
                </mesh>
            </group>

            {/* IV stand (right) */}
            <group position={[2, 0, 0]}>
                <mesh position={[0, 1, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 2, 6]} />
                    <meshStandardMaterial color="#9ca3af" metalness={0.6} />
                </mesh>
                <mesh position={[0, 1.8, 0]}>
                    <boxGeometry args={[0.15, 0.25, 0.05]} />
                    <meshStandardMaterial color="#22d3ee" transparent opacity={0.4} emissive="#22d3ee" emissiveIntensity={0.3} />
                </mesh>
            </group>

            {/* Hospital bed (center) */}
            <group position={[0, 0, 0.5]}>
                {/* Bed frame */}
                <mesh position={[0, 0.35, 0]}>
                    <boxGeometry args={[1.2, 0.08, 2]} />
                    <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
                </mesh>
                {/* Legs */}
                {[[-0.5, -0.8], [0.5, -0.8], [-0.5, 0.8], [0.5, 0.8]].map(([x, z], i) => (
                    <mesh key={i} position={[x, 0.17, z]}>
                        <cylinderGeometry args={[0.03, 0.03, 0.34, 6]} />
                        <meshStandardMaterial color="#9ca3af" metalness={0.5} />
                    </mesh>
                ))}
            </group>

            {/* Heartbeat line */}
            <group ref={heartbeatRef} position={[0, 3, -1.5]}>
                {[0, 0.3, 0.6, 0.9, 1.2].map((x, i) => (
                    <mesh key={i} position={[x - 0.6, i === 2 ? 0.15 : i === 3 ? -0.1 : 0, 0]}>
                        <boxGeometry args={[0.2, 0.03, 0.02]} />
                        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}
