"use client";
/**
 * COWORK.ARMY — World3DScene v2
 * SimCity tarzı 3D dünya — bina içi görünüm + 3. şahıs kamera takibi
 *
 * Mimari:
 * - Binalar: şeffaf cam cepheli prosedürel geometry (GLB değil)
 *   → kamera içine girebilir, agent'lar içerde görünür
 * - Agent maskotları: Meshy.ai GLB modelleri, bina içinde masada çalışır
 * - Kamera: genel SimCity görünümü VEYA seçili agenti 3. şahıs takip
 * - Mesaj ışınları: departmanlar arası bezier yay
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
  Environment,
  Html,
  Billboard,
  Text,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import type { WorldEvent, AgentWorldModel } from "@/lib/world-types";

// ─── Sabitler ────────────────────────────────────────────────────────────────

/** Departman merkezleri (dünya koordinatları) */
const DEPT_POSITIONS: Record<string, [number, number, number]> = {
  trade:    [-9,  0,  -6],
  medical:  [ 0,  0,  -8],
  hotel:    [ 9,  0,  -6],
  software: [-6,  0,   6],
  bots:     [ 6,  0,   6],
};

/** Bina boyutları [genişlik, yükseklik, derinlik] */
const BUILDING_SIZE: [number, number, number] = [4.5, 4, 4.5];

const DEPT_COLORS: Record<string, string> = {
  trade:    "#00ff88",
  medical:  "#00ccff",
  hotel:    "#ffaa00",
  software: "#cc44ff",
  bots:     "#ff4466",
};

const DEPT_LABELS: Record<string, string> = {
  trade:    "TRADE",
  medical:  "MEDICAL",
  hotel:    "HOTEL",
  software: "SOFTWARE",
  bots:     "BOTS",
};

const AGENT_MODEL_MAP: Record<string, string> = {
  trade:    "/models/trade_agent.glb",
  medical:  "/models/medical_agent.glb",
  hotel:    "/models/hotel_agent.glb",
  software: "/models/software_agent.glb",
  bots:     "/models/bots_agent.glb",
};

/** Bina içindeki masa pozisyonları (bina merkezine göre offset) */
const DESK_OFFSETS: [number, number, number][] = [
  [-1.2, 0,  -1.2],
  [ 1.2, 0,  -1.2],
  [-1.2, 0,   0.2],
  [ 1.2, 0,   0.2],
  [ 0,   0,   1.2],
  [-1.2, 0,   1.2],
  [ 1.2, 0,   1.2],
];

// ─── Zemin ───────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#080c18" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[60, 60, "#141c3a", "#0d1228"]} position={[0, 0, 0]} />
    </>
  );
}

// ─── Şeffaf Cam Bina ──────────────────────────────────────────────────────────

interface BuildingProps {
  dept: string;
  position: [number, number, number];
  isActive: boolean;
  agentCount: number;
  activeCount: number;
  onClick: () => void;
}

