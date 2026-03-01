"use client";
/**
 * COWORK.ARMY v7.0 — Trade Floor 3D Scene
 * Trading monitors, candlestick displays, ticker tape vibe
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { SceneProps } from "./DepartmentScene3D";
import AgentDesk from "../AgentDesk";
import AgentAvatar from "../AgentAvatar";
import StatusLED from "../StatusLED";
import { DEPT_DESK_POSITIONS } from "../scene-constants";

const POSITIONS = DEPT_DESK_POSITIONS.trade;
const DEPT_COLOR = "#a78bfa";

export default function TradeFloor({ agents, statuses }: SceneProps) {
  return (
    <group>
      {/* Department lighting */}
      <spotLight position={[0, 10, -2]} angle={0.6} penumbra={0.5} intensity={0.8} color={DEPT_COLOR} />
      <pointLight position={[-4, 5, -1]} intensity={0.3} color="#818cf8" />
      <pointLight position={[4, 5, -1]} intensity={0.3} color="#c084fc" />

      {/* Trading monitors wall */}
      <TradingWall />

      {/* Ticker tape */}
      <TickerTape />

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
        TRADE DEPARTMENT
      </Text>
    </group>
  );
}

function TradingWall() {
  const screens = [
    { pos: [-3, 2.5, -5] as [number, number, number], w: 2, h: 1.2 },
    { pos: [0, 2.5, -5] as [number, number, number], w: 2, h: 1.2 },
    { pos: [3, 2.5, -5] as [number, number, number], w: 2, h: 1.2 },
    { pos: [-1.5, 4, -5] as [number, number, number], w: 2.5, h: 1 },
    { pos: [1.5, 4, -5] as [number, number, number], w: 2.5, h: 1 },
  ];

  return (
    <group>
      {screens.map((s, i) => (
        <group key={i} position={s.pos}>
          {/* Screen frame */}
          <mesh>
            <boxGeometry args={[s.w, s.h, 0.05]} />
            <meshStandardMaterial color="#0a0b12" />
          </mesh>
          {/* Screen surface */}
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[s.w - 0.1, s.h - 0.1]} />
            <meshStandardMaterial
              color="#0f0f20"
              emissive={i % 2 === 0 ? "#22c55e" : "#ef4444"}
              emissiveIntensity={0.15}
            />
          </mesh>
          {/* Chart bars */}
          <ChartBars width={s.w - 0.2} height={s.h - 0.2} offset={i * 10} />
        </group>
      ))}
    </group>
  );
}

function ChartBars({ width, height, offset }: { width: number; height: number; offset: number }) {
  const ref = useRef<THREE.Group>(null);
  const barCount = 12;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.children.forEach((child, i) => {
      const h = (Math.sin(t * 0.5 + i * 0.8 + offset) * 0.5 + 0.5) * height * 0.7 + height * 0.1;
      child.scale.y = h;
      child.position.y = h / 2 - height / 2;
    });
  });

  const barW = width / (barCount * 1.5);

  return (
    <group ref={ref} position={[0, 0, 0.06]}>
      {Array.from({ length: barCount }).map((_, i) => {
        const x = (i - barCount / 2 + 0.5) * (width / barCount);
        const isGreen = i % 3 !== 0;
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[barW, 1, 0.01]} />
            <meshStandardMaterial
              color={isGreen ? "#22c55e" : "#ef4444"}
              emissive={isGreen ? "#22c55e" : "#ef4444"}
              emissiveIntensity={0.5}
              transparent
              opacity={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function TickerTape() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.x = -((clock.getElapsedTime() * 0.5) % 8) + 4;
  });

  return (
    <group position={[0, 1.5, -4.9]}>
      {/* Tape background */}
      <mesh>
        <planeGeometry args={[10, 0.15]} />
        <meshStandardMaterial color="#0a0012" emissive="#a78bfa" emissiveIntensity={0.1} />
      </mesh>
      <group ref={ref}>
        <Text position={[0, 0, 0.01]} fontSize={0.08} color="#a78bfa" anchorX="center" anchorY="middle">
          BTC +2.4% — ETH -0.8% — SOL +5.1% — AVAX +1.2% — BNB -0.3%
        </Text>
      </group>
    </group>
  );
}
