"use client";
/**
 * COWORK.ARMY — World3DScene v5
 *
 * Düzeltmeler:
 * 1. Kamera HUD Canvas DIŞINA taşındı → çıkış butonu her zaman çalışır
 * 2. Her departman için prosedürel ofis iç mekanı (zemin, duvarlar, tavan, ekipman)
 * 3. Agent müdahale paneli: seçili agent'a görev gönder, durdur
 * 4. CEO kule + Cargo drone korundu
 */
import {
  Suspense,
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  Html,
  Billboard,
  Text,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import type { WorldEvent, AgentWorldModel } from "@/lib/world-types";
import AgentCommandPanel from "./AgentCommandPanel";

// ─── Sabitler ────────────────────────────────────────────────────────────────

const CEO_POSITION: [number, number, number] = [0, 0, 0];
const CARGO_COLOR = "#f472b6";
const CEO_COLOR = "#ffd700";

const DEPT_POSITIONS: Record<string, [number, number, number]> = {
  trade:    [-10, 0, -7],
  medical:  [  0, 0, -11],
  hotel:    [ 10, 0, -7],
  software: [ -7, 0,  7],
  bots:     [  7, 0,  7],
};

const DEPT_COLORS: Record<string, string> = {
  management: CEO_COLOR,
  trade:    "#00ff88",
  medical:  "#00ccff",
  hotel:    "#ffaa00",
  software: "#cc44ff",
  bots:     "#ff4466",
};

const DEPT_LABELS: Record<string, string> = {
  management: "CEO",
  trade:    "TRADE",
  medical:  "MEDICAL",
  hotel:    "HOTEL",
  software: "SOFTWARE",
  bots:     "BOTS",
};

const AGENT_MODEL_MAP: Record<string, string> = {
  management: "/models/trade_agent.glb",
  trade:      "/models/trade_agent.glb",
  medical:    "/models/medical_agent.glb",
  hotel:      "/models/hotel_agent.glb",
  software:   "/models/software_agent.glb",
  bots:       "/models/bots_agent.glb",
};

// Masa grid'i — bina merkezine göre
const DESK_OFFSETS: [number, number, number][] = [
  [-1.4, 0, -1.4],
  [ 0.0, 0, -1.4],
  [ 1.4, 0, -1.4],
  [-1.4, 0,  0.2],
  [ 0.0, 0,  0.2],
  [ 1.4, 0,  0.2],
  [ 0.0, 0,  1.5],
];

// Bina boyutları
const BLDG_W = 5.5;
const BLDG_D = 5.5;
const BLDG_H = 3.2;
const WALL_T = 0.08;

// ─── Zemin ───────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#060a14" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[100, 100, "#0e1428", "#0a1020"]} position={[0, 0, 0]} />
    </>
  );
}

// ─── Ofis İç Mekanı ──────────────────────────────────────────────────────────

interface OfficeInteriorProps {
  dept: string;
  position: [number, number, number];
  isActive: boolean;
  agentCount: number;
  activeCount: number;
}

