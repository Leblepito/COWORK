"use client";

import { useState, useEffect } from "react";
import { Html } from "@react-three/drei";

interface SpeechBubbleProps {
    position: [number, number, number];
    message: string | null;
}

export default function SpeechBubble({ position, message }: SpeechBubbleProps) {
    const [visible, setVisible] = useState(false);
    const [displayMessage, setDisplayMessage] = useState<string | null>(null);

    useEffect(() => {
        if (message) {
            setDisplayMessage(message);
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (!visible || !displayMessage) return null;

    return (
        <Html
            position={[position[0], position[1] + 1.8, position[2] - 0.3]}
            center
            distanceFactor={10}
            style={{ pointerEvents: "none" }}
        >
            <div
                style={{
                    background: "rgba(15,23,42,0.9)",
                    color: "white",
                    fontSize: "11px",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    maxWidth: "160px",
                    textAlign: "center",
                    border: "1px solid rgba(100,116,139,0.4)",
                    backdropFilter: "blur(4px)",
                    animation: "fadeIn 0.3s ease-out",
                }}
            >
                {displayMessage}
            </div>
        </Html>
    );
}
