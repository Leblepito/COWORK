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

/* ══════════════════════════════════════════════════════ */
/* ── v7 NEW ACCESSORIES ────────────────────────────── */
/* ══════════════════════════════════════════════════════ */

/* ── Gamepad ────────────────────────────────────────── */
export function Gamepad({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh>
                <boxGeometry args={[0.07 * scale, 0.02 * scale, 0.04 * scale]} />
                <meshStandardMaterial color="#1f2937" roughness={0.5} />
            </mesh>
            <mesh position={[-0.02 * scale, 0.012 * scale, 0]}>
                <sphereGeometry args={[0.006 * scale, 6, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[0.02 * scale, 0.012 * scale, 0]}>
                <sphereGeometry args={[0.006 * scale, 6, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
            </mesh>
        </group>
    );
}

/* ── ChartScreen (Trade Master) ────────────────────── */
export function ChartScreen({ color, scale = 1 }: AccessoryProps) {
    const barRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (barRef.current) barRef.current.scale.y = 0.8 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
    });
    return (
        <group>
            <mesh>
                <boxGeometry args={[0.12 * scale, 0.08 * scale, 0.003 * scale]} />
                <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.3} />
            </mesh>
            {/* Candlestick bars */}
            {[-0.04, -0.02, 0, 0.02, 0.04].map((x, i) => (
                <mesh key={i} ref={i === 2 ? barRef : undefined} position={[x * scale, -0.01 * scale, 0.003 * scale]}>
                    <boxGeometry args={[0.008 * scale, 0.03 * scale, 0.002 * scale]} />
                    <meshStandardMaterial color={i % 2 === 0 ? "#22c55e" : "#ef4444"} emissive={i % 2 === 0 ? "#22c55e" : "#ef4444"} emissiveIntensity={0.6} />
                </mesh>
            ))}
        </group>
    );
}

/* ── Terminal (Full Stack Dev) ──────────────────────── */
export function Terminal({ color, scale = 1 }: AccessoryProps) {
    const cursorRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (cursorRef.current) cursorRef.current.visible = Math.sin(state.clock.elapsedTime * 4) > 0;
    });
    return (
        <group>
            {/* Screen */}
            <mesh position={[0, 0.03 * scale, -0.025 * scale]} rotation={[-0.4, 0, 0]}>
                <boxGeometry args={[0.07 * scale, 0.05 * scale, 0.003 * scale]} />
                <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.4} />
            </mesh>
            {/* Base */}
            <mesh>
                <boxGeometry args={[0.08 * scale, 0.004 * scale, 0.06 * scale]} />
                <meshStandardMaterial color="#1f2937" metalness={0.4} roughness={0.5} />
            </mesh>
            {/* Cursor blink */}
            <mesh ref={cursorRef} position={[0.01 * scale, 0.035 * scale, -0.022 * scale]} rotation={[-0.4, 0, 0]}>
                <boxGeometry args={[0.005 * scale, 0.01 * scale, 0.001 * scale]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} />
            </mesh>
        </group>
    );
}

/* ── Stethoscope (Clinic Director) ─────────────────── */
export function Stethoscope({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            {/* Tube arc */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.06 * scale, 0.005 * scale, 6, 16, Math.PI]} />
                <meshStandardMaterial color="#6b7280" />
            </mesh>
            {/* Chest piece */}
            <mesh position={[0, -0.06 * scale, 0]}>
                <cylinderGeometry args={[0.015 * scale, 0.012 * scale, 0.01 * scale, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.6} />
            </mesh>
            {/* Ear pieces */}
            <mesh position={[-0.06 * scale, 0, 0]}>
                <sphereGeometry args={[0.008 * scale, 6, 6]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.5} />
            </mesh>
            <mesh position={[0.06 * scale, 0, 0]}>
                <sphereGeometry args={[0.008 * scale, 6, 6]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.5} />
            </mesh>
        </group>
    );
}

/* ── Globe (Travel Planner) ────────────────────────── */
export function Globe({ color, scale = 1 }: AccessoryProps) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.5;
    });
    return (
        <group>
            <mesh ref={ref}>
                <sphereGeometry args={[0.06 * scale, 16, 16]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} wireframe transparent opacity={0.6} />
            </mesh>
            {/* Equator ring */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.065 * scale, 0.003 * scale, 6, 24]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

/* ── Gear (Data Ops) ───────────────────────────────── */
export function Gear({ color, scale = 1 }: AccessoryProps) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (ref.current) ref.current.rotation.z = state.clock.elapsedTime * 1.5;
    });
    return (
        <group>
            {/* Gear body — torus with teeth approximation */}
            <mesh ref={ref}>
                <torusGeometry args={[0.04 * scale, 0.012 * scale, 6, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Center hub */}
            <mesh>
                <cylinderGeometry args={[0.012 * scale, 0.012 * scale, 0.01 * scale, 6]} />
                <meshStandardMaterial color="#374151" metalness={0.6} />
            </mesh>
        </group>
    );
}