function OfficeInterior({ dept, position, isActive, agentCount, activeCount }: OfficeInteriorProps) {
  const color = DEPT_COLORS[dept] || "#ffffff";
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = isActive
        ? 1.2 + Math.sin(state.clock.elapsedTime * 2.2) * 0.4
        : 0.15;
    }
  });

  const W = BLDG_W, D = BLDG_D, H = BLDG_H, T = WALL_T;

  return (
    <group position={position}>
      {/* ── Zemin ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#0d1228" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Zemin çizgileri */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[W - 0.1, D - 0.1]} />
        <meshBasicMaterial color={color} transparent opacity={0.04} />
      </mesh>

      {/* ── Tavan ── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color="#080c18" roughness={0.9} />
      </mesh>

      {/* ── Duvarlar (şeffaf cam) ── */}
      {/* Ön duvar */}
      <mesh position={[0, H / 2, D / 2]}>
        <boxGeometry args={[W, H, T]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.08} roughness={0} metalness={0.1} transmission={0.9} />
      </mesh>
      {/* Arka duvar */}
      <mesh position={[0, H / 2, -D / 2]}>
        <boxGeometry args={[W, H, T]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.08} roughness={0} metalness={0.1} transmission={0.9} />
      </mesh>
      {/* Sol duvar */}
      <mesh position={[-W / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, D]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.08} roughness={0} metalness={0.1} transmission={0.9} />
      </mesh>
      {/* Sağ duvar */}
      <mesh position={[W / 2, H / 2, 0]}>
        <boxGeometry args={[T, H, D]} />
        <meshPhysicalMaterial color={color} transparent opacity={0.08} roughness={0} metalness={0.1} transmission={0.9} />
      </mesh>

      {/* ── Köşe kolonları ── */}
      {([[-W/2, W/2, -D/2, D/2]] as never[]).flatMap(() =>
        ([-W/2, W/2] as number[]).flatMap(cx =>
          ([-D/2, D/2] as number[]).map(cz => ({ cx, cz }))
        )
      ).map(({ cx, cz }, i) => (
        <mesh key={i} position={[cx, H / 2, cz]} castShadow>
          <boxGeometry args={[0.18, H, 0.18]} />
          <meshStandardMaterial color="#0d1228" metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.06} />
        </mesh>
      ))}

      {/* ── Tavan ışık şeritleri ── */}
      {([-1.2, 0, 1.2] as number[]).map((ox, i) => (
        <mesh key={i} position={[ox, H - 0.05, 0]}>
          <boxGeometry args={[0.12, 0.04, D - 0.4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 1.2 : 0.3} toneMapped={false} />
        </mesh>
      ))}

      {/* ── Departmana özel ekipman ── */}
      <DeptEquipment dept={dept} color={color} isActive={isActive} />

      {/* ── İç ışık ── */}
      <pointLight ref={glowRef} color={color} intensity={isActive ? 1.2 : 0.15} distance={8} position={[0, H - 0.5, 0]} />

      {/* ── Aktif kıvılcım ── */}
      {isActive && (
        <Sparkles count={12} scale={[W - 1, 0.5, D - 1]} size={1.0} speed={0.3} color={color} position={[0, H + 0.2, 0]} />
      )}

      {/* ── Departman etiketi ── */}
      <Billboard position={[0, H + 1.0, 0]}>
        <Text fontSize={0.32} color={color} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000">
          {DEPT_LABELS[dept]}
        </Text>
        <Text fontSize={0.18} color="#888888" anchorX="center" anchorY="middle" position={[0, -0.44, 0]}>
          {activeCount}/{agentCount} aktif
        </Text>
      </Billboard>

      {/* ── Zemin halkası ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[W / 2 + 0.3, W / 2 + 0.7, 48]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.5 : 0.1} />
      </mesh>
    </group>
  );
}

// ─── Departmana Özel Ekipman ──────────────────────────────────────────────────

function DeptEquipment({ dept, color, isActive }: { dept: string; color: string; isActive: boolean }) {
  switch (dept) {
    case "trade":
      return <TradeEquipment color={color} isActive={isActive} />;
    case "medical":
      return <MedicalEquipment color={color} isActive={isActive} />;
    case "hotel":
      return <HotelEquipment color={color} isActive={isActive} />;
    case "software":
      return <SoftwareEquipment color={color} isActive={isActive} />;
    case "bots":
      return <BotsEquipment color={color} isActive={isActive} />;
    default:
      return null;
  }
}

// Trade: büyük trading ekranı duvarı
function TradeEquipment({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <group>
      {/* Büyük ekran duvarı */}
      <mesh position={[0, 1.6, -BLDG_D / 2 + 0.15]}>
        <boxGeometry args={[4.2, 2.0, 0.08]} />
        <meshStandardMaterial color="#050810" emissive={color} emissiveIntensity={isActive ? 0.25 : 0.05} />
      </mesh>
      {/* Ekran içi grafik çizgileri */}
      {([0.6, 1.0, 0.4, 0.8, 1.2, 0.5] as number[]).map((h, i) => (
        <mesh key={i} position={[-1.8 + i * 0.7, 1.2 + h * 0.5, -BLDG_D / 2 + 0.2]}>
          <boxGeometry args={[0.08, h, 0.02]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      {/* Ticker şeridi */}
      <mesh position={[0, 0.65, -BLDG_D / 2 + 0.18]}>
        <boxGeometry args={[4.0, 0.12, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 2.0 : 0.3} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Medical: yatak + medikal ekipman
function MedicalEquipment({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <group>
      {/* Muayene yatağı */}
      <mesh position={[-1.5, 0.45, -0.5]}>
        <boxGeometry args={[1.2, 0.12, 2.2]} />
        <meshStandardMaterial color="#1a2a3a" roughness={0.7} />
      </mesh>
      <mesh position={[-1.5, 0.3, -0.5]}>
        <boxGeometry args={[1.2, 0.3, 2.2]} />
        <meshStandardMaterial color="#0d1a28" />
      </mesh>
      {/* EKG monitörü */}
      <mesh position={[-0.2, 1.1, -BLDG_D / 2 + 0.2]}>
        <boxGeometry args={[0.7, 0.5, 0.08]} />
        <meshStandardMaterial color="#050810" emissive={color} emissiveIntensity={isActive ? 0.4 : 0.1} />
      </mesh>
      {/* EKG çizgisi */}
      <mesh position={[-0.2, 1.1, -BLDG_D / 2 + 0.25]}>
        <boxGeometry args={[0.5, 0.02, 0.02]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* IV standı */}
      <mesh position={[0.5, 1.0, -0.5]}>
        <cylinderGeometry args={[0.02, 0.02, 2.0, 6]} />
        <meshStandardMaterial color="#334" metalness={0.8} />
      </mesh>
      <mesh position={[0.5, 1.9, -0.5]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Raf */}
      <mesh position={[BLDG_W / 2 - 0.3, 1.5, 0]}>
        <boxGeometry args={[0.12, 0.06, 3.0]} />
        <meshStandardMaterial color="#1a2a3a" />
      </mesh>
    </group>
  );
}

// Hotel: resepsiyon tezgahı + kapı
function HotelEquipment({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <group>
      {/* Resepsiyon tezgahı */}
      <mesh position={[0, 0.55, -1.5]}>
        <boxGeometry args={[3.5, 0.1, 0.9]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.4} emissive={color} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={[0, 0.3, -1.5]}>
        <boxGeometry args={[3.5, 0.5, 0.9]} />
        <meshStandardMaterial color="#12122a" />
      </mesh>
      {/* Tezgah üstü monitör */}
      <mesh position={[0.5, 0.9, -1.7]}>
        <boxGeometry args={[0.55, 0.38, 0.04]} />
        <meshStandardMaterial color="#050810" emissive={color} emissiveIntensity={isActive ? 0.5 : 0.1} />
      </mesh>
      {/* Kapı çerçevesi */}
      <mesh position={[0, BLDG_H / 2, BLDG_D / 2 - 0.05]}>
        <boxGeometry args={[1.0, BLDG_H, 0.1]} />
        <meshStandardMaterial color={color} transparent opacity={0.12} roughness={0} />
      </mesh>
      {/* Kapı ışığı */}
      <mesh position={[0, BLDG_H - 0.15, BLDG_D / 2 - 0.05]}>
        <boxGeometry args={[1.0, 0.08, 0.06]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 2.0 : 0.4} toneMapped={false} />
      </mesh>
      {/* Bekleme koltuğu */}
      <mesh position={[-1.5, 0.3, 1.2]}>
        <boxGeometry args={[0.7, 0.12, 0.65]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Software: server rack + kod ekranları
function SoftwareEquipment({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <group>
      {/* Server rack */}
      <mesh position={[BLDG_W / 2 - 0.5, 1.0, -1.0]}>
        <boxGeometry args={[0.6, 2.0, 0.9]} />
        <meshStandardMaterial color="#0a0a18" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Server ışıkları */}
      {([0.2, 0.5, 0.8, 1.1, 1.4, 1.7] as number[]).map((y, i) => (
        <mesh key={i} position={[BLDG_W / 2 - 0.35, y, -1.0]}>
          <boxGeometry args={[0.06, 0.04, 0.06]} />
          <meshBasicMaterial color={i % 2 === 0 ? color : "#22c55e"} />
        </mesh>
      ))}
      {/* Kod ekranı duvarı */}
      <mesh position={[0, 1.5, -BLDG_D / 2 + 0.15]}>
        <boxGeometry args={[3.5, 1.8, 0.06]} />
        <meshStandardMaterial color="#050810" emissive={color} emissiveIntensity={isActive ? 0.2 : 0.04} />
      </mesh>
      {/* Kod satırları */}
      {([0, 1, 2, 3, 4, 5, 6, 7] as number[]).map((row) => (
        <mesh key={row} position={[-1.4 + (row % 4) * 0.9, 1.8 - Math.floor(row / 4) * 0.5, -BLDG_D / 2 + 0.2]}>
          <boxGeometry args={[0.6 + Math.random() * 0.4, 0.04, 0.01]} />
          <meshBasicMaterial color={row % 3 === 0 ? color : "#334466"} />
        </mesh>
      ))}
    </group>
  );
}

// Bots: data pipeline ekranları + anten
function BotsEquipment({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <group>
      {/* Büyük data ekranı */}
      <mesh position={[0, 1.6, -BLDG_D / 2 + 0.15]}>
        <boxGeometry args={[4.0, 1.8, 0.06]} />
        <meshStandardMaterial color="#050810" emissive={color} emissiveIntensity={isActive ? 0.22 : 0.05} />
      </mesh>
      {/* Data akış çizgileri */}
      {([0, 1, 2, 3, 4] as number[]).map((i) => (
        <mesh key={i} position={[-1.6 + i * 0.8, 1.6, -BLDG_D / 2 + 0.2]}>
          <boxGeometry args={[0.04, 1.4, 0.01]} />
          <meshBasicMaterial color={color} transparent opacity={0.4 + i * 0.1} />
        </mesh>
      ))}
      {/* Anten */}
      <mesh position={[1.8, 1.6, 1.5]}>
        <cylinderGeometry args={[0.03, 0.03, 2.0, 6]} />
        <meshStandardMaterial color="#334" metalness={0.8} />
      </mesh>
      <mesh position={[1.8, 2.6, 1.5]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 3.0 : 0.5} toneMapped={false} />
      </mesh>
      {/* Bot istasyonları */}
      {([-1.2, 0.0, 1.2] as number[]).map((x, i) => (
        <group key={i} position={[x, 0, 1.0]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.18, 0.22, 1.0, 8]} />
            <meshStandardMaterial color="#0d1228" metalness={0.6} emissive={color} emissiveIntensity={isActive ? 0.1 : 0.02} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.8 : 0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Masa + Sandalye ──────────────────────────────────────────────────────────

function Desk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.78, 0.06, 0.54]} />
        <meshStandardMaterial color="#1e2540" roughness={0.5} metalness={0.4} />
      </mesh>
      {([[-0.33, 0.21, -0.23], [0.33, 0.21, -0.23], [-0.33, 0.21, 0.23], [0.33, 0.21, 0.23]] as [number,number,number][]).map(([lx, ly, lz], i) => (
        <mesh key={i} position={[lx, ly, lz]}>
          <boxGeometry args={[0.05, 0.42, 0.05]} />
          <meshStandardMaterial color="#0d1228" />
        </mesh>
      ))}
      <mesh position={[0, 0.70, -0.18]}>
        <boxGeometry args={[0.44, 0.30, 0.03]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.47, -0.18]}>
        <boxGeometry args={[0.05, 0.1, 0.05]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 0.30, 0.44]}>
        <boxGeometry args={[0.52, 0.06, 0.46]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.56, 0.64]}>
        <boxGeometry args={[0.52, 0.5, 0.05]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── CEO Binası ───────────────────────────────────────────────────────────────

function CEOBuilding({ isActive }: { isActive: boolean }) {
  const glowRef = useRef<THREE.PointLight>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = isActive ? 2.5 + Math.sin(state.clock.elapsedTime * 1.8) * 0.8 : 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.6;
    }
  });

  return (
    <group position={CEO_POSITION}>
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[1.0, 1.3, 5.0, 8]} />
        <meshStandardMaterial color="#1a1a2e" emissive={CEO_COLOR} emissiveIntensity={isActive ? 0.15 : 0.05} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 5.2, 0]} castShadow>
        <cylinderGeometry args={[1.5, 1.0, 0.3, 8]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={0.6} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh ref={ringRef} position={[0, 3.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.06, 8, 32]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={isActive ? 1.5 : 0.3} toneMapped={false} />
      </mesh>
      <pointLight ref={glowRef} color={CEO_COLOR} intensity={isActive ? 2.5 : 0.5} distance={12} position={[0, 5.5, 0]} />
      {isActive && <Sparkles count={30} scale={[3, 3, 3]} size={1.8} speed={0.5} color={CEO_COLOR} position={[0, 5.5, 0]} />}
      <Billboard position={[0, 7.0, 0]}>
        <Text fontSize={0.4} color={CEO_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000">
          👑 CEO
        </Text>
        <Text fontSize={0.2} color="#aaaaaa" anchorX="center" anchorY="middle" position={[0, -0.55, 0]}>
          {isActive ? "● Analiz ediyor" : "○ Bekliyor"}
        </Text>
      </Billboard>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[2.0, 2.5, 48]} />
        <meshBasicMaterial color={CEO_COLOR} transparent opacity={isActive ? 0.6 : 0.15} />
      </mesh>
    </group>
  );
}

// ─── Cargo Drone ─────────────────────────────────────────────────────────────

interface CargoDroneProps {
  from: [number, number, number];
  to: [number, number, number];
  taskTitle: string;
  onComplete: () => void;
}

function CargoDrone({ from, to, taskTitle, onComplete }: CargoDroneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const done = useRef(false);

  useFrame((_, delta) => {
    if (!groupRef.current || done.current) return;
    t.current = Math.min(1, t.current + delta * 0.7);
    const v = t.current;
    groupRef.current.position.set(
      THREE.MathUtils.lerp(from[0], to[0], v),
      Math.sin(v * Math.PI) * 5 + 1.5,
      THREE.MathUtils.lerp(from[2], to[2], v)
    );
    groupRef.current.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]);
    if (t.current >= 1) { done.current = true; onComplete(); }
  });

  return (
    <group ref={groupRef} position={[from[0], 1.5, from[2]]}>
      <mesh>
        <boxGeometry args={[0.3, 0.1, 0.3]} />
        <meshStandardMaterial color={CARGO_COLOR} emissive={CARGO_COLOR} emissiveIntensity={0.8} metalness={0.7} />
      </mesh>
      {([[-0.25, 0, -0.25], [0.25, 0, -0.25], [-0.25, 0, 0.25], [0.25, 0, 0.25]] as [number,number,number][]).map(([ax, ay, az], i) => (
        <group key={i} position={[ax, ay, az]}>
          <mesh><cylinderGeometry args={[0.12, 0.12, 0.02, 6]} /><meshStandardMaterial color="#333" /></mesh>
          <pointLight color={CARGO_COLOR} intensity={0.5} distance={1} />
        </group>
      ))}
      <mesh position={[0, -0.18, 0]}>
        <boxGeometry args={[0.18, 0.15, 0.18]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.3} />
      </mesh>
      <pointLight color={CARGO_COLOR} intensity={2} distance={3} />
      <Billboard position={[0, 0.6, 0]}>
        <Text fontSize={0.12} color={CARGO_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000">
          📦 {taskTitle.slice(0, 20)}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Mesaj Işını ──────────────────────────────────────────────────────────────

function MessageBeam({ from, to, color, onComplete }: { from: string; to: string; color: string; onComplete: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const done = useRef(false);
  const fp = DEPT_POSITIONS[from] || [0, 0, 0];
  const tp = DEPT_POSITIONS[to] || [0, 0, 0];

  useFrame((_, delta) => {
    if (!meshRef.current || done.current) return;
    t.current = Math.min(1, t.current + delta * 1.3);
    const v = t.current;
    meshRef.current.position.set(
      THREE.MathUtils.lerp(fp[0], tp[0], v),
      Math.sin(v * Math.PI) * 4,
      THREE.MathUtils.lerp(fp[2], tp[2], v)
    );
    if (t.current >= 1) { done.current = true; onComplete(); }
  });

  return (
    <mesh ref={meshRef} position={[fp[0], 0.5, fp[2]]}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      <pointLight color={color} intensity={5} distance={3} />
    </mesh>
  );
}

// ─── Agent Maskotu ────────────────────────────────────────────────────────────

export interface AgentRef {
  agentId: string;
  dept: string;
  worldPos: THREE.Vector3;
}

interface MascotProps {
  dept: string;
  index: number;
  isWorking: boolean;
  agentName: string;
  isSelected: boolean;
  onSelect: (ref: AgentRef) => void;
}

function AgentMascot3D({ dept, index, isWorking, agentName, isSelected, onSelect }: MascotProps) {
  const modelPath = AGENT_MODEL_MAP[dept] || AGENT_MODEL_MAP["trade"];
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const color = DEPT_COLORS[dept] || "#ffffff";
  const [hovered, setHovered] = useState(false);

  const isCeo = dept === "management";
  const deptPos = isCeo ? CEO_POSITION : (DEPT_POSITIONS[dept] || [0, 0, 0]);
  const off = isCeo ? [0, 0, 0] : DESK_OFFSETS[index % DESK_OFFSETS.length];
  const wx = deptPos[0] + off[0];
  const wy = isCeo ? 5.4 : 0;
  const wz = deptPos[2] + off[2];

  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).raycast = THREE.Mesh.prototype.raycast;
      }
    });
  }, [cloned]);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isWorking) {
      groupRef.current.position.y = wy + Math.abs(Math.sin(state.clock.elapsedTime * 2.8 + index * 1.2)) * 0.07;
    } else {
      groupRef.current.position.y = wy;
      groupRef.current.rotation.y = Math.PI + Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.18;
    }
  });

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelect({ agentId: agentName, dept, worldPos: new THREE.Vector3(wx, wy, wz) });
  }, [agentName, dept, wx, wy, wz, onSelect]);

  return (
    <group ref={groupRef} position={[wx, wy, wz]} rotation={[0, Math.PI, 0]}>
      {/* Görünmez hitbox */}
      <mesh
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "default"; }}
        onClick={handleClick}
        position={[0, 0.5, 0]}
      >
        <cylinderGeometry args={[0.45, 0.45, 1.2, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <primitive object={cloned} scale={[0.24, 0.24, 0.24]} />

      {isSelected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.3, 0.42, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.95} />
          </mesh>
          <pointLight color={color} intensity={1.2} distance={2.5} position={[0, 0.8, 0]} />
        </>
      )}

      {(hovered || isSelected) && (
        <Billboard position={[0, 1.1, 0]}>
          <Text fontSize={0.14} color={color} anchorX="center" anchorY="middle" outlineWidth={0.018} outlineColor="#000">
            {agentName.replace(/_/g, " ")}
          </Text>
          <Text fontSize={0.11} color={isWorking ? "#88ff88" : "#888888"} anchorX="center" anchorY="middle" position={[0, -0.2, 0]}>
            {isWorking ? "● çalışıyor" : "○ bekliyor"}
          </Text>
        </Billboard>
      )}

      {isWorking && !isSelected && (
        <pointLight color={color} intensity={0.5} distance={1.4} position={[0, 0.5, 0]} />
      )}
    </group>
  );
}