function GlassBuilding({ dept, position, isActive, agentCount, activeCount, onClick }: BuildingProps) {
  const color = DEPT_COLORS[dept] || "#ffffff";
  const colorObj = useMemo(() => new THREE.Color(color), [color]);
  const glowRef = useRef<THREE.PointLight>(null);
  const [hovered, setHovered] = useState(false);
  const [W, H, D] = BUILDING_SIZE;

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = isActive
        ? 1.2 + Math.sin(state.clock.elapsedTime * 2.5) * 0.4
        : hovered ? 0.6 : 0.15;
    }
  });

  return (
    <group
      position={position}
      onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
      onClick={onClick}
    >
      {/* ── Zemin plakası ── */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[W + 0.4, 0.1, D + 0.4]} />
        <meshStandardMaterial color={colorObj} roughness={0.6} metalness={0.4} />
      </mesh>

      {/* ── Cam duvarlar (4 yüz, şeffaf) ── */}
      {/* Ön */}
      <mesh position={[0, H / 2, D / 2]}>
        <boxGeometry args={[W, H, 0.08]} />
        <meshPhysicalMaterial
          color={colorObj}
          transparent
          opacity={hovered ? 0.18 : 0.12}
          roughness={0.05}
          metalness={0.1}
          transmission={0.8}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Arka */}
      <mesh position={[0, H / 2, -D / 2]}>
        <boxGeometry args={[W, H, 0.08]} />
        <meshPhysicalMaterial
          color={colorObj}
          transparent
          opacity={hovered ? 0.18 : 0.12}
          roughness={0.05}
          metalness={0.1}
          transmission={0.8}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Sol */}
      <mesh position={[-W / 2, H / 2, 0]}>
        <boxGeometry args={[0.08, H, D]} />
        <meshPhysicalMaterial
          color={colorObj}
          transparent
          opacity={hovered ? 0.18 : 0.12}
          roughness={0.05}
          metalness={0.1}
          transmission={0.8}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Sağ */}
      <mesh position={[W / 2, H / 2, 0]}>
        <boxGeometry args={[0.08, H, D]} />
        <meshPhysicalMaterial
          color={colorObj}
          transparent
          opacity={hovered ? 0.18 : 0.12}
          roughness={0.05}
          metalness={0.1}
          transmission={0.8}
          thickness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Tavan ── */}
      <mesh position={[0, H, 0]} castShadow>
        <boxGeometry args={[W, 0.12, D]} />
        <meshStandardMaterial color={colorObj} roughness={0.4} metalness={0.6} />
      </mesh>

      {/* ── Çerçeve kolonları ── */}
      {(
        [
          [-W / 2, D / 2], [W / 2, D / 2],
          [-W / 2, -D / 2], [W / 2, -D / 2],
        ] as [number, number][]
      ).map(([cx, cz], i) => (
        <mesh key={i} position={[cx, H / 2, cz]} castShadow>
          <boxGeometry args={[0.18, H, 0.18]} />
          <meshStandardMaterial color={colorObj} roughness={0.3} metalness={0.8} />
        </mesh>
      ))}

      {/* ── İç tavan ışığı ── */}
      <pointLight
        ref={glowRef}
        color={color}
        intensity={isActive ? 1.2 : 0.15}
        distance={6}
        position={[0, H - 0.3, 0]}
      />

      {/* ── Aktif kıvılcım ── */}
      {isActive && (
        <Sparkles
          count={15}
          scale={[W, 1, D]}
          size={1.2}
          speed={0.3}
          color={color}
          position={[0, H + 0.3, 0]}
        />
      )}

      {/* ── Departman etiketi ── */}
      <Billboard position={[0, H + 0.9, 0]}>
        <Text
          fontSize={0.32}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#000000"
        >
          {DEPT_LABELS[dept]}
        </Text>
        <Text
          fontSize={0.2}
          color="#aaaaaa"
          anchorX="center"
          anchorY="middle"
          position={[0, -0.42, 0]}
        >
          {activeCount}/{agentCount} aktif
        </Text>
      </Billboard>

      {/* ── Zemin halkası ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <ringGeometry args={[2.4, 2.7, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.5 : hovered ? 0.3 : 0.1}
        />
      </mesh>
    </group>
  );
}

// ─── Masa ─────────────────────────────────────────────────────────────────────

function Desk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Masa yüzeyi */}
      <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.06, 0.5]} />
        <meshStandardMaterial color="#1a2040" roughness={0.6} metalness={0.3} />
      </mesh>
      {/* Masa bacakları */}
      {(
        [[-0.3, 0.19, -0.2], [0.3, 0.19, -0.2], [-0.3, 0.19, 0.2], [0.3, 0.19, 0.2]] as [number, number, number][]
      ).map(([lx, ly, lz], i) => (
        <mesh key={i} position={[lx, ly, lz]} castShadow>
          <boxGeometry args={[0.05, 0.38, 0.05]} />
          <meshStandardMaterial color="#0d1228" roughness={0.8} />
        </mesh>
      ))}
      {/* Monitör */}
      <mesh position={[0, 0.65, -0.15]} castShadow>
        <boxGeometry args={[0.4, 0.28, 0.03]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.2} />
      </mesh>
    </group>
  );
}

