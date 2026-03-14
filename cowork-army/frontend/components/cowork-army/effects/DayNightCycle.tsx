"use client";

/**
 * Day/Night cycle system — smoothly transitions lighting over a configurable period.
 *
 * Phases: Dawn → Day → Dusk → Night (loops)
 * Each phase has distinct ambient light, directional light, sky color, and fog.
 *
 * Accelerated cycle: 1 full day = 120 seconds (configurable)
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface DayNightCycleProps {
    /** Full day duration in seconds (default 120s = 2 minutes) */
    cycleDuration?: number;
    /** Whether cycle is active */
    enabled?: boolean;
}

// Color palettes for each time phase
const PHASES = {
    dawn: {
        ambientColor: new THREE.Color("#fde68a"),
        ambientIntensity: 0.15,
        dirColor: new THREE.Color("#fb923c"),
        dirIntensity: 0.4,
        dirPosition: new THREE.Vector3(-30, 15, 20),
        skyColor: new THREE.Color("#1e1b4b"),
        fogColor: new THREE.Color("#1e1b4b"),
        fogNear: 40,
        fogFar: 80,
    },
    day: {
        ambientColor: new THREE.Color("#f0f9ff"),
        ambientIntensity: 0.25,
        dirColor: new THREE.Color("#fff5e1"),
        dirIntensity: 0.6,
        dirPosition: new THREE.Vector3(30, 40, 20),
        skyColor: new THREE.Color("#0c1220"),
        fogColor: new THREE.Color("#060710"),
        fogNear: 50,
        fogFar: 90,
    },
    dusk: {
        ambientColor: new THREE.Color("#f97316"),
        ambientIntensity: 0.12,
        dirColor: new THREE.Color("#dc2626"),
        dirIntensity: 0.35,
        dirPosition: new THREE.Vector3(30, 10, -20),
        skyColor: new THREE.Color("#1a0a2e"),
        fogColor: new THREE.Color("#1a0a2e"),
        fogNear: 35,
        fogFar: 75,
    },
    night: {
        ambientColor: new THREE.Color("#312e81"),
        ambientIntensity: 0.08,
        dirColor: new THREE.Color("#c7d2fe"),
        dirIntensity: 0.15,
        dirPosition: new THREE.Vector3(-20, 30, -10),
        skyColor: new THREE.Color("#020617"),
        fogColor: new THREE.Color("#020617"),
        fogNear: 30,
        fogFar: 70,
    },
};

function lerpPhases(
    from: typeof PHASES.day,
    to: typeof PHASES.day,
    t: number,
) {
    return {
        ambientColor: from.ambientColor.clone().lerp(to.ambientColor, t),
        ambientIntensity: from.ambientIntensity + (to.ambientIntensity - from.ambientIntensity) * t,
        dirColor: from.dirColor.clone().lerp(to.dirColor, t),
        dirIntensity: from.dirIntensity + (to.dirIntensity - from.dirIntensity) * t,
        dirPosition: from.dirPosition.clone().lerp(to.dirPosition, t),
        skyColor: from.skyColor.clone().lerp(to.skyColor, t),
        fogColor: from.fogColor.clone().lerp(to.fogColor, t),
        fogNear: from.fogNear + (to.fogNear - from.fogNear) * t,
        fogFar: from.fogFar + (to.fogFar - from.fogFar) * t,
    };
}

