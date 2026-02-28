"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface AccessoryProps {
    color: string;
    scale?: number;
}

/* ── Crown (Commander) ───────────────────────────────── */
export function Crown({ scale = 1 }: AccessoryProps) {
    const pts = useMemo(() => {
        const out: [number, number, number][] = [];
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            out.push([Math.cos(a) * 0.09 * scale, 0.03 * scale, Math.sin(a) * 0.09 * scale]);
        }
        return out;
    }, [scale]);

    return (
        <group>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.1 * scale, 0.012 * scale, 6, 16]} />
                <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} metalness={0.8} roughness={0.2} />
            </mesh>
            {pts.map((p, i) => (
                <mesh key={i} position={p}>
                    <coneGeometry args={[0.018 * scale, 0.07 * scale, 4]} />
                    <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} metalness={0.9} roughness={0.2} />
                </mesh>
            ))}
        </group>
    );
}

/* ── Magnifying Glass (Supervisor) ───────────────────── */
export function MagnifyingGlass({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh>
                <torusGeometry args={[0.06 * scale, 0.008 * scale, 8, 16]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.1 * scale, 0]}>
                <cylinderGeometry args={[0.008 * scale, 0.01 * scale, 0.1 * scale, 6]} />
                <meshStandardMaterial color="#5c4033" roughness={0.7} />
            </mesh>
            <mesh>
                <sphereGeometry args={[0.05 * scale, 12, 12]} />
                <meshStandardMaterial color="#a0d8ef" transparent opacity={0.3} />
            </mesh>
        </group>
    );
}

/* ── Medical Cross (Med Health) ──────────────────────── */
export function MedicalCross({ scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh>
                <boxGeometry args={[0.06 * scale, 0.02 * scale, 0.008 * scale]} />
                <meshStandardMaterial color="#ffffff" emissive="#ef4444" emissiveIntensity={0.6} />
            </mesh>
            <mesh>
                <boxGeometry args={[0.02 * scale, 0.06 * scale, 0.008 * scale]} />
                <meshStandardMaterial color="#ffffff" emissive="#ef4444" emissiveIntensity={0.6} />
            </mesh>
        </group>
    );
}

