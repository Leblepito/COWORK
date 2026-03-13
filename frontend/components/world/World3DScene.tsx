"use client";
/**
 * COWORK.ARMY — World3DScene v7 "Silicon Valley Campus"
 * - Skill/role bazlı agent profilleri (agent-profiles.ts)
 * - Animasyon tipi: typing, analyzing, commanding, treating, serving, scanning
 * - Tüm cam duvarlar raycast kapalı — tıklama çalışıyor
 * - task_text düşünce balonunda gösteriliyor
 * - 3. şahıs kamera + Komuta Paneli Canvas dışında
 */
import {
  Suspense, useRef, useEffect, useState, useMemo, useCallback,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls, Billboard, Text, Sparkles, Line } from "@react-three/drei";
import * as THREE from "three";
import type { WorldEvent, AgentWorldModel } from "@/lib/world-types";
import { getAgentProfile, ANIMATION_DESCRIPTIONS } from "@/lib/agent-profiles";
import AgentCommandPanel from "./AgentCommandPanel";

// ─── Sabitler ────────────────────────────────────────────────────────────────
const CEO_POSITION: [number, number, number] = [0, 0, 0];
const CARGO_COLOR = "#f472b6";
const CEO_COLOR = "#ffd700";

const DEPT_POSITIONS: Record<string, [number, number, number]> = {
  trade:    [-12, 0, -8],
  medical:  [  0, 0, -13],
  hotel:    [ 12, 0, -8],
  software: [ -9, 0,  9],
  bots:     [  9, 0,  9],
};

const DEPT_COLORS: Record<string, string> = {
  management: CEO_COLOR,
  trade:    "#00ff88",
  medical:  "#00ccff",
  hotel:    "#ffaa00",
  software: "#cc44ff",
  bots:     "#ff4466",
  cargo:    CARGO_COLOR,
};

const DEPT_ICONS: Record<string, string> = {
  management: "👑", trade: "📈", medical: "🏥", hotel: "🏨", software: "💻", bots: "🤖",
};

const BLDG_W = 7.5;
const BLDG_D = 6.5;
const BLDG_H = 4.2;
const WALL_T = 0.06;

const DESK_OFFSETS: [number, number, number][] = [
  [-2.2, 0, -1.5], [0.0, 0, -1.5], [2.2, 0, -1.5], [-1.1, 0, 1.2],
];

interface AgentRef { agentId: string; dept: string; worldPos: THREE.Vector3; }
interface AgentStatusLocal { status: string; lines: string[]; alive: boolean; task_text?: string; }
interface ActivityItem { id: string; text: string; color: string; time: string; icon: string; }

// ─── Zemin ───────────────────────────────────────────────────────────────────
function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 140]} />
        <meshStandardMaterial color="#040710" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[130, 130, "#0a1020", "#080e1a"]} position={[0, 0.001, 0]} />
      {Object.values(DEPT_POSITIONS).map((pos, i) => {
        const len = Math.sqrt(pos[0] ** 2 + pos[2] ** 2);
        const angle = Math.atan2(pos[0], pos[2]);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, angle]} position={[pos[0] / 2, 0.002, pos[2] / 2]}>
            <planeGeometry args={[0.5, len]} />
            <meshStandardMaterial color="#0d1525" roughness={1} />
          </mesh>
        );
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[4, 4.4, 64]} />
        <meshStandardMaterial color="#0e1a2e" roughness={1} />
      </mesh>
    </>
  );
}

// ─── Ortam ───────────────────────────────────────────────────────────────────
function Environment() {
  return (
    <>
      <ambientLight intensity={0.15} color="#1a2a4a" />
      <directionalLight position={[20, 35, 10]} intensity={0.55} color="#c8d8ff" castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[0, 20, 0]} intensity={0.25} color="#ffffff" distance={70} />
      {Object.entries(DEPT_POSITIONS).map(([dept, pos]) => (
        <pointLight key={dept} position={[pos[0], 8, pos[2]]} intensity={0.12} color={DEPT_COLORS[dept]} distance={14} />
      ))}
    </>
  );
}

