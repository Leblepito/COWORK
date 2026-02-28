/**
 * Tests for CollaborationDetector.ts — Event-based Agent Collaboration
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
    commander: "COMMANDER",
    supervisor: "SUPERVISOR",
    "med-health": "DIRECTOR",
    "travel-agent": "DIRECTOR",
    "trade-engine": "DIRECTOR",
    "alpha-scout": "WORKER",
    "tech-analyst": "WORKER",
    "risk-sentinel": "WORKER",
    "quant-lab": "WORKER",
    "growth-ops": "WORKER",
    "web-dev": "WORKER",
    finance: "WORKER",
};

// ═══════════════════════════════════════════════════════════
//  COLLABORATION DETECTION
// ═══════════════════════════════════════════════════════════

describe("detectCollaborations", () => {
    const now = Date.now();

    it("detects collaboration when agent mentions another", () => {
        const events = [
            makeEvent("commander", "Görev web-dev agent'ına delegated", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(1);
        expect(result[0].agentA).toBe("commander"); // Higher tier stays
        expect(result[0].agentB).toBe("web-dev");   // Lower tier walks
    });

    it("returns empty if no mentions", () => {
        const events = [
            makeEvent("commander", "Genel durum raporu", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(0);
    });

    it("ignores old events beyond detect window", () => {
        const events = [
            makeEvent("commander", "web-dev agent task", 10000, now), // 10s ago, > 5s window
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(0);
    });

    it("tier priority: higher tier agent stays", () => {
        const events = [
            makeEvent("web-dev", "commander ile koordinasyon", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(1);
        expect(result[0].agentA).toBe("commander"); // COMMANDER stays
        expect(result[0].agentB).toBe("web-dev");   // WORKER walks
    });

    it("same tier: source stays, target walks", () => {
        const events = [
            makeEvent("web-dev", "finance agent ile çalış", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result).toHaveLength(1);
        // Both WORKER, so source (web-dev) stays since sourcePri >= targetPri
        expect(result[0].agentA).toBe("web-dev");
        expect(result[0].agentB).toBe("finance");
    });

    it("does not duplicate existing collaborations", () => {
        const existing: CollaborationPair[] = [
            {
                agentA: "commander",
                agentB: "web-dev",
                message: "old collab",
                startedAt: now - 2000,
                expiresAt: now + 13000,
                type: "delegation",
            },
        ];
        const events = [
            makeEvent("commander", "web-dev ile devam", 1000, now),
        ];
        const result = detectCollaborations(events, existing, DEFAULT_TIERS, now);
        // Should still have only 1 (the existing one)
        expect(result).toHaveLength(1);
    });

    it("removes expired collaborations", () => {
        const existing: CollaborationPair[] = [
            {
                agentA: "commander",
                agentB: "web-dev",
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
            makeEvent("commander", "web-dev task assigned", 1000, now),
            makeEvent("commander", "finance rapor iste", 1500, now),
            makeEvent("commander", "growth-ops kampanya başlat", 2000, now),
            makeEvent("commander", "tech-analyst analiz yap", 2500, now),
            makeEvent("commander", "risk-sentinel kontrol et", 3000, now),
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
            makeEvent("commander", "web-dev agent delegate task", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("delegation");
    });

    it("detects data_exchange type", () => {
        const events = [
            makeEvent("commander", "web-dev send data report", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("data_exchange");
    });

    it("detects review type", () => {
        const events = [
            makeEvent("supervisor", "web-dev review output check", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("review");
    });

    it("defaults to generic type", () => {
        const events = [
            makeEvent("commander", "web-dev ile görüşme", 1000, now),
        ];
        const result = detectCollaborations(events, [], DEFAULT_TIERS, now);
        expect(result[0].type).toBe("generic");
    });
});
