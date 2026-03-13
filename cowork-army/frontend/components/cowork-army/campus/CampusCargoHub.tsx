"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { CARGO_BUILDING, DEPT_COLORS } from "../scene-constants";

/**
 * Central Cargo Hub — circular building at campus center.
 * Rotating ring, directional arrows to departments, package drone.
 */
export default function CampusCargoHub() {
  const ringRef = useRef<THREE.Mesh>(null);
  const droneRef = useRef<THREE.Group>(null);
  const arrowGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.5;
    }
    // Drone orbits and bobs
    if (droneRef.current) {
      const angle = t * 0.8;
      droneRef.current.position.set(
        Math.cos(angle) * 3,
        3.5 + Math.sin(t * 2) * 0.3,
        Math.sin(angle) * 3
      );
      droneRef.current.rotation.y = angle + Math.PI;
    }
    // Arrow pulse
    if (arrowGroupRef.current) {
      arrowGroupRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.3 + Math.sin(t * 2 + i * Math.PI / 2) * 0.3;
        }
      });
    }
  });

  const { center, radius, height, color } = CARGO_BUILDING;

  return (
    <group position={center}>
      {/* ── Circular platform ── */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[radius + 0.5, radius + 0.5, 0.3, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* ── Outer rotating ring (decorative) ── */}
      <mesh ref={ringRef} position={[0, 0.5, 0]}>
        <torusGeometry args={[radius, 0.15, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.7} />
      </mesh>

      {/* ── Inner ring ── */}
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[radius - 1.5, 0.1, 6, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.5} />
      </mesh>

      {/* ── Central column ── */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.8, 1.2, height, 8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* ── Top dome ── */}
      <mesh position={[0, height, 0]}>
        <sphereGeometry args={[1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.5} />
      </mesh>

      {/* ── Direction arrows to departments ── */}
      <group ref={arrowGroupRef}>
        {/* Trade (NW) */}
        <mesh position={[-5, 0.3, -4]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]}>
          <coneGeometry args={[0.5, 1.2, 3]} />
          <meshStandardMaterial color={DEPT_COLORS.trade} emissive={DEPT_COLORS.trade} emissiveIntensity={0.3} />
        </mesh>
        {/* Medical (NE) */}
        <mesh position={[5, 0.3, -4]} rotation={[-Math.PI / 2, 0, Math.PI / 4]}>
          <coneGeometry args={[0.5, 1.2, 3]} />
          <meshStandardMaterial color={DEPT_COLORS.medical} emissive={DEPT_COLORS.medical} emissiveIntensity={0.3} />
        </mesh>
        {/* Hotel (SW) */}
        <mesh position={[-5, 0.3, 4]} rotation={[-Math.PI / 2, 0, -Math.PI * 3 / 4]}>
          <coneGeometry args={[0.5, 1.2, 3]} />
          <meshStandardMaterial color={DEPT_COLORS.hotel} emissive={DEPT_COLORS.hotel} emissiveIntensity={0.3} />
        </mesh>
        {/* Software (SE) */}
        <mesh position={[5, 0.3, 4]} rotation={[-Math.PI / 2, 0, Math.PI * 3 / 4]}>
          <coneGeometry args={[0.5, 1.2, 3]} />
          <meshStandardMaterial color={DEPT_COLORS.software} emissive={DEPT_COLORS.software} emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* ── Delivery drone ── */}
      <group ref={droneRef} position={[3, 3.5, 0]}>
        {/* Drone body */}
        <mesh>
          <boxGeometry args={[0.6, 0.15, 0.6]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* Propeller arms */}
        {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([x, z], i) => (
          <group key={i}>
            <mesh position={[x, 0.05, z]}>
              <cylinderGeometry args={[0.02, 0.02, 0.15, 4]} />
              <meshStandardMaterial color="#6b7280" metalness={0.5} />
            </mesh>
            <mesh position={[x, 0.12, z]}>
              <cylinderGeometry args={[0.15, 0.15, 0.02, 4]} />
              <meshStandardMaterial color="#9ca3af" transparent opacity={0.4} />
            </mesh>
          </group>
        ))}
        {/* Package underneath */}
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.3]} />
          <meshStandardMaterial color="#92400e" roughness={0.7} />
        </mesh>
        {/* Drone light */}
        <pointLight color={color} intensity={0.3} distance={4} />
      </group>

      {/* ── Status ring lights ── */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * (radius + 0.2), 0.4, Math.sin(angle) * (radius + 0.2)]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#22c55e" : color}
              emissive={i % 2 === 0 ? "#22c55e" : color}
              emissiveIntensity={0.8}
            />
          </mesh>
        );
      })}

      {/* ── Label ── */}
      <Text position={[0, height + 1, 0]} fontSize={0.6} color={color} anchorX="center" anchorY="middle">
        CARGO HUB
      </Text>
      <Text position={[0, height + 0.4, 0]} fontSize={0.8} anchorX="center" anchorY="middle">
        📦
      </Text>

      {/* ── Light ── */}
      <pointLight position={[0, height + 1, 0]} color={color} intensity={0.5} distance={15} />
    </group>
  );
}