// ─── Departman Ekipmanı ───────────────────────────────────────────────────────
function DeptEquipment({ dept, isActive }: { dept: string; isActive: boolean }) {
  const color = DEPT_COLORS[dept] || "#ffffff";

  if (dept === "trade") return (
    <group position={[0, 0, -2.5]}>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[4.5, 2.2, 0.08]} />
        <meshStandardMaterial color="#030810" emissive={color} emissiveIntensity={isActive ? 0.35 : 0.08} />
      </mesh>
      {[-1.5, -0.75, 0, 0.75, 1.5].map((x, i) => {
        const h = 0.3 + (i % 3) * 0.25;
        return (
          <mesh key={i} position={[x, 0.8 + h / 2, 0.05]}>
            <boxGeometry args={[0.18, h, 0.04]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#00ff88" : "#ff4444"} emissive={i % 2 === 0 ? "#00ff88" : "#ff4444"} emissiveIntensity={isActive ? 0.9 : 0.2} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.12, 0.05]}>
        <boxGeometry args={[4.5, 0.12, 0.03]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 1.2 : 0.2} toneMapped={false} />
      </mesh>
    </group>
  );

  if (dept === "medical") return (
    <group position={[0, 0, -2]}>
      <mesh position={[-1.5, 0.45, 0]}><boxGeometry args={[2.2, 0.15, 1.0]} /><meshStandardMaterial color="#0a1a2a" /></mesh>
      <mesh position={[-1.5, 0.35, 0]}><boxGeometry args={[2.2, 0.55, 1.0]} /><meshStandardMaterial color="#0d2030" /></mesh>
      <mesh position={[1.2, 1.8, 0]}><boxGeometry args={[1.4, 1.0, 0.08]} /><meshStandardMaterial color="#030810" emissive={color} emissiveIntensity={isActive ? 0.3 : 0.08} /></mesh>
      <mesh position={[1.2, 1.8, 0.05]}><boxGeometry args={[1.2, 0.04, 0.02]} /><meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={isActive ? 2 : 0.3} toneMapped={false} /></mesh>
      <mesh position={[-2.8, 1.4, 0]}><cylinderGeometry args={[0.03, 0.03, 2.8, 8]} /><meshStandardMaterial color="#1a2a3a" metalness={0.8} roughness={0.2} /></mesh>
      <mesh position={[-2.8, 2.8, 0]}><sphereGeometry args={[0.2, 8, 8]} /><meshStandardMaterial color={color} transparent opacity={0.7} emissive={color} emissiveIntensity={isActive ? 0.5 : 0.1} /></mesh>
    </group>
  );

  if (dept === "hotel") return (
    <group position={[0, 0, -1.5]}>
      <mesh position={[0, 0.55, 0]}><boxGeometry args={[4.5, 0.12, 1.2]} /><meshStandardMaterial color="#1a1008" roughness={0.3} metalness={0.4} /></mesh>
      <mesh position={[0, 0.0, 0]}><boxGeometry args={[4.5, 1.0, 1.0]} /><meshStandardMaterial color="#0f0a04" roughness={0.5} /></mesh>
      <mesh position={[0, 1.3, 0]}><boxGeometry args={[1.4, 0.9, 0.07]} /><meshStandardMaterial color="#030810" emissive={color} emissiveIntensity={isActive ? 0.3 : 0.08} /></mesh>
      <mesh position={[1.8, 0.65, 0]}><cylinderGeometry args={[0.18, 0.22, 0.12, 16]} /><meshStandardMaterial color="#c8a000" metalness={0.9} roughness={0.1} emissive="#c8a000" emissiveIntensity={isActive ? 0.5 : 0.1} /></mesh>
    </group>
  );

  if (dept === "software") return (
    <group position={[0, 0, -2.2]}>
      <mesh position={[-2.8, 1.5, 0]}><boxGeometry args={[0.7, 3.0, 0.9]} /><meshStandardMaterial color="#080e18" metalness={0.7} roughness={0.3} /></mesh>
      {[0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6].map((y, i) => (
        <mesh key={i} position={[-2.8, y, 0.46]}>
          <boxGeometry args={[0.5, 0.06, 0.04]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#00ff88" : i % 3 === 1 ? color : "#ff4444"} emissive={i % 3 === 0 ? "#00ff88" : i % 3 === 1 ? color : "#ff4444"} emissiveIntensity={isActive ? 1.5 : 0.2} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0.5, 2.0, 0]}><boxGeometry args={[3.5, 2.2, 0.07]} /><meshStandardMaterial color="#030810" emissive={color} emissiveIntensity={isActive ? 0.25 : 0.06} /></mesh>
      {[1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9].map((y, i) => (
        <mesh key={i} position={[0.5 - 0.3 + (i % 2) * 0.3, y, 0.04]}>
          <boxGeometry args={[1.2 + (i % 3) * 0.5, 0.04, 0.02]} />
          <meshStandardMaterial color={i % 4 === 0 ? "#cc44ff" : i % 4 === 1 ? "#00ff88" : i % 4 === 2 ? "#ffaa00" : "#00ccff"} emissive={i % 4 === 0 ? "#cc44ff" : i % 4 === 1 ? "#00ff88" : i % 4 === 2 ? "#ffaa00" : "#00ccff"} emissiveIntensity={isActive ? 0.8 : 0.15} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );

  if (dept === "bots") return (
    <group position={[0, 0, -2]}>
      <mesh position={[0, 2.0, 0]}><boxGeometry args={[4.0, 2.0, 0.07]} /><meshStandardMaterial color="#030810" emissive={color} emissiveIntensity={isActive ? 0.3 : 0.07} /></mesh>
      {[-1.2, 0, 1.2].map((x, i) => (
        <mesh key={i} position={[x, 2.0, 0.04]}><boxGeometry args={[0.06, 1.4, 0.02]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 1.5 : 0.2} toneMapped={false} /></mesh>
      ))}
      <mesh position={[2.5, 1.5, 0]}><cylinderGeometry args={[0.04, 0.04, 3.0, 8]} /><meshStandardMaterial color="#1a2030" metalness={0.8} /></mesh>
      <mesh position={[2.5, 3.1, 0]}><sphereGeometry args={[0.12, 8, 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 2 : 0.3} toneMapped={false} /></mesh>
      {[-1.5, 0, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 1.5]}><boxGeometry args={[0.5, 0.6, 0.5]} /><meshStandardMaterial color="#0a1020" emissive={color} emissiveIntensity={isActive ? 0.3 : 0.05} /></mesh>
      ))}
    </group>
  );

  return null;
}

// ─── Masa ────────────────────────────────────────────────────────────────────
function Desk({ position, color, isActive }: { position: [number, number, number]; color: string; isActive: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[1.3, 0.06, 0.8]} /><meshStandardMaterial color="#0a1020" roughness={0.4} metalness={0.3} /></mesh>
      {[[-0.55, -0.35], [0.55, -0.35], [-0.55, 0.35], [0.55, 0.35]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.35, lz]}><boxGeometry args={[0.06, 0.7, 0.06]} /><meshStandardMaterial color="#0d1525" metalness={0.5} /></mesh>
      ))}
      <mesh position={[0, 1.12, -0.28]}><boxGeometry args={[0.7, 0.45, 0.04]} /><meshStandardMaterial color="#060c18" emissive={color} emissiveIntensity={isActive ? 0.4 : 0.08} /></mesh>
      <mesh position={[0, 0.85, -0.28]}><boxGeometry args={[0.06, 0.25, 0.06]} /><meshStandardMaterial color="#0d1525" metalness={0.5} /></mesh>
      <mesh position={[0, 0.76, 0.1]}><boxGeometry args={[0.55, 0.025, 0.22]} /><meshStandardMaterial color="#0a1018" roughness={0.8} /></mesh>
      {isActive && <pointLight position={[0, 1.2, 0]} intensity={0.5} color={color} distance={1.5} />}
    </group>
  );
}

// ─── Departman Binası ─────────────────────────────────────────────────────────
function DeptBuilding({ dept, isActive, agentCount }: { dept: string; isActive: boolean; agentCount: number }) {
  const color = DEPT_COLORS[dept] || "#ffffff";
  const pos = DEPT_POSITIONS[dept] || [0, 0, 0];

  const wallMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: isActive ? 0.16 : 0.08,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.8,
    thickness: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), [color, isActive]);

  return (
    <group position={pos}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[BLDG_W, BLDG_D]} />
        <meshStandardMaterial color="#060c1a" roughness={0.9} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, BLDG_H, 0]}>
        <planeGeometry args={[BLDG_W, BLDG_D]} />
        <meshStandardMaterial color="#050a14" roughness={0.9} transparent opacity={0.5} />
      </mesh>
      {/* Cam duvarlar — raycast kapalı */}
      <mesh position={[0, BLDG_H / 2, BLDG_D / 2]} material={wallMat} raycast={() => null}><planeGeometry args={[BLDG_W, BLDG_H]} /></mesh>
      <mesh position={[0, BLDG_H / 2, -BLDG_D / 2]} material={wallMat} raycast={() => null}><planeGeometry args={[BLDG_W, BLDG_H]} /></mesh>
      <mesh position={[-BLDG_W / 2, BLDG_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat} raycast={() => null}><planeGeometry args={[BLDG_D, BLDG_H]} /></mesh>
      <mesh position={[BLDG_W / 2, BLDG_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={wallMat} raycast={() => null}><planeGeometry args={[BLDG_D, BLDG_H]} /></mesh>
      {/* Köşe kolonlar */}
      {[[-BLDG_W/2, BLDG_D/2],[BLDG_W/2, BLDG_D/2],[-BLDG_W/2,-BLDG_D/2],[BLDG_W/2,-BLDG_D/2]].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, BLDG_H / 2, cz]} raycast={() => null}>
          <boxGeometry args={[WALL_T * 4, BLDG_H, WALL_T * 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.7 : 0.15} />
        </mesh>
      ))}
      {/* Tavan ışık şeritleri */}
      {[-2, 0, 2].map((x, i) => (
        <mesh key={i} position={[x, BLDG_H - 0.06, 0]} raycast={() => null}>
          <boxGeometry args={[0.1, 0.04, BLDG_D - 0.5]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 1.4 : 0.18} toneMapped={false} />
        </mesh>
      ))}
      <DeptEquipment dept={dept} isActive={isActive} />
      {DESK_OFFSETS.slice(0, Math.max(agentCount, 2)).map((off, i) => (
        <Desk key={i} position={off} color={color} isActive={isActive} />
      ))}
      <pointLight position={[0, BLDG_H - 0.6, 0]} intensity={isActive ? 2.0 : 0.4} color={color} distance={9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <ringGeometry args={[BLDG_W / 2 + 0.1, BLDG_W / 2 + 0.5, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isActive ? 0.9 : 0.2} transparent opacity={0.75} />
      </mesh>
      <Billboard position={[0, BLDG_H + 0.8, 0]}>
        <Text fontSize={0.38} color={color} anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#000">
          {DEPT_ICONS[dept] || "🏢"} {dept.toUpperCase()}
        </Text>
      </Billboard>
      {isActive && <Sparkles count={18} scale={[BLDG_W, BLDG_H, BLDG_D]} size={1.2} speed={0.3} color={color} opacity={0.5} />}
    </group>
  );
}

// ─── CEO Kulesi ───────────────────────────────────────────────────────────────
function CeoTower({ isActive }: { isActive: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => { if (ringRef.current) ringRef.current.rotation.y += delta * 0.8; });
  return (
    <group position={CEO_POSITION}>
      <mesh position={[0, 2.5, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.9, 1.2, 5.0, 16]} />
        <meshStandardMaterial color="#0a0810" emissive={CEO_COLOR} emissiveIntensity={isActive ? 0.25 : 0.06} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh ref={ringRef} position={[0, 4.2, 0]} raycast={() => null}>
        <torusGeometry args={[1.6, 0.08, 8, 32]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={isActive ? 1.5 : 0.3} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 5.5, 0]} intensity={isActive ? 3.5 : 0.6} color={CEO_COLOR} distance={12} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} raycast={() => null}>
        <ringGeometry args={[2.0, 2.5, 64]} />
        <meshStandardMaterial color={CEO_COLOR} emissive={CEO_COLOR} emissiveIntensity={isActive ? 1.0 : 0.2} transparent opacity={0.7} />
      </mesh>
      {isActive && <Sparkles count={25} scale={[4, 6, 4]} size={1.5} speed={0.4} color={CEO_COLOR} opacity={0.6} />}
      <Billboard position={[0, 6.5, 0]}>
        <Text fontSize={0.4} color={CEO_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.04} outlineColor="#000">
          👑 CEO HQ
        </Text>
      </Billboard>
    </group>
  );
}

