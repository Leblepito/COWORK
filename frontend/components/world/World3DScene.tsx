"use client";
/**
 * COWORK.ARMY — World3DScene v6 "Agent Ordusu"
 *
 * Yeni özellikler:
 * 1. Agent yürüme animasyonu: idle → yürü → masa başı otur
 * 2. Düşünce balonu: çalışırken "💭 görev adı..." gösterir
 * 3. Konuşma efekti: işbirliği sırasında iki agent arasında ışık hattı
 * 4. Aktif agent sayacı ve aktivite feed HUD
 * 5. Bina aktifken daha parlak yanar
 * 6. Her departman için detaylı ofis iç mekanı
 * 7. CEO kule + Cargo drone
 * 8. 3. şahıs kamera + Agent Komuta Paneli
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
  Line,
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

const DEPT_ICONS: Record<string, string> = {
  management: "👑",
  trade:    "📈",
  medical:  "🏥",
  hotel:    "🏨",
  software: "💻",
  bots:     "🤖",
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
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#040710" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[120, 120, "#0a1020", "#080e1a"]} position={[0, 0, 0]} />

      {/* Yollar — departmanlar arası */}
      {Object.values(DEPT_POSITIONS).map((pos, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[pos[0] / 2, 0.001, pos[2] / 2]}>
          <planeGeometry args={[0.4, Math.sqrt(pos[0] ** 2 + pos[2] ** 2)]} />
          <meshStandardMaterial color="#0d1525" roughness={1} />
        </mesh>
      ))}

      {/* Kampüs merkezi çemberi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[3.5, 3.8, 64]} />
        <meshStandardMaterial color="#0e1a2e" roughness={1} />
      </mesh>
    </>
  );
}

// ─── Ortam ───────────────────────────────────────────────────────────────────

function Environment() {
  return (
    <>
      <ambientLight intensity={0.18} color="#1a2a4a" />
      <directionalLight
        position={[20, 30, 10]}
        intensity={0.6}
        color="#c8d8ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 15, 0]} intensity={0.3} color="#ffffff" distance={60} />
      {/* Departman ışıkları */}
      {Object.entries(DEPT_POSITIONS).map(([dept, pos]) => (
        <pointLight
          key={dept}
          position={[pos[0], 6, pos[2]]}
          intensity={0.15}
          color={DEPT_COLORS[dept]}
          distance={12}
        />
      ))}
    </>
  );
}

// ─── Bina İç Mekanı ──────────────────────────────────────────────────────────

function DeptBuilding({ dept, isActive, agentCount }: { dept: string; isActive: boolean; agentCount: number }) {
  const color = DEPT_COLORS[dept] || "#ffffff";
  const pos = DEPT_POSITIONS[dept] || [0, 0, 0];
  const glowIntensity = isActive ? 1.8 : 0.4;
  const wallOpacity = isActive ? 0.18 : 0.10;

  const wallMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: wallOpacity,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.75,
    thickness: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), [color, wallOpacity]);

  return (
    <group position={pos}>
      {/* Zemin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[BLDG_W, BLDG_D]} />
        <meshStandardMaterial color="#060c1a" roughness={0.9} />
      </mesh>

      {/* Tavan */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, BLDG_H, 0]}>
        <planeGeometry args={[BLDG_W, BLDG_D]} />
        <meshStandardMaterial color="#050a14" roughness={0.9} transparent opacity={0.6} />
      </mesh>

      {/* Cam Duvarlar */}
      {/* Ön */}
      <mesh position={[0, BLDG_H / 2, BLDG_D / 2]} material={wallMat}>
        <planeGeometry args={[BLDG_W, BLDG_H]} />
      </mesh>
      {/* Arka */}
      <mesh position={[0, BLDG_H / 2, -BLDG_D / 2]} material={wallMat}>
        <planeGeometry args={[BLDG_W, BLDG_H]} />
      </mesh>
      {/* Sol */}
      <mesh position={[-BLDG_W / 2, BLDG_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[BLDG_D, BLDG_H]} />
      </mesh>
      {/* Sağ */}
      <mesh position={[BLDG_W / 2, BLDG_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[BLDG_D, BLDG_H]} />
      </mesh>

      {/* Köşe Kolonlar */}
      {[[-BLDG_W / 2, BLDG_D / 2], [BLDG_W / 2, BLDG_D / 2], [-BLDG_W / 2, -BLDG_D / 2], [BLDG_W / 2, -BLDG_D / 2]].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, BLDG_H / 2, cz]}>
          <boxGeometry args={[WALL_T * 3, BLDG_H, WALL_T * 3]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.6 : 0.15} />
        </mesh>
      ))}

      {/* Tavan ışık şeritleri */}
      {[-1.5, 0, 1.5].map((x, i) => (
        <mesh key={i} position={[x, BLDG_H - 0.05, 0]}>
          <boxGeometry args={[0.12, 0.04, BLDG_D - 0.4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 1.2 : 0.2} toneMapped={false} />
        </mesh>
      ))}

      {/* Departman ekipmanı */}
      <DeptEquipment dept={dept} isActive={isActive} />

      {/* Masalar */}
      {DESK_OFFSETS.slice(0, Math.max(agentCount, 3)).map((off, i) => (
        <Desk key={i} position={off} color={color} isActive={isActive} />
      ))}

      {/* Bina ışığı */}
      <pointLight
        position={[0, BLDG_H - 0.5, 0]}
        intensity={glowIntensity}
        color={color}
        distance={8}
      />

      {/* Zemin halkası */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[BLDG_W / 2 + 0.1, BLDG_W / 2 + 0.4, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.8 : 0.2} transparent opacity={0.7} />
      </mesh>

      {/* Departman etiketi */}
      <Billboard position={[0, BLDG_H + 0.7, 0]}>
        <Text fontSize={0.22} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
          {DEPT_ICONS[dept]} {DEPT_LABELS[dept]}
        </Text>
        {agentCount > 0 && (
          <Text fontSize={0.14} color={isActive ? "#22c55e" : "#445"} anchorX="center" anchorY="middle" position={[0, -0.3, 0]}>
            {isActive ? `${agentCount} aktif` : "bekliyor"}
          </Text>
        )}
      </Billboard>
    </group>
  );
}