// ─── 3. Şahıs Kamera ─────────────────────────────────────────────────────────

function ThirdPersonCamera({ target }: { target: THREE.Vector3 }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3());
  const camLook = useRef(new THREE.Vector3());
  const first = useRef(true);

  useEffect(() => { first.current = true; }, [target]);

  useFrame((_, delta) => {
    const desired = new THREE.Vector3(target.x, target.y + 2.8, target.z + 4.5);
    const look = new THREE.Vector3(target.x, target.y + 1.2, target.z);
    if (first.current) {
      camPos.current.copy(desired);
      camLook.current.copy(look);
      first.current = false;
    } else {
      camPos.current.lerp(desired, Math.min(1, delta * 5));
      camLook.current.lerp(look, Math.min(1, delta * 6));
    }
    camera.position.copy(camPos.current);
    camera.lookAt(camLook.current);
  });

  return null;
}

// ─── Ana Sahne (Canvas içi) ───────────────────────────────────────────────────

interface SceneProps {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
  selected: AgentRef | null;
  onSelect: (ref: AgentRef) => void;
}

interface Beam { id: string; from: string; to: string; color: string; }
interface CargoDroneData { id: string; from: [number,number,number]; to: [number,number,number]; taskTitle: string; }

function Scene({ events, worldModels, selected, onSelect }: SceneProps) {
  const [beams, setBeams] = useState<Beam[]>([]);
  const [drones, setDrones] = useState<CargoDroneData[]>([]);
  const lastLen = useRef(0);

  const isCeoActive = useMemo(() =>
    worldModels.some((m) => m.agent_id === "ceo" && !!m.current_task),
    [worldModels]
  );

  useEffect(() => {
    if (events.length <= lastLen.current) return;
    const fresh = events.slice(lastLen.current);
    lastLen.current = events.length;
    for (const ev of fresh) {
      if (ev.type === "agent_message" && ev.from_dept && ev.to_dept && ev.from_dept !== ev.to_dept) {
        setBeams((p) => [...p.slice(-8), {
          id: `${Date.now()}-${Math.random()}`,
          from: ev.from_dept!, to: ev.to_dept!,
          color: DEPT_COLORS[ev.from_dept!] || "#fff",
        }]);
      }
      if (ev.type === "cargo_route" && ev.to_dept) {
        const toPos = DEPT_POSITIONS[ev.to_dept] || [0, 0, 0];
        setDrones((p) => [...p.slice(-4), {
          id: `drone-${Date.now()}-${Math.random()}`,
          from: CEO_POSITION,
          to: toPos as [number, number, number],
          taskTitle: ev.summary || "Görev",
        }]);
      }
    }
  }, [events]);

  const deptStats = useMemo(() => {
    const s: Record<string, { total: number; active: number }> = {};
    for (const dept of Object.keys(DEPT_POSITIONS)) {
      const ag = worldModels.filter((m) => {
        const id = m.agent_id.toLowerCase();
        return id.includes(dept) || (dept === "bots" && id.includes("bot"));
      });
      s[dept] = { total: ag.length || 3, active: ag.filter((m) => m.current_task).length };
    }
    return s;
  }, [worldModels]);

  const agentsByDept = useMemo(() => {
    const map: Record<string, AgentWorldModel[]> = {};
    for (const dept of Object.keys(DEPT_POSITIONS)) {
      map[dept] = worldModels.filter((m) => {
        const id = m.agent_id.toLowerCase();
        return id.includes(dept) || (dept === "bots" && id.includes("bot"));
      });
      if (map[dept].length === 0) {
        map[dept] = Array.from({ length: 3 }, (_, i) => ({
          agent_id: `${dept}_agent_${i + 1}`,
          current_task: i === 0 ? "idle" : null,
          energy_level: 80, expertise_score: 0.7,
          trust_network: {}, idle_timeout_seconds: 30,
        } as AgentWorldModel));
      }
    }
    return map;
  }, [worldModels]);

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[15, 20, 15]} intensity={0.9} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-15, 12, -15]} intensity={0.18} color="#4466ff" />
      <hemisphereLight args={["#0a1030", "#050810", 0.4]} />

      <Ground />
      <CEOBuilding isActive={isCeoActive} />

      {/* CEO maskotu */}
      <Suspense fallback={null}>
        <AgentMascot3D dept="management" index={0} isWorking={isCeoActive}
          agentName="ceo" isSelected={selected?.agentId === "ceo"} onSelect={onSelect} />
      </Suspense>

      {/* Departman ofisleri + masalar + maskotlar */}
      {Object.entries(DEPT_POSITIONS).map(([dept, pos]) => {
        const st = deptStats[dept] || { total: 3, active: 0 };
        const agents = agentsByDept[dept] || [];
        const cnt = agents.length || st.total;
        return (
          <group key={dept}>
            <OfficeInterior dept={dept} position={pos} isActive={st.active > 0} agentCount={cnt} activeCount={st.active} />
            {Array.from({ length: Math.min(cnt, DESK_OFFSETS.length) }).map((_, i) => {
              const o = DESK_OFFSETS[i];
              return <Desk key={i} position={[pos[0] + o[0], 0, pos[2] + o[2]]} color={DEPT_COLORS[dept] || "#fff"} />;
            })}
            {agents.map((agent, idx) => (
              <Suspense key={agent.agent_id} fallback={null}>
                <AgentMascot3D dept={dept} index={idx} isWorking={!!agent.current_task}
                  agentName={agent.agent_id} isSelected={selected?.agentId === agent.agent_id} onSelect={onSelect} />
              </Suspense>
            ))}
          </group>
        );
      })}

      {/* Cargo drone'lar */}
      {drones.map((d) => (
        <CargoDrone key={d.id} from={d.from} to={d.to} taskTitle={d.taskTitle}
          onComplete={() => setDrones((p) => p.filter((x) => x.id !== d.id))} />
      ))}

      {/* Mesaj ışınları */}
      {beams.map((b) => (
        <MessageBeam key={b.id} from={b.from} to={b.to} color={b.color}
          onComplete={() => setBeams((p) => p.filter((x) => x.id !== b.id))} />
      ))}

      {/* Kamera */}
      {selected ? (
        <ThirdPersonCamera target={selected.worldPos} />
      ) : (
        <OrbitControls enablePan enableZoom enableRotate
          minDistance={5} maxDistance={60}
          maxPolarAngle={Math.PI / 2 - 0.02}
          target={[0, 1, 0]} />
      )}
    </>
  );
}

