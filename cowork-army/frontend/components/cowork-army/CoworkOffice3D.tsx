"use client";
/**
 * COWORK.ARMY — 3D Silicon Valley Campus (v8)
 * Each department is a building, agents work in their own offices.
 */
import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { CoworkAgent, AgentStatus, AutonomousEvent } from "@/lib/cowork-api";
import { DESK_POSITIONS, ZONES, STATUS_COLORS, BUILDINGS, DEPT_COLORS } from "./scene-constants";
import AdvancedAgentAvatar from "./AgentAvatar";
import AdvancedAgentDesk from "./AgentDesk";
import SpeechBubble from "./SpeechBubble";
import CollaborationBeam from "./collaboration/CollaborationBeam";
import { detectCollaborations } from "./collaboration/CollaborationDetector";
import { useMovementSystem, type CollaborationPair } from "./movement/MovementSystem";
import CampusEnvironment from "./campus/CampusEnvironment";
import DepartmentBuilding from "./campus/DepartmentBuilding";
import CampusCargoHub from "./campus/CampusCargoHub";

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
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.5 : 0.3} />
      </mesh>
      <pointLight ref={ref} color={color} intensity={active ? 0.5 : 0.1} distance={3} />
    </group>
  );
}

// ═══ AGENT NODE — desk, avatar, LED, speech bubble ═══
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
      <AdvancedAgentDesk agent={agent} position={[pos[0], pos[1], pos[2]]} />
      <StatusLED
        position={[pos[0], pos[1] + 1.5, pos[2]]}
        color={stColor}
        active={["working", "thinking", "coding", "searching", "planning", "delivering"].includes(st)}
      />
      <AdvancedAgentAvatar
        agentId={agent.id}
        position={[pos[0], pos[1], pos[2]]}
        color={agent.color}
        status={st}
        movementState={movementState}
        isCollaborating={isCollaborating}
      />
      <SpeechBubble position={[pos[0], pos[1], pos[2]]} message={latestMessage} />
    </group>
  );
}

// ═══ CAMPUS HOLOGRAM — floating above the fountain ═══
function CampusHologram() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  return (
    <group position={[0, 7, 0]}>
      <group ref={ref}>
        {/* Wireframe globe */}
        <mesh>
          <sphereGeometry args={[1.0, 12, 8]} />
          <meshStandardMaterial color="#fbbf24" wireframe transparent opacity={0.2} emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>
        {/* Inner cube */}
        <mesh>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#fbbf24" wireframe transparent opacity={0.15} emissive="#fbbf24" emissiveIntensity={0.4} />
        </mesh>
      </group>
      <Text position={[0, 1.3, 0]} fontSize={0.25} color="#fbbf24" anchorX="center" anchorY="middle">
        COWORK.ARMY
      </Text>
      <Text position={[0, 1.0, 0]} fontSize={0.15} color="#94a3b8" anchorX="center" anchorY="middle">
        Silicon Valley Campus
      </Text>
      <Text position={[0, 0.75, 0]} fontSize={0.12} color="#64748b" anchorX="center" anchorY="middle">
        v8.0
      </Text>
    </group>
  );
}

