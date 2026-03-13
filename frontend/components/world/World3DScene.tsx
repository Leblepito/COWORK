"use client";
/**
 * COWORK.ARMY — World3DScene v3
 *
 * Düzeltmeler:
 * 1. Bina: office_building.glb (Meshy.ai) — traverse ile tüm mesh'lere
 *    şeffaflık uygulandı, raycast devre dışı → agent tıklamaları geçer
 * 2. Agent tıklama: görünmez ama büyük hitbox (sphere) + primitive üstünde
 *    onClick — cam duvarlar artık tıklamayı engellemiyor
 * 3. 3. şahıs kamera: seçili agentin arkasına smooth geçiş
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

const DEPT_POSITIONS: Record<string, [number, number, number]> = {
  trade:    [-9,  0,  -6],
  medical:  [ 0,  0,  -9],
  hotel:    [ 9,  0,  -6],
  software: [-6,  0,   6],
  bots:     [ 6,  0,   6],
};

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

/** Bina içindeki masa grid'i — bina merkezi etrafında */
const DESK_OFFSETS: [number, number, number][] = [
  [-1.3, 0, -1.3],
  [ 0.0, 0, -1.3],
  [ 1.3, 0, -1.3],
  [-1.3, 0,  0.2],
  [ 0.0, 0,  0.2],
  [ 1.3, 0,  0.2],
  [ 0.0, 0,  1.4],
];

// ─── Zemin ───────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.02, 0]}
        // Zemin tıklamayı geçirsin (agent'lar için)
        onPointerDown={() => {}}
      >
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#080c18" roughness={0.95} metalness={0.05} />
      </mesh>
      <gridHelper args={[80, 80, "#141c3a", "#0d1228"]} position={[0, 0, 0]} />
    </>
  );
}

// ─── Ofis Binası (GLB + şeffaf traverse) ─────────────────────────────────────

interface BuildingProps {
  dept: string;
  position: [number, number, number];
  isActive: boolean;
  agentCount: number;
  activeCount: number;
}

function DeptBuilding({ dept, position, isActive, agentCount, activeCount }: BuildingProps) {
  const { scene } = useGLTF("/models/office_building.glb");
  const color = DEPT_COLORS[dept] || "#ffffff";
  const glowRef = useRef<THREE.PointLight>(null);

  // GLB'yi klonla ve tüm mesh'lere şeffaflık uygula
  const transparentScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        // Raycast'i devre dışı bırak → agent tıklamaları geçer
        mesh.raycast = () => {};
        // Materyali şeffaf yap
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.transparent = true;
        mat.opacity = 0.45;
        mat.depthWrite = false;
        mat.color = new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.3);
        mat.emissive = new THREE.Color(color);
        mat.emissiveIntensity = isActive ? 0.12 : 0.04;
        mesh.material = mat;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    return clone;
  }, [scene, color, isActive]);

  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.intensity = isActive
        ? 1.0 + Math.sin(state.clock.elapsedTime * 2.5) * 0.35
        : 0.12;
    }
  });

  return (
    <group position={position}>
      {/* GLB bina modeli — şeffaf, tıklamayı geçirir */}
      <primitive
        object={transparentScene}
        scale={[0.38, 0.38, 0.38]}
      />

      {/* Departman renk ışığı */}
      <pointLight
        ref={glowRef}
        color={color}
        intensity={isActive ? 1.0 : 0.12}
        distance={7}
        position={[0, 2.5, 0]}
      />

      {/* Aktif kıvılcım */}
      {isActive && (
        <Sparkles
          count={18}
          scale={[3.5, 1.2, 3.5]}
          size={1.4}
          speed={0.35}
          color={color}
          position={[0, 4.2, 0]}
        />
      )}

      {/* Departman etiketi */}
      <Billboard position={[0, 5.2, 0]}>
        <Text
          fontSize={0.34}
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
          color="#888888"
          anchorX="center"
          anchorY="middle"
          position={[0, -0.46, 0]}
        >
          {activeCount}/{agentCount} aktif
        </Text>
      </Billboard>

      {/* Zemin halkası */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[2.6, 3.0, 48]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.55 : 0.12}
        />
      </mesh>
    </group>
  );
}

// ─── Masa + Sandalye ──────────────────────────────────────────────────────────