// ─── Masa ────────────────────────────────────────────────────────────────────

function Desk({ position, color, isActive }: { position: [number, number, number]; color: string; isActive: boolean }) {
  return (
    <group position={position}>
      {/* Masa yüzeyi */}
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.9, 0.06, 0.55]} />
        <meshStandardMaterial color="#0d1525" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Masa ayakları */}
      {[[-0.38, 0], [0.38, 0], [-0.38, -0.45], [0.38, -0.45]].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.21, dz]}>
          <boxGeometry args={[0.04, 0.42, 0.04]} />
          <meshStandardMaterial color="#0a1020" />
        </mesh>
      ))}
      {/* Monitör */}
      <mesh position={[0, 0.75, -0.18]}>
        <boxGeometry args={[0.55, 0.34, 0.03]} />
        <meshStandardMaterial
          color={isActive ? "#0a1a2e" : "#060810"}
          emissive={color}
          emissiveIntensity={isActive ? 0.35 : 0.05}
        />
      </mesh>
      {/* Monitör stand */}
      <mesh position={[0, 0.55, -0.18]}>
        <boxGeometry args={[0.04, 0.22, 0.04]} />
        <meshStandardMaterial color="#0a1020" />
      </mesh>
      {/* Klavye */}
      <mesh position={[0, 0.46, 0.05]}>
        <boxGeometry args={[0.38, 0.02, 0.14]} />
        <meshStandardMaterial color="#0c1420" roughness={0.9} />
      </mesh>
    </group>
  );
}

// ─── Departman Ekipmanı ───────────────────────────────────────────────────────

