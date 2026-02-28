# Test Coverage Analysis — COWORK.ARMY

**Date:** 2026-02-28
**Status:** Zero test coverage across the entire codebase

## Current State

| Area | Test Files | Framework Configured | Coverage |
|------|-----------|---------------------|----------|
| Backend (`cowork-army/`) | 0 | No | 0% |
| Frontend (`frontend/`) | 0 | No | 0% |
| API Client (`lib/cowork-api.ts`) | 0 | No | 0% |

The only trace of test infrastructure is an optional `pytest` dependency in `cowork-api/pyproject.toml`, but no actual test files exist.

---

## Recommended Test Plan (Priority-Ordered)

### 1. CRITICAL: `tools.py` — Security Sandbox Tests

**Risk:** Path traversal, command injection, resource exhaustion

This module is the security boundary between AI agents and the filesystem. A bug here could allow agents to escape their workspace or execute dangerous commands.

**Tests needed:**
- Path escaping attacks: `../../../etc/passwd`, symlinks outside workspace, absolute paths
- Command injection: Verify blocked patterns (`rm -rf /`, `sudo`, `mkfs`, `dd`)
- Resource limits: Files >50KB, command output >10KB, commands exceeding 30s timeout
- Unicode handling: Non-UTF-8 files, Turkish characters in paths
- Concurrent file writes: Race conditions with simultaneous `write_file` calls

### 2. HIGH: `database.py` — Data Integrity Tests

**Risk:** Data corruption, race conditions, lost updates

**Tests needed:**
- CRUD operations for agents, tasks, events
- Thread safety: Concurrent writes from multiple threads
- Base agent protection: Base agents cannot be deleted
- JSON roundtrip: Arrays (skills, rules, triggers) survive store → retrieve
- Event pruning: Old events cleaned when exceeding 2000 entries
- Edge cases: Empty strings, very long system prompts, special characters

### 3. HIGH: `runner.py` — Agent Lifecycle Tests

**Risk:** Orphaned processes, memory leaks, state inconsistency

**Tests needed:**
- Spawn/kill lifecycle: idle → running → done/error state transitions
- Concurrent spawns: Multiple agents without interference
- Kill during execution: Cancel event, task cleanup, return to idle
- Output buffer: Ring buffer (500 lines max) doesn't grow unbounded
- Missing API key: Early exit with proper error event
- API error handling: Rate limits, network failures → status = "error"
- Mock Claude API: Test execution loop without real API calls

### 4. HIGH: `server.py` — API Endpoint Tests

**Risk:** Broken API contracts, missing validation

**Tests needed:**
- Agent CRUD: Create with valid/invalid data, update partial fields, delete base vs. dynamic
- Spawn/kill routes: Correct status codes, error messages
- Commander delegation: Correct routing, auto-spawn
- Autonomous loop: Start/stop idempotency, event feed pagination
- API key management: Save, mask on retrieval, propagate to runner
- Input validation: Missing fields, malformed JSON, oversized payloads

### 5. MEDIUM: `commander.py` — Task Routing Tests

**Risk:** Tasks routed to wrong agent, duplicate dynamic agents

**Tests needed:**
- Keyword matching: Triggers correctly match relevant task text
- Fallback behavior: Unknown tasks route to `web-dev`
- Turkish character handling: Accents in slugify and keyword extraction
- Stop word filtering: Common words excluded
- Dynamic agent creation: Unique IDs, collision resolution with suffix
- Deterministic hashing: Same task → same icon/color

### 6. MEDIUM: `autonomous.py` — Autonomous Loop Tests

**Risk:** Stuck loop, missed tasks, double-spawns

**Tests needed:**
- Start/stop idempotency: Double-start doesn't create two loops
- Tick execution: Pending tasks get auto-spawned
- Agent filtering: Only idle agents get new tasks
- Error resilience: Failed tick doesn't crash the loop
- Event generation: Correct types at correct intervals

### 7. MEDIUM: Frontend `cowork-api.ts` — API Client Tests

**Risk:** Type mismatches, silent failures

**Tests needed:**
- Response type mapping for all 18 endpoint functions
- FormData serialization: Arrays correctly serialized as JSON strings
- Error propagation: HTTP errors throw with meaningful messages
- Base URL resolution: Env variable vs. fallback

### 8. MEDIUM: Frontend Components — Unit Tests

**Priority components:**
- `MovementSystem`: Pathfinding math, collision detection, phase state machine
- `CollaborationDetector`: Event parsing, agent mention detection, tier priority
- `character-registry`: Hash-based procedural generation determinism
- `scene-constants`: Helper functions (`calculateDynamicDeskPosition`, `buildAllDeskPositions`)
- Page modals: Form validation, state reset on close, async operations

### 9. LOW: `registry.py` — Data Definition Tests

**Tests needed:**
- All 12 base agents have required fields
- No duplicate agent IDs or trigger keywords
- Workspace directories reference valid paths
- `get_base_agents_as_dicts()` output is JSON-serializable

---

## Recommended Testing Stack

| Layer | Framework | Why |
|-------|-----------|-----|
| Backend unit/integration | `pytest` + `pytest-asyncio` | Async support for runner/autonomous |
| Backend API | `httpx` + `pytest` (TestClient) | Test FastAPI endpoints directly |
| Frontend unit | `vitest` + `@testing-library/react` | Fast, Vite-native, good React support |
| Frontend 3D logic | `vitest` (logic only) | Test math/pathfinding; mock Three.js |
| E2E | `Playwright` | Cross-browser, Next.js integration |

## Implementation Phases

1. **Phase 1 — Security & Data** (`tools.py` + `database.py`): Protect system boundaries
2. **Phase 2 — API Contracts** (`server.py` endpoints): Prevent API regressions
3. **Phase 3 — Core Logic** (`runner.py` + `commander.py` + `autonomous.py`): Business logic correctness
4. **Phase 4 — Frontend Logic** (API client + movement/collaboration): Deterministic frontend logic
5. **Phase 5 — UI Integration** (modals, polling, 3D scene): Component-level tests
