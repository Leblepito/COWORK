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
