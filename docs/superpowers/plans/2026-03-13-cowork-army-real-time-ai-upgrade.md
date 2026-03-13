# COWORK.ARMY Real-Time AI Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** To transform COWORK.ARMY into a fully functional, reliable, and intelligent AI agent orchestration platform that executes real tasks.

**Architecture:** Refactor the core agent runner to use a tool-calling architecture, add a dynamic manager assignment system, and establish a robust testing foundation.

**Tech Stack:** FastAPI, Next.js, PostgreSQL, Docker, Anthropic Claude 3, Google Gemini, pytest, jest, ccxt.

---
## Chunk 1: Foundational Setup & Testing

### Task 1: Setup Backend Testing with `pytest`

**Files:**
- Modify: `COWORK/backend/pyproject.toml`
- Create: `COWORK/backend/tests/test_sanity.py`

- [ ] **Step 1: Add `pytest` and `pytest-asyncio` to dev dependencies**
```toml
# In COWORK/backend/pyproject.toml, under [project.optional-dependencies]
dev = ["pytest>=8.0.0", "pytest-asyncio>=0.24.0", "httpx>=0.28.0"]
```

- [ ] **Step 2: Install the new dependencies**
Run: `cd /home/ubuntu/COWORK/backend && python3.11 -m venv .venv && source .venv/bin/activate && pip3 install -e '.[dev]'`
Expected: Successful installation of pytest and its dependencies.

- [ ] **Step 3: Write a basic sanity check test**
```python
# In COWORK/backend/tests/test_sanity.py
import pytest

def test_addition():
    assert 1 + 1 == 2

@pytest.mark.asyncio
async def test_async_sanity():
    import asyncio
    await asyncio.sleep(0.01)
    assert True
```

- [ ] **Step 4: Run `pytest` to verify the setup**
Run: `cd /home/ubuntu/COWORK/backend && source .venv/bin/activate && pytest`
Expected: PASS, showing 2 tests passed.

- [ ] **Step 5: Commit the test setup**
```bash
git add pyproject.toml tests/test_sanity.py
git commit -m "build: setup pytest for backend testing"
```

### Task 2: Add New Project Dependencies

**Files:**
- Modify: `COWORK/backend/pyproject.toml`

- [ ] **Step 1: Add `ccxt`, `google-generativeai`, and `anthropic` to dependencies**
```toml
# In COWORK/backend/pyproject.toml, under [project]
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.6.0",
    "asyncpg>=0.30.0",
    "sqlalchemy[asyncio]>=2.0.0",
    "alembic>=1.13.0",
    "passlib[bcrypt]>=1.7.4",
    "python-jose[cryptography]>=3.3.0",
    "python-multipart>=0.0.9",
    "stripe>=10.0.0",
    "httpx>=0.28.0",
    "apscheduler>=3.10.0",
    "redis>=5.0.0",
    "emails>=0.6",
    "anthropic>=0.25.0",
    "google-generativeai>=0.5.0",
    "ccxt>=4.3.0"
]
```

- [ ] **Step 2: Install the new dependencies**
Run: `cd /home/ubuntu/COWORK/backend && source .venv/bin/activate && pip3 install -e '.'`
Expected: Successful installation of the new libraries.

- [ ] **Step 3: Commit the dependency updates**
```bash
git add pyproject.toml
git commit -m "feat: add anthropic, gemini, and ccxt libraries"
```
## Chunk 2: Agent Brain Transplant - The Tool-Calling Runner

### Task 3: Create the Multi-LLM Provider Layer

**Files:**
- Create: `COWORK/backend/agents/llm_providers.py`
- Create: `COWORK/backend/tests/test_llm_providers.py`

- [ ] **Step 1: Create the `llm_providers.py` file**
```python
# In COWORK/backend/agents/llm_providers.py
"""Multi-LLM Provider Abstraction for Tool Calling."""
import os
import json
import google.generativeai as genai
from anthropic import Anthropic

class LLMProvider:
    def __init__(self, provider, api_key, model):
        self.provider = provider
        self.api_key = api_key
        self.model = model
        if provider == 'gemini':
            genai.configure(api_key=api_key)
            self.client = genai.GenerativeModel(model)
        else: # anthropic
            self.client = Anthropic(api_key=api_key)

    def get_response(self, system_prompt, messages, tools):
        if self.provider == 'gemini':
            # Gemini specific tool-calling logic here
            pass
        else:
            # Anthropic specific tool-calling logic here
            response = self.client.messages.create(
                model=self.model,
                system=system_prompt,
                messages=messages,
                tools=tools,
                tool_choice={"type": "auto"}
            )
            return response

def get_llm_provider():
    provider = os.environ.get("LLM_PROVIDER", "anthropic")
    api_key = ""
    model = ""
    if provider == 'gemini':
        api_key = os.environ.get("GEMINI_API_KEY", "")
        model = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash")
    else:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        model = os.environ.get("ANTHROPIC_MODEL", "claude-3-haiku-20240307")
    return LLMProvider(provider, api_key, model)
```

