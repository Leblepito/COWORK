"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CAMPUS_TREES, CAMPUS_BENCHES } from "../scene-constants";

/** Silicon Valley style tree — low-poly pine/cypress */
function CampusTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Group>(null);
  // Slight sway
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.3 + position[0]) * 0.02;
    }
  });

  return (
    <group ref={ref} position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 2.4, 6]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.9} />
      </mesh>
      {/* Foliage layers (3 cones) */}
      <mesh position={[0, 3.2, 0]}>
        <coneGeometry args={[1.0, 2.0, 6]} />
        <meshStandardMaterial color="#1a5c2a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.8, 0]}>
        <coneGeometry args={[0.75, 1.6, 6]} />
        <meshStandardMaterial color="#1f6b30" roughness={0.8} />
      </mesh>
      <mesh position={[0, 4.3, 0]}>
        <coneGeometry args={[0.5, 1.2, 6]} />
        <meshStandardMaterial color="#247a38" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Park bench */
function Bench({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.2, 0.06, 0.4]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.7} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.6, -0.18]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[1.2, 0.4, 0.04]} />
        <meshStandardMaterial color="#8b5e3c" roughness={0.7} />
      </mesh>
      {/* Legs */}
      {[[-0.45, 0], [0.45, 0]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.17, z]}>
          <boxGeometry args={[0.06, 0.34, 0.4]} />
          <meshStandardMaterial color="#374151" metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Central fountain/water feature */
function CampusFountain() {
  const waterRef = useRef<THREE.Mesh>(null);
  const sprayRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Water surface shimmer
    if (waterRef.current) {
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.15 + Math.sin(t * 2) * 0.05;
    }
    // Spray particles rise and fall
    if (sprayRef.current) {
      sprayRef.current.children.forEach((child, i) => {
        const phase = t * 3 + i * 0.8;
        child.position.y = 1.5 + Math.abs(Math.sin(phase)) * 1.2;
        (child as THREE.Mesh).scale.setScalar(0.5 + Math.sin(phase) * 0.3);
      });
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer basin ring */}
      <mesh position={[0, 0.3, 0]}>
        <torusGeometry args={[4, 0.4, 8, 24]} />
        <meshStandardMaterial color="#64748b" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Inner basin ring */}
      <mesh position={[0, 0.5, 0]}>
        <torusGeometry args={[2, 0.3, 8, 16]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Water surface */}
      <mesh ref={waterRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.8, 24]} />
        <meshStandardMaterial
          color="#0ea5e9"
          emissive="#0284c7"
          emissiveIntensity={0.15}
          transparent
          opacity={0.6}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>
      {/* Center pillar */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 1.6, 8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Water spray particles */}
      <group ref={sprayRef}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const angle = (i / 6) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.5, 1.5, Math.sin(angle) * 0.5]}>
              <sphereGeometry args={[0.08, 6, 6]} />
              <meshStandardMaterial
                color="#7dd3fc"
                emissive="#38bdf8"
                emissiveIntensity={0.8}
                transparent
                opacity={0.6}
              />
            </mesh>
          );
        })}
      </group>
      {/* Fountain top sphere */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.2} metalness={0.6} />
      </mesh>
    </group>
  );
}

/** Campus road/pathway segment */
function CampusRoad({ from, to, width }: { from: [number, number, number]; to: [number, number, number]; width: number }) {
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[2] + to[2]) / 2;
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);

  return (
    <mesh position={[midX, 0.02, midZ]} rotation={[-Math.PI / 2, 0, -angle]}>
      <planeGeometry args={[width, length]} />
      <meshStandardMaterial color="#374151" roughness={0.9} />
    </mesh>
  );
}

/** Welcome sign at campus entrance */
function CampusSign() {
  return (
    <group position={[0, 0, -34]}>
      {/* Sign posts */}
      <mesh position={[-2.5, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3, 6]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[2.5, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3, 6]} />
        <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Sign board */}
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[6, 1.2, 0.15]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} emissive="#fbbf24" emissiveIntensity={0.05} />
      </mesh>
      {/* Sign border glow */}
      <mesh position={[0, 2.8, 0.09]}>
        <boxGeometry args={[5.8, 1, 0.01]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.4} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/** Main campus environment — ground, trees, roads, fountain */
export default function CampusEnvironment() {
  // Circular road around the center
  const circleRoadPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      pts.push([Math.cos(angle) * 8, 0.02, Math.sin(angle) * 8]);
    }
    return pts;
  }, []);

  return (
    <group>
      {/* ── Ground plane (grass) ── */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1a3a1a" roughness={0.95} />
      </mesh>

      {/* ── Central plaza (lighter ground) ── */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12, 32]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.8} />
      </mesh>

      {/* ── Circular walkway ── */}
      {circleRoadPoints.slice(0, -1).map((pt, i) => (
        <CampusRoad key={i} from={pt} to={circleRoadPoints[i + 1]} width={1.5} />
      ))}

      {/* ── Diagonal roads to buildings ── */}
      {/* Trade (NW) */}
      <CampusRoad from={[-6, 0, -6]} to={[-14, 0, -13]} width={2} />
      {/* Medical (NE) */}
      <CampusRoad from={[6, 0, -6]} to={[14, 0, -13]} width={2} />
      {/* Hotel (SW) */}
      <CampusRoad from={[-6, 0, 6]} to={[-14, 0, 13]} width={2} />
      {/* Software (SE) */}
      <CampusRoad from={[6, 0, 6]} to={[14, 0, 13]} width={2} />

      {/* ── North-South main road ── */}
      <CampusRoad from={[0, 0, -12]} to={[0, 0, -34]} width={2.5} />
      <CampusRoad from={[0, 0, 12]} to={[0, 0, 34]} width={2.5} />

      {/* ── Fountain ── */}
      <CampusFountain />

      {/* ── Trees ── */}
      {CAMPUS_TREES.map((pos, i) => (
        <CampusTree key={i} position={pos} scale={0.7 + (i % 3) * 0.15} />
      ))}

      {/* ── Benches ── */}
      {CAMPUS_BENCHES.map((b, i) => (
        <Bench key={i} position={b.pos} rotation={b.rot} />
      ))}

      {/* ── Campus entrance sign ── */}
      <CampusSign />

      {/* ── Ambient ground lights along roads ── */}
      {[
        [-10, 0.3, -10], [10, 0.3, -10], [-10, 0.3, 10], [10, 0.3, 10],
        [0, 0.3, -20], [0, 0.3, 20],
      ].map((pos, i) => (
        <group key={`lamp-${i}`} position={pos as [number, number, number]}>
          {/* Lamp post */}
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.04, 0.06, 2.4, 6]} />
            <meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.4} />
          </mesh>
          {/* Lamp head */}
          <mesh position={[0, 2.5, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={0.6} />
          </mesh>
          <pointLight position={[0, 2.5, 0]} color="#fbbf24" intensity={0.4} distance={8} />
        </group>
      ))}
    </group>
  );
}
