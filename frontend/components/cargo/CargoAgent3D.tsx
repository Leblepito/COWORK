"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface CargoAgent3DProps {
  position: [number, number, number];
  targetPosition?: [number, number, number];
  status: string;
  message?: string;
}

export default function CargoAgent3D({ position, targetPosition, status, message }: CargoAgent3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const isMoving = !!targetPosition && status === "delivering";

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isMoving && targetPosition) {
      progressRef.current = Math.min(progressRef.current + delta * 0.3, 1);
      const p = progressRef.current;
      groupRef.current.position.x = position[0] + (targetPosition[0] - position[0]) * p;
      groupRef.current.position.z = position[2] + (targetPosition[2] - position[2]) * p;
      groupRef.current.position.y = position[1] + Math.sin(p * Math.PI) * 0.5;
    } else {
      // Idle bobbing
      groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.002) * 0.05;
    }
  });

  const isActive = ["working", "delivering", "analyzing"].includes(status);
  const bodyColor = isActive ? "#f472b6" : "#6b7280";

  return (
    <group ref={groupRef} position={position}>
      {/* Body — box shape like a package */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.35, 0.35, 0.35]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.75, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      {/* Package on back */}
      <mesh position={[0, 0.55, -0.2]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.2, 0.15, 0.15]} />
        <meshStandardMaterial color="#a78bfa" />
      </mesh>
      {/* Glow when active */}
      {isActive && (
        <pointLight position={[0, 0.8, 0]} color="#f472b6" intensity={1} distance={2} />
      )}
      {/* Speech bubble */}
      {message && (
        <Html position={[0, 1.2, 0]} center distanceFactor={8}>
          <div className="bg-[#0f1019]/90 border border-pink-500/40 rounded-lg px-2 py-1 text-[8px] text-pink-300 whitespace-nowrap max-w-[150px] truncate backdrop-blur">
            📦 {message}
          </div>
        </Html>
      )}
    </group>
  );
}