/* ── KeyCard (Hotel Manager) ───────────────────────── */
export function KeyCard({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh>
                <boxGeometry args={[0.04 * scale, 0.06 * scale, 0.004 * scale]} />
                <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
            </mesh>
            {/* Magnetic strip */}
            <mesh position={[0, -0.015 * scale, 0.003 * scale]}>
                <boxGeometry args={[0.035 * scale, 0.008 * scale, 0.001 * scale]} />
                <meshStandardMaterial color="#1f2937" />
            </mesh>
            {/* LED indicator */}
            <mesh position={[0, 0.02 * scale, 0.003 * scale]}>
                <sphereGeometry args={[0.004 * scale, 6, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
            </mesh>
        </group>
    );
}

/* ── Wrench ────────────────────────────────────────── */
export function Wrench({ color, scale = 1 }: AccessoryProps) {
    return (
        <group rotation={[0, 0, 0.3]}>
            {/* Handle */}
            <mesh position={[0, -0.03 * scale, 0]}>
                <cylinderGeometry args={[0.006 * scale, 0.006 * scale, 0.06 * scale, 6]} />
                <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
            </mesh>
            {/* Head */}
            <mesh position={[0, 0.01 * scale, 0]}>
                <torusGeometry args={[0.015 * scale, 0.005 * scale, 4, 6, Math.PI * 1.5]} />
                <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
            </mesh>
        </group>
    );
}

/* ── MonitorStack (Tech Lead) ──────────────────────── */
export function MonitorStack({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            {/* Main monitor */}
            <mesh position={[0, 0.03 * scale, 0]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.09 * scale, 0.06 * scale, 0.003 * scale]} />
                <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.5} />
            </mesh>
            {/* Side monitor */}
            <mesh position={[0.055 * scale, 0.03 * scale, 0.01 * scale]} rotation={[-0.2, -0.4, 0]}>
                <boxGeometry args={[0.05 * scale, 0.04 * scale, 0.002 * scale]} />
                <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.3} />
            </mesh>
            {/* Stand */}
            <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.008 * scale, 0.015 * scale, 0.02 * scale, 6]} />
                <meshStandardMaterial color="#374151" metalness={0.5} />
            </mesh>
        </group>
    );
}

/* ── Phone (Concierge) ─────────────────────────────── */
export function Phone({ color, scale = 1 }: AccessoryProps) {
    return (
        <group>
            <mesh>
                <boxGeometry args={[0.03 * scale, 0.055 * scale, 0.005 * scale]} />
                <meshStandardMaterial color="#1f2937" roughness={0.4} />
            </mesh>
            {/* Screen */}
            <mesh position={[0, 0.005 * scale, 0.003 * scale]}>
                <boxGeometry args={[0.025 * scale, 0.04 * scale, 0.001 * scale]} />
                <meshStandardMaterial color="#0f172a" emissive={color} emissiveIntensity={0.6} />
            </mesh>
        </group>
    );
}

/* ── Brain (Quant Brain) ───────────────────────────── */
export function Brain({ color, scale = 1 }: AccessoryProps) {
    const ref = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (ref.current) {
            const s = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
            ref.current.scale.setScalar(s);
        }
    });
    return (
        <group ref={ref}>
            {/* Main brain mass */}
            <mesh>
                <sphereGeometry args={[0.05 * scale, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.8} />
            </mesh>
            {/* Brain folds — smaller spheres */}
            <mesh position={[-0.02 * scale, 0.02 * scale, 0]}>
                <sphereGeometry args={[0.03 * scale, 6, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.6} />
            </mesh>
            <mesh position={[0.02 * scale, 0.02 * scale, 0]}>
                <sphereGeometry args={[0.03 * scale, 6, 6]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.6} />
            </mesh>
        </group>
    );
}

/* ── Package (Cargo) ───────────────────────────────── */
export function Package({ color, scale = 1 }: AccessoryProps) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (ref.current) ref.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.01;
    });
    return (
        <group>
            <mesh ref={ref}>
                <boxGeometry args={[0.06 * scale, 0.05 * scale, 0.06 * scale]} />
                <meshStandardMaterial color="#92400e" roughness={0.7} />
            </mesh>
            {/* Tape cross */}
            <mesh position={[0, 0.026 * scale, 0]}>
                <boxGeometry args={[0.06 * scale, 0.002 * scale, 0.01 * scale]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, 0.026 * scale, 0]}>
                <boxGeometry args={[0.01 * scale, 0.002 * scale, 0.06 * scale]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}
