/**
 * COWORK.ARMY v7.0 — Frontend API Client
 * 4 Departments, 13 Agents, Cargo Orchestrator
 */

const BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "/cowork-api";

// ── Types ──

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

// ── Fetch helper ──

async function coworkFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cowork API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Department Endpoints ──

export const getDepartments = () => coworkFetch<Department[]>("/departments");
export const getDepartment = (id: string) => coworkFetch<Department & { agents: CoworkAgent[] }>(`/departments/${id}`);

// ── Agent Endpoints ──

export const getCoworkAgents = (departmentId?: string) => {
  const params = departmentId ? `?department_id=${departmentId}` : "";
  return coworkFetch<CoworkAgent[]>(`/agents${params}`);
};
export const getCoworkAgent = (id: string) => coworkFetch<CoworkAgent>(`/agents/${id}`);
export const spawnAgent = (id: string, task?: string) => {
  const params = task ? `?task=${encodeURIComponent(task)}` : "";
  return coworkFetch<AgentStatus>(`/agents/${id}/spawn${params}`, { method: "POST" });
};
export const killAgent = (id: string) =>
  coworkFetch<{ status: string; agent_id: string }>(`/agents/${id}/kill`, { method: "POST" });
export const getAgentStatuses = () => coworkFetch<Record<string, AgentStatus>>("/statuses");
export const getAgentOutput = (id: string) => coworkFetch<{ lines: string[] }>(`/agents/${id}/output`);

// ── Task Endpoints ──

export const getCoworkTasks = (departmentId?: string) => {
  const params = departmentId ? `?department_id=${departmentId}` : "";
  return coworkFetch<CoworkTask[]>(`/tasks${params}`);
};

export async function createCoworkTask(
  title: string,
  description: string,
  assignedTo: string,
  priority: string,
  departmentId?: string,
): Promise<CoworkTask> {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("description", description);
  fd.append("assigned_to", assignedTo);
  fd.append("priority", priority);
  if (departmentId) fd.append("department_id", departmentId);
  const res = await fetch(`${BASE}/tasks`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<CoworkTask>;
}

// ── Cargo Endpoints ──

export async function uploadCargo(
  file?: File,
  description?: string,
  content?: string,
): Promise<CargoResult> {
  const fd = new FormData();
  if (file) fd.append("file", file);
  if (description) fd.append("description", description);
  if (content) fd.append("content", content);
  const res = await fetch(`${BASE}/cargo/upload`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<CargoResult>;
}

export async function delegateCargo(
  title: string,
  description: string,
  targetDepartmentId?: string,
  targetAgentId?: string,
): Promise<CargoResult> {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("description", description);
  if (targetDepartmentId) fd.append("target_department_id", targetDepartmentId);
  if (targetAgentId) fd.append("target_agent_id", targetAgentId);
  const res = await fetch(`${BASE}/cargo/delegate`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<CargoResult>;
}

export const getCargoLogs = (limit = 50) => coworkFetch<CargoLog[]>(`/cargo/logs?limit=${limit}`);

// ── Autonomous Loop ──

export const startAutonomousLoop = () =>
  coworkFetch<{ status: string }>("/autonomous/start", { method: "POST" });
export const stopAutonomousLoop = () =>
  coworkFetch<{ status: string }>("/autonomous/stop", { method: "POST" });
export const getAutonomousStatus = () =>
  coworkFetch<AutonomousStatus>("/autonomous/status");
export const getAutonomousEvents = (limit = 50, since = "", departmentId?: string) => {
  let params = `?limit=${limit}`;
  if (since) params += `&since=${encodeURIComponent(since)}`;
  if (departmentId) params += `&department_id=${departmentId}`;
  return coworkFetch<AutonomousEvent[]>(`/autonomous/events${params}`);
};

// ── Server Info ──

export const getServerInfo = () => coworkFetch<ServerInfo>("/info");
