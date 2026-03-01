"use client";

import { useRef } from "react";
import * as THREE from "three";
import type { CharacterDef } from "./character-registry";
import {
    Crown,
    MagnifyingGlass,
    MedicalCross,
    Wings,
    Antenna,
    Binoculars,
    Compass,
    Shield,
    Flask,
    RocketFins,
    Laptop,
    Briefcase,
    Gamepad,
    ChartScreen,
    Terminal,
    Stethoscope,
    Globe,
    Gear,
    KeyCard,
    Wrench,
    MonitorStack,
    Phone,
    Brain,
    Package,
} from "./accessories";

interface CharacterBuilderProps {
    characterDef: CharacterDef;
    color: string;
    status: string;
    facingAngle?: number;
    walkPhase?: number;
}

const ACCESSORY_MAP: Record<string, React.FC<{ color: string; scale?: number }>> = {
    crown: Crown,
    magnifying_glass: MagnifyingGlass,
    medical_cross: MedicalCross,
    wings: Wings,
    antenna: Antenna,
    binoculars: Binoculars,
    compass: Compass,
    shield: Shield,
    flask: Flask,
    rocket_fins: RocketFins,
    laptop: Laptop,
    briefcase: Briefcase,
    gamepad: Gamepad,
    chart_screen: ChartScreen,
    terminal: Terminal,
    stethoscope: Stethoscope,
    globe: Globe,
    gear: Gear,
    key_card: KeyCard,
    wrench: Wrench,
    monitor_stack: MonitorStack,
    phone: Phone,
    brain: Brain,
    package: Package,
};

export default function CharacterBuilder({
    characterDef,
    color,
    status,
    walkPhase = 0,
}: CharacterBuilderProps) {
    const leftLegRef = useRef<THREE.Mesh>(null);
    const rightLegRef = useRef<THREE.Mesh>(null);

    const materialColor = status === "error" ? "#ef4444" : color;
    const isWalking = status === "walking" || status === "returning";

    // Leg animation via walkPhase
    const legSwing = isWalking ? Math.sin(walkPhase) * 0.3 : 0;

    // Leg offset based on style
    const legSpread =
        characterDef.legStyle === "wide_stance" ? 0.08 :
        characterDef.legStyle === "guard_stance" ? 0.09 :
        0.06;

    return (
        <group>
            {/* Head */}
            {renderHead(characterDef.headShape, characterDef.headScale, materialColor, characterDef.emissiveIntensity)}

            {/* Body */}
            {renderBody(characterDef.bodyShape, characterDef.bodyScale, materialColor, characterDef.emissiveIntensity)}

            {/* Legs */}
            <mesh
                ref={leftLegRef}
                position={[-legSpread, -0.15, 0]}
                rotation={[legSwing, 0, 0]}
            >
                <cylinderGeometry args={[0.02, 0.02, 0.18, 6]} />
                <meshStandardMaterial color={materialColor} roughness={0.6} />
            </mesh>
            <mesh
                ref={rightLegRef}
                position={[legSpread, -0.15, 0]}
                rotation={[-legSwing, 0, 0]}
            >
                <cylinderGeometry args={[0.02, 0.02, 0.18, 6]} />
                <meshStandardMaterial color={materialColor} roughness={0.6} />
            </mesh>

            {/* Accessories */}
            {characterDef.accessories.map((acc, i) => {
                const Comp = ACCESSORY_MAP[acc.type];
                if (!Comp) return null;
                return (
                    <group key={i} position={acc.position}>
                        <Comp color={color} scale={acc.scale} />
                    </group>
                );
            })}
        </group>
    );
}

function renderHead(shape: CharacterDef["headShape"], scale: number, color: string, emissive: number) {
    const s = 0.15 * scale;
    const mat = <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} emissive={color} emissiveIntensity={emissive * 0.5} />;

    switch (shape) {
        case "box":
            return (
                <mesh position={[0, 0.35, 0]} castShadow>
                    <boxGeometry args={[s * 1.4, s * 1.4, s * 1.4]} />
                    {mat}
                </mesh>
            );
        case "octahedron":
            return (
                <mesh position={[0, 0.35, 0]} castShadow>
                    <octahedronGeometry args={[s]} />
                    <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} emissive={color} emissiveIntensity={emissive} />
                </mesh>
            );
        case "dodecahedron":
            return (
                <mesh position={[0, 0.37, 0]} castShadow>
                    <dodecahedronGeometry args={[s * 1.2]} />
                    <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} emissive={color} emissiveIntensity={emissive} />
                </mesh>
            );
        default: // sphere
            return (
                <mesh position={[0, 0.35, 0]} castShadow>
                    <sphereGeometry args={[s, 16, 16]} />
                    {mat}
                </mesh>
            );
    }
}

function renderBody(shape: CharacterDef["bodyShape"], bodyScale: [number, number, number], color: string, emissive: number) {
    const [w, h] = bodyScale;

    switch (shape) {
        case "tall":
            return (
                <mesh position={[0, 0.05, 0]} castShadow>
                    <coneGeometry args={[w, h, 8]} />
                    <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={emissive * 0.3} />
                </mesh>
            );
        case "wide":
            return (
                <mesh position={[0, 0.05, 0]} castShadow>
                    <coneGeometry args={[w, h, 12]} />
                    <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={emissive * 0.3} />
                </mesh>
            );
        case "angular":
            return (
                <mesh position={[0, 0.05, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
                    <boxGeometry args={[w, h, w]} />
                    <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} emissive={color} emissiveIntensity={emissive * 0.3} />
                </mesh>
            );
        case "dynamic":
            return (
                <mesh position={[0, 0.05, 0]} rotation={[0.1, 0, 0]} castShadow>
                    <coneGeometry args={[w, h, 6]} />
                    <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={emissive * 0.3} />
                </mesh>
            );
        default: // standard
            return (
                <mesh position={[0, 0.05, 0]} castShadow>
                    <coneGeometry args={[w, h, 8]} />
                    <meshStandardMaterial color={color} roughness={0.5} />
                </mesh>
            );
    }
}
