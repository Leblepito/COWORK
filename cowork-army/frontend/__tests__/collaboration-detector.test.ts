/**
 * Tests for CollaborationDetector.ts — Event-based Agent Collaboration (v7)
 * Collaboration detection, tier priority, expiration.
 */
import { describe, it, expect } from "vitest";

import { detectCollaborations } from "@/components/cowork-army/collaboration/CollaborationDetector";
import type { AutonomousEvent } from "@/lib/cowork-api";
import type { CollaborationPair } from "@/components/cowork-army/movement/MovementSystem";

// ── Helpers ─────────────────────────────────────────────

function makeEvent(
    agent_id: string,
    message: string,
    ageMs: number,
    now: number,
): AutonomousEvent {
    return {
        timestamp: new Date(now - ageMs).toISOString(),
        agent_id,
        message,
        type: "info",
    };
}

const DEFAULT_TIERS: Record<string, string> = {
    cargo: "SUPERVISOR",
    "trade-master": "DIRECTOR",
    "chart-eye": "WORKER",
    "risk-guard": "WORKER",
    "quant-brain": "WORKER",
    "clinic-director": "DIRECTOR",
    "patient-care": "WORKER",
    "hotel-manager": "DIRECTOR",
    "travel-planner": "WORKER",
    concierge: "WORKER",
    "tech-lead": "DIRECTOR",
    "full-stack": "WORKER",
    "data-ops": "WORKER",
};

// ═══════════════════════════════════════════════════════════
//  COLLABORATION DETECTION
// ═══════════════════════════════════════════════════════════

describe("detectCollaborations", () => {
    const now = Date.now();

    it("detects collaboration when agent mentions another", () => {
        const events = [
            makeEvent("trade-master", "Görev full-stack agent'ına delegated", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(1);
        expect(result[0].agentA).toBe("trade-master"); // Higher tier stays
        expect(result[0].agentB).toBe("full-stack");    // Lower tier walks
    });

    it("returns empty if no mentions", () => {
        const events = [
            makeEvent("trade-master", "Genel durum raporu", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(0);
    });

    it("ignores old events beyond detect window", () => {
        const events = [
            makeEvent("trade-master", "full-stack agent task", 10000, now), // 10s ago, > 5s window
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(0);
    });

    it("tier priority: higher tier agent stays", () => {
        const events = [
            makeEvent("full-stack", "trade-master ile koordinasyon", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(1);
        expect(result[0].agentA).toBe("trade-master"); // DIRECTOR stays
        expect(result[0].agentB).toBe("full-stack");    // WORKER walks
    });

    it("same tier: source stays, target walks", () => {
        const events = [
            makeEvent("full-stack", "data-ops agent ile çalış", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(1);
        // Both WORKER, so source (full-stack) stays since sourcePri >= targetPri
        expect(result[0].agentA).toBe("full-stack");
        expect(result[0].agentB).toBe("data-ops");
    });

    it("does not duplicate existing collaborations", () => {
        const existing: CollaborationPair[] = [
            {
                agentA: "trade-master",
                agentB: "full-stack",
                message: "old collab",
                startedAt: now - 2000,
                expiresAt: now + 13000,
                type: "delegation",
            },
        ];
        const events = [
            makeEvent("trade-master", "full-stack ile devam", 1000, now),
        ];
        const result = detectCollaborations(events, existing, DEFAULT_TIERS, now);
        expect(result).toHaveLength(1);
    });

    it("removes expired collaborations", () => {
        const existing: CollaborationPair[] = [
            {
                agentA: "trade-master",
                agentB: "full-stack",
                message: "expired",
                startedAt: now - 20000,
                expiresAt: now - 1000, // Already expired
                type: "delegation",
            },
        ];
        const result = detectCollaborations([], existing, DEFAULT_TIERS, now);
        expect(result).toHaveLength(0);
    });

    it("limits to max 4 simultaneous collaborations", () => {
        const events = [
            makeEvent("trade-master", "full-stack task assigned", 1000, now),
            makeEvent("trade-master", "data-ops rapor iste", 1500, now),
            makeEvent("trade-master", "chart-eye analiz yap", 2000, now),
            makeEvent("trade-master", "risk-guard kontrol et", 2500, now),
            makeEvent("trade-master", "quant-brain hesapla", 3000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result.length).toBeLessThanOrEqual(4);
    });
});

// ═══════════════════════════════════════════════════════════
//  COLLABORATION TYPE INFERENCE
// ═══════════════════════════════════════════════════════════

describe("Collaboration Type Inference", () => {
    const now = Date.now();

    it("detects delegation type", () => {
        const events = [
            makeEvent("trade-master", "full-stack agent delegate task", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("delegation");
    });

    it("detects data_exchange type", () => {
        const events = [
            makeEvent("trade-master", "full-stack send data report", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("data_exchange");
    });

    it("detects review type", () => {
        const events = [
            makeEvent("cargo", "full-stack review output check", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("review");
    });

    it("defaults to generic type", () => {
        const events = [
            makeEvent("trade-master", "full-stack ile görüşme", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("generic");
    });
});
