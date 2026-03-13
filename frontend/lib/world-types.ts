/**
 * COWORK.ARMY — Agent World Type Definitions
 * /world sayfası için tüm tip tanımları
 */

export type Department = "trade" | "medical" | "hotel" | "software" | "bots";

export interface AgentWorldModel {
  agent_id: string;
  expertise_score: number;
  energy_level: number;
  current_task: string | null;
  trust_network: Record<string, number>;
  idle_timeout_seconds: number;
}

export interface AgentMessageEvent {
  type: "agent_message";
  id: string;
  from_agent: string;
  to_agent: string;
  from_dept?: string;
  to_dept?: string;
  message_type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  payload_summary: string;
  thread_id: string;
  cascade_id: string | null;
  timestamp: string;
}

export interface ExternalTriggerEvent {
  type: "external_trigger";
  source: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  summary: string;
  target_departments: string[];
  timestamp: string;
}

export interface CascadeEvent {
  type: "cascade_event" | "cascade_complete";
  cascade_id: string;
  affected_departments: string[];
  depth?: number;
  summary?: string;
}

export type WorldEvent = AgentMessageEvent | ExternalTriggerEvent | CascadeEvent;

export interface SchedulerStats {
  queue_size: number;
  active_tasks: number;
  active_agents: string[];
}

export interface WorldUpdatePayload {
  type: "update";
  statuses: Record<string, unknown>;
  events: unknown[];
  new_events: boolean;
  world_models: AgentWorldModel[];
  scheduler_stats: SchedulerStats;
}

export const DEPT_CONFIG: Record<Department, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  position: { x: number; y: number };  // Canvas'taki bina konumu (%)
  agents: string[];  // Bu departmandaki agent ID'leri (kısmi eşleşme için)
}> = {
  trade: {
    label: "Trade",
    color: "#00ff88",
    bgColor: "#00ff8818",
    icon: "📈",
    position: { x: 22, y: 32 },
    agents: ["indicator", "algobot", "u2algo"],
  },
  medical: {
    label: "Medical",
    color: "#00aaff",
    bgColor: "#00aaff18",
    icon: "🏥",
    position: { x: 50, y: 20 },
    agents: ["diagnosis", "treatment", "research"],
  },
  hotel: {
    label: "Hotel",
    color: "#ff8800",
    bgColor: "#ff880018",
    icon: "🏨",
    position: { x: 78, y: 32 },
    agents: ["flight", "rental", "concierge"],
  },
  software: {
    label: "Software",
    color: "#aa00ff",
    bgColor: "#aa00ff18",
    icon: "💻",
    position: { x: 32, y: 68 },
    agents: ["fullstack", "appbuilder", "devops"],
  },
  bots: {
    label: "Bots",
    color: "#ff3366",
    bgColor: "#ff336618",
    icon: "🤖",
    position: { x: 68, y: 68 },
    agents: ["social", "scraper", "automation"],
  },
};

/** Agent ID'den departman çıkar */
export function getAgentDepartment(agentId: string): Department | null {
  const lower = agentId.toLowerCase();
  for (const [dept, cfg] of Object.entries(DEPT_CONFIG) as [Department, typeof DEPT_CONFIG[Department]][]) {
    if (lower.includes(dept)) return dept;
    for (const agentKey of cfg.agents) {
      if (lower.includes(agentKey)) return dept;
    }
  }
  return null;
}
