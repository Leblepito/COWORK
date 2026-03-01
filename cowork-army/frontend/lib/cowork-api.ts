/**
 * COWORK.ARMY — Frontend API Client
 * Local: /cowork-api/* (proxied to port 8888)
 */

const BASE = process.env.NEXT_PUBLIC_COWORK_API_URL || "/cowork-api";

// ── Types ──
export interface CoworkAgent {
  id: string; name: string; icon: string; tier: string; color: string;
  domain: string; desc: string; skills: string[]; rules: string[];
  triggers?: string[]; workspace_dir: string; system_prompt: string;
  is_base?: boolean;
}

export interface AgentStatus {
  agent_id: string; status: string; lines: string[];
  alive: boolean; pid: number; started_at: string;
}

export interface CoworkTask {
  id: string; title: string; description: string; assigned_to: string;
  priority: string; status: string; created_by: string;
  created_at: string; updated_at: string; log: string[];
}

export interface AutonomousEvent {
  timestamp: string; agent_id: string; message: string;
  type: "info" | "task_created" | "inbox_check" | "self_improve" | "warning";
}

export interface AutonomousStatus {
  running: boolean; tick_count: number; total_events: number;
  agents_tracked: number; last_tick: string | null;
}

export interface ServerInfo {
  name: string; version: string; mode: string; agents: number;
  bridge_connected: boolean; bridge_count: number;
  autonomous: boolean; autonomous_ticks: number;
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

// ── Agent Endpoints ──
export const getCoworkAgents = () => coworkFetch<CoworkAgent[]>("/agents");
export const getCoworkAgent = (id: string) => coworkFetch<CoworkAgent>(`/agents/${id}`);
export const spawnAgent = (id: string, task?: string) => {
  const params = task ? `?task=${encodeURIComponent(task)}` : "";
  return coworkFetch<AgentStatus>(`/agents/${id}/spawn${params}`, { method: "POST" });
};
export const killAgent = (id: string) =>
  coworkFetch<{ status: string; agent_id: string }>(`/agents/${id}/kill`, { method: "POST" });
export const getAgentStatuses = () => coworkFetch<Record<string, AgentStatus>>("/statuses");
export const getAgentOutput = (id: string) => coworkFetch<{ lines: string[] }>(`/agents/${id}/output`);
export async function createCoworkAgent(
  agentId: string, name: string, icon: string, domain: string,
  desc: string, skills: string, rules: string, triggers: string, systemPrompt: string
): Promise<CoworkAgent> {
  const fd = new FormData();
  fd.append("agent_id", agentId);
  fd.append("name", name);
  fd.append("icon", icon);
  fd.append("domain", domain);
  fd.append("desc", desc);
  fd.append("skills", skills);
  fd.append("rules", rules);
  fd.append("triggers", triggers);
  fd.append("system_prompt", systemPrompt);
  const res = await fetch(`${BASE}/agents`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<CoworkAgent>;
}
export async function deleteCoworkAgent(id: string): Promise<{ deleted: boolean }> {
  return coworkFetch<{ deleted: boolean }>(`/agents/${id}`, { method: "DELETE" });
}

// ── Task Endpoints ──
export const getCoworkTasks = () => coworkFetch<CoworkTask[]>("/tasks");
export const getCoworkTask = (id: string) => coworkFetch<CoworkTask>(`/tasks/${id}`);
export async function createCoworkTask(
  title: string, description: string, assignedTo: string, priority: string
): Promise<CoworkTask> {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("description", description);
  fd.append("assigned_to", assignedTo);
  fd.append("priority", priority);
  const res = await fetch(`${BASE}/tasks`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<CoworkTask>;
}
export async function updateCoworkTaskStatus(
    id: string, status: string, logMessage: string = ""
): Promise<CoworkTask> {
    const fd = new FormData();
    fd.append("status", status);
    fd.append("log_message", logMessage);
    const res = await fetch(`${BASE}/tasks/${id}`, { method: "PUT", body: fd });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<CoworkTask>;
}

// ── Autonomous Loop ──
export const startAutonomousLoop = () => coworkFetch<{ status: string }>("/autonomous/start", { method: "POST" });
export const stopAutonomousLoop = () => coworkFetch<{ status: string }>("/autonomous/stop", { method: "POST" });
export const getAutonomousStatus = () => coworkFetch<AutonomousStatus>("/autonomous/status");
export const getAutonomousEvents = (limit = 50, since = "") =>
  coworkFetch<AutonomousEvent[]>(`/autonomous/events?limit=${limit}&since=${encodeURIComponent(since)}`);

// ── Server Info ──
export const getServerInfo = () => coworkFetch<ServerInfo>("/info");

// ── Commander ──
export async function commanderDelegate(
  title: string, description: string, priority: string, autoSpawn: boolean
): Promise<Record<string, unknown>> {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("description", description);
  fd.append("priority", priority);
  fd.append("auto_spawn", String(autoSpawn));
  const res = await fetch(`${BASE}/commander/delegate`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Settings ──
export const getApiKeyStatus = () => coworkFetch<{ has_key?: boolean; set?: boolean; preview: string }>("/settings/api-key-status");
export async function saveApiKey(key: string): Promise<{ status: string; masked?: string; preview?: string }> {
  const fd = new FormData();
  fd.append("api_key", key);
  const res = await fetch(`${BASE}/settings/api-key`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Agent CRUD (object-based interface) ──
export interface CreateAgentInput {
  id?: string; name: string; icon: string; tier: string; color: string;
  domain: string; desc: string; skills: string[]; rules: string[];
  workspace_dir: string; triggers: string[]; system_prompt: string;
}
export async function createAgent(input: CreateAgentInput): Promise<CoworkAgent> {
  const fd = new FormData();
  if (input.id) fd.append("id", input.id);
  fd.append("agent_id", input.id || `agent-${Date.now()}`);
  fd.append("name", input.name);
  fd.append("icon", input.icon);
  fd.append("domain", input.domain);
  fd.append("desc", input.desc);
  fd.append("skills", JSON.stringify(input.skills));
  fd.append("rules", JSON.stringify(input.rules));
  fd.append("triggers", JSON.stringify(input.triggers));
  fd.append("system_prompt", input.system_prompt);
  const res = await fetch(`${BASE}/agents`, { method: "POST", body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<CoworkAgent>;
}
export async function deleteAgent(id: string): Promise<{ deleted?: boolean; status?: string; agent_id?: string }> {
  const res = await fetch(`${BASE}/agents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}
