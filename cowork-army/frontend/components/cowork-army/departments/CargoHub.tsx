"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Cargo Hub — Center of the office
 * Rotating platform, 4 direction arrows, package stack, delivery indicators
 */
export default function CargoHub({ position }: { position: [number, number, number] }) {
    const platformRef = useRef<THREE.Mesh>(null);
    const arrowGroupRef = useRef<THREE.Group>(null);
    const packageRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Rotate platform
        if (platformRef.current) {
            platformRef.current.rotation.y = t * 0.3;
        }
        // Pulse arrows
        if (arrowGroupRef.current) {
            arrowGroupRef.current.children.forEach((child, i) => {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                    (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
                        0.3 + Math.sin(t * 2 + i * Math.PI / 2) * 0.3;
                }
            });
        }
        // Package hover
        if (packageRef.current) {
            packageRef.current.position.y = 1.5 + Math.sin(t * 1.5) * 0.1;
        }
    });

    return (
        <group position={position}>
            {/* Rotating platform base */}
            <mesh ref={platformRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[2.5, 2.5, 0.1, 24]} />
                <meshStandardMaterial color="#1f2937" emissive="#f59e0b" emissiveIntensity={0.1} metalness={0.5} roughness={0.3} />
            </mesh>

            {/* Platform ring */}
            <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2.5, 0.05, 8, 24]} />
                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>

            {/* Inner ring */}
            <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.5, 0.03, 6, 16]} />
                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.6} />
            </mesh>

            {/* 4 Direction arrows (N, S, E, W → trade, hotel, medical, software) */}
            <group ref={arrowGroupRef}>
                {/* Trade (NW) */}
                <mesh position={[-3.5, 0.05, -2.5]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
                    <coneGeometry args={[0.3, 0.8, 3]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
                </mesh>
                {/* Medical (NE) */}
                <mesh position={[3.5, 0.05, -2.5]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
                    <coneGeometry args={[0.3, 0.8, 3]} />
                    <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.3} />
                </mesh>
                {/* Hotel (SW) */}
                <mesh position={[-3.5, 0.05, 2.5]} rotation={[-Math.PI / 2, 0, -Math.PI * 3 / 4]}>
                    <coneGeometry args={[0.3, 0.8, 3]} />
                    <meshStandardMaterial color="#ec4899" emissive="#ec4899" emissiveIntensity={0.3} />
                </mesh>
                {/* Software (SE) */}
                <mesh position={[3.5, 0.05, 2.5]} rotation={[-Math.PI / 2, 0, Math.PI * 3 / 4]}>
                    <coneGeometry args={[0.3, 0.8, 3]} />
                    <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
                </mesh>
            </group>

            {/* Package stack (center, hovering) */}
            <group ref={packageRef} position={[0, 1.5, 0]}>
                <mesh>
                    <boxGeometry args={[0.5, 0.4, 0.5]} />
                    <meshStandardMaterial color="#92400e" roughness={0.7} />
                </mesh>
                {/* Tape */}
                <mesh position={[0, 0.21, 0]}>
                    <boxGeometry args={[0.5, 0.02, 0.08]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
                </mesh>
                <mesh position={[0, 0.21, 0]}>
                    <boxGeometry args={[0.08, 0.02, 0.5]} />
                    <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
                </mesh>
            </group>

            {/* Light pillar */}
            <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 4, 6]} />
                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.4} transparent opacity={0.15} />
            </mesh>

            {/* Delivery status lights around the rim */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                const angle = (i / 8) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(angle) * 2.8, 0.15, Math.sin(angle) * 2.8]}>
                        <sphereGeometry args={[0.06, 6, 6]} />
                        <meshStandardMaterial
                            color={i % 2 === 0 ? "#22c55e" : "#f59e0b"}
                            emissive={i % 2 === 0 ? "#22c55e" : "#f59e0b"}
                            emissiveIntensity={0.8}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}
