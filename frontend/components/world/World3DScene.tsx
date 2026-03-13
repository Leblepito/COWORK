"use client";
/**
 * COWORK.ARMY — World3DScene
 * SimCity tarzı 3D dünya — React Three Fiber + Meshy.ai 3D modelleri
 * Departman binaları, hareketli maskotlar, agent mesaj animasyonları
 */
import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  OrbitControls,
  Environment,
  Float,
  Html,
  Billboard,
  Text,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import type { WorldEvent, AgentWorldModel } from "@/lib/world-types";

// ─── Sabitler ────────────────────────────────────────────────────────────────

const DEPT_POSITIONS: Record<string, [number, number, number]> = {
  trade:    [-6,  0,  -4],
  medical:  [ 0,  0,  -6],
  hotel:    [ 6,  0,  -4],
  software: [-4,  0,   4],
  bots:     [ 4,  0,   4],
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

// ─── Zemin ───────────────────────────────────────────────────────────────────

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.05, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial
        color="#0a0e1a"
        roughness={0.9}
        metalness={0.1}
      />
    </mesh>
  );
}

// Izgara çizgileri
function GridLines() {
  const gridRef = useRef<THREE.GridHelper>(null);
  return (
    <gridHelper
      ref={gridRef}
      args={[40, 40, "#1a2040", "#0f1530"]}
      position={[0, 0, 0]}
    />
  );
}

// ─── Çevre modeli (Silicon Valley) ───────────────────────────────────────────

function SiliconValleyEnv() {
  const { scene } = useGLTF("/models/silicon_valley_env.glb");
  const cloned = useMemo(() => scene.clone(), [scene]);
  return (
    <primitive
      object={cloned}
      scale={[0.8, 0.8, 0.8]}
      position={[0, 0, 0]}
      receiveShadow
    />
  );
}

// ─── Ofis Binası ─────────────────────────────────────────────────────────────

interface BuildingProps {
  dept: string;
  position: [number, number, number];
  isActive: boolean;
  agentCount: number;
  activeCount: number;
}

function DeptBuilding({ dept, position, isActive, agentCount, activeCount }: BuildingProps) {
  const { scene } = useGLTF("/models/office_building.glb");
  const cloned = useMemo(() => scene.clone(), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);
  const color = DEPT_COLORS[dept] || "#ffffff";
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!groupRef.current) return;
    // Aktif olduğunda hafif yüzer
    if (isActive) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    } else {
      groupRef.current.position.y = position[1];
    }
    // Glow efekti
    if (glowRef.current) {
      glowRef.current.intensity = isActive
        ? 1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.5
        : hovered ? 0.8 : 0.2;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Bina modeli */}
      <primitive
        object={cloned}
        scale={[0.35, 0.35, 0.35]}
        castShadow
        receiveShadow
      />
      {/* Departman renk ışığı */}
      <pointLight
        ref={glowRef}
        color={color}
        intensity={isActive ? 1.5 : 0.2}
        distance={4}
        position={[0, 2, 0]}
      />
      {/* Aktif olduğunda kıvılcımlar */}
      {isActive && (
        <Sparkles
          count={20}
          scale={2}
          size={1.5}
          speed={0.4}
          color={color}
          position={[0, 1.5, 0]}
        />
      )}
      {/* Departman etiketi */}
      <Billboard position={[0, 3.2, 0]}>
        <Text
          fontSize={0.28}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {DEPT_LABELS[dept]}
        </Text>
        <Text
          fontSize={0.18}
          color="#888888"
          anchorX="center"
          anchorY="middle"
          position={[0, -0.35, 0]}
        >
          {activeCount}/{agentCount} aktif
        </Text>
      </Billboard>
      {/* Zemin halkası */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color={color} transparent opacity={isActive ? 0.6 : 0.15} />
      </mesh>
    </group>
  );
}

// ─── Agent Maskotu ────────────────────────────────────────────────────────────

interface MascotProps {
  dept: string;
  index: number;
  totalInDept: number;
  isWorking: boolean;
  agentName: string;
  targetDept?: string;
}