- [ ] **Step 2: Write a test for the provider factory**
```python
# In COWORK/backend/tests/test_llm_providers.py
import os
from unittest.mock import patch
from ..agents.llm_providers import get_llm_provider

@patch.dict(os.environ, {"LLM_PROVIDER": "anthropic", "ANTHROPIC_API_KEY": "test_key"})
def test_get_anthropic_provider():
    provider = get_llm_provider()
    assert provider.provider == "anthropic"
    assert provider.api_key == "test_key"

@patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "test_key_gemini"})
def test_get_gemini_provider():
    provider = get_llm_provider()
    assert provider.provider == "gemini"
    assert provider.api_key == "test_key_gemini"
```

- [ ] **Step 3: Run the new test**
Run: `cd /home/ubuntu/COWORK/backend && source .venv/bin/activate && pytest tests/test_llm_providers.py`
Expected: PASS, showing 2 tests passed.

- [ ] **Step 4: Commit the provider layer**
```bash
git add agents/llm_providers.py tests/test_llm_providers.py
git commit -m "feat: create multi-llm provider layer for tool calling"
```

### Task 4: Refactor the Agent Runner for Tool Calling

**Files:**
- Modify: `COWORK/backend/agents/runner.py`
- Create: `COWORK/backend/tests/test_runner.py`

- [ ] **Step 1: Rewrite `runner.py` to use a tool-calling loop**
```python
# In COWORK/backend/agents/runner.py
# (This is a conceptual rewrite, the actual code will be more detailed)
import json
from .llm_providers import get_llm_provider
from . import tools

MAX_TOOL_ROUNDS = 10

def _execute_tool(tool_name, tool_input):
    # ... (logic to call functions from tools.py) ...
    if hasattr(tools, tool_name):
        func = getattr(tools, tool_name)
        # Note: This is simplified. Real implementation needs to handle agent_id etc.
        return func(**tool_input)
    else:
        return {"error": f"Unknown tool: {tool_name}"}

def _run(proc, task):
    # ... (setup code) ...
    llm = get_llm_provider()
    messages = [{"role": "user", "content": task}]
    
    for _ in range(MAX_TOOL_ROUNDS):
        response = llm.get_response(system_prompt, messages, tools.TOOL_DEFINITIONS)

        if response.stop_reason == "tool_use":
            tool_results = []
            for tool_call in response.content:
                if tool_call.type == 'tool_use':
                    tool_name = tool_call.name
                    tool_input = tool_call.input
                    proc.log(f"Tool Call: {tool_name} with input {tool_input}")
                    result = _execute_tool(tool_name, tool_input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_call.id,
                        "content": json.dumps(result)
                    })
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            final_answer = response.content[0].text
            proc.log(f"Final Answer: {final_answer}")
            # ... (save output) ...
            break
    # ... (cleanup) ...
```

- [ ] **Step 2: Write a test for the new tool-calling runner**
```python
# In COWORK/backend/tests/test_runner.py
from unittest.mock import MagicMock, patch
from ..agents import runner

@patch('..agents.runner.get_llm_provider')
@patch('..agents.runner._execute_tool')
def test_runner_tool_call_loop(mock_execute_tool, mock_get_provider):
    # Mock LLM responses
    mock_llm = MagicMock()
    mock_response_tool = MagicMock()
    mock_response_tool.stop_reason = 'tool_use'
    mock_tool_call = MagicMock()
    mock_tool_call.type = 'tool_use'
    mock_tool_call.name = 'read_file'
    mock_tool_call.input = {'path': 'test.txt'}
    mock_tool_call.id = 'tool_123'
    mock_response_tool.content = [mock_tool_call]

    mock_response_final = MagicMock()
    mock_response_final.stop_reason = 'end_turn'
    mock_final_text = MagicMock()
    mock_final_text.text = 'Final answer'
    mock_response_final.content = [mock_final_text]

    mock_llm.get_response.side_effect = [mock_response_tool, mock_response_final]
    mock_get_provider.return_value = mock_llm

    # Mock tool execution
    mock_execute_tool.return_value = {"content": "file content"}

    # Run the process
    mock_proc = MagicMock()
    runner._run(mock_proc, "test task")

    # Assertions
    assert mock_llm.get_response.call_count == 2
    mock_execute_tool.assert_called_once_with('read_file', {'path': 'test.txt'})
    mock_proc.log.assert_any_call("Tool Call: read_file with input {'path': 'test.txt'}")
    mock_proc.log.assert_any_call('Final Answer: Final answer')
```

