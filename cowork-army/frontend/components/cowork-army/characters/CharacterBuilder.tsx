"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
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
    mood?: string;
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
    mood = "neutral",
}: CharacterBuilderProps) {
    const leftLegRef = useRef<THREE.Mesh>(null);
    const rightLegRef = useRef<THREE.Mesh>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const headGroupRef = useRef<THREE.Group>(null);
    const bodyBreathRef = useRef<THREE.Group>(null);

    const materialColor = status === "error" ? "#ef4444" : color;
    const isWalking = status === "walking" || status === "returning";
    const isWorking = ["working", "coding", "searching"].includes(status);
    const isThinking = ["thinking", "planning"].includes(status);

    // Leg animation via walkPhase
    const legSwing = isWalking ? Math.sin(walkPhase) * 0.3 : 0;
    // Arm swing — opposite to legs for natural walk
    const armSwing = isWalking ? Math.sin(walkPhase + Math.PI) * 0.4 : 0;

    // Leg offset based on style
    const legSpread =
        characterDef.legStyle === "wide_stance" ? 0.08 :
        characterDef.legStyle === "guard_stance" ? 0.09 :
        0.06;

    // Arm offset (slightly wider than legs)
    const armSpread = legSpread + 0.06;

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;

        // Breathing animation on body
        if (bodyBreathRef.current) {
            const breathScale = 1 + Math.sin(t * 1.2) * 0.008;
            bodyBreathRef.current.scale.set(breathScale, 1, breathScale);
        }

        // Head animation based on status/mood
        if (headGroupRef.current) {
            if (isThinking) {
                // Slight head tilt while thinking
                headGroupRef.current.rotation.z = Math.sin(t * 0.8) * 0.08;
                headGroupRef.current.rotation.x = Math.sin(t * 0.5) * 0.05;
            } else if (isWorking) {
                // Head nod while working (looking at screen)
                headGroupRef.current.rotation.x = -0.1 + Math.sin(t * 2) * 0.03;
                headGroupRef.current.rotation.z = 0;
            } else if (mood === "happy" || mood === "celebrating") {
                headGroupRef.current.rotation.z = Math.sin(t * 3) * 0.06;
                headGroupRef.current.rotation.x = 0;
            } else {
                // Reset
                headGroupRef.current.rotation.z *= 0.95;
                headGroupRef.current.rotation.x *= 0.95;
            }
        }

        // Arm animations for non-walking states
        if (!isWalking) {
            if (leftArmRef.current && rightArmRef.current) {
                if (isWorking) {
                    // Typing animation — small rapid arm movements
                    leftArmRef.current.rotation.x = -0.8 + Math.sin(t * 8) * 0.05;
                    rightArmRef.current.rotation.x = -0.8 + Math.sin(t * 8 + 1.5) * 0.05;
                    leftArmRef.current.rotation.z = 0.15;
                    rightArmRef.current.rotation.z = -0.15;
                } else if (isThinking) {
                    // One arm up to chin
                    leftArmRef.current.rotation.x = 0;
                    leftArmRef.current.rotation.z = 0;
                    rightArmRef.current.rotation.x = -1.0 + Math.sin(t * 0.5) * 0.1;
                    rightArmRef.current.rotation.z = -0.3;
                } else if (mood === "celebrating") {
                    // Arms up celebration
                    leftArmRef.current.rotation.x = -2.5 + Math.sin(t * 4) * 0.3;
                    rightArmRef.current.rotation.x = -2.5 + Math.sin(t * 4 + Math.PI) * 0.3;
                    leftArmRef.current.rotation.z = 0.3;
                    rightArmRef.current.rotation.z = -0.3;
                } else if (mood === "stressed") {
                    // Arms tense
                    leftArmRef.current.rotation.x = -0.3 + Math.sin(t * 6) * 0.02;
                    rightArmRef.current.rotation.x = -0.3 + Math.sin(t * 6) * 0.02;
                    leftArmRef.current.rotation.z = 0.15;
                    rightArmRef.current.rotation.z = -0.15;
                } else {
                    // Idle — gentle sway
                    leftArmRef.current.rotation.x = Math.sin(t * 0.6) * 0.05;
                    rightArmRef.current.rotation.x = Math.sin(t * 0.6 + 1) * 0.05;
                    leftArmRef.current.rotation.z = 0;
                    rightArmRef.current.rotation.z = 0;
                }
            }
        }
    });

    return (
        <group>
            {/* Head with animation group */}
            <group ref={headGroupRef}>
                {renderHead(characterDef.headShape, characterDef.headScale, materialColor, characterDef.emissiveIntensity)}
            </group>

            {/* Body with breathing */}
            <group ref={bodyBreathRef}>
                {renderBody(characterDef.bodyShape, characterDef.bodyScale, materialColor, characterDef.emissiveIntensity)}
            </group>

            {/* Arms */}
            <group
                ref={leftArmRef}
                position={[-armSpread - 0.04, 0.12, 0]}
                rotation={[isWalking ? armSwing : 0, 0, 0]}
            >
                {/* Upper arm */}
                <mesh position={[0, -0.06, 0]}>
                    <cylinderGeometry args={[0.018, 0.015, 0.14, 6]} />
                    <meshStandardMaterial color={materialColor} roughness={0.5} />
                </mesh>
                {/* Forearm */}
                <mesh position={[0, -0.14, isWorking ? -0.04 : 0]} rotation={[isWorking ? -0.5 : 0, 0, 0]}>
                    <cylinderGeometry args={[0.015, 0.012, 0.1, 6]} />
                    <meshStandardMaterial color={materialColor} roughness={0.5} />
                </mesh>
            </group>
            <group
                ref={rightArmRef}
                position={[armSpread + 0.04, 0.12, 0]}
                rotation={[isWalking ? -armSwing : 0, 0, 0]}
            >
                <mesh position={[0, -0.06, 0]}>
                    <cylinderGeometry args={[0.018, 0.015, 0.14, 6]} />
                    <meshStandardMaterial color={materialColor} roughness={0.5} />
                </mesh>
                <mesh position={[0, -0.14, isWorking ? -0.04 : 0]} rotation={[isWorking ? -0.5 : 0, 0, 0]}>
                    <cylinderGeometry args={[0.015, 0.012, 0.1, 6]} />
                    <meshStandardMaterial color={materialColor} roughness={0.5} />
                </mesh>
            </group>

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
