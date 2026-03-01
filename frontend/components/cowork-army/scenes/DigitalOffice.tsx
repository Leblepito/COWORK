"use client";
/**
 * COWORK.ARMY v7.0 — Digital Office 3D Scene
 * Modern tech office: server rack, multi-monitors, code displays
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { SceneProps } from "./DepartmentScene3D";
import AgentDesk from "../AgentDesk";
import AgentAvatar from "../AgentAvatar";
import StatusLED from "../StatusLED";
import { DEPT_DESK_POSITIONS } from "../scene-constants";

const POSITIONS = DEPT_DESK_POSITIONS.software;
const DEPT_COLOR = "#22c55e";

export default function DigitalOffice({ agents, statuses }: SceneProps) {
  return (
    <group>
      {/* Green-tinted tech lighting */}
      <spotLight position={[0, 10, -2]} angle={0.6} penumbra={0.4} intensity={0.7} color="#e0ffe0" />
      <pointLight position={[-4, 5, 0]} intensity={0.3} color={DEPT_COLOR} />
      <pointLight position={[4, 5, 0]} intensity={0.3} color="#4ade80" />

      {/* Server rack */}
      <ServerRack />

      {/* Multi-monitor setup */}
      <MonitorWall />

      {/* Code particle effect */}
      <CodeParticles />

      {/* Agent desks + avatars */}
      {agents.map(a => {
        const pos = POSITIONS[a.id] || [0, 0, 0];
        const st = statuses[a.id]?.status || "idle";
        return (
          <group key={a.id}>
            <AgentDesk agent={a} position={pos} />
            <AgentAvatar agentId={a.id} position={pos} color={a.color} status={st} />
            <StatusLED position={pos} status={st} />
          </group>
        );
      })}

      {/* Zone label */}
      <Text position={[0, 0.05, -5.5]} fontSize={0.2} color={DEPT_COLOR}
        anchorX="center" anchorY="middle">
        SOFTWARE DEPARTMENT
      </Text>
    </group>
  );
}

function ServerRack() {
  return (
    <group position={[5.5, 0, -4]}>
      {/* Rack frame */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.8, 3, 0.6]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Server units */}
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <group key={i} position={[0, 0.4 + i * 0.35, 0.31]}>
          <mesh>
            <boxGeometry args={[0.7, 0.25, 0.02]} />
            <meshStandardMaterial color="#0f172a" metalness={0.5} />
          </mesh>
          {/* LED indicators */}
          <ServerLED x={-0.28} y={0} i={i} />
          <ServerLED x={-0.22} y={0} i={i + 3} />
        </group>
      ))}
    </group>
  );
}

function ServerLED({ x, y, i }: { x: number; y: number; i: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    const t = clock.getElapsedTime();
    const blink = Math.sin(t * (2 + i * 0.5)) > 0;
    mat.emissiveIntensity = blink ? 1.5 : 0.3;
  });

  return (
    <mesh ref={ref} position={[x, y, 0.01]}>
      <sphereGeometry args={[0.015, 6, 6]} />
      <meshStandardMaterial
        color={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#f59e0b" : "#3b82f6"}
        emissive={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#f59e0b" : "#3b82f6"}
        emissiveIntensity={1}
      />
    </mesh>
  );
}

function MonitorWall() {
  const monitors = [
    { pos: [-3, 2.2, -5] as [number, number, number], w: 1.6, h: 1 },
    { pos: [-1, 2.2, -5] as [number, number, number], w: 1.6, h: 1 },
    { pos: [1, 2.2, -5] as [number, number, number], w: 1.6, h: 1 },
    { pos: [3, 2.2, -5] as [number, number, number], w: 1.6, h: 1 },
    { pos: [-2, 3.5, -5] as [number, number, number], w: 2, h: 0.8 },
    { pos: [2, 3.5, -5] as [number, number, number], w: 2, h: 0.8 },
  ];

  return (
    <group>
      {monitors.map((m, i) => (
        <group key={i} position={m.pos}>
          <mesh>
            <boxGeometry args={[m.w, m.h, 0.03]} />
            <meshStandardMaterial color="#0a0b12" />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[m.w - 0.08, m.h - 0.08]} />
            <meshStandardMaterial
              color="#0c1a0c"
              emissive={DEPT_COLOR}
              emissiveIntensity={0.1}
            />
          </mesh>
          <CodeLines width={m.w - 0.15} height={m.h - 0.15} offset={i * 5} />
        </group>
      ))}
    </group>
  );
}

function CodeLines({ width, height, offset }: { width: number; height: number; offset: number }) {
  const ref = useRef<THREE.Group>(null);
  const lineCount = 8;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const scroll = ((t * 0.3 + offset) + i * 0.2) % (lineCount + 2);
      mat.opacity = scroll < lineCount ? 0.6 : 0;
      mesh.scale.x = 0.3 + Math.sin(i * 2.1 + offset) * 0.5 + 0.5;
    });
  });

  return (
    <group ref={ref} position={[0, 0, 0.04]}>
      {Array.from({ length: lineCount }).map((_, i) => {
        const y = (i / lineCount - 0.5) * height + height / lineCount / 2;
        return (
          <mesh key={i} position={[-width * 0.2, y, 0]}>
            <planeGeometry args={[width * 0.6, height / lineCount * 0.5]} />
            <meshStandardMaterial
              color={DEPT_COLOR}
              emissive={DEPT_COLOR}
              emissiveIntensity={0.4}
              transparent
              opacity={0.5}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function CodeParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 50;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = Math.random() * 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
  }

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const geo = ref.current.geometry;
    const pos = geo.attributes.position;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      let y = pos.getY(i) + 0.005;
      if (y > 5) y = 0;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t + i) * 0.002);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial color={DEPT_COLOR} size={0.04} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}
