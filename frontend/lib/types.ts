/**
 * COWORK.ARMY v7.0 — Shared TypeScript Types
 * 4 Departments, 13 Agents, Cargo Orchestrator
 */

export interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
  scene_type: string;
  description: string;
  agents?: CoworkAgent[];
}

export interface CoworkAgent {
  id: string;
  name: string;
  icon: string;
  tier: string;
  color: string;
  domain: string;
  desc: string;
  department_id: string | null;
  skills: string[];
  rules: string[];
  triggers?: string[];
  workspace_dir: string;
  system_prompt: string;
  is_base?: boolean;
}

export interface AgentStatus {
  agent_id: string;
  status: string;
  lines: string[];
  alive: boolean;
  pid: number;
  started_at: string;
}

export interface CoworkTask {
  id: string;
  title: string;
  description: string;
  department_id: string | null;
  assigned_to: string;
  priority: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  log: string[];
}

export interface AutonomousEvent {
  timestamp: string;
  department_id: string | null;
  agent_id: string;
  message: string;
  type: string;
}

export interface AutonomousStatus {
  running: boolean;
  tick_count: number;
  total_events: number;
  agents_tracked: number;
  last_tick: string | null;
}

export interface ServerInfo {
  name: string;
  version: string;
  mode: string;
  agents: number;
  departments: number;
  autonomous: boolean;
  autonomous_ticks: number;
}

export interface CargoResult {
  success: boolean;
  cargo_log_id?: number;
  target_department_id?: string;
  target_agent_id?: string;
  confidence?: number;
  reasoning?: string;
  keywords_found?: string[];
  error?: string;
}

export interface CargoLog {
  id: number;
  timestamp: string;
  filename: string;
  file_type: string;
  file_size: number;
  analysis: Record<string, unknown>;
  source_department_id: string | null;
  target_department_id: string;
  target_agent_id: string;
  status: string;
  prompt_generated: string;
}