// ─── Agent Maskotu (bina içinde) ──────────────────────────────────────────────

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
  registerRef: (id: string, dept: string, pos: THREE.Vector3) => void;
}

function AgentMascot3D({
  dept,
  index,
  isWorking,
  agentName,
  isSelected,
  onSelect,
  registerRef,
}: MascotProps) {
  const modelPath = AGENT_MODEL_MAP[dept] || AGENT_MODEL_MAP["trade"];
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const color = DEPT_COLORS[dept] || "#ffffff";
  const [hovered, setHovered] = useState(false);

  // Bina içindeki masa pozisyonu
  const deptPos = DEPT_POSITIONS[dept] || [0, 0, 0];
  const deskOffset = DESK_OFFSETS[index % DESK_OFFSETS.length];
  const worldX = deptPos[0] + deskOffset[0];
  const worldZ = deptPos[2] + deskOffset[2];

  useEffect(() => {
    const wp = new THREE.Vector3(worldX, 0, worldZ);
    registerRef(agentName, dept, wp);
  }, [agentName, dept, worldX, worldZ, registerRef]);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isWorking) {
      // Çalışırken hafif baş sallama
      groupRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 2.5 + index * 1.1)) * 0.06;
      groupRef.current.rotation.x = -0.05;
    } else {
      groupRef.current.position.y = 0;
      groupRef.current.rotation.x = 0;
      // Idle: hafif sağa-sola sallan
      groupRef.current.rotation.y = Math.PI + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.15;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[worldX, 0, worldZ]}
      rotation={[0, Math.PI, 0]}
      onPointerEnter={() => { setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerLeave={() => { setHovered(false); document.body.style.cursor = "default"; }}
      onClick={(e) => {
        e.stopPropagation();
        const wp = new THREE.Vector3(worldX, 0, worldZ);
        onSelect({ agentId: agentName, dept, worldPos: wp });
      }}
    >
      {/* Maskot GLB */}
      <primitive object={cloned} scale={[0.22, 0.22, 0.22]} castShadow />

      {/* Seçili halkası */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.28, 0.36, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} />
        </mesh>
      )}

      {/* Hover / seçili etiketi */}
      {(hovered || isSelected) && (
        <Billboard position={[0, 0.9, 0]}>
          <Text
            fontSize={0.13}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.015}
            outlineColor="#000000"
          >
            {agentName.split("_").slice(0, 2).join(" ")}
          </Text>
          {isWorking && (
            <Text
              fontSize={0.1}
              color="#88ff88"
              anchorX="center"
              anchorY="middle"
              position={[0, -0.18, 0]}
            >
              ● çalışıyor
            </Text>
          )}
        </Billboard>
      )}

      {/* Çalışırken küçük ışık */}
      {isWorking && (
        <pointLight color={color} intensity={0.6} distance={1.5} position={[0, 0.5, 0]} />
      )}
    </group>
  );
}

// ─── Mesaj Işını ──────────────────────────────────────────────────────────────

interface MessageBeamProps {
  from: string;
  to: string;
  color: string;
  onComplete: () => void;
}

