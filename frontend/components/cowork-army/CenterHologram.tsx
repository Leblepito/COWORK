"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

export default function CenterHologram() {
    const cubeRef = useRef<THREE.Mesh>(null);

    useFrame((_, delta) => {
        if (cubeRef.current) {
            cubeRef.current.rotation.y += delta * 0.5;
            cubeRef.current.rotation.x += delta * 0.2;
        }
    });

    return (
        <group position={[0, 1.5, -4]}>
            {/* Wireframe cube */}
            <mesh ref={cubeRef}>
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <meshStandardMaterial
                    color="#8b5cf6"
                    wireframe
                    transparent
                    opacity={0.4}
                    emissive="#8b5cf6"
                    emissiveIntensity={0.5}
                />
            </mesh>
            {/* Title + Version — HTML overlay */}
            <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
                <div style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#fff", textShadow: "0 0 10px #8b5cf6" }}>
                        COWORK.ARMY
                    </div>
                    <div style={{ fontSize: "10px", color: "#a78bfa" }}>v4.3</div>
                </div>
            </Html>
        </group>
    );
}