- [ ] **Step 3: Run the new runner test**
Run: `cd /home/ubuntu/COWORK/backend && source .venv/bin/activate && pytest tests/test_runner.py`
Expected: PASS, showing 1 test passed.

- [ ] **Step 4: Commit the new runner**
```bash
git add agents/runner.py tests/test_runner.py
git commit -m "refactor(runner): implement tool-calling loop"
```

## Chunk 3: Dynamic Manager System

### Task 5: Enhance the Commander for Dynamic Routing

**Files:**
- Modify: `COWORK/backend/agents/commander.py`
- Create: `COWORK/backend/services/dynamic_agent_service.py`
- Create: `COWORK/backend/tests/test_commander.py`

- [ ] **Step 1: Create a `DynamicAgentService` to handle agent creation**
```python
# In COWORK/backend/services/dynamic_agent_service.py
from ..database import get_db
from ..agents.llm_providers import get_llm_provider
import json

class DynamicAgentService:
    def __init__(self):
        self.db = get_db()
        self.llm = get_llm_provider()

    async def create_manager_for_project(self, project_description: str) -> dict:
        prompt = f'Given the project "{project_description}", define a new Director Agent. Provide a unique ID (e.g., project-name-manager), a name, a list of required skills, and a list of rules. Respond in JSON format: {{"id": "...", "name": "...", "skills": [...], "rules": [...]}}'
        
        response = self.llm.get_response("You are a system architect.", [{"role": "user", "content": prompt}], [])
        
        try:
            agent_def = json.loads(response.content[0].text)
            # TODO: Save this new agent to the database
            # new_agent = await self.db.create_agent(...)
            return agent_def
        except (json.JSONDecodeError, KeyError):
            return {"error": "Failed to generate a valid agent definition."}
```

- [ ] **Step 2: Update `commander.py` to use the new service**
```python
# In COWORK/backend/agents/commander.py
# ... (imports)
from ..services.dynamic_agent_service import DynamicAgentService

async def delegate_task(title: str, description: str):
    task_text = f"{title} {description}"
    # Simple heuristic to decide if it's a complex project
    if len(task_text) > 200 or "project" in task_text.lower() or "develop" in task_text.lower():
        service = DynamicAgentService()
        manager_def = await service.create_manager_for_project(task_text)
        if "error" not in manager_def:
            # A new manager was created, assign the task to it
            # ... (logic to create task and assign to new manager) ...
            return {"status": "delegated_to_new_manager", "manager_id": manager_def["id"]}
    
    # Fallback to existing routing
    # ... (rest of the original delegate_task function)
```

- [ ] **Step 3: Write a test for the new dynamic routing logic**
```python
# In COWORK/backend/tests/test_commander.py
from unittest.mock import patch, AsyncMock
from ..agents import commander

@patch('..agents.commander.DynamicAgentService')
@pytest.mark.asyncio
async def test_delegate_complex_task_creates_manager(MockDynamicAgentService):
    # Arrange
    mock_service_instance = MockDynamicAgentService.return_value
    mock_service_instance.create_manager_for_project = AsyncMock(
        return_value={"id": "new-manager", "name": "New Manager"}
    )

    # Act
    result = await commander.delegate_task("New Project", "This is a very long and complex project description that requires a new manager to be created for proper handling and delegation of sub-tasks.")

    # Assert
    mock_service_instance.create_manager_for_project.assert_called_once()
    assert result["status"] == "delegated_to_new_manager"
    assert result["manager_id"] == "new-manager"
```

- [ ] **Step 4: Run the new commander test**
Run: `cd /home/ubuntu/COWORK/backend && source .venv/bin/activate && pytest tests/test_commander.py`
Expected: PASS, showing 1 test passed.

- [ ] **Step 5: Commit the dynamic manager system**
```bash
git add agents/commander.py services/dynamic_agent_service.py tests/test_commander.py
git commit -m "feat(commander): add dynamic manager creation for complex projects"
```

## Chunk 4: System-Wide Improvements

### Task 6: Create the New `bots` Department

**Files:**
- Create: `COWORK/backend/departments/bots/__init__.py`
- Create: `COWORK/backend/departments/bots/prompts.py`
- Create: `COWORK/backend/departments/bots/tools.py`
- Modify: `COWORK/backend/departments/registry.py`
- Create: `COWORK/backend/tests/test_registry.py`

- [ ] **Step 1: Create the department directory and files**
Run: `mkdir -p /home/ubuntu/COWORK/backend/departments/bots && touch /home/ubuntu/COWORK/backend/departments/bots/__init__.py`

