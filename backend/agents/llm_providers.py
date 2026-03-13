"""
COWORK.ARMY v8.1 — Multi-LLM Provider Abstraction
Supports Anthropic Claude and Google Gemini with tool-calling.
Gemini 429 RESOURCE_EXHAUSTED → automatic Anthropic fallback.
"""
from __future__ import annotations
import os
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("cowork.llm")


def _read_env_value(key: str) -> str:
    """Read a value from environment or .env file."""
    v = os.environ.get(key, "")
    if not v:
        env = Path(__file__).parent.parent / ".env"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith(f"{key}="):
                    v = line.split("=", 1)[1].strip().strip('"')
    return v


def is_rate_limit_error(exc: Exception) -> bool:
    """Return True if the exception is a Gemini/Google 429 rate limit error."""
    msg = str(exc).lower()
    return (
        "429" in msg
        or "resource_exhausted" in msg
        or "quota" in msg
        or "rate limit" in msg
        or getattr(exc, "status_code", None) == 429
        or getattr(exc, "code", None) == 429
    )


class LLMResponse:
    """Normalized response from any LLM provider."""
    def __init__(self, stop_reason: str, content: list, raw=None):
        self.stop_reason = stop_reason  # "tool_use" | "end_turn"
        self.content = content          # list of content blocks
        self.raw = raw


class ToolUseBlock:
    """Normalized tool use block."""
    def __init__(self, id: str, name: str, input: dict):
        self.type = "tool_use"
        self.id = id
        self.name = name
        self.input = input


class TextBlock:
    """Normalized text block."""
    def __init__(self, text: str):
        self.type = "text"
        self.text = text


class AnthropicProvider:
    """Anthropic Claude provider with tool-calling support."""

    def __init__(self, api_key: str, model: str):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key)
        self.model = model or "claude-3-haiku-20240307"

    def get_response(self, system_prompt: str, messages: list, tools: list) -> LLMResponse:
        # Anthropic API tool_result içinde 'tool_name' alanını kabul etmez
        # (Gemini için runner.py'de saklanır, buraya gelince filtrelenir)
        def _clean_messages(msgs: list) -> list:
            cleaned = []
            for m in msgs:
                if isinstance(m.get("content"), list):
                    new_content = []
                    for item in m["content"]:
                        if isinstance(item, dict) and item.get("type") == "tool_result":
                            item = {k: v for k, v in item.items() if k != "tool_name"}
                        new_content.append(item)
                    cleaned.append({**m, "content": new_content})
                else:
                    cleaned.append(m)
            return cleaned

        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": _clean_messages(messages),
        }
        if tools:
            # Convert to Anthropic tool format
            anthropic_tools = []
            for t in tools:
                anthropic_tools.append({
                    "name": t["name"],
                    "description": t.get("description", ""),
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            k: {"type": v.get("type", "string"), "description": v.get("description", "")}
                            for k, v in t.get("parameters", {}).items()
                        },
                        "required": t.get("required", []),
                    },
                })
            kwargs["tools"] = anthropic_tools
            kwargs["tool_choice"] = {"type": "auto"}

        response = self.client.messages.create(**kwargs)

        # Normalize response
        content = []
        for block in response.content:
            if block.type == "tool_use":
                content.append(ToolUseBlock(id=block.id, name=block.name, input=block.input))
            elif block.type == "text":
                content.append(TextBlock(text=block.text))

        stop_reason = "tool_use" if response.stop_reason == "tool_use" else "end_turn"
        return LLMResponse(stop_reason=stop_reason, content=content, raw=response)


