"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TransferBeamProps {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  active: boolean;
}

const PARTICLE_COUNT = 10;
const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

export default function TransferBeam({ from, to, color = "#f472b6", active }: TransferBeamProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const progressRef = useRef<number[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => i / PARTICLE_COUNT)
  );

  useFrame((_, delta) => {
    if (!meshRef.current || !active) return;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      progressRef.current[i] = (progressRef.current[i] + delta * 0.6) % 1;
      const p = progressRef.current[i];

      // Lerp along path with arc
      const x = from[0] + (to[0] - from[0]) * p;
      const y = from[1] + (to[1] - from[1]) * p + Math.sin(p * Math.PI) * 1.0;
      const z = from[2] + (to[2] - from[2]) * p;

      // Package-like scaling — larger in the middle
      const scale = 0.04 + Math.sin(p * Math.PI) * 0.03;

      _tempObj.position.set(x, y, z);
      _tempObj.scale.setScalar(scale);
      _tempObj.updateMatrix();
      meshRef.current.setMatrixAt(i, _tempObj.matrix);

      _tempColor.set(color);
      _tempColor.multiplyScalar(0.8 + Math.sin(p * Math.PI) * 0.4);
      meshRef.current.setColorAt(i, _tempColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <group>
      {/* Transfer particles */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          transparent
          opacity={0.7}
        />
      </instancedMesh>

      {/* Trail line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([...from, ...to]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.15} />
      </line>
    </group>
  );
}