// ─── Agent Maskotu ────────────────────────────────────────────────────────────
interface MascotProps {
  agentId: string; dept: string; index: number; isWorking: boolean;
  taskText?: string; isSelected: boolean; onSelect: (ref: AgentRef) => void;
}

function AgentMascot3D({ agentId, dept, index, isWorking, taskText, isSelected, onSelect }: MascotProps) {
  const profile = useMemo(() => getAgentProfile(agentId), [agentId]);
  const { scene } = useGLTF(profile.glbModel);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).raycast = THREE.Mesh.prototype.raycast;
      }
    });
    return c;
  }, [scene]);

  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const walkPhase = useRef<0 | 1 | 2>(0);
  const walkT = useRef(0);
  const currentPos = useRef<[number, number, number]>([0, 0, 0]);
  const walkTarget = useRef<[number, number, number]>([0, 0, 0]);
  const animT = useRef(0);
  const prevWorking = useRef(isWorking);

  const deptPos = dept === "management" ? CEO_POSITION : (DEPT_POSITIONS[dept] || [0, 0, 0]);
  const deskOff = DESK_OFFSETS[index % DESK_OFFSETS.length];
  const deskX = deptPos[0] + deskOff[0];
  const deskY = 0.75;
  const deskZ = deptPos[2] + deskOff[2];
  const idleX = dept === "management" ? 0 : deptPos[0] + Math.sin(index * 1.4) * 1.8;
  const idleY = dept === "management" ? 5.2 : 0;
  const idleZ = dept === "management" ? 0 : deptPos[2] + Math.cos(index * 1.4) * 1.8;

  useEffect(() => {
    currentPos.current = [idleX, idleY, idleZ];
    if (groupRef.current) groupRef.current.position.set(idleX, idleY, idleZ);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (isWorking === prevWorking.current) return;
    prevWorking.current = isWorking;
    if (isWorking) {
      walkPhase.current = 1;
      walkTarget.current = [deskX, deskY, deskZ];
      walkT.current = 0;
    } else {
      walkPhase.current = 1;
      walkTarget.current = [idleX, idleY, idleZ];
      walkT.current = 0;
    }
  }, [isWorking, deskX, deskY, deskZ, idleX, idleY, idleZ]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    animT.current += delta;
    const t = animT.current;

    if (walkPhase.current === 1) {
      walkT.current = Math.min(1, walkT.current + delta * 1.4);
      const wt = walkT.current;
      const tx = THREE.MathUtils.lerp(currentPos.current[0], walkTarget.current[0], wt);
      const ty = THREE.MathUtils.lerp(currentPos.current[1], walkTarget.current[1], wt);
      const tz = THREE.MathUtils.lerp(currentPos.current[2], walkTarget.current[2], wt);
      const dx = walkTarget.current[0] - currentPos.current[0];
      const dz = walkTarget.current[2] - currentPos.current[2];
      if (Math.abs(dx) + Math.abs(dz) > 0.01) groupRef.current.rotation.y = Math.atan2(dx, dz);
      groupRef.current.position.set(tx, ty + Math.abs(Math.sin(t * 7)) * 0.07, tz);
      if (wt >= 1) { currentPos.current = [...walkTarget.current]; walkPhase.current = isWorking ? 2 : 0; }
    } else if (walkPhase.current === 2) {
      const anim = profile.animationType;
      groupRef.current.position.set(deskX, deskY, deskZ);
      if (anim === "typing") { groupRef.current.rotation.x = Math.sin(t * 3) * 0.08; groupRef.current.rotation.y = Math.PI; }
      else if (anim === "analyzing") { groupRef.current.rotation.y = Math.PI + Math.sin(t * 1.5) * 0.15; groupRef.current.rotation.x = -0.05; }
      else if (anim === "treating") { groupRef.current.rotation.x = Math.sin(t * 2) * 0.12 - 0.1; groupRef.current.rotation.y = Math.PI; }
      else if (anim === "serving") { groupRef.current.rotation.y = Math.PI + Math.sin(t * 1.2) * 0.2; groupRef.current.position.y = deskY + Math.abs(Math.sin(t * 2)) * 0.04; }
      else if (anim === "scanning") { groupRef.current.rotation.y = Math.PI + Math.sin(t * 4) * 0.35; }
      else if (anim === "coordinating") { groupRef.current.rotation.y += delta * 0.8; }
      else if (anim === "commanding") { groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1; groupRef.current.position.y = deskY + Math.sin(t * 1.5) * 0.05; }
      else { groupRef.current.position.y = deskY + Math.abs(Math.sin(t * 2.5 + index)) * 0.05; groupRef.current.rotation.y = Math.PI; }
    } else {
      groupRef.current.position.set(idleX, idleY + Math.sin(t * 0.8 + index) * 0.04, idleZ);
      groupRef.current.rotation.y = Math.PI + Math.sin(t * 0.5 + index) * 0.25;
      groupRef.current.rotation.x = 0;
    }
  });

  const handleClick = useCallback((e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    const pos = groupRef.current?.position.clone() || new THREE.Vector3(deskX, deskY, deskZ);
    onSelect({ agentId, dept, worldPos: pos });
  }, [agentId, dept, deskX, deskY, deskZ, onSelect]);

  const thoughtText = useMemo(() => {
    if (!isWorking) return null;
    if (taskText) {
      const clean = taskText.replace(/\[İŞBİRLİĞİ\]/g, "🤝").replace(/\[IŞBIRLIĞI\]/g, "🤝");
      return clean.length > 30 ? clean.slice(0, 30) + "..." : clean;
    }
    return ANIMATION_DESCRIPTIONS[profile.animationType];
  }, [isWorking, taskText, profile.animationType]);

  const color = profile.accentColor || profile.color;

  return (
    <group ref={groupRef} position={[idleX, idleY, idleZ]}>
      {/* Tıklanabilir hitbox */}
      <mesh position={[0, 0.55, 0]}
        onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerLeave={e => { e.stopPropagation(); setHovered(false); document.body.style.cursor = "default"; }}
        onClick={handleClick}
      >
        <cylinderGeometry args={[0.5, 0.5, 1.3, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <primitive object={cloned} scale={[profile.scale, profile.scale, profile.scale]} />
      {isSelected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.32, 0.48, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.95} />
          </mesh>
          <pointLight color={color} intensity={1.5} distance={3} position={[0, 1, 0]} />
        </>
      )}
      {(hovered || isSelected) && (
        <Billboard position={[0, 1.9, 0]}>
          <Text fontSize={0.15} color={color} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
            {profile.roleIcon} {profile.name}
          </Text>
          <Text fontSize={0.11} color={isWorking ? "#88ff88" : "#445566"} anchorX="center" anchorY="middle" position={[0, -0.22, 0]}>
            {profile.roleLabel}
          </Text>
          {isSelected && profile.skills.slice(0, 3).map((skill, i) => (
            <Text key={i} fontSize={0.09} color={color} anchorX="center" anchorY="middle" position={[0, -0.44 - i * 0.16, 0]} outlineWidth={0.01} outlineColor="#000">
              ▸ {skill.replace(/_/g, " ")}
            </Text>
          ))}
        </Billboard>
      )}
      {isWorking && thoughtText && !isSelected && (
        <Billboard position={[0, 2.3, 0]}>
          <Text fontSize={0.12} color={color} anchorX="center" anchorY="middle" outlineWidth={0.016} outlineColor="#000a18" maxWidth={2.2}>
            {profile.workingEmoji} {thoughtText}
          </Text>
        </Billboard>
      )}
      {isWorking && <pointLight color={color} intensity={0.7} distance={2.2} position={[0, 1, 0]} />}
      {profile.tier !== "WORKER" && (
        <Billboard position={[0, 1.3, 0]}>
          <Text fontSize={0.13} color={profile.tier === "CEO" ? "#ffd700" : "#f472b6"} anchorX="center" anchorY="middle">
            {profile.tier === "CEO" ? "👑" : "⭐"}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ─── 3. Şahıs Kamera ─────────────────────────────────────────────────────────
function ThirdPersonCamera({ target }: { target: THREE.Vector3 }) {
  const { camera } = useThree();
  const first = useRef(true);
  useFrame(() => {
    const offset = new THREE.Vector3(0, 3.5, 5.5);
    const desired = target.clone().add(offset);
    if (first.current) { camera.position.copy(desired); first.current = false; }
    else camera.position.lerp(desired, 0.06);
    camera.lookAt(target.clone().add(new THREE.Vector3(0, 0.8, 0)));
  });
  return null;
}

// ─── Mesaj Işını ──────────────────────────────────────────────────────────────
function MessageBeam({ from, to, color, onComplete }: { from: string; to: string; color: string; onComplete: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const done = useRef(false);
  const fp = DEPT_POSITIONS[from] || [0, 0, 0];
  const tp = DEPT_POSITIONS[to] || [0, 0, 0];
  useFrame((_, delta) => {
    if (done.current || !meshRef.current) return;
    t.current = Math.min(1, t.current + delta * 0.55);
    const v = t.current;
    meshRef.current.position.set(THREE.MathUtils.lerp(fp[0], tp[0], v), Math.sin(v * Math.PI) * 4.5, THREE.MathUtils.lerp(fp[2], tp[2], v));
    if (t.current >= 1) { done.current = true; onComplete(); }
  });
  return (
    <mesh ref={meshRef} position={[fp[0], 0.5, fp[2]]}>
      <sphereGeometry args={[0.18, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.5} toneMapped={false} />
      <pointLight color={color} intensity={6} distance={3.5} />
    </mesh>
  );
}

// ─── Cargo Drone ──────────────────────────────────────────────────────────────
function CargoDrone({ from, to, taskTitle, onComplete }: { from: string; to: string; taskTitle: string; onComplete: () => void }) {
  const meshRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const done = useRef(false);
  const fp = from === "management" ? CEO_POSITION : (DEPT_POSITIONS[from] || CEO_POSITION);
  const tp = DEPT_POSITIONS[to] || [0, 0, 0];
  useFrame((_, delta) => {
    if (done.current || !meshRef.current) return;
    t.current = Math.min(1, t.current + delta * 0.4);
    const v = t.current;
    meshRef.current.position.set(THREE.MathUtils.lerp(fp[0], tp[0], v), 5 + Math.sin(v * Math.PI) * 3, THREE.MathUtils.lerp(fp[2], tp[2], v));
    meshRef.current.rotation.y += delta * 3;
    if (t.current >= 1) { done.current = true; onComplete(); }
  });
  return (
    <group ref={meshRef} position={[fp[0], 5, fp[2]]}>
      <mesh><boxGeometry args={[0.35, 0.12, 0.35]} /><meshStandardMaterial color="#0a1020" emissive={CARGO_COLOR} emissiveIntensity={1.5} /></mesh>
      {[[-0.22, 0.22],[0.22, 0.22],[-0.22,-0.22],[0.22,-0.22]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.06, pz]} rotation={[0, i * 0.5, 0]}><cylinderGeometry args={[0.12, 0.12, 0.02, 6]} /><meshStandardMaterial color={CARGO_COLOR} emissive={CARGO_COLOR} emissiveIntensity={2} toneMapped={false} /></mesh>
      ))}
      <pointLight color={CARGO_COLOR} intensity={4} distance={3} />
      <Billboard position={[0, 0.5, 0]}>
        <Text fontSize={0.14} color={CARGO_COLOR} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000">
          📦 {taskTitle.slice(0, 20)}
        </Text>
      </Billboard>
    </group>
  );
}

// ─── İşbirliği Işın Hattı ────────────────────────────────────────────────────
function CollabBeam({ agentAPos, agentBPos, color }: { agentAPos: THREE.Vector3; agentBPos: THREE.Vector3; color: string }) {
  const t = useRef(0);
  const [opacity, setOpacity] = useState(0.8);
  useFrame((_, delta) => { t.current += delta; setOpacity(0.4 + Math.sin(t.current * 3) * 0.3); });
  return (
    <Line points={[agentAPos, agentBPos.clone().add(new THREE.Vector3(0, 0.5, 0))]} color={color} lineWidth={1.5} transparent opacity={opacity} dashed dashSize={0.4} gapSize={0.2} />
  );
}

// ─── Aktivite Feed HUD ────────────────────────────────────────────────────────
function ActivityFeedHUD({ items, activeCount, totalAgents }: { items: ActivityItem[]; activeCount: number; totalAgents: number }) {
  return (
    <div style={{ position: "absolute", top: 14, left: 14, zIndex: 10, display: "flex", flexDirection: "column", gap: 6, pointerEvents: "none" }}>
      <div style={{ background: "rgba(4,7,16,0.85)", border: "1px solid #0e1a2e", borderRadius: 8, padding: "5px 12px", display: "flex", alignItems: "center", gap: 10, fontFamily: "monospace" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", animation: activeCount > 0 ? "pulse 1.5s infinite" : "none" }} />
          <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>{activeCount}</span>
          <span style={{ fontSize: 9, color: "#334" }}>/ {totalAgents} aktif</span>
        </div>
        <div style={{ width: 1, height: 14, background: "#1a2030" }} />
        <span style={{ fontSize: 9, color: "#334" }}>COWORK.ARMY</span>
      </div>
      {items.slice(0, 5).map(item => (
        <div key={item.id} style={{ background: "rgba(4,7,16,0.8)", border: `1px solid ${item.color}25`, borderLeft: `2px solid ${item.color}`, borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, fontFamily: "monospace", animation: "fadeIn 0.3s ease" }}>
          <span style={{ fontSize: 11 }}>{item.icon}</span>
          <span style={{ fontSize: 9, color: "#667", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</span>
          <span style={{ fontSize: 8, color: "#334" }}>{item.time}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Kamera HUD ───────────────────────────────────────────────────────────────
function CameraHUD({ agent, onExit }: { agent: AgentRef; onExit: () => void }) {
  const profile = useMemo(() => getAgentProfile(agent.agentId), [agent.agentId]);
  return (
    <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", alignItems: "center", gap: 10, background: "rgba(4,7,16,0.9)", border: `1px solid ${profile.accentColor}40`, borderRadius: 12, padding: "8px 16px", fontFamily: "monospace", boxShadow: `0 0 20px ${profile.accentColor}20` }}>
      <span style={{ fontSize: 18 }}>{profile.roleIcon}</span>
      <div>
        <div style={{ fontSize: 11, color: profile.accentColor, fontWeight: 700 }}>{profile.name}</div>
        <div style={{ fontSize: 9, color: "#445" }}>{profile.roleLabel} · {profile.dept.toUpperCase()}</div>
      </div>
      <div style={{ width: 1, height: 28, background: "#1a2030", margin: "0 4px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {profile.skills.slice(0, 2).map((s, i) => (
          <span key={i} style={{ fontSize: 8, color: "#445", padding: "1px 5px", borderRadius: 4, background: `${profile.accentColor}15` }}>{s.replace(/_/g, " ")}</span>
        ))}
      </div>
      <button onClick={onExit} style={{ marginLeft: 8, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "1px solid #334", background: "#0a1020", color: "#667", cursor: "pointer" }}>
        ✕ Çık
      </button>
    </div>
  );
}

// ─── Loader ───────────────────────────────────────────────────────────────────
function Loader() {
  return <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={1} /></mesh>;
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({ events, worldModels, selected, onSelect, statuses }: {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
  selected: AgentRef | null;
  onSelect: (ref: AgentRef) => void;
  statuses: Record<string, AgentStatusLocal>;
}) {
  const [beams, setBeams] = useState<{ id: string; from: string; to: string; color: string }[]>([]);
  const [drones, setDrones] = useState<{ id: string; from: string; to: string; title: string }[]>([]);

  useEffect(() => {
    const latest = events[0];
    if (!latest) return;
    if (latest.type === "agent_message" && latest.from_dept && latest.to_dept) {
      const id = `beam-${Date.now()}`;
      setBeams(prev => [...prev.slice(-4), { id, from: latest.from_dept!, to: latest.to_dept!, color: DEPT_COLORS[latest.from_dept!] || "#fff" }]);
    }
    if (latest.type === "cargo_route" && latest.from_dept && latest.to_dept) {
      const id = `drone-${Date.now()}`;
      const title = (latest as { title?: string }).title || "Görev";
      setDrones(prev => [...prev.slice(-2), { id, from: latest.from_dept!, to: latest.to_dept!, title }]);
    }
  }, [events]);

  const agentsByDept = useMemo(() => {
    const map: Record<string, AgentWorldModel[]> = {};
    worldModels.forEach(m => {
      const dept = m.department_id || "unknown";
      if (!map[dept]) map[dept] = [];
      map[dept].push(m);
    });
    return map;
  }, [worldModels]);

  const ceoModel = useMemo(() => worldModels.find(m => m.agent_id === "ceo"), [worldModels]);
  const ceoSt = statuses["ceo"];
  const isCeoActive = !!(ceoSt?.alive || ["working","thinking","running"].includes(ceoSt?.status || ""));

  const collabPairs = useMemo(() => {
    const pairs: { a: AgentWorldModel; b: AgentWorldModel }[] = [];
    const working = worldModels.filter(m => {
      const st = statuses[m.agent_id];
      return st?.alive && (st?.lines || []).some(l => l.includes("İŞBİRLİĞİ") || l.includes("IŞBIRLIĞI"));
    });
    for (let i = 0; i + 1 < working.length; i += 2) pairs.push({ a: working[i], b: working[i + 1] });
    return pairs;
  }, [worldModels, statuses]);

  return (
    <>
      <Environment />
      <Ground />
      {Object.entries(DEPT_POSITIONS).map(([dept]) => {
        const deptAgents = agentsByDept[dept] || [];
        const isActive = deptAgents.some(m => {
          const st = statuses[m.agent_id];
          return st?.alive || ["working","thinking","coding","searching","running"].includes(st?.status || "");
        });
        return <DeptBuilding key={dept} dept={dept} isActive={isActive} agentCount={deptAgents.length} />;
      })}
      <CeoTower isActive={isCeoActive} />
      {ceoModel && (
        <AgentMascot3D key="ceo" agentId="ceo" dept="management" index={0} isWorking={isCeoActive}
          taskText={ceoSt?.task_text || ceoSt?.lines?.[ceoSt.lines.length - 1]}
          isSelected={selected?.agentId === "ceo"} onSelect={onSelect} />
      )}
      {Object.entries(agentsByDept).map(([dept, agents]) =>
        agents.map((m, i) => {
          const st = statuses[m.agent_id];
          const isWorking = !!(st?.alive || ["working","thinking","coding","searching","running"].includes(st?.status || ""));
          return (
            <AgentMascot3D key={m.agent_id} agentId={m.agent_id} dept={dept} index={i} isWorking={isWorking}
              taskText={st?.task_text || st?.lines?.[st.lines.length - 1]}
              isSelected={selected?.agentId === m.agent_id} onSelect={onSelect} />
          );
        })
      )}
      {beams.map(b => <MessageBeam key={b.id} from={b.from} to={b.to} color={b.color} onComplete={() => setBeams(prev => prev.filter(x => x.id !== b.id))} />)}
      {drones.map(d => <CargoDrone key={d.id} from={d.from} to={d.to} taskTitle={d.title} onComplete={() => setDrones(prev => prev.filter(x => x.id !== d.id))} />)}
      {collabPairs.map((pair, i) => {
        const posA = DEPT_POSITIONS[pair.a.department_id || "trade"] || [0, 0, 0];
        const posB = DEPT_POSITIONS[pair.b.department_id || "trade"] || [0, 0, 0];
        return <CollabBeam key={i} agentAPos={new THREE.Vector3(posA[0], 1.2, posA[2])} agentBPos={new THREE.Vector3(posB[0], 1.2, posB[2])} color={DEPT_COLORS[pair.a.department_id || "trade"] || "#fff"} />;
      })}
      {selected ? <ThirdPersonCamera target={selected.worldPos} /> : <OrbitControls makeDefault minDistance={4} maxDistance={60} maxPolarAngle={Math.PI / 2.1} target={[0, 1, 0]} />}
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function World3DScene({ events, worldModels }: { events: WorldEvent[]; worldModels: AgentWorldModel[] }) {
  const [selected, setSelected] = useState<AgentRef | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AgentStatusLocal>>({});

  const handleSelect = useCallback((ref: AgentRef) => { setSelected(ref); setPanelOpen(true); }, []);
  const handleExit = useCallback(() => { setSelected(null); setPanelOpen(false); }, []);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "";
    const fetch_ = async () => {
      try { const r = await fetch(`${API_BASE}/cowork-api/statuses`); if (r.ok) setStatuses(await r.json()); } catch { /* ignore */ }
    };
    fetch_();
    const iv = setInterval(fetch_, 2000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!events.length) return;
    const latest = events[0];
    const now = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    let text = ""; let icon = "●"; let color = "#445566";
    if (latest.type === "agent_message") { icon = "💬"; color = DEPT_COLORS[latest.from_dept || "trade"] || "#00ff88"; text = `${latest.from_dept?.toUpperCase() || "?"} → ${latest.to_dept?.toUpperCase() || "?"}: ${(latest as { title?: string }).title || "mesaj"}`; }
    else if (latest.type === "cargo_route") { icon = "📦"; color = CARGO_COLOR; text = `Cargo: ${(latest as { title?: string }).title || "görev"} → ${latest.to_dept?.toUpperCase() || "?"}`; }
    else if (latest.type === "external_trigger") { icon = "📡"; color = "#a78bfa"; text = (latest as { title?: string }).title || latest.summary || "Dış veri"; }
    else if (latest.type === "cascade_event") { icon = "⚡"; color = "#fbbf24"; text = (latest as { title?: string }).title || "Cascade"; }
    if (text) setActivityItems(prev => [{ id: `${Date.now()}-${Math.random()}`, text, color, time: now, icon }, ...prev].slice(0, 8));
  }, [events]);

  const activeCount = Object.values(statuses).filter(s => s.alive || ["working","thinking","coding","searching","running"].includes(s.status)).length;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", background: "#040710" }}>
      <ActivityFeedHUD items={activityItems} activeCount={activeCount} totalAgents={worldModels.length} />
      {!selected && (
        <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(4,7,16,0.75)", border: "1px solid #1a2a4a", borderRadius: 8, padding: "5px 18px", fontFamily: "monospace", fontSize: 11, color: "#334", zIndex: 10, pointerEvents: "none", whiteSpace: "nowrap" }}>
          Agent'a tıkla → 3. şahıs kamera + Komuta Paneli
        </div>
      )}
      {selected && <CameraHUD agent={selected} onExit={handleExit} />}
      {selected && panelOpen && <AgentCommandPanel agentId={selected.agentId} dept={selected.dept} onClose={handleExit} />}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <Canvas shadows camera={{ position: [0, 24, 30], fov: 44 }} gl={{ antialias: true, alpha: false }} style={{ background: "#040710" }}>
        <Suspense fallback={<Loader />}>
          <Scene events={events} worldModels={worldModels} selected={selected} onSelect={handleSelect} statuses={statuses} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/trade_agent.glb");
useGLTF.preload("/models/medical_agent.glb");
useGLTF.preload("/models/hotel_agent.glb");
useGLTF.preload("/models/software_agent.glb");
useGLTF.preload("/models/bots_agent.glb");
