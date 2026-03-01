"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Software Department — Purple theme
 * Server rack, code screen, network cables, whiteboard, purple glow
 */
export default function SoftwareDepartment({ position }: { position: [number, number, number] }) {
    const screenRef = useRef<THREE.Mesh>(null);
    const ledRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Code screen scroll effect
        if (screenRef.current) {
            const mat = screenRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.1;
        }
        // Server LED blink
        if (ledRef.current) {
            ledRef.current.visible = Math.sin(t * 8) > 0;
        }
    });

    return (
        <group position={position}>
            {/* Floor glow */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#a855f7" transparent opacity={0.03} emissive="#a855f7" emissiveIntensity={0.1} />
            </mesh>

            {/* Server rack (left side) */}
            <group position={[-3, 0, 0]}>
                {/* Rack frame */}
                <mesh position={[0, 1.2, 0]}>
                    <boxGeometry args={[0.8, 2.4, 0.5]} />
                    <meshStandardMaterial color="#1f2937" roughness={0.5} metalness={0.3} />
                </mesh>
                {/* Server units */}
                {[0.3, 0.7, 1.1, 1.5, 1.9].map((y, i) => (
                    <mesh key={i} position={[0, y, 0.26]}>
                        <boxGeometry args={[0.7, 0.3, 0.02]} />
                        <meshStandardMaterial color="#111827" emissive="#a855f7" emissiveIntensity={0.1} />
                    </mesh>
                ))}
                {/* Blinking LEDs */}
                {[0.3, 0.7, 1.1, 1.5, 1.9].map((y, i) => (
                    <mesh key={i} ref={i === 2 ? ledRef : undefined} position={[0.3, y, 0.28]}>
                        <sphereGeometry args={[0.02, 4, 4]} />
                        <meshStandardMaterial
                            color={i % 2 === 0 ? "#22c55e" : "#3b82f6"}
                            emissive={i % 2 === 0 ? "#22c55e" : "#3b82f6"}
                            emissiveIntensity={1.5}
                        />
                    </mesh>
                ))}
            </group>

            {/* Large code screen (back wall) */}
            <mesh ref={screenRef} position={[0, 2, -3.5]}>
                <boxGeometry args={[4, 2, 0.08]} />
                <meshStandardMaterial color="#0f172a" emissive="#a855f7" emissiveIntensity={0.3} />
            </mesh>
            {/* Code lines on screen */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((y, i) => (
                <mesh key={i} position={[-0.5 + (i % 3) * 0.3, 1.3 + y * 0.8, -3.44]}>
                    <boxGeometry args={[0.8 - (i % 3) * 0.15, 0.05, 0.01]} />
                    <meshStandardMaterial
                        color={["#22c55e", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#34d399"][i]}
                        emissive={["#22c55e", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#34d399"][i]}
                        emissiveIntensity={0.8}
                    />
                </mesh>
            ))}

            {/* Network cables (floor) */}
            {[[-1, 0], [0, 0], [1, 0]].map(([x, z], i) => (
                <mesh key={i} position={[x, 0.02, z]} rotation={[0, (i * Math.PI) / 3, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 2, 4]} />
                    <meshStandardMaterial color={["#3b82f6", "#a855f7", "#22c55e"][i]} transparent opacity={0.4} />
                </mesh>
            ))}

            {/* Whiteboard (right side) */}
            <group position={[3.5, 0, 0]}>
                <mesh position={[0, 1.5, 0]} rotation={[0, -0.3, 0]}>
                    <boxGeometry args={[0.05, 1.8, 1.4]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.3} />
                </mesh>
                {/* Sticky notes on whiteboard */}
                {[[0.04, 1.8, 0.2], [0.04, 1.4, -0.3], [0.04, 2, -0.1]].map(([x, y, z], i) => (
                    <mesh key={i} position={[x, y, z]} rotation={[0, -0.3, 0]}>
                        <boxGeometry args={[0.01, 0.2, 0.2]} />
                        <meshStandardMaterial color={["#fbbf24", "#ec4899", "#22d3ee"][i]} />
                    </mesh>
                ))}
            </group>
        </group>
    );
}
