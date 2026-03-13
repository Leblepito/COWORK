"use client";

/**
 * Visual effects for agent social interactions on campus.
 * - Chat bubbles between socializing agents
 * - Thought cloud over thinking agents
 * - Work sparks over coding agents
 * - Data transfer particles between collaborating agents
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { AgentLifeState } from "../movement/AgentLifeSystem";

const CHAT_EMOJIS = ["💬", "🗣️", "💡", "🤝", "📊", "🔗", "⚡", "🎯"];
const WORK_EMOJIS = ["⚙️", "💻", "📈", "🔍", "🧠", "📝", "🛠️", "🔬"];

/** Floating emoji particles between two socializing agents */
function SocialBubbles({
    posA,
    posB,
    active,
}: {
    posA: THREE.Vector3;
    posB: THREE.Vector3;
    active: boolean;
}) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (!groupRef.current || !active) return;
        const t = clock.elapsedTime;
        groupRef.current.children.forEach((child, i) => {
            const phase = t * 1.5 + i * 1.2;
            const progress = (Math.sin(phase) + 1) / 2;
            const pos = new THREE.Vector3().lerpVectors(posA, posB, progress);
            pos.y = 2.0 + Math.sin(phase * 2) * 0.3;
            child.position.copy(pos);
            child.scale.setScalar(0.6 + Math.sin(phase) * 0.2);
        });
    });

    if (!active) return null;

    return (
        <group ref={groupRef}>
            {[0, 1, 2].map((i) => (
                <mesh key={i}>
                    <sphereGeometry args={[0.12, 6, 6]} />
                    <meshStandardMaterial
                        color="#fbbf24"
                        emissive="#fbbf24"
                        emissiveIntensity={0.8}
                        transparent
                        opacity={0.7}
                    />
                </mesh>
            ))}
        </group>
    );
}

/** Work activity indicator — sparks/particles above working agent */
function WorkIndicator({
    position,
    status,
    color,
}: {
    position: THREE.Vector3;
    status: string;
    color: string;
}) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.elapsedTime;
        groupRef.current.children.forEach((child, i) => {
            const angle = t * 2 + i * (Math.PI * 2 / 4);
            const r = 0.4 + Math.sin(t * 3 + i) * 0.1;
            child.position.set(
                Math.cos(angle) * r,
                2.2 + Math.sin(t * 4 + i * 0.5) * 0.15,
                Math.sin(angle) * r,
            );
            (child as THREE.Mesh).scale.setScalar(0.5 + Math.sin(t * 5 + i) * 0.3);
        });
    });

    if (!["working", "coding", "thinking", "searching", "planning"].includes(status)) return null;

    const sparkColor = status === "coding" ? "#3b82f6"
        : status === "thinking" ? "#8b5cf6"
        : status === "searching" ? "#f59e0b"
        : color;

    return (
        <group ref={groupRef} position={[position.x, position.y, position.z]}>
            {[0, 1, 2, 3].map((i) => (
                <mesh key={i}>
                    <octahedronGeometry args={[0.06]} />
                    <meshStandardMaterial
                        color={sparkColor}
                        emissive={sparkColor}
                        emissiveIntensity={1.5}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}
        </group>
    );
}

/** Chat emoji popup for socializing agents */
function ChatEmoji({
    position,
    socializing,
}: {
    position: THREE.Vector3;
    socializing: boolean;
}) {
    const emojiRef = useRef({ current: "💬", lastChange: 0 });

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        if (t - emojiRef.current.lastChange > 2) {
            emojiRef.current.current = CHAT_EMOJIS[Math.floor(Math.random() * CHAT_EMOJIS.length)];
            emojiRef.current.lastChange = t;
        }
    });

    if (!socializing) return null;

    return (
        <Html
            position={[position.x, position.y + 2.5, position.z]}
            center
            distanceFactor={10}
            style={{ pointerEvents: "none" }}
        >
            <div style={{
                fontSize: "18px",
                animation: "bounce 0.6s ease-in-out infinite alternate",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}>
                {emojiRef.current.current}
            </div>
        </Html>
    );
}

/** Main social interaction overlay — renders effects for all agents */
export default function SocialInteractions({
    lifeStates,
    agentColors,
    statuses,
}: {
    lifeStates: Record<string, AgentLifeState>;
    agentColors: Record<string, string>;
    statuses: Record<string, { status: string }>;
}) {
    // Find socializing pairs to draw bubbles between them
    const socialPairs: { a: string; b: string; posA: THREE.Vector3; posB: THREE.Vector3 }[] = [];
    const seenPairs = new Set<string>();

    for (const [id, state] of Object.entries(lifeStates)) {
        if (state.activity === "socializing" && state.socialPartner) {
            const pairKey = [id, state.socialPartner].sort().join("-");
            if (seenPairs.has(pairKey)) continue;
            seenPairs.add(pairKey);

            const partnerState = lifeStates[state.socialPartner];
            if (partnerState) {
                socialPairs.push({
                    a: id,
                    b: state.socialPartner,
                    posA: state.currentPosition,
                    posB: partnerState.currentPosition,
                });
            }
        }
    }

    return (
        <group>
            {/* Social pair bubbles */}
            {socialPairs.map((pair) => (
                <SocialBubbles
                    key={`social-${pair.a}-${pair.b}`}
                    posA={pair.posA}
                    posB={pair.posB}
                    active={true}
                />
            ))}

            {/* Per-agent indicators */}
            {Object.entries(lifeStates).map(([id, state]) => (
                <group key={`indicator-${id}`}>
                    {/* Work sparks */}
                    <WorkIndicator
                        position={state.currentPosition}
                        status={statuses[id]?.status || "idle"}
                        color={agentColors[id] || "#64748b"}
                    />
                    {/* Chat emoji */}
                    <ChatEmoji
                        position={state.currentPosition}
                        socializing={state.activity === "socializing"}
                    />
                </group>
            ))}
        </group>
    );
}