export default function DayNightCycle({
    cycleDuration = 120,
    enabled = true,
}: DayNightCycleProps) {
    const ambientRef = useRef<THREE.AmbientLight>(null);
    const dirRef = useRef<THREE.DirectionalLight>(null);
    const { scene } = useThree();

    useFrame(({ clock }) => {
        if (!enabled || !ambientRef.current || !dirRef.current) return;

        const t = clock.elapsedTime;
        const dayProgress = (t % cycleDuration) / cycleDuration; // 0-1 over full cycle

        // Determine current phase and transition progress
        let from: typeof PHASES.day;
        let to: typeof PHASES.day;
        let phaseProgress: number;

        if (dayProgress < 0.15) {
            // Dawn (0-15%)
            from = PHASES.night;
            to = PHASES.dawn;
            phaseProgress = dayProgress / 0.15;
        } else if (dayProgress < 0.45) {
            // Day (15-45%)
            from = PHASES.dawn;
            to = PHASES.day;
            phaseProgress = (dayProgress - 0.15) / 0.3;
        } else if (dayProgress < 0.6) {
            // Dusk (45-60%)
            from = PHASES.day;
            to = PHASES.dusk;
            phaseProgress = (dayProgress - 0.45) / 0.15;
        } else if (dayProgress < 0.75) {
            // Night transition (60-75%)
            from = PHASES.dusk;
            to = PHASES.night;
            phaseProgress = (dayProgress - 0.6) / 0.15;
        } else {
            // Deep night (75-100%)
            from = PHASES.night;
            to = PHASES.night;
            phaseProgress = 0;
        }

        // Smooth easing
        const eased = phaseProgress * phaseProgress * (3 - 2 * phaseProgress); // smoothstep
        const current = lerpPhases(from, to, eased);

        // Apply to lights
        ambientRef.current.color.copy(current.ambientColor);
        ambientRef.current.intensity = current.ambientIntensity;
        dirRef.current.color.copy(current.dirColor);
        dirRef.current.intensity = current.dirIntensity;
        dirRef.current.position.copy(current.dirPosition);

        // Apply to fog
        if (scene.fog && scene.fog instanceof THREE.Fog) {
            scene.fog.color.copy(current.fogColor);
            scene.fog.near = current.fogNear;
            scene.fog.far = current.fogFar;
        }

        // Apply sky/background color
        if (scene.background instanceof THREE.Color) {
            scene.background.copy(current.skyColor);
        }
    });

    return (
        <>
            <ambientLight ref={ambientRef} intensity={0.2} />
            <directionalLight
                ref={dirRef}
                position={[30, 40, 20]}
                intensity={0.5}
                castShadow
                color="#fff5e1"
            />
        </>
    );
}

/** Stars that appear during night phase */
export function NightStars({ cycleDuration = 120 }: { cycleDuration?: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const starsRef = useRef<{ pos: THREE.Vector3; size: number; twinkleSpeed: number }[]>([]);

    // Generate star positions once
    if (starsRef.current.length === 0) {
        for (let i = 0; i < 80; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI * 0.4 + 0.1; // above horizon
            const r = 60 + Math.random() * 20;
            starsRef.current.push({
                pos: new THREE.Vector3(
                    Math.cos(theta) * Math.sin(phi) * r,
                    Math.cos(phi) * r,
                    Math.sin(theta) * Math.sin(phi) * r,
                ),
                size: 0.05 + Math.random() * 0.1,
                twinkleSpeed: 1 + Math.random() * 3,
            });
        }
    }

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;
        const dayProgress = (t % cycleDuration) / cycleDuration;

        // Stars visible during night (60-100% and 0-15%)
        const nightVisibility = dayProgress > 0.55 ? Math.min(1, (dayProgress - 0.55) / 0.1)
            : dayProgress < 0.2 ? Math.max(0, 1 - dayProgress / 0.2)
            : 0;

        groupRef.current.children.forEach((child, i) => {
            const star = starsRef.current[i];
            if (!star) return;
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            const twinkle = 0.5 + Math.sin(t * star.twinkleSpeed + i * 0.5) * 0.5;
            mat.opacity = nightVisibility * twinkle;
            mat.emissiveIntensity = 1 + twinkle * 2;
            mesh.scale.setScalar(star.size * (0.8 + twinkle * 0.4));
        });
    });

    return (
        <group ref={groupRef}>
            {starsRef.current.map((star, i) => (
                <mesh key={i} position={star.pos}>
                    <sphereGeometry args={[star.size, 4, 4]} />
                    <meshStandardMaterial
                        color="#fef3c7"
                        emissive="#fef3c7"
                        emissiveIntensity={2}
                        transparent
                        opacity={0}
                    />
                </mesh>
            ))}
        </group>
    );
}