class GeminiProvider:
    """Google Gemini provider with tool-calling support (using google-genai SDK).

    On 429 RESOURCE_EXHAUSTED, automatically falls back to Anthropic Claude
    if `anthropic_fallback_key` is provided or ANTHROPIC_API_KEY is set.
    """

    def __init__(self, api_key: str, model: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)
        self.model_name = model or "gemini-2.5-flash"

    def get_response(
        self,
        system_prompt: str,
        messages: list,
        tools: list,
        anthropic_fallback_key: str | None = None,
    ) -> LLMResponse:
        from google import genai as genai_sdk
        from google.genai import types as genai_types
        import uuid

        # Build Gemini tool declarations
        tool_declarations = []
        if tools:
            for t in tools:
                props = {}
                for k, v in t.get("parameters", {}).items():
                    props[k] = genai_types.Schema(
                        type=genai_types.Type.STRING,
                        description=v.get("description", ""),
                    )
                tool_declarations.append(genai_types.FunctionDeclaration(
                    name=t["name"],
                    description=t.get("description", ""),
                    parameters=genai_types.Schema(
                        type=genai_types.Type.OBJECT,
                        properties=props,
                        required=t.get("required", []),
                    ),
                ))

        # Build contents from messages
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            if isinstance(msg["content"], str):
                contents.append(genai_types.Content(role=role, parts=[genai_types.Part(text=msg["content"])]))
            elif isinstance(msg["content"], list):
                parts = []
                for item in msg["content"]:
                    if isinstance(item, dict) and item.get("type") == "tool_result":
                        parts.append(genai_types.Part(
                            function_response=genai_types.FunctionResponse(
                                name=item.get("tool_name", ""),
                                response={"result": item.get("content", "")},
                            )
                        ))
                    else:
                        parts.append(genai_types.Part(text=str(item)))
                contents.append(genai_types.Content(role=role, parts=parts))

        config = genai_types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=[genai_types.Tool(function_declarations=tool_declarations)] if tool_declarations else None,
        )

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )
        except Exception as exc:
            if is_rate_limit_error(exc):
                # Try Anthropic fallback
                fallback_key = anthropic_fallback_key or _read_env_value("ANTHROPIC_API_KEY")
                if fallback_key:
                    logger.warning(
                        f"[llm] Gemini 429 rate limit — falling back to Anthropic Claude. "
                        f"Original error: {exc}"
                    )
                    fallback_model = _read_env_value("ANTHROPIC_MODEL") or "claude-3-haiku-20240307"
                    fallback = AnthropicProvider(api_key=fallback_key, model=fallback_model)
                    return fallback.get_response(system_prompt, messages, tools)
                else:
                    logger.error(
                        f"[llm] Gemini 429 rate limit and no ANTHROPIC_API_KEY for fallback. "
                        f"Original error: {exc}"
                    )
            raise

        # Normalize response
        content = []
        stop_reason = "end_turn"
        for part in response.candidates[0].content.parts:
            if hasattr(part, "function_call") and part.function_call:
                fc = part.function_call
                content.append(ToolUseBlock(
                    id=str(uuid.uuid4()),
                    name=fc.name,
                    input=dict(fc.args),
                ))
                stop_reason = "tool_use"
            elif hasattr(part, "text") and part.text:
                content.append(TextBlock(text=part.text))

        return LLMResponse(stop_reason=stop_reason, content=content, raw=response)


# Keywords that signal a heavy / complex task → Claude
_HEAVY_KEYWORDS = [
    "plan", "proje", "project", "analiz", "analysis", "strateji", "strategy",
    "mimari", "architecture", "tasarim", "design", "rapor", "report",
    "yol haritasi", "roadmap", "entegrasyon", "integration", "sistem", "system",
    "gelistir", "develop", "yaz ", "olustur", "kur ", "setup",
    "optimize", "refactor", "debug", "test", "deploy", "migrate",
    "director", "manager", "koordinat", "coordin", "kapsamli", "comprehensive",
    "detayli", "detailed", "tam ", "full ", "butun", "complete",
]


def _is_heavy_task(task: str) -> bool:
    """Return True if the task is complex enough to warrant Claude."""
    if not task:
        return False
    # Long tasks are inherently complex
    if len(task) > 200:
        return True
    t = task.lower()
    return any(kw in t for kw in _HEAVY_KEYWORDS)


