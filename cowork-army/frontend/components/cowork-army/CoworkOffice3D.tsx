"use client";
/**
 * COWORK.ARMY — 3D Silicon Valley Campus (v9.0)
 * Living campus with day/night cycle, weather, mood indicators, spawn effects,
 * enhanced character animations, and full agent life simulation.
 */
import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import type { CoworkAgent, AgentStatus, AutonomousEvent, AnimationState } from "@/lib/cowork-api";
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
import DayNightCycle, { NightStars } from "./effects/DayNightCycle";
import WeatherSystem from "./effects/WeatherSystem";
import type { WeatherType } from "./effects/WeatherSystem";
import SpawnEffect from "./effects/SpawnEffect";
import MoodIndicator from "./effects/MoodIndicator";
import type { AgentMood } from "./effects/MoodIndicator";

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
function LivingAgentNode({
  agent,
  status,
  lifeState,
  latestMessage,
  animState,
}: {
  agent: CoworkAgent;
  status?: AgentStatus;
  lifeState?: AgentLifeState;
  latestMessage: string | null;
  animState?: AnimationState;
}) {
  const deskPos = DESK_POSITIONS[agent.id] || [0, 0, 0];
  const st = status?.status || "idle";
  const stColor = STATUS_COLORS[st] || "#64748b";
  const isActive = ["working", "thinking", "coding", "searching", "planning", "delivering"].includes(st);

  const agentPos = lifeState?.currentPosition;
  const isMoving = lifeState?.isMoving ?? false;
  const isSocializing = lifeState?.activity === "socializing";

  // Extract mood and energy from animation state
  const mood = (animState?.mood || "neutral") as AgentMood;
  const energy = animState?.energy ?? 100;

  // Active animation trigger
  const activeAnimation = animState?.animation_state?.animation as string | undefined;
  const [showSpawnEffect, setShowSpawnEffect] = useState(false);
  const [spawnType, setSpawnType] = useState<"spawn" | "despawn" | "celebrate" | "alert" | "power_up" | "shake">("spawn");
  const lastAnimRef = useRef<string>("");

  // Detect new animation triggers
  useFrame(() => {
    if (activeAnimation && activeAnimation !== lastAnimRef.current) {
      lastAnimRef.current = activeAnimation;
      if (["spawn", "despawn", "celebrate", "alert", "power_up", "shake"].includes(activeAnimation)) {
        setSpawnType(activeAnimation as typeof spawnType);
        setShowSpawnEffect(true);
      }
    }
  });

  const effectPos: [number, number, number] = agentPos && isMoving
    ? [agentPos.x, 0, agentPos.z]
    : [deskPos[0], deskPos[1], deskPos[2]];

  const moodPos = agentPos && isMoving
    ? agentPos
    : new THREE.Vector3(deskPos[0], deskPos[1], deskPos[2]);

  return (
    <group>
      {/* Desk */}
      <AdvancedAgentDesk agent={agent} position={[deskPos[0], deskPos[1], deskPos[2]]} />

      {/* Status LED */}
      <StatusLED
        position={
          agentPos && isMoving
            ? [agentPos.x, 1.5, agentPos.z]
            : [deskPos[0], deskPos[1] + 1.5, deskPos[2]]
        }
        color={stColor}
        active={isActive}
      />

      {/* Avatar */}
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

      {/* Mood indicator */}
      {mood !== "neutral" && (
        <MoodIndicator
          position={moodPos}
          mood={mood}
          energy={energy}
          color={agent.color}
        />
      )}

      {/* Spawn/Animation effect */}
      {showSpawnEffect && (
        <SpawnEffect
          position={effectPos}
          type={spawnType}
          color={agent.color}
          onComplete={() => setShowSpawnEffect(false)}
        />
      )}

      {/* Speech Bubble */}
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
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.3;
    // Pulsing hologram ring
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2;
      ringRef.current.rotation.z = t * 0.5;
      const scale = 1 + Math.sin(t * 1.5) * 0.1;
      ringRef.current.scale.setScalar(scale);
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.15 + Math.sin(t * 2) * 0.05;
    }
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
      {/* Orbiting ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[1.5, 0.02, 8, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} transparent opacity={0.2} />
      </mesh>
      <Text position={[0, 1.3, 0]} fontSize={0.25} color="#fbbf24" anchorX="center" anchorY="middle">
        COWORK.ARMY
      </Text>
      <Text position={[0, 1.0, 0]} fontSize={0.15} color="#94a3b8" anchorX="center" anchorY="middle">
        Silicon Valley Campus
      </Text>
      <Text position={[0, 0.75, 0]} fontSize={0.12} color="#64748b" anchorX="center" anchorY="middle">
        v9.0
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
  animationStates,
  autonomousActive,
  dayNightEnabled,
  weatherType,
}: {
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  events: AutonomousEvent[];
  animationStates: Record<string, AnimationState>;
  autonomousActive: boolean;
  dayNightEnabled: boolean;
  weatherType: WeatherType;
}) {
  const baseAgents = useMemo(() => agents.filter(a => a.is_base !== false && DESK_POSITIONS[a.id]), [agents]);
  const dynamicAgents = useMemo(() => agents.filter(a => !DESK_POSITIONS[a.id]), [agents]);
  const agentIds = useMemo(() => baseAgents.map((a: CoworkAgent) => a.id), [baseAgents]);

  // ── Agent Life System ──
  const lifeStates = useAgentLifeSystem(agentIds, statuses, events);

  // Latest messages
  const latestMessages = useMemo(() => {
    const map: Record<string, string> = {};
    for (const ev of events) {
      if (!map[ev.agent_id] && ev.message) {
        map[ev.agent_id] = ev.message.length > 60 ? ev.message.slice(0, 57) + "..." : ev.message;
      }
    }
    return map;
  }, [events]);

  // Agent colors map
  const agentColors = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.color;
    return map;
  }, [agents]);

  // Social beams
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
      {/* ══════ Lighting — Day/Night Cycle or Static ══════ */}
      {dayNightEnabled ? (
        <DayNightCycle cycleDuration={120} enabled={true} />
      ) : (
        <>
          <ambientLight intensity={0.2} />
          <directionalLight position={[30, 40, 20]} intensity={0.5} castShadow color="#fff5e1" />
        </>
      )}
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

      {/* ══════ Night Stars ══════ */}
      {dayNightEnabled && <NightStars cycleDuration={120} />}

      {/* ══════ Weather System ══════ */}
      <WeatherSystem
        type={weatherType}
        intensity={0.8}
        autonomousActive={autonomousActive}
      />

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
          animState={animationStates[a.id]}
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

      {/* ══════ Collaboration Beams ══════ */}
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
  animationStates = {},
  autonomousActive = false,
  dayNightEnabled = true,
  weatherType = "fireflies",
}: {
  agents: CoworkAgent[];
  statuses: Record<string, AgentStatus>;
  events: AutonomousEvent[];
  animationStates?: Record<string, AnimationState>;
  autonomousActive?: boolean;
  dayNightEnabled?: boolean;
  weatherType?: WeatherType;
}) {
  return (
    <Canvas camera={{ position: [0, 35, 50], fov: 50 }} shadows
      style={{ width: "100%", height: "100%", background: "#060710" }}>
      <fog attach="fog" args={["#060710", 50, 90]} />
      <InnerScene
        agents={agents}
        statuses={statuses}
        events={events}
        animationStates={animationStates}
        autonomousActive={autonomousActive}
        dayNightEnabled={dayNightEnabled}
        weatherType={weatherType}
      />
    </Canvas>
  );
}
