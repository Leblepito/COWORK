"use client";
/**
 * COWORK.ARMY v7.0 — Hotel Lobby 3D Scene
 * Reception desk, warm amber lighting, luggage, seating
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

const POSITIONS = DEPT_DESK_POSITIONS.hotel;
const DEPT_COLOR = "#f59e0b";

export default function HotelLobby({ agents, statuses }: SceneProps) {
  return (
    <group>
      {/* Warm amber lighting */}
      <spotLight position={[0, 10, -2]} angle={0.5} penumbra={0.6} intensity={0.8} color="#fbbf24" />
      <pointLight position={[-3, 5, 0]} intensity={0.4} color="#f59e0b" />
      <pointLight position={[3, 5, 0]} intensity={0.4} color="#d97706" />

      {/* Reception desk */}
      <ReceptionDesk />

      {/* Luggage */}
      <LuggageArea />

      {/* Chandelier */}
      <Chandelier />

      {/* Seating area */}
      <SeatingArea />

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
        HOTEL & TRAVEL DEPARTMENT
      </Text>
    </group>
  );
}

function ReceptionDesk() {
  return (
    <group position={[0, 0, -4.5]}>
      {/* Main desk */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[3, 1, 0.6]} />
        <meshStandardMaterial color="#78350f" roughness={0.4} />
      </mesh>
      {/* Desk top */}
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[3.2, 0.04, 0.7]} />
        <meshStandardMaterial color="#92400e" roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Bell */}
      <mesh position={[1, 1.1, 0]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Sign */}
      <Text position={[0, 1.5, -0.1]} fontSize={0.12} color={DEPT_COLOR}
        anchorX="center" anchorY="middle">
        RECEPTION
      </Text>
    </group>
  );
}

function LuggageArea() {
  const luggage = [
    { pos: [4.5, 0, 1] as [number, number, number], size: [0.4, 0.5, 0.25] as [number, number, number], color: "#1e40af" },
    { pos: [4.8, 0, 0.6] as [number, number, number], size: [0.35, 0.6, 0.2] as [number, number, number], color: "#7c2d12" },
    { pos: [5.1, 0, 0.9] as [number, number, number], size: [0.3, 0.4, 0.2] as [number, number, number], color: "#166534" },
  ];

  return (
    <group>
      {luggage.map((l, i) => (
        <group key={i} position={l.pos}>
          <mesh position={[0, l.size[1] / 2, 0]}>
            <boxGeometry args={l.size} />
            <meshStandardMaterial color={l.color} roughness={0.6} />
          </mesh>
          {/* Handle */}
          <mesh position={[0, l.size[1] + 0.05, 0]}>
            <boxGeometry args={[l.size[0] * 0.3, 0.05, 0.02]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Chandelier() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.1;
  });

  return (
    <group ref={ref} position={[0, 5, -2]}>
      {/* Central ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.03, 8, 24]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Light points */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(angle) * 0.8, -0.1, Math.sin(angle) * 0.8]}>
            <mesh>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={1} />
            </mesh>
            <pointLight color="#fbbf24" intensity={0.15} distance={3} />
          </group>
        );
      })}
    </group>
  );
}

function SeatingArea() {
  const seats = [
    [-4.5, 0, 1] as [number, number, number],
    [-3.5, 0, 1] as [number, number, number],
    [-4, 0, 2] as [number, number, number],
  ];

  return (
    <group>
      {seats.map((pos, i) => (
        <group key={i} position={pos}>
          {/* Seat cushion */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.5]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
          {/* Back rest */}
          <mesh position={[0, 0.55, -0.2]}>
            <boxGeometry args={[0.5, 0.35, 0.08]} />
            <meshStandardMaterial color="#78350f" roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* Coffee table */}
      <mesh position={[-4, 0.25, 1.5]}>
        <cylinderGeometry args={[0.3, 0.3, 0.02, 16]} />
        <meshStandardMaterial color="#92400e" roughness={0.3} />
      </mesh>
      <mesh position={[-4, 0.12, 1.5]}>
        <cylinderGeometry args={[0.03, 0.03, 0.24, 8]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
    </group>
  );
}