function DeptEquipment({ dept, isActive }: { dept: string; isActive: boolean }) {
  const color = DEPT_COLORS[dept] || "#ffffff";

  if (dept === "trade") {
    return (
      <group position={[0, 0, -2.2]}>
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[3.2, 1.8, 0.08]} />
          <meshStandardMaterial color="#060c18" emissive={color} emissiveIntensity={isActive ? 0.3 : 0.05} />
        </mesh>
        {[-1.1, 0, 1.1].map((x, i) => (
          <mesh key={i} position={[x, 1.4, 0.05]}>
            <boxGeometry args={[0.85, 1.5, 0.02]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.6 : 0.1} transparent opacity={0.8} />
          </mesh>
        ))}
        {/* Grafik barlar */}
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={i} position={[-1.4 + i * 0.25, 0.5 + Math.random() * 0.5, 0.1]}>
            <boxGeometry args={[0.12, 0.3 + Math.random() * 0.6, 0.04]} />
            <meshStandardMaterial color={i % 3 === 0 ? "#ff4466" : color} emissive={color} emissiveIntensity={isActive ? 0.5 : 0.1} />
          </mesh>
        ))}
      </group>
    );
  }

  if (dept === "medical") {
    return (
      <group>
        {/* Muayene yatağı */}
        <mesh position={[1.5, 0.45, 0]}>
          <boxGeometry args={[0.7, 0.12, 1.8]} />
          <meshStandardMaterial color="#0d2030" roughness={0.8} />
        </mesh>
        {/* EKG monitörü */}
        <mesh position={[-1.5, 1.1, -1.8]}>
          <boxGeometry args={[0.8, 0.55, 0.08]} />
          <meshStandardMaterial color="#060c18" emissive={color} emissiveIntensity={isActive ? 0.5 : 0.08} />
        </mesh>
        {/* IV standı */}
        <mesh position={[1.8, 1.2, -0.5]}>
          <cylinderGeometry args={[0.02, 0.02, 1.8, 8]} />
          <meshStandardMaterial color="#1a2a4a" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[1.8, 2.0, -0.5]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.6 : 0.1} transparent opacity={0.7} />
        </mesh>
      </group>
    );
  }

  if (dept === "hotel") {
    return (
      <group>
        {/* Resepsiyon tezgahı */}
        <mesh position={[0, 0.55, -2]}>
          <boxGeometry args={[3.5, 0.1, 0.8]} />
          <meshStandardMaterial color="#0d1a2e" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.3, -2]}>
          <boxGeometry args={[3.5, 0.5, 0.7]} />
          <meshStandardMaterial color="#0a1428" roughness={0.7} />
        </mesh>
        {/* Monitörler */}
        {[-0.8, 0.8].map((x, i) => (
          <mesh key={i} position={[x, 0.9, -2.1]}>
            <boxGeometry args={[0.5, 0.32, 0.04]} />
            <meshStandardMaterial color="#060c18" emissive={color} emissiveIntensity={isActive ? 0.4 : 0.06} />
          </mesh>
        ))}
        {/* Cam kapı çerçevesi */}
        <mesh position={[0, 1.2, 2.4]}>
          <boxGeometry args={[1.2, 2.4, 0.06]} />
          <meshStandardMaterial color={color} transparent opacity={0.15} roughness={0.1} />
        </mesh>
      </group>
    );
  }

  if (dept === "software") {
    return (
      <group>
        {/* Server rack */}
        <mesh position={[-2, 1.2, -2]}>
          <boxGeometry args={[0.7, 2.4, 0.9]} />
          <meshStandardMaterial color="#080e1a" roughness={0.8} metalness={0.6} />
        </mesh>
        {/* Server LED'leri */}
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={i} position={[-1.68, 0.3 + i * 0.28, -2]}>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? "#ff4444" : color}
              emissive={i % 3 === 0 ? "#ff4444" : color}
              emissiveIntensity={isActive ? 1.5 : 0.3}
              toneMapped={false}
            />
          </mesh>
        ))}
        {/* Kod ekranı */}
        <mesh position={[0, 1.4, -2.2]}>
          <boxGeometry args={[2.8, 1.6, 0.06]} />
          <meshStandardMaterial color="#040810" emissive={color} emissiveIntensity={isActive ? 0.25 : 0.04} />
        </mesh>
        {/* Kod satırları */}
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} position={[(-0.8 + Math.random() * 1.6), 1.85 - i * 0.2, -2.15]}>
            <boxGeometry args={[0.4 + Math.random() * 1.2, 0.04, 0.01]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.8 : 0.1} />
          </mesh>
        ))}
      </group>
    );
  }

  if (dept === "bots") {
    return (
      <group>
        {/* Data pipeline ekranı */}
        <mesh position={[0, 1.5, -2.2]}>
          <boxGeometry args={[3.0, 1.8, 0.06]} />
          <meshStandardMaterial color="#040810" emissive={color} emissiveIntensity={isActive ? 0.3 : 0.05} />
        </mesh>
        {/* Anten */}
        <mesh position={[2, 2.5, 2]}>
          <cylinderGeometry args={[0.03, 0.03, 2.2, 8]} />
          <meshStandardMaterial color="#1a2a4a" metalness={0.9} />
        </mesh>
        <mesh position={[2, 3.6, 2]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 2 : 0.3} toneMapped={false} />
        </mesh>
        {/* Bot istasyonları */}
        {[-1.2, 0, 1.2].map((x, i) => (
          <group key={i} position={[x, 0.5, 1.5]}>
            <mesh>
              <boxGeometry args={[0.4, 0.4, 0.4]} />
              <meshStandardMaterial color="#080e1a" emissive={color} emissiveIntensity={isActive ? 0.3 : 0.05} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <sphereGeometry args={[0.14, 8, 8]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.8 : 0.1} />
            </mesh>
          </group>
        ))}
      </group>
    );
  }

  return null;
}

