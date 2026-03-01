"use client";
/**
 * COWORK.ARMY — 3D Office Scene (v6)
 * Advanced: CharacterBuilder avatars, movement, collaboration beams, speech bubbles
 */
import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, ContactShadows, Grid } from "@react-three/drei";
import * as THREE from "three";
import type { CoworkAgent, AgentStatus, AutonomousEvent } from "@/lib/cowork-api";
import { DESK_POSITIONS, ZONES, STATUS_COLORS } from "./scene-constants";
import AdvancedAgentAvatar from "./AgentAvatar";
import AdvancedAgentDesk from "./AgentDesk";
import SpeechBubble from "./SpeechBubble";
import CollaborationBeam from "./collaboration/CollaborationBeam";
import { detectCollaborations } from "./collaboration/CollaborationDetector";
import { useMovementSystem, type CollaborationPair } from "./movement/MovementSystem";

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

// ═══ AGENT NODE — combines desk, avatar, LED, speech bubble ═══
function AgentNode({
  agent,
  status,
  movementState,
  isCollaborating,
  latestMessage,
}: {
  agent: CoworkAgent;
  status?: AgentStatus;
  movementState?: ReturnType<typeof useMovementSystem>[string] | null;
  isCollaborating: boolean;
  latestMessage: string | null;
}) {
  const pos = DESK_POSITIONS[agent.id] || [0, 0, 0];
  const st = status?.status || "idle";
  const stColor = STATUS_COLORS[st] || "#64748b";

  return (
    <group>
      {/* Desk */}
      <AdvancedAgentDesk agent={agent} position={[pos[0], pos[1], pos[2]]} />
      {/* Status LED */}
      <StatusLED
        position={[pos[0], pos[1] + 1.3, pos[2]]}
        color={stColor}
        active={["working", "thinking", "coding", "searching", "planning"].includes(st)}
      />
      {/* Advanced Avatar */}
      <AdvancedAgentAvatar
        agentId={agent.id}
        position={[pos[0], pos[1], pos[2]]}
        color={agent.color}
        status={st}
        movementState={movementState}
        isCollaborating={isCollaborating}
      />
      {/* Speech Bubble */}
      <SpeechBubble position={[pos[0], pos[1], pos[2]]} message={latestMessage} />
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
        v6.0
      </Text>
    </group>
  );
}

// ═══ DYNAMIC AGENT ZONE ═══
function DynamicAgentZone({ agents, statuses }: { agents: CoworkAgent[]; statuses: Record<string, AgentStatus> }) {
  if (agents.length === 0) return null;

  return (
    <group position={[0, 0, 3]}>
      <Text position={[0, 0.05, -1.5]} fontSize={0.15} color="#64748b" anchorX="center" anchorY="middle">
        DYNAMIC AGENTS
      </Text>
      {agents.map((a, i) => {
        const x = (i - (agents.length - 1) / 2) * 2.5;
        const pos: [number, number, number] = [x, 0, 0];
        const st = statuses[a.id]?.status || "idle";
        const stColor = STATUS_COLORS[st] || "#64748b";
        return (
          <group key={a.id}>
            <AdvancedAgentDesk agent={a} position={pos} />
            <StatusLED position={[x, 1.3, 0]} color={stColor} active={st !== "idle"} />
            <AdvancedAgentAvatar agentId={a.id} position={pos} color={a.color} status={st} />
            <SpeechBubble position={pos} message={null} />
          </group>
        );
      })}
    </group>
  );
}

// ═══ INNER SCENE (needs R3F context for hooks) ═══
function InnerScene({
  agents,
  statuses,
  events,
}: {
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  events: AutonomousEvent[];
}) {
  const [collaborations, setCollaborations] = useState<CollaborationPair[]>([]);
  const lastCollabTickRef = useRef(0);

  const baseAgents = useMemo(() => agents.filter(a => a.is_base !== false && DESK_POSITIONS[a.id]), [agents]);
  const dynamicAgents = useMemo(() => agents.filter(a => !DESK_POSITIONS[a.id]), [agents]);

  const agentIds = useMemo(() => baseAgents.map((a: CoworkAgent) => a.id), [baseAgents]);
  const agentTiers = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.tier;
    return map;
  }, [agents]);

  // Movement system
  const movementStates = useMovementSystem(agentIds, collaborations);

  // Collaboration detection — runs every ~500ms via useFrame
  useFrame(() => {
    const now = Date.now();
    if (now - lastCollabTickRef.current < 500) return;
    lastCollabTickRef.current = now;
    const updated = detectCollaborations(events, collaborations, agentTiers, now);
    if (updated.length !== collaborations.length || updated.some((c, i) => c !== collaborations[i])) {
      setCollaborations(updated);
    }
  });

  // Build latest message map from events (most recent per agent)
  const latestMessages = useMemo(() => {
    const map: Record<string, string> = {};
    // Events are newest-first, take only the first per agent
    for (const ev of events) {
      if (!map[ev.agent_id] && ev.message) {
        map[ev.agent_id] = ev.message.length > 60 ? ev.message.slice(0, 57) + "..." : ev.message;
      }
    }
    return map;
  }, [events]);

  // Collab-active agents set
  const collabAgents = useMemo(() => {
    const set = new Set<string>();
    for (const c of collaborations) {
      set.add(c.agentA);
      set.add(c.agentB);
    }
    return set;
  }, [collaborations]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 15, 10]} intensity={0.5} castShadow />
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

      {/* Base Agent Nodes */}
      {baseAgents.map((a: CoworkAgent) => (
        <group key={a.id}>
          <AgentNode
            agent={a}
            status={statuses[a.id]}
            movementState={movementStates[a.id] || null}
            isCollaborating={collabAgents.has(a.id)}
            latestMessage={latestMessages[a.id] || null}
          />
        </group>
      ))}

      {/* Dynamic Agents */}
      <DynamicAgentZone agents={dynamicAgents} statuses={statuses} />

      {/* Collaboration Beams */}
      {collaborations.map((collab: CollaborationPair, i: number) => {
        const fromPos = DESK_POSITIONS[collab.agentA];
        const toAgent = movementStates[collab.agentB];
        if (!fromPos) return null;
        const from = new THREE.Vector3(fromPos[0], fromPos[1], fromPos[2]);
        const to = toAgent
          ? toAgent.currentPosition.clone()
          : (() => { const p = DESK_POSITIONS[collab.agentB]; return p ? new THREE.Vector3(p[0], p[1], p[2]) : from.clone(); })();
        return (
          <group key={`collab-${i}`}>
            <CollaborationBeam
              fromPosition={from}
              toPosition={to}
              color={agents.find((a: CoworkAgent) => a.id === collab.agentA)?.color || "#ffffff"}
              active={true}
            />
          </group>
        );
      })}

      {/* Center hologram */}
      <CenterHologram />

      {/* Camera controls */}
      <OrbitControls minDistance={5} maxDistance={30} target={[0, 0, -4]}
        enablePan enableZoom enableRotate />
    </>
  );
}

// ═══ MAIN EXPORT ═══
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
      <InnerScene agents={agents} statuses={statuses} events={events} />
    </Canvas>
  );
}