function MessageBeam({ from, to, color, onComplete }: MessageBeamProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  const fromPos = DEPT_POSITIONS[from] || [0, 0, 0];
  const toPos = DEPT_POSITIONS[to] || [0, 0, 0];
  const completed = useRef(false);

  useFrame((_, delta) => {
    if (!meshRef.current || completed.current) return;
    progress.current = Math.min(1, progress.current + delta * 1.4);
    const t = progress.current;
    const x = THREE.MathUtils.lerp(fromPos[0], toPos[0], t);
    const y = Math.sin(t * Math.PI) * 3.5;
    const z = THREE.MathUtils.lerp(fromPos[2], toPos[2], t);
    meshRef.current.position.set(x, y, z);
    if (progress.current >= 1 && !completed.current) {
      completed.current = true;
      onComplete();
    }
  });

  return (
    <mesh ref={meshRef} position={[fromPos[0], 0.5, fromPos[2]]}>
      <sphereGeometry args={[0.14, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} toneMapped={false} />
      <pointLight color={color} intensity={4} distance={2.5} />
    </mesh>
  );
}

// ─── 3. Şahıs Kamera Kontrolcüsü ─────────────────────────────────────────────

interface ThirdPersonCameraProps {
  target: THREE.Vector3;
}

function ThirdPersonCamera({ target }: ThirdPersonCameraProps) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3());
  const smoothLook = useRef(new THREE.Vector3());

  // İlk kez hedef geldiğinde anında konumlan
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      smoothPos.current.set(target.x, target.y + 2.5, target.z + 3.5);
      smoothLook.current.set(target.x, target.y + 1.0, target.z);
      initialized.current = false; // her yeni seçimde sıfırla
    }
  }, [target]);

  useFrame((_, delta) => {
    const desiredPos = new THREE.Vector3(target.x, target.y + 2.5, target.z + 3.5);
    const lookAt = new THREE.Vector3(target.x, target.y + 1.0, target.z);

    smoothPos.current.lerp(desiredPos, delta * 4);
    smoothLook.current.lerp(lookAt, delta * 5);

    camera.position.copy(smoothPos.current);
    camera.lookAt(smoothLook.current);
  });

  return null;
}

// ─── Kamera HUD ───────────────────────────────────────────────────────────────

interface CameraHUDProps {
  selectedAgent: AgentRef;
  onExit: () => void;
}

function CameraHUD({ selectedAgent, onExit }: CameraHUDProps) {
  const color = DEPT_COLORS[selectedAgent.dept] || "#ffffff";
  return (
    <Html fullscreen>
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.75)",
          border: `1px solid ${color}`,
          borderRadius: 10,
          padding: "10px 22px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontFamily: "monospace",
          color: "#fff",
          fontSize: 13,
          backdropFilter: "blur(6px)",
          zIndex: 100,
          pointerEvents: "all",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color }}>●</span>
        <span>
          <b style={{ color }}>{selectedAgent.agentId.split("_").slice(0, 2).join(" ")}</b>
          {" — "}
          <span style={{ color: "#aaa" }}>{DEPT_LABELS[selectedAgent.dept]}</span>
        </span>
        <button
          onClick={onExit}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid #444",
            borderRadius: 6,
            color: "#fff",
            padding: "3px 12px",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          ✕ Çık
        </button>
      </div>
    </Html>
  );
}

// ─── Ana Sahne ────────────────────────────────────────────────────────────────

interface SceneProps {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
  selectedAgent: AgentRef | null;
  onSelectAgent: (ref: AgentRef) => void;
  onExitFollow: () => void;
}

interface ActiveBeam {
  id: string;
  from: string;
  to: string;
  color: string;
}

