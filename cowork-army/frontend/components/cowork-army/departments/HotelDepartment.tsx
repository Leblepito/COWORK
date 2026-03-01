"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Hotel Department — Pink theme
 * Reception desk, luggage, car silhouette, palm tree, pink glow
 */
export default function HotelDepartment({ position }: { position: [number, number, number] }) {
    const palmRef = useRef<THREE.Group>(null);
    const signRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Palm tree sway
        if (palmRef.current) {
            palmRef.current.rotation.z = Math.sin(t * 0.8) * 0.05;
        }
        // Sign glow pulse
        if (signRef.current) {
            const mat = signRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.3 + Math.sin(t * 2) * 0.15;
        }
    });

    return (
        <group position={position}>
            {/* Floor glow */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#ec4899" transparent opacity={0.03} emissive="#ec4899" emissiveIntensity={0.1} />
            </mesh>

            {/* Reception desk */}
            <group position={[0, 0, -3]}>
                <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[3, 1, 0.6]} />
                    <meshStandardMaterial color="#78350f" roughness={0.6} />
                </mesh>
                {/* Desk top */}
                <mesh position={[0, 1.02, 0]}>
                    <boxGeometry args={[3.2, 0.04, 0.7]} />
                    <meshStandardMaterial color="#451a03" roughness={0.4} metalness={0.2} />
                </mesh>
                {/* Hotel sign */}
                <mesh ref={signRef} position={[0, 1.8, 0]}>
                    <boxGeometry args={[2, 0.4, 0.05]} />
                    <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.3} />
                </mesh>
            </group>

            {/* Luggage stack */}
            <group position={[3, 0, -1]}>
                <mesh position={[0, 0.2, 0]}>
                    <boxGeometry args={[0.5, 0.4, 0.3]} />
                    <meshStandardMaterial color="#7c2d12" roughness={0.7} />
                </mesh>
                <mesh position={[0.1, 0.55, 0]}>
                    <boxGeometry args={[0.4, 0.3, 0.25]} />
                    <meshStandardMaterial color="#1e3a5f" roughness={0.6} />
                </mesh>
                <mesh position={[-0.05, 0.8, 0]}>
                    <boxGeometry args={[0.3, 0.2, 0.2]} />
                    <meshStandardMaterial color="#be185d" roughness={0.6} />
                </mesh>
            </group>

            {/* Palm tree */}
            <group ref={palmRef} position={[-3, 0, 1]}>
                {/* Trunk */}
                <mesh position={[0, 1.2, 0]}>
                    <cylinderGeometry args={[0.08, 0.12, 2.4, 6]} />
                    <meshStandardMaterial color="#92400e" roughness={0.8} />
                </mesh>
                {/* Leaves */}
                {[0, 1.2, 2.4, 3.6, 4.8].map((rot, i) => (
                    <mesh key={i} position={[Math.cos(rot) * 0.3, 2.3, Math.sin(rot) * 0.3]} rotation={[0.5, rot, 0]}>
                        <coneGeometry args={[0.15, 0.8, 4]} />
                        <meshStandardMaterial color="#22c55e" transparent opacity={0.8} />
                    </mesh>
                ))}
            </group>

            {/* Car silhouette (simple) */}
            <group position={[0, 0, 3]}>
                {/* Body */}
                <mesh position={[0, 0.3, 0]}>
                    <boxGeometry args={[1.8, 0.4, 0.8]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.5} />
                </mesh>
                {/* Roof */}
                <mesh position={[0, 0.6, 0]}>
                    <boxGeometry args={[1, 0.3, 0.7]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.5} />
                </mesh>
                {/* Wheels */}
                {[[-0.6, -0.3], [0.6, -0.3]].map(([x, z], i) => (
                    <mesh key={i} position={[x, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.12, 0.12, 0.08, 8]} />
                        <meshStandardMaterial color="#111827" />
                    </mesh>
                ))}
                {[[-0.6, 0.3], [0.6, 0.3]].map(([x, z], i) => (
                    <mesh key={i + 2} position={[x, 0.1, z]} rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.12, 0.12, 0.08, 8]} />
                        <meshStandardMaterial color="#111827" />
                    </mesh>
                ))}
            </group>
        </group>
    );
}
