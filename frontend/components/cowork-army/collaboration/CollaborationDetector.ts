import {
    DESK_POSITIONS,
    TIER_PRIORITY,
    COLLAB_DURATION_MS,
    COLLAB_MAX_SIMULTANEOUS,
    COLLAB_DETECT_WINDOW_MS,
} from "../scene-constants";
import type { AutonomousEvent } from "@/lib/cowork-api";
import type { CollaborationPair } from "../movement/MovementSystem";

const AGENT_IDS = Object.keys(DESK_POSITIONS);

/**
 * Analyze events to detect collaboration between agents.
 * Returns updated list of active collaborations.
 */
export function detectCollaborations(
    events: AutonomousEvent[],
    existing: CollaborationPair[],
    agentTiers: Record<string, string>, // agentId → tier string
    now: number,
): CollaborationPair[] {
    // Remove expired
    const active = existing.filter((c) => c.expiresAt > now);

    // Only look at recent events
    const recent = events.filter((ev) => {
        const age = now - new Date(ev.timestamp).getTime();
        return age >= 0 && age < COLLAB_DETECT_WINDOW_MS;
    });

    const newCollabs: CollaborationPair[] = [];

    for (const ev of recent) {
        // Check if event mentions another agent by ID
        const mentioned = AGENT_IDS.filter(
            (id) => id !== ev.agent_id && ev.message.toLowerCase().includes(id),
        );

        for (const targetId of mentioned) {
            // Skip if collab already exists between these two
            const exists = active.some(
                (c) =>
                    (c.agentA === ev.agent_id && c.agentB === targetId) ||
                    (c.agentA === targetId && c.agentB === ev.agent_id),
            );
            if (exists) continue;

            // Also skip if already in newCollabs
            const inNew = newCollabs.some(
                (c) =>
                    (c.agentA === ev.agent_id && c.agentB === targetId) ||
                    (c.agentA === targetId && c.agentB === ev.agent_id),
            );
            if (inNew) continue;

            // Determine who stays (higher tier) and who walks (lower tier)
            const sourcePri = TIER_PRIORITY[agentTiers[ev.agent_id] ?? "WORKER"] ?? 0;
            const targetPri = TIER_PRIORITY[agentTiers[targetId] ?? "WORKER"] ?? 0;

            const [stayer, walker] =
                sourcePri >= targetPri ? [ev.agent_id, targetId] : [targetId, ev.agent_id];

            newCollabs.push({
                agentA: stayer,
                agentB: walker,
                message: ev.message,
                startedAt: now,
                expiresAt: now + COLLAB_DURATION_MS,
                type: inferCollabType(ev),
            });
        }
    }

    const result = [...active, ...newCollabs];
    return result.slice(0, COLLAB_MAX_SIMULTANEOUS);
}

function inferCollabType(ev: AutonomousEvent): CollaborationPair["type"] {
    const msg = ev.message.toLowerCase();
    if (msg.includes("delegat") || msg.includes("assign") || msg.includes("route"))
        return "delegation";
    if (msg.includes("data") || msg.includes("send") || msg.includes("fetch"))
        return "data_exchange";
    if (msg.includes("review") || msg.includes("check") || msg.includes("verify"))
        return "review";
    return "generic";
}
