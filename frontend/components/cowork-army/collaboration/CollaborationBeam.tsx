"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface CollaborationBeamProps {
    fromPosition: THREE.Vector3;
    toPosition: THREE.Vector3;
    color: string;
    active: boolean;
}

const PARTICLE_COUNT = 6;
const _tempObj = new THREE.Object3D();
const _tempColor = new THREE.Color();

export default function CollaborationBeam({
    fromPosition,
    toPosition,
    color,
    active,
}: CollaborationBeamProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const progressRef = useRef<number[]>(
        Array.from({ length: PARTICLE_COUNT }, (_, i) => i / PARTICLE_COUNT),
    );

    useFrame((_, delta) => {
        if (!meshRef.current || !active) return;

        const from = fromPosition;
        const to = toPosition;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            progressRef.current[i] = (progressRef.current[i] + delta * 0.8) % 1;
            const p = progressRef.current[i];

            const x = from.x + (to.x - from.x) * p;
            const y = (from.y + 1) + (to.y - from.y) * p + Math.sin(p * Math.PI) * 0.3;
            const z = from.z + (to.z - from.z) * p;

            _tempObj.position.set(x, y, z);
            _tempObj.scale.setScalar(0.6 + Math.sin(p * Math.PI) * 0.4);
            _tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, _tempObj.matrix);

            _tempColor.set(color);
            meshRef.current.setColorAt(i, _tempColor);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    if (!active) return null;

    return (
        <group>
            {/* Energy particles */}
            <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
                <sphereGeometry args={[0.04, 6, 6]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={2}
                    transparent
                    opacity={0.8}
                />
            </instancedMesh>
        </group>
    );
}
