/**
 * Tests for lib/cowork-api.ts — Frontend API Client (v7)
 * Fetch mocking, FormData serialization, error handling, LLM provider settings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally before importing the module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Now import the module under test
import {
    getCoworkAgents,
    getCoworkAgent,
    spawnAgent,
    killAgent,
    getAgentStatuses,
    getAgentOutput,
    createAgent,
    deleteAgent,
    getCoworkTasks,
    createCoworkTask,
    updateCoworkTaskStatus,
    startAutonomousLoop,
    stopAutonomousLoop,
    getAutonomousStatus,
    getAutonomousEvents,
    commanderDelegate,
    getServerInfo,
    getApiKeyStatus,
    saveApiKey,
    getLlmProvider,
    setLlmProvider,
} from "@/lib/cowork-api";

// ── Helpers ─────────────────────────────────────────────

function mockJsonResponse(data: unknown, status = 200) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(data),
        text: () => Promise.resolve(JSON.stringify(data)),
    };
}

beforeEach(() => {
    mockFetch.mockReset();
});

// ═══════════════════════════════════════════════════════════
//  AGENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

describe("Agent Endpoints", () => {
    it("getCoworkAgents fetches /agents", async () => {
        const agents = [{ id: "cargo", name: "Cargo Hub" }];
        mockFetch.mockResolvedValue(mockJsonResponse(agents));

        const result = await getCoworkAgents();
        expect(result).toEqual(agents);
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/agents",
            expect.objectContaining({ headers: { "Content-Type": "application/json" } })
        );
    });

    it("getCoworkAgent fetches single agent", async () => {
        const agent = { id: "full-stack", name: "Full-Stack Dev" };
        mockFetch.mockResolvedValue(mockJsonResponse(agent));

        const result = await getCoworkAgent("full-stack");
        expect(result).toEqual(agent);
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/agents/full-stack",
            expect.anything()
        );
    });

    it("spawnAgent sends POST with task", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ status: "thinking" }));

        await spawnAgent("full-stack", "build frontend");
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/agents/full-stack/spawn?task=build%20frontend",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("spawnAgent works without task", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ status: "thinking" }));

        await spawnAgent("full-stack");
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/agents/full-stack/spawn",
            expect.objectContaining({ method: "POST" })
        );
    });

    it("killAgent sends POST", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ status: "killed" }));

        const result = await killAgent("full-stack");
        expect(result.status).toBe("killed");
    });

    it("getAgentStatuses returns dict", async () => {
        const statuses = { cargo: { status: "idle" } };
        mockFetch.mockResolvedValue(mockJsonResponse(statuses));

        const result = await getAgentStatuses();
        expect(result).toEqual(statuses);
    });

    it("getAgentOutput returns lines", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ lines: ["line 1"] }));

        const result = await getAgentOutput("full-stack");
        expect(result.lines).toEqual(["line 1"]);
    });
});

// ═══════════════════════════════════════════════════════════
//  AGENT CRUD
// ═══════════════════════════════════════════════════════════

describe("Agent CRUD", () => {
    it("createAgent sends FormData with correct fields", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ id: "new-agent" }));

        await createAgent({
            name: "Test Agent",
            icon: "🤖",
            tier: "WORKER",
            color: "#ff0000",
            domain: "Test",
            desc: "Description",
            skills: ["skill1", "skill2"],
            rules: ["rule1"],
            workspace_dir: ".",
            triggers: ["trigger1"],
            system_prompt: "You are test.",
        });

        const [url, options] = mockFetch.mock.calls[0];
        expect(url).toBe("/api/agents");
        expect(options.method).toBe("POST");
        expect(options.body).toBeInstanceOf(FormData);

        const fd = options.body as FormData;
        expect(fd.get("name")).toBe("Test Agent");
        expect(fd.get("skills")).toBe(JSON.stringify(["skill1", "skill2"]));
        expect(fd.get("triggers")).toBe(JSON.stringify(["trigger1"]));
    });

    it("createAgent includes optional id", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ id: "my-id" }));

        await createAgent({
            id: "my-id",
            name: "Agent",
            icon: "🤖",
            tier: "WORKER",
            color: "#fff",
            domain: "",
            desc: "",
            skills: [],
            rules: [],
            workspace_dir: ".",
            triggers: [],
            system_prompt: "",
        });

        const fd = mockFetch.mock.calls[0][1].body as FormData;
        expect(fd.get("id")).toBe("my-id");
    });

    it("deleteAgent sends DELETE", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ status: "deleted" }));

        const result = await deleteAgent("some-agent");
        expect(result.status).toBe("deleted");
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/agents/some-agent",
            expect.objectContaining({ method: "DELETE" })
        );
    });
});

// ═══════════════════════════════════════════════════════════
//  ERROR HANDLING
// ═══════════════════════════════════════════════════════════

describe("Error Handling", () => {
    it("throws on non-ok response (coworkFetch)", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ error: "Not found" }, 404));

        await expect(getCoworkAgents()).rejects.toThrow("Cowork API error 404");
    });

    it("throws on createAgent error", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 500,
            text: () => Promise.resolve("Internal error"),
        });

        await expect(
            createAgent({
                name: "Bad",
                icon: "",
                tier: "",
                color: "",
                domain: "",
                desc: "",
                skills: [],
                rules: [],
                workspace_dir: "",
                triggers: [],
                system_prompt: "",
            })
        ).rejects.toThrow("API error 500");
    });

    it("throws on deleteAgent error with message", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 403,
            text: () => Promise.resolve("Base agents cannot be deleted"),
        });

        await expect(deleteAgent("cargo")).rejects.toThrow("API error 403");
    });
});

// ═══════════════════════════════════════════════════════════
//  TASK ENDPOINTS
// ═══════════════════════════════════════════════════════════

describe("Task Endpoints", () => {
    it("getCoworkTasks fetches tasks", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse([{ id: "task-1" }]));
        const result = await getCoworkTasks();
        expect(result).toHaveLength(1);
    });

    it("createCoworkTask sends FormData", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ id: "task-new" }));

        await createCoworkTask("Test", "Desc", "full-stack", "high");
        const fd = mockFetch.mock.calls[0][1].body as FormData;
        expect(fd.get("title")).toBe("Test");
        expect(fd.get("assigned_to")).toBe("full-stack");
        expect(fd.get("priority")).toBe("high");
    });

    it("updateCoworkTaskStatus sends status and log", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ status: "done" }));

        await updateCoworkTaskStatus("task-1", "done", "Completed!");
        const fd = mockFetch.mock.calls[0][1].body as FormData;
        expect(fd.get("status")).toBe("done");
        expect(fd.get("log_message")).toBe("Completed!");
    });
});

// ═══════════════════════════════════════════════════════════
//  AUTONOMOUS & COMMANDER
// ═══════════════════════════════════════════════════════════

describe("Autonomous Loop", () => {
    it("startAutonomousLoop sends POST", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ status: "started" }));
        const result = await startAutonomousLoop();
        expect(result.status).toBe("started");
    });

    it("stopAutonomousLoop sends POST", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse({ status: "stopped" }));
        const result = await stopAutonomousLoop();
        expect(result.status).toBe("stopped");
    });

    it("getAutonomousStatus returns status", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({ running: true, tick_count: 5 })
        );
        const result = await getAutonomousStatus();
        expect(result.running).toBe(true);
    });

    it("getAutonomousEvents passes limit and since", async () => {
        mockFetch.mockResolvedValue(mockJsonResponse([]));
        await getAutonomousEvents(10, "2024-01-01");
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/autonomous/events?limit=10&since=2024-01-01",
            expect.anything()
        );
    });
});

describe("Commander Delegation", () => {
    it("commanderDelegate sends FormData", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({ routed_to: "med-health", spawned: false })
        );

        const result = await commanderDelegate("Hasta randevusu", "Klinik", "high", false);
        expect(result.routed_to).toBe("med-health");

        const fd = mockFetch.mock.calls[0][1].body as FormData;
        expect(fd.get("title")).toBe("Hasta randevusu");
        expect(fd.get("auto_spawn")).toBe("false");
    });
});

// ═══════════════════════════════════════════════════════════
//  SERVER INFO & SETTINGS (v7 — multi-LLM)
// ═══════════════════════════════════════════════════════════

describe("Server Info & Settings", () => {
    it("getServerInfo returns server data", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({ name: "COWORK.ARMY", version: "7.0" })
        );
        const result = await getServerInfo();
        expect(result.name).toBe("COWORK.ARMY");
    });

    it("getApiKeyStatus returns key status with provider info", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({
                set: true,
                preview: "sk-ant-a...",
                active_provider: "anthropic",
                anthropic: { set: true, preview: "sk-ant-a..." },
                gemini: { set: false, preview: "" },
            })
        );
        const result = await getApiKeyStatus();
        expect(result.set).toBe(true);
        expect(result.active_provider).toBe("anthropic");
        expect(result.anthropic.set).toBe(true);
        expect(result.gemini.set).toBe(false);
    });

    it("saveApiKey sends key and provider via FormData", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({ status: "saved", provider: "anthropic", preview: "sk-ant-a..." })
        );
        await saveApiKey("sk-ant-api03-test-key", "anthropic");
        const fd = mockFetch.mock.calls[0][1].body as FormData;
        expect(fd.get("key")).toBe("sk-ant-api03-test-key");
        expect(fd.get("provider")).toBe("anthropic");
    });

    it("saveApiKey defaults provider to anthropic", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({ status: "saved", provider: "anthropic", preview: "sk-..." })
        );
        await saveApiKey("sk-ant-api03-test-key");
        const fd = mockFetch.mock.calls[0][1].body as FormData;
        expect(fd.get("key")).toBe("sk-ant-api03-test-key");
        expect(fd.get("provider")).toBe("anthropic");
    });

    it("getLlmProvider fetches current provider", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({ provider: "anthropic" })
        );
        const result = await getLlmProvider();
        expect(result.provider).toBe("anthropic");
        expect(mockFetch).toHaveBeenCalledWith(
            "/api/settings/llm-provider",
            expect.objectContaining({ headers: { "Content-Type": "application/json" } })
        );
    });

    it("setLlmProvider sends provider via FormData", async () => {
        mockFetch.mockResolvedValue(
            mockJsonResponse({ status: "ok", provider: "gemini" })
        );
        const result = await setLlmProvider("gemini");
        expect(result.provider).toBe("gemini");
        const fd = mockFetch.mock.calls[0][1].body as FormData;
        expect(fd.get("provider")).toBe("gemini");
    });
});