// ─── CEO Kulesi ───────────────────────────────────────────────────────────────

function CeoTower({ isActive }: { isActive: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) ringRef.current.rotation.y = state.clock.elapsedTime * 0.8;
    if (ring2Ref.current) ring2Ref.current.rotation.y = -state.clock.elapsedTime * 0.5;
  });

  return (
    <group position={CEO_POSITION}>
      {/* Ana kule */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1.2, 5, 12]} />
        <meshStandardMaterial color="#0d1a2e" emissive={CEO_COLOR} emissiveIntensity={isActive ? 0.25 : 0.08} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Üst küre */}
      <mesh position={[0, 5.2, 0]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={isActive ? 1.5 : 0.4} toneMapped={false} />
      </mesh>
      {/* Dönen halkalar */}
      <mesh ref={ringRef} position={[0, 3.5, 0]}>
        <torusGeometry args={[1.8, 0.05, 8, 64]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={isActive ? 1.2 : 0.3} toneMapped={false} />
      </mesh>
      <mesh ref={ring2Ref} position={[0, 2.5, 0]} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.2, 0.03, 8, 64]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={isActive ? 0.8 : 0.2} toneMapped={false} transparent opacity={0.7} />
      </mesh>
      {/* Zemin halkası */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[2.5, 3.0, 64]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={isActive ? 0.6 : 0.15} transparent opacity={0.5} />
      </mesh>
      {/* Işık */}
      <pointLight position={[0, 5, 0]} intensity={isActive ? 3 : 0.8} color={CEO_COLOR} distance={15} />
      {isActive && <Sparkles count={20} scale={4} size={1.5} speed={0.4} color={CEO_COLOR} position={[0, 3, 0]} />}
      {/* Etiket */}
      <Billboard position={[0, 6.5, 0]}>
        <Text fontSize={0.28} color={CEO_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000">
          👑 CEO HQ
        </Text>
        <Text fontSize={0.15} color={isActive ? "#22c55e" : "#445"} anchorX="center" anchorY="middle" position={[0, -0.4, 0]}>
          {isActive ? "● Sistem Analizi" : "○ Bekliyor"}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Cargo Drone ─────────────────────────────────────────────────────────────

function CargoDrone({ from, to, taskTitle, onComplete }: { from: string; to: string; taskTitle: string; onComplete: () => void }) {
  const meshRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const done = useRef(false);
  const fp: [number, number, number] = from === "management" ? [0, 5, 0] : (DEPT_POSITIONS[from] || [0, 0, 0]);
  const tp = DEPT_POSITIONS[to] || [0, 0, 0];

  useFrame((state, delta) => {
    if (!meshRef.current || done.current) return;
    t.current = Math.min(1, t.current + delta * 0.7);
    const v = t.current;
    meshRef.current.position.set(
      THREE.MathUtils.lerp(fp[0], tp[0], v),
      fp[1] + Math.sin(v * Math.PI) * 5 + (1 - v) * fp[1],
      THREE.MathUtils.lerp(fp[2], tp[2], v)
    );
    meshRef.current.rotation.y = state.clock.elapsedTime * 3;
    if (t.current >= 1) { done.current = true; onComplete(); }
  });

  return (
    <group ref={meshRef} position={fp}>
      {/* Drone gövdesi */}
      <mesh>
        <boxGeometry args={[0.3, 0.12, 0.3]} />
        <meshStandardMaterial color="#1a2a4a" emissive={CARGO_COLOR} emissiveIntensity={0.5} metalness={0.8} />
      </mesh>
      {/* Pervaneler */}
      {[[-0.22, 0.08, -0.22], [0.22, 0.08, -0.22], [-0.22, 0.08, 0.22], [0.22, 0.08, 0.22]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 8]} />
          <meshStandardMaterial color={CARGO_COLOR} emissive={CARGO_COLOR} emissiveIntensity={1} transparent opacity={0.7} />
        </mesh>
      ))}
      <pointLight color={CARGO_COLOR} intensity={3} distance={3} />
      <Billboard position={[0, 0.5, 0]}>
        <Text fontSize={0.12} color={CARGO_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000">
          📦 {taskTitle.slice(0, 22)}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── İşbirliği Işın Hattı ────────────────────────────────────────────────────

function CollabBeam({ agentAPos, agentBPos, color }: { agentAPos: THREE.Vector3; agentBPos: THREE.Vector3; color: string }) {
  const t = useRef(0);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    t.current = (t.current + delta * 2) % 1;
    if (meshRef.current) {
      meshRef.current.position.lerpVectors(agentAPos, agentBPos, t.current);
      meshRef.current.position.y += Math.sin(t.current * Math.PI) * 0.5;
    }
  });

  const points = [
    new THREE.Vector3(agentAPos.x, agentAPos.y + 1, agentAPos.z),
    new THREE.Vector3((agentAPos.x + agentBPos.x) / 2, Math.max(agentAPos.y, agentBPos.y) + 3, (agentAPos.z + agentBPos.z) / 2),
    new THREE.Vector3(agentBPos.x, agentBPos.y + 1, agentBPos.z),
  ];

  return (
    <group>
      <Line points={points} color={color} lineWidth={1.5} dashed dashSize={0.3} gapSize={0.15} />
      <mesh ref={meshRef} position={[agentAPos.x, agentAPos.y + 1, agentAPos.z]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
        <pointLight color={color} intensity={2} distance={2} />
      </mesh>
    </group>
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
  agentId: string;
  agentName: string;
  taskText?: string;
  isSelected: boolean;
  onSelect: (ref: AgentRef) => void;
}

function AgentMascot3D({ dept, index, isWorking, agentId, agentName, taskText, isSelected, onSelect }: MascotProps) {
  const modelPath = AGENT_MODEL_MAP[dept] || AGENT_MODEL_MAP["trade"];
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const color = DEPT_COLORS[dept] || "#ffffff";
  const [hovered, setHovered] = useState(false);
  const walkPhase = useRef(0); // 0=idle, 1=walking, 2=working
  const walkTarget = useRef<[number, number, number]>([0, 0, 0]);
  const currentPos = useRef<[number, number, number]>([0, 0, 0]);
  const walkT = useRef(0);

  const isCeo = dept === "management";
  const deptPos = isCeo ? CEO_POSITION : (DEPT_POSITIONS[dept] || [0, 0, 0]);
  const deskOff = isCeo ? [0, 0, 0] : DESK_OFFSETS[index % DESK_OFFSETS.length];
  const deskX = deptPos[0] + deskOff[0];
  const deskY = isCeo ? 5.4 : 0;
  const deskZ = deptPos[2] + deskOff[2];

  // Idle pozisyon — bina girişi yakını
  const idleX = deptPos[0] + (Math.random() - 0.5) * 1.5;
  const idleZ = deptPos[2] + 2.2;

  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).raycast = THREE.Mesh.prototype.raycast;
      }
    });
    currentPos.current = [idleX, 0, idleZ];
  }, [cloned]);

  // Çalışmaya başlayınca yürüme animasyonu tetikle
  useEffect(() => {
    if (isWorking && walkPhase.current !== 2) {
      walkPhase.current = 1;
      walkTarget.current = [deskX, deskY, deskZ];
      walkT.current = 0;
    } else if (!isWorking && walkPhase.current === 2) {
      walkPhase.current = 1;
      walkTarget.current = [idleX, 0, idleZ];
      walkT.current = 0;
    }
  }, [isWorking]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (walkPhase.current === 1) {
      // Yürüme
      walkT.current = Math.min(1, walkT.current + delta * 1.2);
      const tx = THREE.MathUtils.lerp(currentPos.current[0], walkTarget.current[0], walkT.current);
      const ty = THREE.MathUtils.lerp(currentPos.current[1], walkTarget.current[1], walkT.current);
      const tz = THREE.MathUtils.lerp(currentPos.current[2], walkTarget.current[2], walkT.current);
      groupRef.current.position.set(tx, ty, tz);

      // Yürüme sallanma
      groupRef.current.rotation.y = Math.atan2(
        walkTarget.current[0] - currentPos.current[0],
        walkTarget.current[2] - currentPos.current[2]
      );
      groupRef.current.position.y = ty + Math.abs(Math.sin(state.clock.elapsedTime * 6)) * 0.06;

      if (walkT.current >= 1) {
        currentPos.current = [...walkTarget.current];
        walkPhase.current = isWorking ? 2 : 0;
      }
    } else if (walkPhase.current === 2) {
      // Çalışma — hafif zıplama
      groupRef.current.position.set(deskX, deskY + Math.abs(Math.sin(state.clock.elapsedTime * 2.5 + index * 1.2)) * 0.05, deskZ);
      groupRef.current.rotation.y = Math.PI;
    } else {
      // Idle — sallanma
      groupRef.current.position.set(idleX, 0, idleZ);
      groupRef.current.rotation.y = Math.PI + Math.sin(state.clock.elapsedTime * 0.6 + index) * 0.2;
    }
  });

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const pos = groupRef.current?.position || new THREE.Vector3(deskX, deskY, deskZ);
    onSelect({ agentId, dept, worldPos: pos.clone() });
  }, [agentId, dept, deskX, deskY, deskZ, onSelect]);

  // Düşünce balonu metni
  const thoughtText = useMemo(() => {
    if (!isWorking || !taskText) return null;
    const t = taskText.replace(/\[İŞBİRLİĞİ\]/g, "🤝").replace(/\[IŞBIRLIĞI\]/g, "🤝");
    return t.length > 28 ? t.slice(0, 28) + "..." : t;
  }, [isWorking, taskText]);

  return (
    <group ref={groupRef} position={[idleX, 0, idleZ]}>
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

      {/* Seçili göstergesi */}
      {isSelected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.3, 0.42, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.95} />
          </mesh>
          <pointLight color={color} intensity={1.2} distance={2.5} position={[0, 0.8, 0]} />
        </>
      )}

      {/* İsim etiketi */}
      {(hovered || isSelected) && (
        <Billboard position={[0, 1.6, 0]}>
          <Text fontSize={0.14} color={color} anchorX="center" anchorY="middle" outlineWidth={0.018} outlineColor="#000">
            {agentName.replace(/_/g, " ")}
          </Text>
          <Text fontSize={0.11} color={isWorking ? "#88ff88" : "#556"} anchorX="center" anchorY="middle" position={[0, -0.2, 0]}>
            {isWorking ? "● çalışıyor" : "○ bekliyor"}
          </Text>
        </Billboard>
      )}

      {/* Düşünce balonu */}
      {isWorking && thoughtText && !isSelected && (
        <Billboard position={[0, 2.1, 0]}>
          <Text fontSize={0.11} color={color} anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#000a18" maxWidth={2}>
            💭 {thoughtText}
          </Text>
        </Billboard>
      )}

      {/* Çalışma ışığı */}
      {isWorking && !isSelected && (
        <pointLight color={color} intensity={0.6} distance={1.8} position={[0, 0.8, 0]} />
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

// ─── Aktivite Feed HUD ────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  text: string;
  color: string;
  time: string;
  icon: string;
}

function ActivityFeedHUD({ items, activeCount, totalAgents }: { items: ActivityItem[]; activeCount: number; totalAgents: number }) {
  return (
    <div style={{
      position: "absolute",
      top: 14,
      left: 14,
      width: 260,
      fontFamily: "monospace",
      zIndex: 20,
      pointerEvents: "none",
    }}>
      {/* Başlık */}
      <div style={{
        background: "rgba(5,8,20,0.92)",
        border: "1px solid #0e1a2e",
        borderRadius: "10px 10px 0 0",
        padding: "8px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "#ffd700", fontWeight: "bold", letterSpacing: 1 }}>COWORK.ARMY</div>
          <div style={{ fontSize: 9, color: "#334", marginTop: 1 }}>Silicon Valley HQ</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: activeCount > 0 ? "#22c55e" : "#445", fontWeight: "bold" }}>
            {activeCount}/{totalAgents}
          </div>
          <div style={{ fontSize: 8, color: "#334" }}>AKTİF</div>
        </div>
      </div>

      {/* Aktivite listesi */}
      <div style={{
        background: "rgba(4,7,16,0.88)",
        border: "1px solid #0a1428",
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        backdropFilter: "blur(12px)",
        maxHeight: 200,
        overflow: "hidden",
      }}>
        {items.length === 0 ? (
          <div style={{ padding: "10px 14px", fontSize: 10, color: "#223" }}>
            Aktivite bekleniyor...
          </div>
        ) : (
          items.slice(0, 6).map((item) => (
            <div key={item.id} style={{
              padding: "5px 14px",
              borderBottom: "1px solid #080e18",
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}>
              <span style={{ fontSize: 11, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: item.color, lineHeight: 1.4, wordBreak: "break-word" }}>
                  {item.text}
                </div>
                <div style={{ fontSize: 8, color: "#223", marginTop: 1 }}>{item.time}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Kamera HUD ───────────────────────────────────────────────────────────────

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
        <p style={{ color: "#00ccff", fontFamily: "monospace", fontSize: 12 }}>COWORK.ARMY yükleniyor...</p>
      </div>
    </Html>
  );
}

// ─── Sahne ────────────────────────────────────────────────────────────────────

interface SceneProps {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
  selected: AgentRef | null;
  onSelect: (ref: AgentRef) => void;
  statuses: Record<string, { status: string; task?: string; alive?: boolean }>;
}

function Scene({ events, worldModels, selected, onSelect, statuses }: SceneProps) {
  const [beams, setBeams] = useState<{ id: string; from: string; to: string; color: string }[]>([]);
  const [drones, setDrones] = useState<{ id: string; from: string; to: string; title: string }[]>([]);

  // Event'leri işle
  useEffect(() => {
    const latest = events[0];
    if (!latest) return;

    if (latest.type === "agent_message" && latest.from_dept && latest.to_dept) {
      const id = `beam-${Date.now()}`;
      const color = DEPT_COLORS[latest.from_dept] || "#ffffff";
      setBeams(prev => [...prev.slice(-4), { id, from: latest.from_dept!, to: latest.to_dept!, color }]);
    }

    if (latest.type === "cargo_route" && latest.from_dept && latest.to_dept) {
      const id = `drone-${Date.now()}`;
      setDrones(prev => [...prev.slice(-2), { id, from: latest.from_dept!, to: latest.to_dept!, title: latest.title || "Görev" }]);
    }
  }, [events]);

  // Departman bazlı agent'ları grupla
  const agentsByDept = useMemo(() => {
    const map: Record<string, AgentWorldModel[]> = {};
    worldModels.forEach(m => {
      const dept = m.department_id || "unknown";
      if (!map[dept]) map[dept] = [];
      map[dept].push(m);
    });
    return map;
  }, [worldModels]);

  // CEO agent
  const ceoModel = useMemo(() => worldModels.find(m => m.agent_id === "ceo"), [worldModels]);
  const ceoStatus = statuses["ceo"];
  const isCeoActive = ceoStatus?.alive || ["working","thinking","running"].includes(ceoStatus?.status || "");

  // İşbirliği çiftleri (aynı anda çalışan ve task'ında [İŞBİRLİĞİ] geçenler)
  const collabPairs = useMemo(() => {
    const pairs: { a: AgentWorldModel; b: AgentWorldModel }[] = [];
    const working = worldModels.filter(m => {
      const st = statuses[m.agent_id];
      return st?.alive && st?.task?.includes("İŞBİRLİĞİ");
    });
    for (let i = 0; i < working.length - 1; i += 2) {
      pairs.push({ a: working[i], b: working[i + 1] });
    }
    return pairs;
  }, [worldModels, statuses]);

  return (
    <>
      <Environment />
      <Ground />

      {/* Departman binaları */}
      {Object.entries(DEPT_POSITIONS).map(([dept]) => {
        const deptAgents = agentsByDept[dept] || [];
        const isActive = deptAgents.some(m => {
          const st = statuses[m.agent_id];
          return st?.alive || ["working","thinking","coding","searching","running"].includes(st?.status || "");
        });
        return (
          <DeptBuilding
            key={dept}
            dept={dept}
            isActive={isActive}
            agentCount={deptAgents.length}
          />
        );
      })}

      {/* CEO Kulesi */}
      <CeoTower isActive={isCeoActive} />

      {/* CEO Agent maskotu */}
      {ceoModel && (
        <AgentMascot3D
          key="ceo"
          dept="management"
          index={0}
          isWorking={isCeoActive}
          agentId="ceo"
          agentName={ceoModel.name || "CEO"}
          taskText={ceoStatus?.task}
          isSelected={selected?.agentId === "ceo"}
          onSelect={onSelect}
        />
      )}

      {/* Departman agent'ları */}
      {Object.entries(agentsByDept).map(([dept, agents]) =>
        agents.map((m, i) => {
          const st = statuses[m.agent_id];
          const isWorking = st?.alive || ["working","thinking","coding","searching","running"].includes(st?.status || "");
          return (
            <AgentMascot3D
              key={m.agent_id}
              dept={dept}
              index={i}
              isWorking={isWorking}
              agentId={m.agent_id}
              agentName={m.name || m.agent_id}
              taskText={st?.task}
              isSelected={selected?.agentId === m.agent_id}
              onSelect={onSelect}
            />
          );
        })
      )}

      {/* Mesaj ışınları */}
      {beams.map(b => (
        <MessageBeam
          key={b.id}
          from={b.from}
          to={b.to}
          color={b.color}
          onComplete={() => setBeams(prev => prev.filter(x => x.id !== b.id))}
        />
      ))}

      {/* Cargo drone'lar */}
      {drones.map(d => (
        <CargoDrone
          key={d.id}
          from={d.from}
          to={d.to}
          taskTitle={d.title}
          onComplete={() => setDrones(prev => prev.filter(x => x.id !== d.id))}
        />
      ))}

      {/* İşbirliği ışın hatları */}
      {collabPairs.map((pair, i) => {
        const deptA = pair.a.department_id || "trade";
        const posA = DEPT_POSITIONS[deptA] || [0, 0, 0];
        const deptB = pair.b.department_id || "trade";
        const posB = DEPT_POSITIONS[deptB] || [0, 0, 0];
        return (
          <CollabBeam
            key={i}
            agentAPos={new THREE.Vector3(posA[0], 1, posA[2])}
            agentBPos={new THREE.Vector3(posB[0], 1, posB[2])}
            color={DEPT_COLORS[deptA] || "#fff"}
          />
        );
      })}

      {/* Kamera */}
      {selected ? (
        <ThirdPersonCamera target={selected.worldPos} />
      ) : (
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={5}
          maxDistance={60}
          maxPolarAngle={Math.PI / 2.1}
        />
      )}
    </>
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
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);

  const handleSelect = useCallback((ref: AgentRef) => {
    setSelected(ref);
    setPanelOpen(true);
  }, []);
  const handleExit = useCallback(() => {
    setSelected(null);
    setPanelOpen(false);
  }, []);

  // Statuses state — WebSocket'ten gelen statuses'ı burada tutuyoruz
  const [statuses, setStatuses] = useState<Record<string, { status: string; task?: string; alive?: boolean }>>({});

  // Statuses'ı periyodik çek
  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "";
    const fetchStatuses = async () => {
      try {
        const r = await fetch(`${API_BASE}/cowork-api/statuses`);
        if (r.ok) setStatuses(await r.json());
      } catch { /* ignore */ }
    };
    fetchStatuses();
    const iv = setInterval(fetchStatuses, 2000);
    return () => clearInterval(iv);
  }, []);

  // Aktivite feed'i oluştur
  useEffect(() => {
    if (!events.length) return;
    const latest = events[0];
    const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    let text = "";
    let icon = "●";
    let color = "#445566";

    if (latest.type === "agent_message") {
      icon = "💬";
      color = DEPT_COLORS[latest.from_dept || "trade"] || "#00ff88";
      text = `${latest.from_dept?.toUpperCase() || "?"} → ${latest.to_dept?.toUpperCase() || "?"}: ${latest.title || "mesaj"}`;
    } else if (latest.type === "cargo_route") {
      icon = "📦";
      color = CARGO_COLOR;
      text = `Cargo: ${latest.title || "görev"} → ${latest.to_dept?.toUpperCase() || "?"}`;
    } else if (latest.type === "external_trigger") {
      icon = "📡";
      color = "#a78bfa";
      text = latest.title || "Dış veri tetiklendi";
    } else if (latest.type === "cascade_event") {
      icon = "⚡";
      color = "#fbbf24";
      text = latest.title || "Cascade başladı";
    }

    if (text) {
      setActivityItems(prev => [{
        id: `${Date.now()}-${Math.random()}`,
        text,
        color,
        time: now,
        icon,
      }, ...prev].slice(0, 8));
    }
  }, [events]);

  // Aktif agent sayısı
  const activeCount = Object.values(statuses).filter(s =>
    s.alive || ["working","thinking","coding","searching","running"].includes(s.status)
  ).length;

  return (
    <div className="w-full h-full relative" style={{ background: "#040710" }}>
      {/* Aktivite Feed HUD — sol üst */}
      <ActivityFeedHUD
        items={activityItems}
        activeCount={activeCount}
        totalAgents={worldModels.length}
      />

      {/* İpucu */}
      {!selected && (
        <div style={{
          position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.65)", border: "1px solid #1a2a4a",
          borderRadius: 8, padding: "5px 18px", fontFamily: "monospace",
          fontSize: 11, color: "#445566", zIndex: 10, pointerEvents: "none", whiteSpace: "nowrap",
        }}>
          Agent'a tıkla → 3. şahıs kamerası + Komuta Paneli
        </div>
      )}

      {/* Kamera HUD */}
      {selected && <CameraHUD agent={selected} onExit={handleExit} />}

      {/* Agent Komuta Paneli */}
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
        style={{ background: "#040710" }}
      >
        <Suspense fallback={<Loader />}>
          <Scene
            events={events}
            worldModels={worldModels}
            selected={selected}
            onSelect={handleSelect}
            statuses={statuses}
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
