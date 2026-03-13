"use client";
/**
 * COWORK.ARMY — 3D Silicon Valley Campus (v8.1)
 * Living campus where agents wander, socialize, work, and interact in real-time.
 */
import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { CoworkAgent, AgentStatus, AutonomousEvent } from "@/lib/cowork-api";
import { DESK_POSITIONS, STATUS_COLORS, BUILDINGS } from "./scene-constants";
import AdvancedAgentAvatar from "./AgentAvatar";
import AdvancedAgentDesk from "./AgentDesk";
import SpeechBubble from "./SpeechBubble";
import CollaborationBeam from "./collaboration/CollaborationBeam";
import CampusEnvironment from "./campus/CampusEnvironment";
import DepartmentBuilding from "./campus/DepartmentBuilding";
import CampusCargoHub from "./campus/CampusCargoHub";
import SocialInteractions from "./campus/SocialInteraction";
import { useAgentLifeSystem, type AgentLifeState } from "./movement/AgentLifeSystem";

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

// ═══ LIVING AGENT NODE ═══
// Agent rendered at its life-system position (may be walking, socializing, etc.)
function LivingAgentNode({
  agent,
  status,
  lifeState,
  latestMessage,
}: {
  agent: CoworkAgent;
  status?: AgentStatus;
  lifeState?: AgentLifeState;
  latestMessage: string | null;
}) {
  const deskPos = DESK_POSITIONS[agent.id] || [0, 0, 0];
  const st = status?.status || "idle";
  const stColor = STATUS_COLORS[st] || "#64748b";
  const isActive = ["working", "thinking", "coding", "searching", "planning", "delivering"].includes(st);

  // Agent position: from life system if available, otherwise desk
  const agentPos = lifeState?.currentPosition;
  const isMoving = lifeState?.isMoving ?? false;
  const isSocializing = lifeState?.activity === "socializing";

  // Desk is always at the fixed position
  // Avatar may be elsewhere (wandering, socializing, etc.)
  return (
    <group>
      {/* Desk — always at fixed position */}
      <AdvancedAgentDesk agent={agent} position={[deskPos[0], deskPos[1], deskPos[2]]} />

      {/* Status LED — follows agent if moving, else at desk */}
      <StatusLED
        position={
          agentPos && isMoving
            ? [agentPos.x, 1.5, agentPos.z]
            : [deskPos[0], deskPos[1] + 1.5, deskPos[2]]
        }
        color={stColor}
        active={isActive}
      />

      {/* Avatar — uses life system movement state */}
      <AdvancedAgentAvatar
        agentId={agent.id}
        position={[deskPos[0], deskPos[1], deskPos[2]]}
        color={agent.color}
        status={st}
        movementState={lifeState ? {
          isMoving: lifeState.isMoving,
          currentPosition: lifeState.currentPosition,
          progress: lifeState.progress,
          facingAngle: lifeState.facingAngle,
          walkCyclePhase: lifeState.walkCyclePhase,
        } : undefined}
        isCollaborating={isSocializing}
      />

      {/* Speech Bubble — follows agent */}
      <SpeechBubble
        position={
          agentPos && isMoving
            ? [agentPos.x, 0, agentPos.z]
            : [deskPos[0], deskPos[1], deskPos[2]]
        }
        message={latestMessage}
      />
    </group>
  );
}

// ═══ CAMPUS HOLOGRAM ═══
function CampusHologram() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.3;
  });
  return (
    <group position={[0, 7, 0]}>
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[1.0, 12, 8]} />
          <meshStandardMaterial color="#fbbf24" wireframe transparent opacity={0.2} emissive="#fbbf24" emissiveIntensity={0.3} />
        </mesh>
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
        v8.1
      </Text>
    </group>
  );
}

// ═══ DYNAMIC AGENT ZONE — "Startup Garage" ═══
function DynamicAgentZone({
  agents,
  statuses,
  lifeStates,
  latestMessages,
}: {
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  lifeStates: Record<string, AgentLifeState>;
  latestMessages: Record<string, string>;
}) {
  if (agents.length === 0) return null;

  return (
    <group position={[0, 0, 36]}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[agents.length * 3 + 4, 3, 6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.2} />
      </mesh>
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
            <SpeechBubble position={pos} message={latestMessages[a.id] || null} />
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
  const baseAgents = useMemo(() => agents.filter(a => a.is_base !== false && DESK_POSITIONS[a.id]), [agents]);
  const dynamicAgents = useMemo(() => agents.filter(a => !DESK_POSITIONS[a.id]), [agents]);
  const agentIds = useMemo(() => baseAgents.map((a: CoworkAgent) => a.id), [baseAgents]);

  // ── Agent Life System — the heart of the living campus ──
  const lifeStates = useAgentLifeSystem(agentIds, statuses, events);

  // Latest messages from events
  const latestMessages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of events) {
      if (!map[ev.agent_id] && ev.message) {
        map[ev.agent_id] = ev.message.length > 60 ? ev.message.slice(0, 57) + "..." : ev.message;
      }
    }
    return map;
  }, [events]);

  // Agent colors map for social interactions
  const agentColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.color;
    return map;
  }, [agents]);

  // Find active social pairs for collaboration beams
  const socialBeams = useMemo(() => {
    const beams: { from: string; to: string }[] = [];
    const seen = new Set<string>();
    for (const [id, state] of Object.entries(lifeStates)) {
      if ((state.activity === "socializing" || state.activity === "walking_to_social") && state.socialPartner) {
        const key = [id, state.socialPartner].sort().join("-");
        if (!seen.has(key)) {
          seen.add(key);
          beams.push({ from: id, to: state.socialPartner });
        }
      }
    }
    return beams;
  }, [lifeStates]);

  return (
    <>
      {/* ══════ Lighting ══════ */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[30, 40, 20]} intensity={0.5} castShadow color="#fff5e1" />
      <directionalLight position={[-20, 30, -10]} intensity={0.15} color="#c7d2fe" />

      {Object.entries(BUILDINGS).map(([id, bldg]) => (
        <spotLight
          key={id}
          position={[bldg.center[0], 15, bldg.center[2]]}
          angle={0.6}
          penumbra={0.5}
          intensity={0.5}
          color={bldg.color}
        />
      ))}
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

      {/* ══════ Living Agent Nodes ══════ */}
      {baseAgents.map((a: CoworkAgent) => (
        <LivingAgentNode
          key={a.id}
          agent={a}
          status={statuses[a.id]}
          lifeState={lifeStates[a.id]}
          latestMessage={latestMessages[a.id] || null}
        />
      ))}

      {/* ══════ Dynamic Agents ══════ */}
      <DynamicAgentZone
        agents={dynamicAgents}
        statuses={statuses}
        lifeStates={lifeStates}
        latestMessages={latestMessages}
      />

      {/* ══════ Social Interaction Effects ══════ */}
      <SocialInteractions
        lifeStates={lifeStates}
        agentColors={agentColors}
        statuses={statuses}
      />

      {/* ══════ Collaboration Beams (social meetings) ══════ */}
      {socialBeams.map((beam, i) => {
        const fromState = lifeStates[beam.from];
        const toState = lifeStates[beam.to];
        if (!fromState || !toState) return null;
        return (
          <CollaborationBeam
            key={`beam-${i}`}
            fromPosition={fromState.currentPosition.clone().add(new THREE.Vector3(0, 1, 0))}
            toPosition={toState.currentPosition.clone().add(new THREE.Vector3(0, 1, 0))}
            color={agentColors[beam.from] || "#fbbf24"}
            active={true}
          />
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