function Desk({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Masa yüzeyi */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[0.75, 0.06, 0.52]} />
        <meshStandardMaterial color="#1e2540" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Bacaklar */}
      {([[-0.32, 0.2, -0.22], [0.32, 0.2, -0.22], [-0.32, 0.2, 0.22], [0.32, 0.2, 0.22]] as [number, number, number][]).map(
        ([lx, ly, lz], i) => (
          <mesh key={i} position={[lx, ly, lz]}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color="#0d1228" />
          </mesh>
        )
      )}
      {/* Monitör */}
      <mesh position={[0, 0.68, -0.17]}>
        <boxGeometry args={[0.42, 0.3, 0.03]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.15}
        />
      </mesh>
      {/* Monitör standı */}
      <mesh position={[0, 0.46, -0.17]}>
        <boxGeometry args={[0.05, 0.1, 0.05]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Sandalye */}
      <mesh position={[0, 0.28, 0.42]}>
        <boxGeometry args={[0.5, 0.06, 0.45]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.55, 0.62]}>
        <boxGeometry args={[0.5, 0.5, 0.05]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
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

  // Dünya pozisyonu
  const deptPos = DEPT_POSITIONS[dept] || [0, 0, 0];
  const off = DESK_OFFSETS[index % DESK_OFFSETS.length];
  const wx = deptPos[0] + off[0];
  const wz = deptPos[2] + off[2];

  // GLB içindeki mesh'lerin kendi raycast'ini etkinleştir
  useEffect(() => {
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        // Varsayılan raycast geri yükle
        (child as THREE.Mesh).raycast = THREE.Mesh.prototype.raycast;
      }
    });
  }, [cloned]);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (isWorking) {
      groupRef.current.position.y =
        Math.abs(Math.sin(state.clock.elapsedTime * 2.8 + index * 1.2)) * 0.07;
    } else {
      groupRef.current.position.y = 0;
      groupRef.current.rotation.y =
        Math.PI + Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.18;
    }
  });

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      onSelect({
        agentId: agentName,
        dept,
        worldPos: new THREE.Vector3(wx, 0, wz),
      });
    },
    [agentName, dept, wx, wz, onSelect]
  );

  return (
    <group
      ref={groupRef}
      position={[wx, 0, wz]}
      rotation={[0, Math.PI, 0]}
    >
      {/* ── Görünmez ama büyük tıklama alanı (hitbox) ── */}
      <mesh
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        onClick={handleClick}
        position={[0, 0.5, 0]}
      >
        <cylinderGeometry args={[0.45, 0.45, 1.2, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── GLB maskot ── */}
      <primitive object={cloned} scale={[0.24, 0.24, 0.24]} />

      {/* ── Seçili halka ── */}
      {isSelected && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[0.3, 0.42, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.95} />
          </mesh>
          <pointLight color={color} intensity={1.2} distance={2.5} position={[0, 0.8, 0]} />
        </>
      )}

      {/* ── Hover / seçili etiket ── */}
      {(hovered || isSelected) && (
        <Billboard position={[0, 1.1, 0]}>
          <Text
            fontSize={0.14}
            color={color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.018}
            outlineColor="#000000"
          >
            {agentName.replace(/_/g, " ")}
          </Text>
          <Text
            fontSize={0.11}
            color={isWorking ? "#88ff88" : "#888888"}
            anchorX="center"
            anchorY="middle"
            position={[0, -0.2, 0]}
          >
            {isWorking ? "● çalışıyor" : "○ bekliyor"}
          </Text>
        </Billboard>
      )}

      {/* ── Çalışırken ışık ── */}
      {isWorking && !isSelected && (
        <pointLight color={color} intensity={0.5} distance={1.4} position={[0, 0.5, 0]} />
      )}
    </group>
  );
}

// ─── Mesaj Işını ──────────────────────────────────────────────────────────────

interface BeamProps {
  from: string;
  to: string;
  color: string;
  onComplete: () => void;
}

