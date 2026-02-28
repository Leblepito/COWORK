"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { STATUS_COLORS } from "./scene-constants";

interface StatusLEDProps {
    position: [number, number, number];
    status: string;
}

export default function StatusLED({ position, status }: StatusLEDProps) {
    const lightRef = useRef<THREE.PointLight>(null);
    const color = STATUS_COLORS[status] || STATUS_COLORS.idle;

    useFrame((state) => {
        if (!lightRef.current) return;
        const t = state.clock.elapsedTime;
        if (status === "working" || status === "thinking") {
            lightRef.current.intensity = 0.5 + Math.sin(t * 3) * 0.3;
        } else {
            lightRef.current.intensity = 0.4;
        }
    });

    return (
        <group position={[position[0], position[1] + 1.4, position[2] - 0.3]}>
            <mesh>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={2}
                />
            </mesh>
            <pointLight ref={lightRef} color={color} intensity={0.4} distance={2} />
        </group>
    );
}
