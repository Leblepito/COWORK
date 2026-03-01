"use client";
/**
 * COWORK.ARMY — 3D Office Scene
 * Three.js/R3F: floor, agent desks, avatars, zone borders, center hologram
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame, ThreeElements } from "@react-three/fiber";
import { OrbitControls, Text, Html, ContactShadows, Grid } from "@react-three/drei";
import * as THREE from "three";
import type { CoworkAgent, AgentStatus, AutonomousEvent } from "@/lib/cowork-api";
import { DESK_POSITIONS, ZONES, TIER_COLORS, STATUS_COLORS } from "./scene-constants";

// ═══ AGENT DESK ═══
function AgentDesk({ agent, status }: { agent: CoworkAgent; status?: AgentStatus }) {
  const pos = DESK_POSITIONS[agent.id] || [0, 0, 0];
  const st = status?.status || "idle";
  const color = new THREE.Color(agent.color);
  const stColor = STATUS_COLORS[st] || "#64748b";

  return (
    <group position={[pos[0], pos[1], pos[2]]}>
      {/* Desk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Desk legs */}
      {[[-0.5, 0, -0.3], [0.5, 0, -0.3], [-0.5, 0, 0.3], [0.5, 0, 0.3]].map((lp, i) => (
        <mesh key={i} position={[lp[0], 0.25, lp[2]]}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color="#1a1f30" />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 0.85, -0.2]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.02]} />
        <meshStandardMaterial color="#0a0b12" emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* Agent name label */}
      <Text position={[0, 0.85, -0.18]} fontSize={0.08} color={agent.color} anchorX="center" anchorY="middle"
        font="/fonts/JetBrainsMono-Bold.woff" characters="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_ ">
        {agent.icon} {agent.name}
      </Text>
      {/* Status LED */}
      <StatusLED position={[0, 1.3, 0]} color={stColor} active={["working", "thinking", "coding", "searching"].includes(st)} />
      {/* Avatar */}
      <AgentAvatar agent={agent} status={st} />
      {/* Tier badge */}
      <Text position={[0, 0.42, 0.42]} fontSize={0.06} color={TIER_COLORS[agent.tier] || "#64748b"}
        anchorX="center" anchorY="middle">
        {agent.tier}
      </Text>
    </group>
  );
}

// ═══ AGENT AVATAR ═══
function AgentAvatar({ agent, status }: { agent: CoworkAgent; status: string }) {
  const ref = useRef<THREE.Group>(null);
  const color = new THREE.Color(agent.color);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (status === "idle") {
      ref.current.position.y = 1.0 + Math.sin(t * 1.5) * 0.03;
      ref.current.rotation.y = 0;
    } else if (status === "working" || status === "coding") {
      ref.current.position.y = 1.0;
      ref.current.rotation.y = t * 2;
    } else if (status === "thinking") {
      const s = 1.0 + Math.sin(t * 2) * 0.05;
      ref.current.scale.setScalar(s);
      ref.current.position.y = 1.0;
    } else if (status === "error") {
      ref.current.position.y = 1.0;
    } else {
      ref.current.position.y = 1.0;
    }
  });

  return (
    <group ref={ref} position={[0, 1.0, 0.3]}>
      {/* Head */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={color} emissive={status === "error" ? "#ef4444" : color}
          emissiveIntensity={status === "error" ? 0.8 : 0.2} />
      </mesh>
      {/* Body */}
      <mesh position={[0, -0.25, 0]}>
        <coneGeometry args={[0.18, 0.35, 8]} />
        <meshStandardMaterial color={color} opacity={0.85} transparent />
      </mesh>
    </group>
  );
}

// ═══ STATUS LED ═══
function StatusLED({ position, color, active }: { position: [number, number, number]; color: string; active: boolean }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current && active) {
      ref.current.intensity = 0.5 + Math.sin(clock.getElapsedTime() * 4) * 0.3;
    }
  });
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.5 : 0.3} />
      </mesh>
      <pointLight ref={ref} color={color} intensity={active ? 0.5 : 0.1} distance={2} />
    </group>
  );
}

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
        v5.0
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
    <Canvas camera={{ position: [12, 10, 12], fov: 45 }} shadows
      style={{ width: "100%", height: "100%", background: "#060710" }}>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={0.5} castShadow />
      {/* Zone spotlights */}
      <spotLight position={[-7, 8, -6]} angle={0.4} penumbra={0.5} intensity={0.6} color="#fbbf24" />
      <spotLight position={[0, 8, -4]} angle={0.5} penumbra={0.5} intensity={0.8} color="#a78bfa" />
      <spotLight position={[7, 8, -5]} angle={0.4} penumbra={0.5} intensity={0.5} color="#22c55e" />

      {/* Floor */}
      <Grid args={[30, 30]} cellSize={1} cellThickness={0.5} cellColor="#1a1a2e"
        sectionSize={5} sectionThickness={1} sectionColor="#252540"
        position={[0, 0, -4]} fadeDistance={25} />
      <ContactShadows position={[0, 0, -4]} opacity={0.3} scale={30} blur={2} />

      {/* Zones */}
      {ZONES.map(z => <ZoneBorder key={z.id} zone={z} />)}

      {/* Desks */}
      {agents.map(a => (
        <AgentDesk key={a.id} agent={a} status={statuses[a.id]} />
      ))}

      {/* Center hologram */}
      <CenterHologram />

      {/* Camera controls */}
      <OrbitControls minDistance={5} maxDistance={30} target={[0, 0, -4]}
        enablePan enableZoom enableRotate />
    </Canvas>
  );
}
