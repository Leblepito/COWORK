"use client";

import { Html } from "@react-three/drei";
import type { ZoneDefinition } from "./scene-constants";

interface ZoneBorderProps {
    zone: ZoneDefinition;
}

/** Thin box used as a border edge */
function BorderEdge({
    from,
    to,
    color,
}: {
    from: [number, number, number];
    to: [number, number, number];
    color: string;
}) {
    const mx = (from[0] + to[0]) / 2;
    const mz = (from[2] + to[2]) / 2;
    const dx = to[0] - from[0];
    const dz = to[2] - from[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    return (
        <mesh position={[mx, 0.02, mz]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.02, 0.01, len]} />
            <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
    );
}

export default function ZoneBorder({ zone }: ZoneBorderProps) {
    const [minX, minZ, maxX, maxZ] = zone.bounds;

    const corners: [number, number, number][] = [
        [minX, 0, minZ],
        [maxX, 0, minZ],
        [maxX, 0, maxZ],
        [minX, 0, maxZ],
    ];

    return (
        <group>
            {/* 4 border edges */}
            {corners.map((c, i) => (
                <BorderEdge
                    key={i}
                    from={c}
                    to={corners[(i + 1) % 4]}
                    color={zone.color}
                />
            ))}
            {/* Zone label */}
            <Html
                position={[(minX + maxX) / 2, 0.15, maxZ + 0.4]}
                center
                distanceFactor={12}
                style={{ pointerEvents: "none" }}
            >
                <div
                    style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: zone.color,
                        letterSpacing: "2px",
                        textShadow: `0 0 8px ${zone.color}`,
                        whiteSpace: "nowrap",
                    }}
                >
                    {zone.label}
                </div>
            </Html>
        </group>
    );
}