- [ ] **Step 2: Create placeholder prompts and tools**
```python
# In COWORK/backend/departments/bots/prompts.py
BOTS_PROMPTS = {
    "social-media-manager": "You are a social media manager bot...",
}

# In COWORK/backend/departments/bots/tools.py
BOTS_TOOLS = [
    {"name": "post_to_x", "description": "Post a message to X/Twitter..."},
]
```

- [ ] **Step 3: Add the new department to the registry**
```python
# In COWORK/backend/departments/registry.py
# ... (import BOTS_PROMPTS, BOTS_TOOLS)

_BOTS_DEPARTMENT = {
    "id": "bots",
    "name": "Automation Bots",
    "icon": "🚀",
    "color": "#f97316",
    "scene_type": "digital-office",
    "description": "Manages automation, social media, and other specialized bots.",
}

_BOTS_AGENTS = [
    {
        "id": "social-media-manager",
        "department_id": "bots",
        "name": "SocialMediaManager",
        "icon": "🐦",
        "tier": "WORKER",
        "domain": "Social Media Management",
        "desc": "Manages posts and interactions on platforms like X/Twitter.",
        "system_prompt": BOTS_PROMPTS["social-media-manager"],
    },
]

# Add to ALL_DEPARTMENTS and ALL_AGENTS lists
ALL_DEPARTMENTS = [_TRADE_DEPARTMENT, _MEDICAL_DEPARTMENT, _HOTEL_DEPARTMENT, _SOFTWARE_DEPARTMENT, _BOTS_DEPARTMENT]
ALL_AGENTS = _TRADE_AGENTS + _MEDICAL_AGENTS + _HOTEL_AGENTS + _SOFTWARE_AGENTS + _BOTS_AGENTS + [_CARGO_AGENT]
```

- [ ] **Step 4: Write a test to verify the new department is registered**
```python
# In COWORK/backend/tests/test_registry.py
from ..departments.registry import ALL_DEPARTMENTS, ALL_AGENTS

def test_bots_department_is_registered():
    dept_ids = [d["id"] for d in ALL_DEPARTMENTS]
    assert "bots" in dept_ids

def test_social_media_agent_is_registered():
    agent_ids = [a["id"] for a in ALL_AGENTS]
    assert "social-media-manager" in agent_ids
```

- [ ] **Step 5: Run the registry test**
Run: `cd /home/ubuntu/COWORK/backend && source .venv/bin/activate && pytest tests/test_registry.py`
Expected: PASS, showing 2 tests passed.

- [ ] **Step 6: Commit the new department**
```bash
git add departments/bots/ departments/registry.py tests/test_registry.py
git commit -m "feat: add new bots department"
```

### Task 7: Implement a Real-Data Tool (Proof of Concept)

**Files:**
- Modify: `COWORK/backend/departments/trade/tools.py`
- Create: `COWORK/backend/tests/test_trade_tools.py`

- [ ] **Step 1: Implement `analyze_chart` with `ccxt`**
```python
# In COWORK/backend/departments/trade/tools.py
import ccxt

def analyze_chart(symbol: str, timeframe: str):
    """Fetches real OHLCV data from Binance and provides a basic summary."""
    try:
        binance = ccxt.binance()
        ohlcv = binance.fetch_ohlcv(symbol, timeframe, limit=5)
        # [timestamp, open, high, low, close, volume]
        last_candle = ohlcv[-1]
        return {
            "status": "success",
            "symbol": symbol,
            "timeframe": timeframe,
            "last_close": last_candle[4],
            "last_volume": last_candle[5],
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# This is a placeholder for the full tool definitions
TRADE_TOOLS_IMPLEMENTATION = {
    "analyze_chart": analyze_chart,
}
```

- [ ] **Step 2: Write a test for the real-data tool**
```python
# In COWORK/backend/tests/test_trade_tools.py
from unittest.mock import patch
from ..departments.trade.tools import analyze_chart

@patch("ccxt.binance")
def test_analyze_chart_fetches_real_data(mock_binance):
    mock_binance.return_value.fetch_ohlcv.return_value = [
        [1672531200000, 60000, 61000, 59000, 60500, 100],
        [1672534800000, 60500, 62000, 60000, 61500, 120],
    ]
    
    result = analyze_chart("BTC/USDT", "1h")
    
    assert result["status"] == "success"
    assert result["last_close"] == 61500
    mock_binance.return_value.fetch_ohlcv.assert_called_once_with("BTC/USDT", "1h", limit=5)
```

- [ ] **Step 3: Run the trade tools test**
Run: `cd /home/ubuntu/COWORK/backend && source .venv/bin/activate && pytest tests/test_trade_tools.py`
Expected: PASS, showing 1 test passed.

- [ ] **Step 4: Commit the real-data tool**
```bash
git add departments/trade/tools.py tests/test_trade_tools.py
git commit -m "feat(trade): implement real-data analyze_chart tool using ccxt"
```