def get_llm_provider(
    task: str = "",
    force_anthropic: bool = False,
) -> AnthropicProvider | GeminiProvider:
    """
    Smart LLM factory:
      - force_anthropic=True → always return AnthropicProvider (used after Gemini 429).
      - Explicit LLM_PROVIDER env var overrides everything.
      - Heavy / complex tasks (plan, project, analysis, long text) → Claude (if key available).
      - Light / quick tasks → Gemini (if key available).
      - Falls back to whichever key is present.
    """
    # --- Force Anthropic (e.g. after Gemini rate limit) ---
    if force_anthropic:
        api_key = _read_env_value("ANTHROPIC_API_KEY")
        if api_key:
            model = _read_env_value("ANTHROPIC_MODEL") or "claude-3-haiku-20240307"
            return AnthropicProvider(api_key=api_key, model=model)

    # --- Explicit override ---
    override = _read_env_value("LLM_PROVIDER")
    if override == "gemini":
        api_key = _read_env_value("GEMINI_API_KEY")
        model = _read_env_value("GEMINI_MODEL") or "gemini-2.5-flash"
        return GeminiProvider(api_key=api_key, model=model)
    if override == "anthropic":
        api_key = _read_env_value("ANTHROPIC_API_KEY")
        model = _read_env_value("ANTHROPIC_MODEL") or "claude-3-haiku-20240307"
        return AnthropicProvider(api_key=api_key, model=model)

    # --- Auto-select based on task complexity ---
    gemini_key = _read_env_value("GEMINI_API_KEY")
    anthropic_key = _read_env_value("ANTHROPIC_API_KEY")
    heavy = _is_heavy_task(task)

    if heavy and anthropic_key:
        # Complex task → Claude
        model = _read_env_value("ANTHROPIC_MODEL") or "claude-3-haiku-20240307"
        return AnthropicProvider(api_key=anthropic_key, model=model)
    elif gemini_key:
        # Default / light task → Gemini
        model = _read_env_value("GEMINI_MODEL") or "gemini-2.5-flash"
        return GeminiProvider(api_key=gemini_key, model=model)
    elif anthropic_key:
        # Gemini unavailable → fall back to Claude
        model = _read_env_value("ANTHROPIC_MODEL") or "claude-3-haiku-20240307"
        return AnthropicProvider(api_key=anthropic_key, model=model)
    else:
        raise RuntimeError("No LLM API key configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.")


# Unified tool definitions used by all agents
TOOL_DEFS = [
    {
        "name": "read_file",
        "description": "Read a file from workspace or project directory",
        "parameters": {
            "path": {"type": "string", "description": "File path (relative to workspace or absolute)"},
        },
        "required": ["path"],
    },
    {
        "name": "write_file",
        "description": "Write content to a file in agent's workspace",
        "parameters": {
            "path": {"type": "string", "description": "File path (relative to workspace)"},
            "content": {"type": "string", "description": "File content to write"},
        },
        "required": ["path", "content"],
    },
    {
        "name": "list_dir",
        "description": "List files in a directory",
        "parameters": {
            "path": {"type": "string", "description": "Directory path (empty = workspace root)"},
        },
        "required": [],
    },
    {
        "name": "search_files",
        "description": "Search for files matching a glob pattern",
        "parameters": {
            "pattern": {"type": "string", "description": "Glob pattern like *.py"},
            "directory": {"type": "string", "description": "Search directory"},
        },
        "required": ["pattern"],
    },
    {
        "name": "run_command",
        "description": "Run a safe shell command (ls, cat, grep, python3, etc.)",
        "parameters": {
            "command": {"type": "string", "description": "Shell command to run"},
            "cwd": {"type": "string", "description": "Working directory (optional)"},
        },
        "required": ["command"],
    },
]