/* ── Wings (Travel Agent) ────────────────────────────── */
export function Wings({ color, scale = 1 }: AccessoryProps) {
    const geo = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const s = scale;
        const verts = new Float32Array([0, 0, 0, -0.18 * s, 0.08 * s, -0.04 * s, -0.1 * s, -0.08 * s, -0.02 * s]);
        g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        g.computeVertexNormals();
        return g;
    }, [scale]);

    const geo2 = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const s = scale;
        const verts = new Float32Array([0, 0, 0, 0.18 * s, 0.08 * s, -0.04 * s, 0.1 * s, -0.08 * s, -0.02 * s]);
        g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        g.computeVertexNormals();
        return g;
    }, [scale]);

    return (
        <group>
            <mesh geometry={geo}>
                <meshStandardMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            <mesh geometry={geo2}>
                <meshStandardMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

/* ── Antenna (Trade Engine) ──────────────────────────── */
export function Antenna({ color, scale = 1 }: AccessoryProps) {
    const tipRef1 = useRef<THREE.Mesh>(null);
    const tipRef2 = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (tipRef1.current) tipRef1.current.scale.setScalar(0.8 + Math.sin(t * 4) * 0.3);
        if (tipRef2.current) tipRef2.current.scale.setScalar(0.8 + Math.sin(t * 4 + Math.PI) * 0.3);
    });

    return (
        <group>
            <mesh position={[-0.04 * scale, 0.06 * scale, 0]} rotation={[0, 0, 0.2]}>
                <cylinderGeometry args={[0.005 * scale, 0.005 * scale, 0.12 * scale, 4]} />
                <meshStandardMaterial color="#6b7280" />
            </mesh>
            <mesh ref={tipRef1} position={[-0.06 * scale, 0.12 * scale, 0]}>
                <sphereGeometry args={[0.015 * scale, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
            </mesh>
            <mesh position={[0.04 * scale, 0.06 * scale, 0]} rotation={[0, 0, -0.2]}>
                <cylinderGeometry args={[0.005 * scale, 0.005 * scale, 0.12 * scale, 4]} />
                <meshStandardMaterial color="#6b7280" />
            </mesh>
            <mesh ref={tipRef2} position={[0.06 * scale, 0.12 * scale, 0]}>
                <sphereGeometry args={[0.015 * scale, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
            </mesh>
        </group>
    );
}

/* ── Binoculars (Alpha Scout) ────────────────────────── */
export function Binoculars({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh position={[-0.025 * scale, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.015 * scale, 0.018 * scale, 0.05 * scale, 8]} />
                <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0.025 * scale, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.015 * scale, 0.018 * scale, 0.05 * scale, 8]} />
                <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0, -0.01 * scale]}>
                <boxGeometry args={[0.03 * scale, 0.01 * scale, 0.01 * scale]} />
                <meshStandardMaterial color="#374151" />
            </mesh>
            {/* Lens glow */}
            <mesh position={[-0.025 * scale, 0, 0.03 * scale]}>
                <sphereGeometry args={[0.012 * scale, 6, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.5} />
            </mesh>
            <mesh position={[0.025 * scale, 0, 0.03 * scale]}>
                <sphereGeometry args={[0.012 * scale, 6, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

/* ── Compass (Tech Analyst) ──────────────────────────── */
export function Compass({ color, scale = 1 }: AccessoryProps) {
    const needleRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (needleRef.current) needleRef.current.rotation.z = state.clock.elapsedTime * 1.5;
    });

    return (
        <group>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.05 * scale, 0.005 * scale, 6, 16]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh ref={needleRef}>
                <boxGeometry args={[0.07 * scale, 0.006 * scale, 0.003 * scale]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

/* ── Shield (Risk Sentinel) ──────────────────────────── */
export function Shield({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh scale={[1, 1, 0.2]}>
                <octahedronGeometry args={[0.1 * scale]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.1 * scale, 0.008 * scale, 6, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.8} />
            </mesh>
        </group>
    );
}

/* ── Flask (Quant Lab) ───────────────────────────────── */
export function Flask({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            {/* Flask body */}
            <mesh position={[0, 0, 0]}>
                <coneGeometry args={[0.035 * scale, 0.06 * scale, 8]} />
                <meshStandardMaterial color="#e5e7eb" transparent opacity={0.5} />
            </mesh>
            {/* Neck */}
            <mesh position={[0, 0.045 * scale, 0]}>
                <cylinderGeometry args={[0.008 * scale, 0.012 * scale, 0.03 * scale, 6]} />
                <meshStandardMaterial color="#e5e7eb" transparent opacity={0.5} />
            </mesh>
            {/* Liquid */}
            <mesh position={[0, -0.01 * scale, 0]}>
                <sphereGeometry args={[0.025 * scale, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.7} />
            </mesh>
        </group>
    );
}

/* ── Rocket Fins (Growth Ops) ────────────────────────── */
export function RocketFins({ color, scale = 1 }: AccessoryProps) {
    const fins = useMemo(() => {
        const arr: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 3; i++) {
            const g = new THREE.BufferGeometry();
            const s = scale;
            const verts = new Float32Array([0, 0.04 * s, 0, -0.04 * s, -0.06 * s, 0, 0.04 * s, -0.06 * s, 0]);
            g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
            g.computeVertexNormals();
            arr.push(g);
        }
        return arr;
    }, [scale]);

    return (
        <group>
            {fins.map((geo, i) => (
                <mesh key={i} geometry={geo} rotation={[0, (i / 3) * Math.PI * 2, 0]}>
                    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
}

/* ── Laptop (Web Dev) ────────────────────────────────── */
export function Laptop({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            {/* Base */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.08 * scale, 0.004 * scale, 0.06 * scale]} />
                <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
            </mesh>
            {/* Screen */}
            <mesh position={[0, 0.03 * scale, -0.025 * scale]} rotation={[-0.4, 0, 0]}>
                <boxGeometry args={[0.07 * scale, 0.05 * scale, 0.003 * scale]} />
                <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.6} />
            </mesh>
        </group>
    );
}

/* ── Briefcase (Finance) ─────────────────────────────── */
export function Briefcase({ scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh>
                <boxGeometry args={[0.06 * scale, 0.04 * scale, 0.02 * scale]} />
                <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.025 * scale, 0]} rotation={[0, 0, 0]}>
                <torusGeometry args={[0.015 * scale, 0.003 * scale, 4, 8, Math.PI]} />
                <meshStandardMaterial color="#92400e" metalness={0.6} />
            </mesh>
        </group>
    );
}
