"use client";

export default function Floor() {
    return (
        <group>
            {/* Dark base plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial color="#0a0a1a" roughness={0.8} metalness={0.2} />
            </mesh>
            {/* Grid lines */}
            <gridHelper args={[30, 30, "#1a1a2e", "#1a1a2e"]} position={[0, 0, 0]} />
        </group>
    );
}
