"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Trade Department — Amber theme
 * 3 monitor walls, ticker tape, candle charts, amber glow
 */
export default function TradeDepartment({ position }: { position: [number, number, number] }) {
    const tickerRef = useRef<THREE.Group>(null);
    const chartRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        // Ticker tape scroll
        if (tickerRef.current) {
            tickerRef.current.position.x = ((t * 0.5) % 4) - 2;
        }
        // Chart pulse
        if (chartRef.current) {
            chartRef.current.scale.y = 0.8 + Math.sin(t * 2) * 0.2;
        }
    });

    return (
        <group position={position}>
            {/* Floor glow */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[8, 8]} />
                <meshStandardMaterial color="#f59e0b" transparent opacity={0.03} emissive="#f59e0b" emissiveIntensity={0.1} />
            </mesh>

            {/* Main monitor wall (back) */}
            <mesh position={[0, 2, -3.5]}>
                <boxGeometry args={[5, 2.5, 0.1]} />
                <meshStandardMaterial color="#0f172a" emissive="#f59e0b" emissiveIntensity={0.15} />
            </mesh>

            {/* Candlestick bars on main monitor */}
            {[-1.5, -1, -0.5, 0, 0.5, 1, 1.5].map((x, i) => (
                <mesh key={i} ref={i === 3 ? chartRef : undefined} position={[x, 1.5 + (i % 3) * 0.3, -3.4]}>
                    <boxGeometry args={[0.15, 0.3 + (i % 4) * 0.15, 0.05]} />
                    <meshStandardMaterial
                        color={i % 2 === 0 ? "#22c55e" : "#ef4444"}
                        emissive={i % 2 === 0 ? "#22c55e" : "#ef4444"}
                        emissiveIntensity={0.5}
                    />
                </mesh>
            ))}

            {/* Side monitors */}
            <mesh position={[-3.5, 1.8, -1]} rotation={[0, 0.4, 0]}>
                <boxGeometry args={[2, 1.5, 0.08]} />
                <meshStandardMaterial color="#0f172a" emissive="#eab308" emissiveIntensity={0.1} />
            </mesh>
            <mesh position={[3.5, 1.8, -1]} rotation={[0, -0.4, 0]}>
                <boxGeometry args={[2, 1.5, 0.08]} />
                <meshStandardMaterial color="#0f172a" emissive="#eab308" emissiveIntensity={0.1} />
            </mesh>

            {/* Ticker tape */}
            <group ref={tickerRef} position={[0, 0.8, -3.4]}>
                {[0, 0.6, 1.2, 1.8, 2.4].map((x, i) => (
                    <mesh key={i} position={[x - 1.2, 0, 0]}>
                        <boxGeometry args={[0.4, 0.08, 0.02]} />
                        <meshStandardMaterial
                            color={i % 2 === 0 ? "#22c55e" : "#ef4444"}
                            emissive={i % 2 === 0 ? "#22c55e" : "#ef4444"}
                            emissiveIntensity={0.8}
                        />
                    </mesh>
                ))}
            </group>

            {/* Ambient light pillar */}
            <mesh position={[0, 1.5, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 3, 6]} />
                <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} transparent opacity={0.2} />
            </mesh>
        </group>
    );
}
