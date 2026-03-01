"use client";
/**
 * COWORK.ARMY v7.0 — 3D Office Overview Scene
 * All 4 departments + Cargo agent in one scene
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, ContactShadows, Grid } from "@react-three/drei";
import * as THREE from "three";
import type { CoworkAgent, AgentStatus, AutonomousEvent } from "@/lib/cowork-api";
import { DESK_POSITIONS, ZONES, TIER_COLORS, STATUS_COLORS } from "./scene-constants";
import AgentDeskComp from "./AgentDesk";
import AgentAvatarComp from "./AgentAvatar";
import StatusLEDComp from "./StatusLED";

// ═══ ZONE BORDERS ═══
function ZoneBorder({ zone }: { zone: typeof ZONES[0] }) {
  const hw = zone.size[0] / 2 + 0.5;
  const hd = zone.size[1] / 2 + 0.5;
  const y = 0.02;
  const pts = [
    new THREE.Vector3(-hw, y, -hd), new THREE.Vector3(hw, y, -hd),
    new THREE.Vector3(hw, y, hd), new THREE.Vector3(-hw, y, hd),
    new THREE.Vector3(-hw, y, -hd),
  ];
  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(pts), []);

  return (
    <group position={[zone.center[0], 0, zone.center[2]]}>
      <lineSegments geometry={geom}>
        <lineBasicMaterial color={zone.color} transparent opacity={0.3} />
      </lineSegments>
      <Text position={[0, 0.05, -hd - 0.3]} fontSize={0.15} color={zone.color}
        anchorX="center" anchorY="middle">
        {zone.label}
      </Text>
    </group>
  );
}

// ═══ CENTER HOLOGRAM ═══
function CenterHologram() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.5;
  });
  return (
    <group position={[0, 2, -4]}>
      <mesh ref={ref}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#fbbf24" wireframe transparent opacity={0.15} emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>
      <Text position={[0, 0, 0.55]} fontSize={0.12} color="#fbbf24" anchorX="center" anchorY="middle">
        COWORK.ARMY
      </Text>
      <Text position={[0, -0.2, 0.55]} fontSize={0.08} color="#64748b" anchorX="center" anchorY="middle">
        v7.0
      </Text>
    </group>
  );
}

// ═══ MAIN 3D SCENE ═══
export default function CoworkOffice3D({
  agents, statuses, events,
}: {
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  events: AutonomousEvent[];
}) {
  return (
    <Canvas camera={{ position: [14, 12, 14], fov: 45 }} shadows
      style={{ width: "100%", height: "100%", background: "#060710" }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={0.5} castShadow />

      {/* Zone spotlights — one per department */}
      <spotLight position={[-5, 8, -7]} angle={0.4} penumbra={0.5} intensity={0.6} color="#a78bfa" />
      <spotLight position={[-5, 8, -1]} angle={0.4} penumbra={0.5} intensity={0.6} color="#22d3ee" />
      <spotLight position={[5, 8, -7]} angle={0.4} penumbra={0.5} intensity={0.6} color="#f59e0b" />
      <spotLight position={[5, 8, -1]} angle={0.4} penumbra={0.5} intensity={0.5} color="#22c55e" />
      {/* Cargo center light */}
      <spotLight position={[0, 8, -4]} angle={0.3} penumbra={0.5} intensity={0.5} color="#f472b6" />

      <Grid args={[30, 30]} cellSize={1} cellThickness={0.5} cellColor="#1a1a2e"
        sectionSize={5} sectionThickness={1} sectionColor="#252540"
        position={[0, 0, -4]} fadeDistance={25} />
      <ContactShadows position={[0, 0, -4]} opacity={0.3} scale={30} blur={2} />

      {ZONES.map(z => <ZoneBorder key={z.id} zone={z} />)}

      {agents.map(a => {
        const pos = DESK_POSITIONS[a.id] || [0, 0, 0];
        const st = statuses[a.id]?.status || "idle";
        return (
          <group key={a.id}>
            <AgentDeskComp agent={a} position={pos} />
            <AgentAvatarComp agentId={a.id} position={pos} color={a.color} status={st} />
            <StatusLEDComp position={pos} status={st} />
          </group>
        );
      })}

      <CenterHologram />

      <OrbitControls minDistance={5} maxDistance={30} target={[0, 0, -4]}
        enablePan enableZoom enableRotate />
    </Canvas>
  );
}
