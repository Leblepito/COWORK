/**
 * Meshy.ai API Client — text-to-3D generation with polling and caching
 * Models are saved to /public/models/ as GLB files.
 * Falls back to primitive geometries when GLB not available.
 */

const MESHY_API_BASE = "https://api.meshy.ai/v2";

interface MeshyTaskResponse {
  result: string; // task ID
}

interface MeshyTaskStatus {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "SUCCEEDED" | "FAILED" | "EXPIRED";
  progress: number;
  model_urls?: { glb?: string; fbx?: string; obj?: string };
  thumbnail_url?: string;
}

/** Local cache of model availability (agentId → boolean) */
const modelCache = new Map<string, boolean>();

/**
 * Check if a GLB model exists in /public/models/ for the given agent.
 */
export function hasGLBModel(agentId: string): boolean {
  if (modelCache.has(agentId)) return modelCache.get(agentId)!;
  // Will be populated at runtime after checking /models/{agentId}.glb
  return false;
}

/**
 * Probe model availability by fetching HEAD on the GLB URL.
 */
export async function probeModelAvailability(agentId: string): Promise<boolean> {
  try {
    const resp = await fetch(`/models/${agentId}.glb`, { method: "HEAD" });
    const exists = resp.ok;
    modelCache.set(agentId, exists);
    return exists;
  } catch {
    modelCache.set(agentId, false);
    return false;
  }
}

/**
 * Submit a text-to-3D generation request to Meshy.ai.
 * Requires MESHY_API_KEY environment variable on the backend.
 */
export async function submitTextTo3D(
  apiKey: string,
  prompt: string,
  options?: { artStyle?: string; negativePrompt?: string }
): Promise<string> {
  const resp = await fetch(`${MESHY_API_BASE}/text-to-3d`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "preview",
      prompt,
      art_style: options?.artStyle ?? "realistic",
      negative_prompt: options?.negativePrompt ?? "",
    }),
  });
  if (!resp.ok) throw new Error(`Meshy API error: ${resp.status}`);
  const data: MeshyTaskResponse = await resp.json();
  return data.result;
}

/**
 * Poll a Meshy task until completion.
 */
export async function pollMeshyTask(
  apiKey: string,
  taskId: string,
  intervalMs = 5000,
  maxAttempts = 60
): Promise<MeshyTaskStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(`${MESHY_API_BASE}/text-to-3d/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!resp.ok) throw new Error(`Meshy poll error: ${resp.status}`);
    const status: MeshyTaskStatus = await resp.json();
    if (status.status === "SUCCEEDED") return status;
    if (status.status === "FAILED" || status.status === "EXPIRED") {
      throw new Error(`Meshy task ${status.status}`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Meshy polling timeout");
}

/**
 * Get the local path for a model GLB.
 */
export function getModelPath(agentId: string): string {
  return `/models/${agentId}.glb`;
}
