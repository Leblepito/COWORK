"""
COWORK.ARMY v7.0 — Software Department Tools
Dev-specific tools for fullstack, app-builder, prompt-engineer
"""

SOFTWARE_TOOLS = [
    {
        "name": "write_code",
        "description": "Kod yaz (dosya olustur/guncelle)",
        "parameters": {
            "filepath": {"type": "string", "description": "Dosya yolu (workspace icinde)"},
            "content": {"type": "string", "description": "Dosya icerigi"},
            "language": {"type": "string", "description": "Programlama dili (python, typescript, jsx, sql)"},
        },
        "required": ["filepath", "content"],
    },
    {
        "name": "run_tests",
        "description": "Test calistir (unit, integration, e2e)",
        "parameters": {
            "test_type": {"type": "string", "description": "Test tipi (unit, integration, e2e)"},
            "target": {"type": "string", "description": "Test hedefi (dosya/klasor yolu)"},
            "framework": {"type": "string", "description": "Test framework (pytest, vitest, jest)", "default": "pytest"},
        },
        "required": ["test_type"],
    },
    {
        "name": "design_api",
        "description": "REST API endpoint tasarla (OpenAPI spec formatinda)",
        "parameters": {
            "method": {"type": "string", "description": "HTTP method (GET, POST, PUT, DELETE)"},
            "path": {"type": "string", "description": "Endpoint path (/api/...)"},
            "description": {"type": "string", "description": "Endpoint aciklamasi"},
            "request_body": {"type": "object", "description": "Request body sema"},
            "response": {"type": "object", "description": "Response sema"},
        },
        "required": ["method", "path", "description"],
    },
    {
        "name": "create_migration",
        "description": "Database migration olustur",
        "parameters": {
            "description": {"type": "string", "description": "Migration aciklamasi"},
            "operations": {"type": "array", "description": "SQL operasyonlari (create_table, add_column, vb.)", "items": {"type": "string"}},
        },
        "required": ["description", "operations"],
    },
    {
        "name": "optimize_prompt",
        "description": "Agent system prompt optimize et (A/B test, metrik olcum)",
        "parameters": {
            "agent_id": {"type": "string", "description": "Hedef agent ID"},
            "current_prompt": {"type": "string", "description": "Mevcut system prompt"},
            "goal": {"type": "string", "description": "Optimizasyon hedefi"},
            "test_cases": {"type": "array", "description": "Test senaryolari", "items": {"type": "object"}},
        },
        "required": ["agent_id", "goal"],
    },
    {
        "name": "build_app",
        "description": "Uygulama derle ve paketleme (web, mobile, desktop)",
        "parameters": {
            "platform": {"type": "string", "description": "Platform (web, ios, android, windows, macos, linux)"},
            "build_type": {"type": "string", "description": "Build tipi (development, staging, production)"},
            "config": {"type": "object", "description": "Build konfigurasyonu"},
        },
        "required": ["platform", "build_type"],
    },
]

# ── Tool Implementations ──────────────────────────────────────────────────────
import os as _os
from datetime import datetime as _datetime


def _write_code(filepath: str, content: str, language: str = "python", **kwargs) -> dict:
    try:
        workspace = _os.environ.get("WORKSPACE_DIR", "/tmp/cowork_workspace")
        _os.makedirs(workspace, exist_ok=True)
        safe_path = _os.path.join(workspace, _os.path.basename(filepath))
        with open(safe_path, "w") as f:
            f.write(content)
        return {"status": "written", "filepath": safe_path, "language": language,
                "lines": len(content.splitlines()), "bytes": len(content.encode())}
    except Exception as e:
        return {"error": str(e), "filepath": filepath}


def _run_tests(test_type: str, target: str = ".", framework: str = "pytest", **kwargs) -> dict:
    return {"status": "simulated", "test_type": test_type, "target": target,
            "framework": framework, "result": "Tests would run in production environment",
            "timestamp": _datetime.now().isoformat()}


def _design_api(method: str, path: str, description: str, request_body: dict = None,
                response: dict = None, **kwargs) -> dict:
    return {"openapi_spec": {
        "paths": {path: {method.lower(): {
            "summary": description,
            "requestBody": {"content": {"application/json": {"schema": request_body or {}}}},
            "responses": {"200": {"description": "Success",
                                  "content": {"application/json": {"schema": response or {}}}}}
        }}}
    }, "method": method, "path": path, "description": description}


def _create_migration(description: str, operations: list, **kwargs) -> dict:
    ts = _datetime.now().strftime("%Y%m%d_%H%M%S")
    migration_id = f"{ts}_{description.lower().replace(' ', '_')[:30]}"
    sql = "\n".join(f"-- {op}" for op in operations)
    return {"migration_id": migration_id, "description": description,
            "operations_count": len(operations), "sql_preview": sql,
            "status": "generated"}


def _optimize_prompt(agent_id: str, goal: str, current_prompt: str = "",
                     test_cases: list = None, **kwargs) -> dict:
    suggestions = [
        f"Hedef odaklı: '{goal}' için spesifik talimatlar ekleyin",
        "Çıktı formatını açıkça belirtin (JSON, markdown, vb.)",
        "Hata durumlarını ele alın",
        "Örnekler (few-shot) ekleyin",
    ]
    return {"agent_id": agent_id, "goal": goal,
            "original_length": len(current_prompt),
            "suggestions": suggestions,
            "test_cases_count": len(test_cases or []),
            "status": "analyzed"}


def _build_app(platform: str, build_type: str, config: dict = None, **kwargs) -> dict:
    return {"platform": platform, "build_type": build_type, "config": config or {},
            "status": "build_queued",
            "estimated_duration": "3-5 dakika",
            "timestamp": _datetime.now().isoformat()}


SOFTWARE_TOOLS_IMPL = {
    "write_code": _write_code,
    "run_tests": _run_tests,
    "design_api": _design_api,
    "create_migration": _create_migration,
    "optimize_prompt": _optimize_prompt,
    "build_app": _build_app,
}

SOFTWARE_TOOL_DEFINITIONS = SOFTWARE_TOOLS
