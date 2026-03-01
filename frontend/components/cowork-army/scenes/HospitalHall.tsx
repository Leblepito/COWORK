"use client";
/**
 * COWORK.ARMY v7.0 — Hospital Hall 3D Scene
 * Medical corridor, patient rooms, equipment props
 */
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { SceneProps } from "./DepartmentScene3D";
import AgentDesk from "../AgentDesk";
import AgentAvatar from "../AgentAvatar";
import StatusLED from "../StatusLED";
import { DEPT_DESK_POSITIONS } from "../scene-constants";

const POSITIONS = DEPT_DESK_POSITIONS.medical;
const DEPT_COLOR = "#22d3ee";

export default function HospitalHall({ agents, statuses }: SceneProps) {
  return (
    <group>
      {/* Department lighting — cold white/cyan */}
      <spotLight position={[0, 10, -2]} angle={0.6} penumbra={0.3} intensity={1.0} color="#e0f7ff" />
      <pointLight position={[-4, 4, 0]} intensity={0.4} color={DEPT_COLOR} />
      <pointLight position={[4, 4, 0]} intensity={0.4} color={DEPT_COLOR} />

      {/* Hospital corridor walls */}
      <CorridorWalls />

      {/* Medical equipment */}
      <MedicalEquipment />

      {/* Patient rooms */}
      <PatientRooms />

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
        MEDICAL DEPARTMENT
      </Text>
    </group>
  );
}

function CorridorWalls() {
  return (
    <group>
      {/* Back wall */}
      <mesh position={[0, 2, -5.5]}>
        <boxGeometry args={[12, 4, 0.1]} />
        <meshStandardMaterial color="#1a2a30" />
      </mesh>
      {/* Side walls */}
      <mesh position={[-6, 2, -2.5]}>
        <boxGeometry args={[0.1, 4, 6]} />
        <meshStandardMaterial color="#1a2a30" />
      </mesh>
      <mesh position={[6, 2, -2.5]}>
        <boxGeometry args={[0.1, 4, 6]} />
        <meshStandardMaterial color="#1a2a30" />
      </mesh>
      {/* Medical cross emblem */}
      <MedicalCross position={[0, 3.2, -5.4]} />
    </group>
  );
}

function MedicalCross({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.15, 0.5, 0.05]} />
        <meshStandardMaterial color={DEPT_COLOR} emissive={DEPT_COLOR} emissiveIntensity={0.8} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.5, 0.15, 0.05]} />
        <meshStandardMaterial color={DEPT_COLOR} emissive={DEPT_COLOR} emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function MedicalEquipment() {
  return (
    <group>
      {/* ECG monitor */}
      <group position={[-5, 1.2, -3]}>
        <mesh>
          <boxGeometry args={[0.5, 0.4, 0.1]} />
          <meshStandardMaterial color="#0a1520" emissive="#22c55e" emissiveIntensity={0.2} />
        </mesh>
        <ECGLine />
      </group>

      {/* IV stand */}
      <group position={[5, 0, -3]}>
        <mesh position={[0, 1.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 2.4, 8]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 2.4, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.05]} />
          <meshStandardMaterial color="#0ea5e9" transparent opacity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function ECGLine() {
  const geom = useMemo(() => {
    const points = Array.from({ length: 30 }, (_, i) =>
      new THREE.Vector3((i / 30 - 0.5) * 0.4, 0, 0.06)
    );
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: "#22c55e" }), []);
  const lineObj = useMemo(() => new THREE.Line(geom, mat), [geom, mat]);

  useFrame(({ clock }) => {
    const positions = geom.attributes.position;
    const t = clock.getElapsedTime();

    for (let i = 0; i < positions.count; i++) {
      const x = (i / positions.count - 0.5) * 0.4;
      const phase = t * 3 + i * 0.3;
      let y = 0;
      const mod = phase % 6;
      if (mod > 2 && mod < 2.3) y = 0.1;
      else if (mod > 2.3 && mod < 2.5) y = -0.15;
      else if (mod > 2.5 && mod < 2.8) y = 0.2;
      else y = Math.sin(phase * 0.5) * 0.01;
      positions.setXYZ(i, x, y, 0.06);
    }
    positions.needsUpdate = true;
  });

  return <primitive object={lineObj} />;
}

function PatientRooms() {
  const rooms = [
    { pos: [-4.5, 0, -4.5] as [number, number, number], label: "R-101" },
    { pos: [-2, 0, -4.5] as [number, number, number], label: "R-102" },
    { pos: [2, 0, -4.5] as [number, number, number], label: "R-103" },
    { pos: [4.5, 0, -4.5] as [number, number, number], label: "R-104" },
  ];

  return (
    <group>
      {rooms.map((r, i) => (
        <group key={i} position={r.pos}>
          {/* Bed */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.8, 0.1, 0.5]} />
            <meshStandardMaterial color="#e0f2fe" />
          </mesh>
          {/* Room number */}
          <Text position={[0, 0.8, 0]} fontSize={0.08} color={DEPT_COLOR}
            anchorX="center" anchorY="middle">
            {r.label}
          </Text>
        </group>
      ))}
    </group>
  );
}
