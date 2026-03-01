/** Agent movement system — status-driven animations */
export type MovementState = "idle" | "working" | "walking" | "thinking";

export function getMovementParams(status: string): { speed: number; amplitude: number; bobFreq: number } {
  switch (status) {
    case "working": return { speed: 2, amplitude: 0, bobFreq: 0 };
    case "thinking": return { speed: 0, amplitude: 0.05, bobFreq: 2 };
    case "coding": return { speed: 3, amplitude: 0, bobFreq: 0 };
    default: return { speed: 0, amplitude: 0.03, bobFreq: 1.5 };
  }
}
