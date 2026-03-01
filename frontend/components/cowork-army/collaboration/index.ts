/** Agent collaboration beam system — visual connections between collaborating agents */
export interface CollabBeam {
  from: string;
  to: string;
  color: string;
  intensity: number;
}

export function getActiveCollaborations(statuses: Record<string, { status: string }>): CollabBeam[] {
  const beams: CollabBeam[] = [];
  const active = Object.entries(statuses).filter(([, s]) =>
    ["working", "coding", "thinking"].includes(s.status)
  );
  // Trading swarm collaborations
  const tradingIds = ["trade-engine", "alpha-scout", "tech-analyst", "risk-sentinel", "quant-lab"];
  const activeTradingAgents = active.filter(([id]) => tradingIds.includes(id));
  if (activeTradingAgents.length >= 2) {
    for (let i = 1; i < activeTradingAgents.length; i++) {
      beams.push({
        from: "trade-engine",
        to: activeTradingAgents[i][0],
        color: "#a78bfa",
        intensity: 0.5,
      });
    }
  }
  return beams;
}