function Scene({ events, worldModels, selectedAgent, onSelectAgent, onExitFollow }: SceneProps) {
  const [activeBeams, setActiveBeams] = useState<ActiveBeam[]>([]);
  const lastEventCount = useRef(0);
  const agentRefs = useRef<Map<string, { dept: string; pos: THREE.Vector3 }>>(new Map());

  const registerRef = useCallback((id: string, dept: string, pos: THREE.Vector3) => {
    agentRefs.current.set(id, { dept, pos });
  }, []);

  useEffect(() => {
    if (events.length <= lastEventCount.current) return;
    const newEvents = events.slice(lastEventCount.current);
    lastEventCount.current = events.length;
    for (const ev of newEvents) {
      if (ev.type === "agent_message" && ev.from_dept && ev.to_dept && ev.from_dept !== ev.to_dept) {
        setActiveBeams((prev) => [
          ...prev.slice(-8),
          {
            id: `${Date.now()}-${Math.random()}`,
            from: ev.from_dept!,
            to: ev.to_dept!,
            color: DEPT_COLORS[ev.from_dept!] || "#ffffff",
          },
        ]);
      }
    }
  }, [events]);

  const deptStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number }> = {};
    for (const dept of Object.keys(DEPT_POSITIONS)) {
      const agents = worldModels.filter((m) => {
        const id = m.agent_id.toLowerCase();
        return id.includes(dept) || (dept === "bots" && id.includes("bot"));
      });
      stats[dept] = {
        total: agents.length || 3,
        active: agents.filter((m) => m.current_task).length,
      };
    }
    return stats;
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
          energy_level: 80,
          expertise_score: 0.7,
          trust_network: {},
          idle_timeout_seconds: 30,
        } as AgentWorldModel));
      }
    }
    return map;
  }, [worldModels]);

  return (
    <>
      {/* ── Işıklar ── */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[12, 18, 12]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-12, 10, -12]} intensity={0.25} color="#4466ff" />
      <hemisphereLight args={["#0a1030", "#050810", 0.5]} />

      {/* ── Zemin ── */}
      <Ground />

      {/* ── Departman binaları + masalar ── */}
      {Object.entries(DEPT_POSITIONS).map(([dept, pos]) => {
        const stats = deptStats[dept] || { total: 3, active: 0 };
        const agentCount = agentsByDept[dept]?.length || stats.total;
        return (
          <group key={dept}>
            <GlassBuilding
              dept={dept}
              position={pos}
              isActive={stats.active > 0}
              agentCount={agentCount}
              activeCount={stats.active}
              onClick={onExitFollow}
            />
            {/* Bina içindeki masalar */}
            {Array.from({ length: Math.min(agentCount, DESK_OFFSETS.length) }).map((_, i) => {
              const off = DESK_OFFSETS[i];
              return (
                <Desk
                  key={i}
                  position={[pos[0] + off[0], 0, pos[2] + off[2]]}
                  color={DEPT_COLORS[dept] || "#ffffff"}
                />
              );
            })}
          </group>
        );
      })}

      {/* ── Agent maskotları (bina içinde) ── */}
      {Object.entries(agentsByDept).map(([dept, agents]) =>
        agents.map((agent, idx) => (
          <Suspense key={agent.agent_id} fallback={null}>
            <AgentMascot3D
              dept={dept}
              index={idx}
              isWorking={!!agent.current_task}
              agentName={agent.agent_id}
              isSelected={selectedAgent?.agentId === agent.agent_id}
              onSelect={onSelectAgent}
              registerRef={registerRef}
            />
          </Suspense>
        ))
      )}

      {/* ── Mesaj ışınları ── */}
      {activeBeams.map((beam) => (
        <MessageBeam
          key={beam.id}
          from={beam.from}
          to={beam.to}
          color={beam.color}
          onComplete={() =>
            setActiveBeams((prev) => prev.filter((b) => b.id !== beam.id))
          }
        />
      ))}

      {/* ── Kamera modu ── */}
      {selectedAgent ? (
        <>
          <ThirdPersonCamera target={selectedAgent.worldPos} />
          <CameraHUD selectedAgent={selectedAgent} onExit={onExitFollow} />
        </>
      ) : (
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2 - 0.02}
          target={[0, 1, 0]}
        />
      )}

      {/* ── Çevre ── */}
      <Environment preset="night" />
    </>
  );
}

// ─── Yükleme ──────────────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-cyan-400 text-xs font-mono">3D Dünya yükleniyor...</p>
      </div>
    </Html>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

interface World3DSceneProps {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
}

export default function World3DScene({ events, worldModels }: World3DSceneProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentRef | null>(null);

  const handleSelectAgent = useCallback((ref: AgentRef) => {
    setSelectedAgent(ref);
  }, []);

  const handleExitFollow = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  return (
    <div className="w-full h-full relative" style={{ background: "#050810" }}>
      {/* Kamera modu ipucu */}
      {!selectedAgent && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.6)",
            border: "1px solid #1a2a4a",
            borderRadius: 8,
            padding: "5px 16px",
            fontFamily: "monospace",
            fontSize: 11,
            color: "#556688",
            zIndex: 10,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Bir agent'a tıklayarak 3. şahıs kamerasına geç
        </div>
      )}

      <Canvas
        shadows
        camera={{ position: [0, 18, 22], fov: 48 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#050810" }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            events={events}
            worldModels={worldModels}
            selectedAgent={selectedAgent}
            onSelectAgent={handleSelectAgent}
            onExitFollow={handleExitFollow}
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
