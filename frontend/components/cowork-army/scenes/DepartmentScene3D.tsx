"use client";
/**
 * COWORK.ARMY v7.0 — Department 3D Scene Wrapper
 * Selects the correct scene based on department ID
 */
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Grid } from "@react-three/drei";
import type { CoworkAgent, AgentStatus, AutonomousEvent } from "@/lib/cowork-api";
import TradeFloor from "./TradeFloor";
import HospitalHall from "./HospitalHall";
import HotelLobby from "./HotelLobby";
import DigitalOffice from "./DigitalOffice";

interface Props {
  departmentId: string;
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  events: AutonomousEvent[];
}

const SCENE_MAP: Record<string, React.ComponentType<SceneProps>> = {
  trade: TradeFloor,
  medical: HospitalHall,
  hotel: HotelLobby,
  software: DigitalOffice,
};

export interface SceneProps {
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
}

export default function DepartmentScene3D({ departmentId, agents, statuses }: Props) {
  const SceneComponent = SCENE_MAP[departmentId];

  return (
    <Canvas
      camera={{ position: [10, 8, 10], fov: 45 }}
      shadows
      style={{ width: "100%", height: "100%", background: "#060710" }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[8, 12, 8]} intensity={0.5} castShadow />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a2e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#252540"
        position={[0, 0, -2]}
        fadeDistance={20}
      />
      <ContactShadows position={[0, 0, -2]} opacity={0.3} scale={20} blur={2} />

      {SceneComponent && <SceneComponent agents={agents} statuses={statuses} />}

      <OrbitControls
        minDistance={4}
        maxDistance={25}
        target={[0, 0, -2]}
        enablePan
        enableZoom
        enableRotate
      />
    </Canvas>
  );
}