// ═══ DYNAMIC AGENT ZONE — "Startup Garage" ═══
function DynamicAgentZone({ agents, statuses }: { agents: CoworkAgent[]; statuses: Record<string, AgentStatus> }) {
  if (agents.length === 0) return null;

  return (
    <group position={[0, 0, 36]}>
      {/* Garage building */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[agents.length * 3 + 4, 3, 6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[agents.length * 3 + 4.5, 0.1, 6.5]} />
        <meshStandardMaterial color="#64748b" emissive="#64748b" emissiveIntensity={0.1} />
      </mesh>
      <Text position={[0, 3.4, 3.1]} fontSize={0.5} color="#64748b" anchorX="center" anchorY="middle">
        STARTUP GARAGE
      </Text>

      {agents.map((a, i) => {
        const x = (i - (agents.length - 1) / 2) * 3;
        const pos: [number, number, number] = [x, 0, 0];
        const st = statuses[a.id]?.status || "idle";
        const stColor = STATUS_COLORS[st] || "#64748b";
        return (
          <group key={a.id}>
            <AdvancedAgentDesk agent={a} position={pos} />
            <StatusLED position={[x, 1.5, 0]} color={stColor} active={st !== "idle"} />
            <AdvancedAgentAvatar agentId={a.id} position={pos} color={a.color} status={st} />
            <SpeechBubble position={pos} message={null} />
            {/* Garage bay marker */}
            <mesh position={[x, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[1.2, 12]} />
              <meshStandardMaterial color="#64748b" emissive="#64748b" emissiveIntensity={0.1} transparent opacity={0.3} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ═══ INNER SCENE ═══
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

  const movementStates = useMovementSystem(agentIds, collaborations);

  useFrame(() => {
    const now = Date.now();
    if (now - lastCollabTickRef.current < 500) return;
    lastCollabTickRef.current = now;
    const updated = detectCollaborations(events, collaborations, agentTiers, now);
    if (updated.length !== collaborations.length || updated.some((c, i) => c !== collaborations[i])) {
      setCollaborations(updated);
    }
  });

  const latestMessages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of events) {
      if (!map[ev.agent_id] && ev.message) {
        map[ev.agent_id] = ev.message.length > 60 ? ev.message.slice(0, 57) + "..." : ev.message;
      }
    }
    return map;
  }, [events]);

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
      {/* ══════ Lighting ══════ */}
      <ambientLight intensity={0.2} />
      {/* Sun — warm directional */}
      <directionalLight position={[30, 40, 20]} intensity={0.5} castShadow color="#fff5e1" />
      {/* Fill light */}
      <directionalLight position={[-20, 30, -10]} intensity={0.15} color="#c7d2fe" />

      {/* Department spotlights (from above each building) */}
      {Object.entries(BUILDINGS).map(([id, bldg]) => (
        <spotLight
          key={id}
          position={[bldg.center[0], 15, bldg.center[2]]}
          angle={0.6}
          penumbra={0.5}
          intensity={0.5}
          color={bldg.color}
          target-position={bldg.center}
        />
      ))}
      {/* Cargo hub light */}
      <spotLight position={[0, 15, 0]} angle={0.7} penumbra={0.5} intensity={0.4} color="#f59e0b" />

      {/* ══════ Campus Environment ══════ */}
      <CampusEnvironment />
      <ContactShadows position={[0, 0, 0]} opacity={0.25} scale={80} blur={2} />

      {/* ══════ Department Buildings ══════ */}
      {Object.entries(BUILDINGS).map(([id, bldg]) => (
        <DepartmentBuilding key={id} building={bldg} deptId={id} />
      ))}

      {/* ══════ Cargo Hub ══════ */}
      <CampusCargoHub />

      {/* ══════ Base Agent Nodes (at their office desks) ══════ */}
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

      {/* ══════ Dynamic Agents (Startup Garage) ══════ */}
      <DynamicAgentZone agents={dynamicAgents} statuses={statuses} />

      {/* ══════ Collaboration Beams ══════ */}
      {collaborations.map((collab: CollaborationPair, i: number) => {
        const fromPos = DESK_POSITIONS[collab.agentA];
        const toAgent = movementStates[collab.agentB];
        if (!fromPos) return null;
        const from = new THREE.Vector3(fromPos[0], fromPos[1] + 1, fromPos[2]);
        const to = toAgent
          ? toAgent.currentPosition.clone().add(new THREE.Vector3(0, 1, 0))
          : (() => { const p = DESK_POSITIONS[collab.agentB]; return p ? new THREE.Vector3(p[0], p[1] + 1, p[2]) : from.clone(); })();
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

      {/* ══════ Campus Hologram ══════ */}
      <CampusHologram />

      {/* ══════ Camera ══════ */}
      <OrbitControls minDistance={10} maxDistance={70} target={[0, 2, 0]}
        enablePan enableZoom enableRotate maxPolarAngle={Math.PI / 2.2} />
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
    <Canvas camera={{ position: [0, 35, 50], fov: 50 }} shadows
      style={{ width: "100%", height: "100%", background: "#060710" }}>
      <fog attach="fog" args={["#060710", 50, 90]} />
      <InnerScene agents={agents} statuses={statuses} events={events} />
    </Canvas>
  );
}
