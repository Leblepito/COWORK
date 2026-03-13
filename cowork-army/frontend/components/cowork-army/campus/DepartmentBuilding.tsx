"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { BuildingDef } from "../scene-constants";

/**
 * Silicon Valley style office building for a department.
 * Glass facade, glowing department color accents, rooftop sign.
 * Each agent gets a visible "office window" on the ground floor.
 */
export default function DepartmentBuilding({ building, deptId }: { building: BuildingDef; deptId: string }) {
  const glowRef = useRef<THREE.Mesh>(null);
  const roofLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Subtle building glow pulse
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.08 + Math.sin(t * 0.8) * 0.03;
    }
    // Rooftop beacon
    if (roofLightRef.current) {
      roofLightRef.current.intensity = 0.3 + Math.sin(t * 1.5) * 0.15;
    }
  });

  const [w, d] = building.footprint;
  const h = building.height;
  const color = building.color;

  // Window grid on each face
  const windowRows = Math.floor(h / 1.2);
  const windowColsFront = Math.floor(w / 2.2);
  const windowColsSide = Math.floor(d / 2.2);

  return (
    <group position={building.center}>
      {/* ── Foundation / base platform ── */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[w + 1, 0.3, d + 1]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.3} />
      </mesh>

      {/* ── Main building body ── */}
      <mesh position={[0, h / 2 + 0.3, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* ── Glass facade (front — facing center/+Z or -Z) ── */}
      <mesh ref={glowRef} position={[0, h / 2 + 0.3, d / 2 + 0.01]}>
        <planeGeometry args={[w - 0.4, h - 0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.08}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Glass facade back */}
      <mesh position={[0, h / 2 + 0.3, -d / 2 - 0.01]}>
        <planeGeometry args={[w - 0.4, h - 0.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.06}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Windows (front face) ── */}
      {Array.from({ length: windowRows }).map((_, row) =>
        Array.from({ length: windowColsFront }).map((_, col) => {
          const wx = (col - (windowColsFront - 1) / 2) * 2.2;
          const wy = 1.2 + row * 1.2;
          return (
            <mesh key={`wf-${row}-${col}`} position={[wx, wy + 0.3, d / 2 + 0.02]}>
              <planeGeometry args={[1.4, 0.8]} />
              <meshStandardMaterial
                color="#0c4a6e"
                emissive={row === 0 ? color : "#0369a1"}
                emissiveIntensity={row === 0 ? 0.4 : 0.15}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })
      )}

      {/* ── Windows (back face) ── */}
      {Array.from({ length: windowRows }).map((_, row) =>
        Array.from({ length: windowColsFront }).map((_, col) => {
          const wx = (col - (windowColsFront - 1) / 2) * 2.2;
          const wy = 1.2 + row * 1.2;
          return (
            <mesh key={`wb-${row}-${col}`} position={[wx, wy + 0.3, -d / 2 - 0.02]}>
              <planeGeometry args={[1.4, 0.8]} />
              <meshStandardMaterial
                color="#0c4a6e"
                emissive="#0369a1"
                emissiveIntensity={0.1}
                transparent
                opacity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })
      )}

      {/* ── Windows (side faces) ── */}
      {[-1, 1].map((side) =>
        Array.from({ length: windowRows }).map((_, row) =>
          Array.from({ length: windowColsSide }).map((_, col) => {
            const wz = (col - (windowColsSide - 1) / 2) * 2.2;
            const wy = 1.2 + row * 1.2;
            return (
              <mesh key={`ws-${side}-${row}-${col}`} position={[side * (w / 2 + 0.02), wy + 0.3, wz]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[1.4, 0.8]} />
                <meshStandardMaterial
                  color="#0c4a6e"
                  emissive="#0369a1"
                  emissiveIntensity={0.1}
                  transparent
                  opacity={0.5}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          })
        )
      )}

      {/* ── Rooftop ── */}
      <mesh position={[0, h + 0.35, 0]}>
        <boxGeometry args={[w + 0.2, 0.1, d + 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* ── Rooftop accent stripe ── */}
      <mesh position={[0, h + 0.3, 0]}>
        <boxGeometry args={[w + 0.4, 0.15, d + 0.4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.6} />
      </mesh>

      {/* ── Rooftop antenna/beacon ── */}
      <mesh position={[0, h + 1.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.5, 6]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, h + 2, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
      </mesh>
      <pointLight ref={roofLightRef} position={[0, h + 2, 0]} color={color} intensity={0.3} distance={10} />

      {/* ── Building name sign (front) ── */}
      <Text
        position={[0, h + 0.6, d / 2 + 0.1]}
        fontSize={0.7}
        color={color}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {building.label}
      </Text>

      {/* ── Department icon ── */}
      <Text
        position={[0, h - 0.2, d / 2 + 0.1]}
        fontSize={1.0}
        anchorX="center"
        anchorY="middle"
      >
        {building.icon}
      </Text>

      {/* ── Entrance (ground floor, front) ── */}
      <mesh position={[0, 0.8, d / 2 + 0.02]}>
        <planeGeometry args={[2.5, 1.3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Ground floor office areas (one per agent, visible through windows) ── */}
      {building.offices.map((office, i) => (
        <group key={office.agentId} position={[office.offset[0], 0, office.offset[2]]}>
          {/* Office floor marker */}
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.8, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.15}
              transparent
              opacity={0.3}
            />
          </mesh>
          {/* Office partition walls (low, glass-like) */}
          <mesh position={[0, 0.5, -1.5]}>
            <boxGeometry args={[2.8, 1, 0.05]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.15} />
          </mesh>
          <mesh position={[-1.4, 0.5, 0]}>
            <boxGeometry args={[0.05, 1, 3]} />
            <meshStandardMaterial color="#1e293b" transparent opacity={0.15} />
          </mesh>
        </group>
      ))}

      {/* ── Building ambient light ── */}
      <pointLight position={[0, h / 2, 0]} color={color} intensity={0.2} distance={w} />
    </group>
  );
}
