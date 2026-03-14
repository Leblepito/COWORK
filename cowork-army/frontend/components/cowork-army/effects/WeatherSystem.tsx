"use client";

/**
 * Weather particle system — ambient particles that add atmosphere.
 *
 * Types:
 * - fireflies: floating warm particles (default, always active)
 * - rain: falling blue particles
 * - snow: gently falling white particles
 * - energy: rising green energy particles (when autonomous mode is active)
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type WeatherType = "fireflies" | "rain" | "snow" | "energy";

interface WeatherSystemProps {
    type?: WeatherType;
    intensity?: number; // 0-1, controls particle count visibility
    autonomousActive?: boolean;
}

const FIREFLY_COUNT = 30;
const RAIN_COUNT = 60;
const SNOW_COUNT = 40;
const ENERGY_COUNT = 24;

const CAMPUS_RADIUS = 38;

interface Particle {
    basePos: THREE.Vector3;
    speed: number;
    phase: number;
    size: number;
}

function generateParticles(count: number, spread: number, height: number): Particle[] {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
        particles.push({
            basePos: new THREE.Vector3(
                (Math.random() - 0.5) * spread * 2,
                Math.random() * height,
                (Math.random() - 0.5) * spread * 2,
            ),
            speed: 0.5 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2,
            size: 0.03 + Math.random() * 0.05,
        });
    }
    return particles;
}

/** Floating firefly particles */
function Fireflies({ intensity = 1 }: { intensity: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useMemo(() => generateParticles(FIREFLY_COUNT, CAMPUS_RADIUS, 6), []);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;

        groupRef.current.children.forEach((child, i) => {
            const p = particles[i];
            if (!p) return;
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;

            // Gentle floating motion
            mesh.position.set(
                p.basePos.x + Math.sin(t * p.speed * 0.3 + p.phase) * 3,
                p.basePos.y + 1 + Math.sin(t * p.speed * 0.5 + p.phase * 2) * 1.5,
                p.basePos.z + Math.cos(t * p.speed * 0.4 + p.phase) * 3,
            );

            // Pulsing glow
            const glow = 0.3 + Math.sin(t * p.speed * 2 + p.phase) * 0.7;
            mat.opacity = glow * intensity * 0.6;
            mat.emissiveIntensity = 1 + glow * 2;
            mesh.scale.setScalar(p.size * (0.5 + glow * 0.5));
        });
    });

    return (
        <group ref={groupRef}>
            {particles.map((p, i) => (
                <mesh key={i} position={p.basePos}>
                    <sphereGeometry args={[p.size, 4, 4]} />
                    <meshStandardMaterial
                        color="#fbbf24"
                        emissive="#fbbf24"
                        emissiveIntensity={2}
                        transparent
                        opacity={0}
                    />
                </mesh>
            ))}
        </group>
    );
}

/** Rain particle effect */
function Rain({ intensity = 1 }: { intensity: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useMemo(() => generateParticles(RAIN_COUNT, CAMPUS_RADIUS, 15), []);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;

        groupRef.current.children.forEach((child, i) => {
            const p = particles[i];
            if (!p) return;
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;

            // Falling motion with wrap-around
            const fallY = ((p.basePos.y - t * p.speed * 4) % 15 + 15) % 15;
            mesh.position.set(
                p.basePos.x + Math.sin(t * 0.3 + p.phase) * 0.5, // wind
                fallY,
                p.basePos.z,
            );

            mat.opacity = intensity * 0.5;
        });
    });

    return (
        <group ref={groupRef}>
            {particles.map((p, i) => (
                <mesh key={i} position={p.basePos} rotation={[0, 0, 0.1]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.3, 3]} />
                    <meshStandardMaterial
                        color="#60a5fa"
                        emissive="#3b82f6"
                        emissiveIntensity={0.5}
                        transparent
                        opacity={0}
                    />
                </mesh>
            ))}
        </group>
    );
}

/** Snow particle effect */
function Snow({ intensity = 1 }: { intensity: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useMemo(() => generateParticles(SNOW_COUNT, CAMPUS_RADIUS, 12), []);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;

        groupRef.current.children.forEach((child, i) => {
            const p = particles[i];
            if (!p) return;
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;

            // Slow falling with drift
            const fallY = ((p.basePos.y - t * p.speed * 0.8) % 12 + 12) % 12;
            mesh.position.set(
                p.basePos.x + Math.sin(t * p.speed * 0.5 + p.phase) * 2,
                fallY,
                p.basePos.z + Math.cos(t * p.speed * 0.3 + p.phase) * 1.5,
            );

            mesh.scale.setScalar(p.size * (0.8 + Math.sin(t + p.phase) * 0.2));
            mat.opacity = intensity * 0.7;
        });
    });

    return (
        <group ref={groupRef}>
            {particles.map((p, i) => (
                <mesh key={i} position={p.basePos}>
                    <sphereGeometry args={[p.size, 4, 4]} />
                    <meshStandardMaterial
                        color="#e2e8f0"
                        emissive="#e2e8f0"
                        emissiveIntensity={0.3}
                        transparent
                        opacity={0}
                    />
                </mesh>
            ))}
        </group>
    );
}

/** Energy particles — rising when autonomous mode is active */
function EnergyParticles({ intensity = 1 }: { intensity: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const particles = useMemo(() => generateParticles(ENERGY_COUNT, 12, 5), []);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;

        groupRef.current.children.forEach((child, i) => {
            const p = particles[i];
            if (!p) return;
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;

            // Rising spiral from ground
            const riseY = ((t * p.speed * 1.5 + p.basePos.y) % 6);
            const spiralAngle = t * p.speed * 2 + p.phase;
            const spiralRadius = 0.5 + riseY * 0.3;

            mesh.position.set(
                p.basePos.x * 0.3 + Math.cos(spiralAngle) * spiralRadius,
                riseY,
                p.basePos.z * 0.3 + Math.sin(spiralAngle) * spiralRadius,
            );

            const fade = Math.sin((riseY / 6) * Math.PI);
            mesh.scale.setScalar(p.size * (0.5 + fade));
            mat.opacity = fade * intensity * 0.6;
            mat.emissiveIntensity = 1 + fade * 3;
        });
    });

    return (
        <group ref={groupRef}>
            {particles.map((p, i) => (
                <mesh key={i} position={p.basePos}>
                    <octahedronGeometry args={[p.size]} />
                    <meshStandardMaterial
                        color="#22c55e"
                        emissive="#22c55e"
                        emissiveIntensity={2}
                        transparent
                        opacity={0}
                    />
                </mesh>
            ))}
        </group>
    );
}

/** Main weather system — selects and renders the appropriate effect */
export default function WeatherSystem({
    type = "fireflies",
    intensity = 1,
    autonomousActive = false,
}: WeatherSystemProps) {
    return (
        <group>
            {/* Fireflies are always present as ambient effect */}
            <Fireflies intensity={type === "fireflies" ? intensity : intensity * 0.3} />

            {/* Weather-specific particles */}
            {type === "rain" && <Rain intensity={intensity} />}
            {type === "snow" && <Snow intensity={intensity} />}

            {/* Energy particles when autonomous mode is active */}
            {autonomousActive && <EnergyParticles intensity={intensity} />}
        </group>
    );
}
