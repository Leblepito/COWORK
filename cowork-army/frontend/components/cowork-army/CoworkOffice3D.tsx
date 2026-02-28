"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { CoworkAgent, AgentStatus, AutonomousEvent } from "@/lib/cowork-api";
import { DESK_POSITIONS, ZONES, DEFAULT_POSITION, buildAllDeskPositions, getDynamicZone } from "./scene-constants";
import Floor from "./Floor";
import AgentDesk from "./AgentDesk";
import AgentAvatar from "./AgentAvatar";
import StatusLED from "./StatusLED";
import SpeechBubble from "./SpeechBubble";
import ZoneBorder from "./ZoneBorder";
import CenterHologram from "./CenterHologram";
import { useMovementSystem } from "./movement/MovementSystem";
import type { CollaborationPair } from "./movement/MovementSystem";
import { detectCollaborations } from "./collaboration/CollaborationDetector";
import CollaborationBeam from "./collaboration/CollaborationBeam";

interface CoworkOffice3DProps {
    agents: CoworkAgent[];
    statuses: Record<string, AgentStatus>;
    events: AutonomousEvent[];
}

class CanvasErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
> {
    state: { error: Error | null } = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div className="w-full h-full flex items-center justify-center bg-[#0a0a1a] text-white p-8">
                    <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-6 max-w-md">
                        <p className="text-red-400 font-semibold mb-2">3D Sahne Hatasi</p>
                        <pre className="text-xs text-red-300/70 whitespace-pre-wrap break-all">
                            {this.state.error.message}
                        </pre>
                        <button
                            onClick={() => this.setState({ error: null })}
                            className="mt-3 px-4 py-1.5 bg-red-500/20 text-red-300 text-xs rounded-lg hover:bg-red-500/30"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function CoworkOffice3D({ agents, statuses, events }: CoworkOffice3DProps) {
    return (
        <CanvasErrorBoundary>
            <Canvas
                camera={{ position: [12, 10, 12], fov: 50 }}
                shadows
                gl={{ antialias: true, alpha: false }}
                style={{ background: "#0a0a1a", width: "100%", height: "100%" }}
                onCreated={(state) => {
                    state.gl.setClearColor("#0a0a1a");
                }}
            >
                <SceneContent agents={agents} statuses={statuses} events={events} />
            </Canvas>
        </CanvasErrorBoundary>
    );
}

/** Inner component — runs inside Canvas context so R3F hooks work. */
function SceneContent({ agents, statuses, events }: CoworkOffice3DProps) {
    // Build latest event message per agent (last 10s)
    const latestEventPerAgent: Record<string, string> = {};
    const now = Date.now();
    for (const ev of events) {
        const age = now - new Date(ev.timestamp).getTime();
        if (age < 10000) {
            latestEventPerAgent[ev.agent_id] = ev.message;
        }
    }

    // Agent tier lookup
    const agentTiers = useMemo(() => {
        const map: Record<string, string> = {};
        for (const a of agents) map[a.id] = a.tier;
        return map;
    }, [agents]);

    // Build positions including dynamic agents
    const allPositions = useMemo(
        () => buildAllDeskPositions(agents.map((a) => a.id)),
        [agents],
    );
    const dynamicAgentIds = useMemo(
        () => agents.filter((a) => !DESK_POSITIONS[a.id]).map((a) => a.id),
        [agents],
    );
    const dynamicZone = useMemo(
        () => getDynamicZone(dynamicAgentIds),
        [dynamicAgentIds],
    );

    // Collaboration detection
    const [collaborations, setCollaborations] = useState<CollaborationPair[]>([]);

    useEffect(() => {
        const n = Date.now();
        setCollaborations((prev) => detectCollaborations(events, prev, agentTiers, n));
    }, [events, agentTiers]);

    // Movement system
    const agentIds = useMemo(() => agents.map((a) => a.id), [agents]);
    const movementStates = useMovementSystem(agentIds, collaborations);

    return (
        <>
            {/* Controls */}
            <OrbitControls
                target={[0, 0, -3]}
                minDistance={5}
                maxDistance={30}
                maxPolarAngle={Math.PI / 2.2}
            />

            {/* Lighting */}
            <ambientLight intensity={0.3} />
            <directionalLight position={[10, 15, 10]} intensity={0.4} castShadow />

            {/* Zone spotlights */}
            <spotLight position={[-7, 8, -6]} color="#fbbf24" intensity={0.5} angle={0.4} penumbra={0.5} />
            <spotLight position={[-7, 8, -2]} color="#06b6d4" intensity={0.4} angle={0.4} penumbra={0.5} />
            <spotLight position={[0, 8, -4]} color="#8b5cf6" intensity={0.6} angle={0.6} penumbra={0.5} />
            <spotLight position={[7, 8, -5]} color="#22c55e" intensity={0.4} angle={0.5} penumbra={0.5} />

            {/* Environment — simple fog-like lighting instead of HDR preset */}
            <fog attach="fog" args={["#0a0a1a", 20, 40]} />
            <hemisphereLight args={["#1a1a3e", "#0a0a1a", 0.3]} />

            {/* Floor */}
            <Floor />

            {/* Zone borders */}
            {ZONES.map((zone) => (
                <ZoneBorder key={zone.id} zone={zone} />
            ))}
            {dynamicZone && <ZoneBorder zone={dynamicZone} />}

            {/* Center hologram */}
            <CenterHologram />

            {/* Agents */}
            {agents.map((agent) => {
                const pos = allPositions[agent.id] || DEFAULT_POSITION;
                const agentStatus = statuses[agent.id];
                const statusStr = agentStatus?.alive ? (agentStatus.status || "idle") : "idle";
                const latestMessage = latestEventPerAgent[agent.id] || null;
                const mvState = movementStates[agent.id] || null;
                const isCollab = collaborations.some(
                    (c) => c.agentA === agent.id || c.agentB === agent.id,
                );

                // Actual position for floating elements (speech bubble, LED)
                const actualPos: [number, number, number] = mvState?.isMoving
                    ? [mvState.currentPosition.x, 0, mvState.currentPosition.z]
                    : pos;

                return (
                    <group key={agent.id}>
                        <AgentDesk agent={agent} position={pos} />
                        <AgentAvatar
                            agentId={agent.id}
                            position={pos}
                            color={agent.color}
                            status={statusStr}
                            movementState={mvState}
                            isCollaborating={isCollab}
                        />
                        <StatusLED position={actualPos} status={statusStr} />
                        <SpeechBubble position={actualPos} message={latestMessage} />
                    </group>
                );
            })}

            {/* Collaboration beams */}
            {collaborations.map((collab, i) => {
                const posA = allPositions[collab.agentA] || DEFAULT_POSITION;
                const posB = movementStates[collab.agentB]?.currentPosition
                    || new THREE.Vector3(
                        ...(allPositions[collab.agentB] || DEFAULT_POSITION),
                    );
                const fromVec = new THREE.Vector3(posA[0], 0, posA[2]);
                const toVec = posB instanceof THREE.Vector3 ? posB : new THREE.Vector3(posB[0], 0, posB[2]);
                const agentColor = agents.find((a) => a.id === collab.agentA)?.color || "#8b5cf6";

                return (
                    <CollaborationBeam
                        key={`collab-${collab.agentA}-${collab.agentB}-${i}`}
                        fromPosition={fromVec}
                        toPosition={toVec}
                        color={agentColor}
                        active={true}
                    />
                );
            })}
        </>
    );
}
