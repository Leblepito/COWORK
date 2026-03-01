/** Agent collaboration beam system — visual connections between collaborating agents */
export interface CollabBeam {
  from: string;
  to: string;
  color: string;
  intensity: number;
}

/** v7.0 department agent ID groups */
const DEPT_AGENTS: Record<string, { ids: string[]; hub: string; color: string }> = {
  trade:    { ids: ["school-game", "indicator", "algo-bot"],               hub: "indicator",  color: "#a78bfa" },
  medical:  { ids: ["clinic", "health-tourism", "manufacturing"],          hub: "clinic",     color: "#22d3ee" },
  hotel:    { ids: ["hotel", "flight", "rental"],                          hub: "hotel",      color: "#f59e0b" },
  software: { ids: ["fullstack", "app-builder", "prompt-engineer"],        hub: "fullstack",  color: "#22c55e" },
};

export function getActiveCollaborations(statuses: Record<string, { status: string }>): CollabBeam[] {
  const beams: CollabBeam[] = [];
  const active = Object.entries(statuses).filter(([, s]) =>
    ["working", "coding", "thinking"].includes(s.status)
  );
  const activeIds = new Set(active.map(([id]) => id));

  for (const dept of Object.values(DEPT_AGENTS)) {
    const activeDeptAgents = dept.ids.filter(id => activeIds.has(id));
    if (activeDeptAgents.length >= 2) {
      for (const agentId of activeDeptAgents) {
        if (agentId !== dept.hub) {
          beams.push({
            from: dept.hub,
            to: agentId,
            color: dept.color,
            intensity: 0.5,
          });
        }
      }
    }
  }

  // Cross-department beams via cargo agent
  if (activeIds.has("cargo")) {
    const activeDepts = Object.values(DEPT_AGENTS).filter(
      dept => dept.ids.some(id => activeIds.has(id))
    );
    if (activeDepts.length >= 2) {
      for (const dept of activeDepts) {
        beams.push({
          from: "cargo",
          to: dept.hub,
          color: "#f472b6",
          intensity: 0.3,
        });
      }
    }
  }

  return beams;
}