// ─── Kamera HUD (Canvas DIŞINDA) ──────────────────────────────────────────────

function CameraHUD({ agent, onExit }: { agent: AgentRef; onExit: () => void }) {
  const color = DEPT_COLORS[agent.dept] || "#fff";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(5,8,16,0.92)",
        border: `1.5px solid ${color}`,
        borderRadius: 14,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: "monospace",
        color: "#fff",
        fontSize: 13,
        backdropFilter: "blur(12px)",
        zIndex: 100,
        pointerEvents: "all",
        whiteSpace: "nowrap",
        boxShadow: `0 0 24px ${color}44`,
        userSelect: "none",
      }}
    >
      <span style={{ color, fontSize: 16 }}>◉</span>
      <span>
        <b style={{ color }}>{agent.agentId.replace(/_/g, " ")}</b>
        <span style={{ color: "#555", margin: "0 8px" }}>|</span>
        <span style={{ color: "#888" }}>{DEPT_LABELS[agent.dept] || agent.dept.toUpperCase()}</span>
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onExit(); }}
        style={{
          background: "rgba(255,255,255,0.1)",
          border: "1px solid #333",
          borderRadius: 8,
          color: "#ccc",
          padding: "5px 16px",
          cursor: "pointer",
          fontSize: 12,
          fontFamily: "monospace",
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
      >
        ✕ Çık
      </button>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function Loader() {
  return (
    <Html center>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, border: "2px solid #00ccff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#00ccff", fontFamily: "monospace", fontSize: 12 }}>3D Dünya yükleniyor...</p>
      </div>
    </Html>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function World3DScene({
  events,
  worldModels,
}: {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
}) {
  const [selected, setSelected] = useState<AgentRef | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const handleSelect = useCallback((ref: AgentRef) => {
    setSelected(ref);
    setPanelOpen(true);
  }, []);
  const handleExit = useCallback(() => {
    setSelected(null);
    setPanelOpen(false);
  }, []);

  return (
    <div className="w-full h-full relative" style={{ background: "#050810" }}>
      {/* İpucu (sadece kamera serbest modda) */}
      {!selected && (
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.65)", border: "1px solid #1a2a4a",
          borderRadius: 8, padding: "5px 18px", fontFamily: "monospace",
          fontSize: 11, color: "#445566", zIndex: 10, pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          Agent'a tıkla → 3. şahıs kamerası
        </div>
      )}

      {/* Kamera HUD — Canvas DIŞINDA, her zaman tıklanabilir */}
      {selected && <CameraHUD agent={selected} onExit={handleExit} />}

      {/* Agent Komuta Paneli — sağ kenar */}
      {selected && panelOpen && (
        <AgentCommandPanel
          agentId={selected.agentId}
          dept={selected.dept}
          onClose={handleExit}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <Canvas
        shadows
        camera={{ position: [0, 22, 28], fov: 46 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#050810" }}
      >
        <Suspense fallback={<Loader />}>
          <Scene
            events={events}
            worldModels={worldModels}
            selected={selected}
            onSelect={handleSelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload
useGLTF.preload("/models/trade_agent.glb");
useGLTF.preload("/models/medical_agent.glb");
useGLTF.preload("/models/hotel_agent.glb");
useGLTF.preload("/models/software_agent.glb");
useGLTF.preload("/models/bots_agent.glb");