function MessageBeam({ from, to, color, onComplete }: BeamProps) {
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

// ─── 3. Şahıs Kamera ─────────────────────────────────────────────────────────

function ThirdPersonCamera({ target }: { target: THREE.Vector3 }) {
  const { camera } = useThree();
  const camPos = useRef(new THREE.Vector3());
  const camLook = useRef(new THREE.Vector3());
  const first = useRef(true);

  useEffect(() => {
    // Yeni agent seçilince anında konumlan
    first.current = true;
  }, [target]);

  useFrame((_, delta) => {
    const desired = new THREE.Vector3(target.x, target.y + 2.8, target.z + 4.0);
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

// ─── Kamera HUD ───────────────────────────────────────────────────────────────

function CameraHUD({ agent, onExit }: { agent: AgentRef; onExit: () => void }) {
  const color = DEPT_COLORS[agent.dept] || "#fff";
  return (
    <Html fullscreen>
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(5,8,16,0.85)",
          border: `1.5px solid ${color}`,
          borderRadius: 12,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          fontFamily: "monospace",
          color: "#fff",
          fontSize: 13,
          backdropFilter: "blur(8px)",
          zIndex: 200,
          pointerEvents: "all",
          whiteSpace: "nowrap",
          boxShadow: `0 0 20px ${color}44`,
        }}
      >
        <span style={{ color, fontSize: 16 }}>◉</span>
        <span>
          <b style={{ color }}>{agent.agentId.replace(/_/g, " ")}</b>
          <span style={{ color: "#666", margin: "0 8px" }}>|</span>
          <span style={{ color: "#aaa" }}>{DEPT_LABELS[agent.dept]}</span>
        </span>
        <button
          onClick={onExit}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid #333",
            borderRadius: 7,
            color: "#ccc",
            padding: "4px 14px",
            cursor: "pointer",
            fontSize: 12,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
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
  selected: AgentRef | null;
  onSelect: (ref: AgentRef) => void;
  onExit: () => void;
}

interface Beam { id: string; from: string; to: string; color: string; }

function Scene({ events, worldModels, selected, onSelect, onExit }: SceneProps) {
  const [beams, setBeams] = useState<Beam[]>([]);
  const lastLen = useRef(0);

  useEffect(() => {
    if (events.length <= lastLen.current) return;
    const fresh = events.slice(lastLen.current);
    lastLen.current = events.length;
    for (const ev of fresh) {
      if (ev.type === "agent_message" && ev.from_dept && ev.to_dept && ev.from_dept !== ev.to_dept) {
        setBeams((p) => [
          ...p.slice(-8),
          { id: `${Date.now()}-${Math.random()}`, from: ev.from_dept!, to: ev.to_dept!, color: DEPT_COLORS[ev.from_dept!] || "#fff" },
        ]);
      }
    }
  }, [events]);

  // Departman istatistikleri
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

  // Agent listesi (placeholder dahil)
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
      {/* Işıklar */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[15, 20, 15]} intensity={1.0} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-15, 12, -15]} intensity={0.2} color="#4466ff" />
      <hemisphereLight args={["#0a1030", "#050810", 0.45]} />

      {/* Zemin */}
      <Ground />

      {/* Binalar + masalar */}
      {Object.entries(DEPT_POSITIONS).map(([dept, pos]) => {
        const st = deptStats[dept] || { total: 3, active: 0 };
        const cnt = agentsByDept[dept]?.length || st.total;
        return (
          <group key={dept}>
            <Suspense fallback={null}>
              <DeptBuilding
                dept={dept}
                position={pos}
                isActive={st.active > 0}
                agentCount={cnt}
                activeCount={st.active}
              />
            </Suspense>
            {Array.from({ length: Math.min(cnt, DESK_OFFSETS.length) }).map((_, i) => {
              const o = DESK_OFFSETS[i];
              return (
                <Desk
                  key={i}
                  position={[pos[0] + o[0], 0, pos[2] + o[2]]}
                  color={DEPT_COLORS[dept] || "#fff"}
                />
              );
            })}
          </group>
        );
      })}

      {/* Agent maskotları */}
      {Object.entries(agentsByDept).map(([dept, agents]) =>
        agents.map((agent, idx) => (
          <Suspense key={agent.agent_id} fallback={null}>
            <AgentMascot3D
              dept={dept}
              index={idx}
              isWorking={!!agent.current_task}
              agentName={agent.agent_id}
              isSelected={selected?.agentId === agent.agent_id}
              onSelect={onSelect}
            />
          </Suspense>
        ))
      )}

      {/* Mesaj ışınları */}
      {beams.map((b) => (
        <MessageBeam
          key={b.id}
          from={b.from}
          to={b.to}
          color={b.color}
          onComplete={() => setBeams((p) => p.filter((x) => x.id !== b.id))}
        />
      ))}

      {/* Kamera */}
      {selected ? (
        <>
          <ThirdPersonCamera target={selected.worldPos} />
          <CameraHUD agent={selected} onExit={onExit} />
        </>
      ) : (
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={55}
          maxPolarAngle={Math.PI / 2 - 0.02}
          target={[0, 1, 0]}
        />
      )}

      <Environment preset="night" />
    </>
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
  const handleSelect = useCallback((ref: AgentRef) => setSelected(ref), []);
  const handleExit = useCallback(() => setSelected(null), []);

  return (
    <div className="w-full h-full relative" style={{ background: "#050810" }}>
      {/* İpucu */}
      {!selected && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.65)",
            border: "1px solid #1a2a4a",
            borderRadius: 8,
            padding: "5px 18px",
            fontFamily: "monospace",
            fontSize: 11,
            color: "#445566",
            zIndex: 10,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Agent'a tıkla → 3. şahıs kamerası
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <Canvas
        shadows
        camera={{ position: [0, 20, 26], fov: 46 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#050810" }}
      >
        <Suspense fallback={<Loader />}>
          <Scene
            events={events}
            worldModels={worldModels}
            selected={selected}
            onSelect={handleSelect}
            onExit={handleExit}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload
useGLTF.preload("/models/office_building.glb");
useGLTF.preload("/models/trade_agent.glb");
useGLTF.preload("/models/medical_agent.glb");
useGLTF.preload("/models/hotel_agent.glb");
useGLTF.preload("/models/software_agent.glb");
useGLTF.preload("/models/bots_agent.glb");