function AgentMascot3D({ dept, index, totalInDept, isWorking, agentName, targetDept }: MascotProps) {
  const modelPath = AGENT_MODEL_MAP[dept] || AGENT_MODEL_MAP["trade"];
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => scene.clone(), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const [moving, setMoving] = useState(false);
  const moveProgress = useRef(0);
  const basePos = useRef<[number, number, number]>([0, 0, 0]);
  const targetPos = useRef<[number, number, number]>([0, 0, 0]);

  // Departman içindeki pozisyon
  const deptPos = DEPT_POSITIONS[dept] || [0, 0, 0];
  const angle = (index / Math.max(totalInDept, 1)) * Math.PI * 2;
  const radius = 1.2;
  const offsetX = Math.cos(angle) * radius;
  const offsetZ = Math.sin(angle) * radius;
  const startPos: [number, number, number] = [
    deptPos[0] + offsetX,
    0,
    deptPos[2] + offsetZ,
  ];

  useEffect(() => {
    basePos.current = startPos;
    if (groupRef.current) {
      groupRef.current.position.set(...startPos);
    }
  }, []);

  // Hedef departmana hareket
  useEffect(() => {
    if (targetDept && DEPT_POSITIONS[targetDept]) {
      const tp = DEPT_POSITIONS[targetDept];
      targetPos.current = [tp[0], 0, tp[2]];
      moveProgress.current = 0;
      setMoving(true);
    }
  }, [targetDept]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (moving) {
      moveProgress.current = Math.min(1, moveProgress.current + delta * 0.8);
      const t = moveProgress.current;
      // Bezier yay hareketi
      const midY = 1.5;
      const x = THREE.MathUtils.lerp(basePos.current[0], targetPos.current[0], t);
      const y = Math.sin(t * Math.PI) * midY;
      const z = THREE.MathUtils.lerp(basePos.current[2], targetPos.current[2], t);
      groupRef.current.position.set(x, y, z);
      // Hareket yönüne bak
      const dx = targetPos.current[0] - basePos.current[0];
      const dz = targetPos.current[2] - basePos.current[2];
      if (Math.abs(dx) + Math.abs(dz) > 0.1) {
        groupRef.current.rotation.y = Math.atan2(dx, dz);
      }
      if (moveProgress.current >= 1) {
        setMoving(false);
        basePos.current = [...targetPos.current];
      }
    } else {
      // Çalışırken zıplama animasyonu
      if (isWorking) {
        groupRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 3 + index)) * 0.15;
      } else {
        groupRef.current.position.y = 0;
      }
      // Yavaşça kendi etrafında dön
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive
        object={cloned}
        scale={[0.18, 0.18, 0.18]}
        castShadow
      />
      {/* Agent adı */}
      {isWorking && (
        <Billboard position={[0, 0.8, 0]}>
          <Text
            fontSize={0.12}
            color={DEPT_COLORS[dept] || "#ffffff"}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.015}
            outlineColor="#000000"
          >
            {agentName.split("_")[0]}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ─── Mesaj Parçacığı ──────────────────────────────────────────────────────────

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
    progress.current = Math.min(1, progress.current + delta * 1.2);
    const t = progress.current;
    const x = THREE.MathUtils.lerp(fromPos[0], toPos[0], t);
    const y = Math.sin(t * Math.PI) * 2.5;
    const z = THREE.MathUtils.lerp(fromPos[2], toPos[2], t);
    meshRef.current.position.set(x, y, z);
    if (progress.current >= 1 && !completed.current) {
      completed.current = true;
      onComplete();
    }
  });

  return (
    <mesh ref={meshRef} position={[fromPos[0], 0, fromPos[2]]}>
      <sphereGeometry args={[0.12, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        toneMapped={false}
      />
      {/* Işık izi */}
      <pointLight color={color} intensity={3} distance={2} />
    </mesh>
  );
}

// ─── Ana Sahne ────────────────────────────────────────────────────────────────

interface SceneProps {
  events: WorldEvent[];
  worldModels: AgentWorldModel[];
}

interface ActiveBeam {
  id: string;
  from: string;
  to: string;
  color: string;
}

function Scene({ events, worldModels }: SceneProps) {
  const [activeBeams, setActiveBeams] = useState<ActiveBeam[]>([]);
  const lastEventCount = useRef(0);

  // Yeni event'leri izle ve beam oluştur
  useEffect(() => {
    if (events.length <= lastEventCount.current) return;
    const newEvents = events.slice(lastEventCount.current);
    lastEventCount.current = events.length;

    for (const ev of newEvents) {
      if (ev.type === "agent_message" && ev.from_dept && ev.to_dept && ev.from_dept !== ev.to_dept) {
        const beam: ActiveBeam = {
          id: `${Date.now()}-${Math.random()}`,
          from: ev.from_dept,
          to: ev.to_dept,
          color: DEPT_COLORS[ev.from_dept] || "#ffffff",
        };
        setActiveBeams((prev) => [...prev.slice(-10), beam]);
      }
    }
  }, [events]);

  // Departman istatistikleri
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

  // Agent listesi
  const agentsByDept = useMemo(() => {
    const map: Record<string, AgentWorldModel[]> = {};
    for (const dept of Object.keys(DEPT_POSITIONS)) {
      map[dept] = worldModels.filter((m) => {
        const id = m.agent_id.toLowerCase();
        return id.includes(dept) || (dept === "bots" && id.includes("bot"));
      });
    }
    return map;
  }, [worldModels]);

  return (
    <>
      {/* Işıklar */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#4488ff" />

      {/* Zemin */}
      <Ground />
      <GridLines />

      {/* Çevre */}
      <Suspense fallback={null}>
        <SiliconValleyEnv />
      </Suspense>

      {/* Departman binaları */}
      {Object.entries(DEPT_POSITIONS).map(([dept, pos]) => (
        <Suspense key={dept} fallback={null}>
          <DeptBuilding
            dept={dept}
            position={pos}
            isActive={(deptStats[dept]?.active || 0) > 0}
            agentCount={deptStats[dept]?.total || 3}
            activeCount={deptStats[dept]?.active || 0}
          />
        </Suspense>
      ))}

      {/* Agent maskotları */}
      {Object.entries(agentsByDept).map(([dept, agents]) =>
        agents.map((agent, idx) => (
          <Suspense key={agent.agent_id} fallback={null}>
            <AgentMascot3D
              dept={dept}
              index={idx}
              totalInDept={agents.length}
              isWorking={!!agent.current_task}
              agentName={agent.agent_id}
            />
          </Suspense>
        ))
      )}

      {/* Mesaj ışınları */}
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

      {/* Kamera kontrolü */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />

      {/* Çevre ışığı */}
      <Environment preset="night" />
    </>
  );
}

// ─── Yükleme Göstergesi ───────────────────────────────────────────────────────

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
  return (
    <div className="w-full h-full" style={{ background: "#050810" }}>
      <Canvas
        shadows
        camera={{ position: [0, 12, 16], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#050810" }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene events={events} worldModels={worldModels} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Preload modeller
useGLTF.preload("/models/trade_agent.glb");
useGLTF.preload("/models/medical_agent.glb");
useGLTF.preload("/models/hotel_agent.glb");
useGLTF.preload("/models/software_agent.glb");
useGLTF.preload("/models/bots_agent.glb");
useGLTF.preload("/models/office_building.glb");
useGLTF.preload("/models/silicon_valley_env.glb");
