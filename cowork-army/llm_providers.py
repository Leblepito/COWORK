"""
COWORK.ARMY — LLM Provider Abstraction
Supports Anthropic (Claude) and Google (Gemini) as interchangeable backends.
"""
import json
from abc import ABC, abstractmethod


# Tool definitions shared across providers (provider-agnostic format)
TOOL_DEFS = [
    {
        "name": "read_file",
        "description": "Read a file from agent workspace or project directory.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path (relative to workspace or absolute)"}
            },
            "required": ["path"]
        }
    },
    {
        "name": "write_file",
        "description": "Write content to a file in agent's workspace.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "File path relative to workspace"},
                "content": {"type": "string", "description": "File content to write"}
            },
            "required": ["path", "content"]
        }
    },
    {
        "name": "list_dir",
        "description": "List files and directories in a directory.",
        "parameters": {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "Directory path (empty string for workspace root)"}
            },
            "required": []
        }
    },
    {
        "name": "search_files",
        "description": "Search for files matching a glob pattern.",
        "parameters": {
            "type": "object",
            "properties": {
                "pattern": {"type": "string", "description": "Glob pattern like *.py or *.md"},
                "directory": {"type": "string", "description": "Search directory (empty for workspace root)"}
            },
            "required": ["pattern"]
        }
    },
    {
        "name": "run_command",
        "description": "Run a shell command (limited to safe commands: ls, cat, head, tail, grep, find, python3, node, npm, git status/log/diff).",
        "parameters": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Shell command to run"},
                "cwd": {"type": "string", "description": "Working directory (empty for workspace root)"}
            },
            "required": ["command"]
        }
    },
]


class ToolCall:
    """Provider-agnostic tool call representation."""
    __slots__ = ("id", "name", "input")
    def __init__(self, id: str, name: str, input: dict):
        self.id = id
        self.name = name
        self.input = input


class LLMProvider(ABC):
    """Base class for LLM providers."""

    @abstractmethod
    def chat(self, system: str, messages: list, tools: list) -> tuple[str, list[ToolCall]]:
        """Send a chat request and return (text, tool_calls)."""
        ...

    @abstractmethod
    def format_tool_result(self, tool_call: ToolCall, content: str) -> dict:
        """Format a tool result for the next message."""
        ...

    @abstractmethod
    def format_assistant_message(self, text: str, tool_calls: list[ToolCall]) -> dict:
        """Format the assistant response as a message for conversation history."""
        ...


class AnthropicProvider(LLMProvider):
    """Claude via Anthropic SDK."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        from anthropic import Anthropic
        self.client = Anthropic(api_key=api_key)
        self.model = model
        self.max_tokens = 4096

    def _to_claude_tools(self, tools: list) -> list:
        return [
            {
                "name": t["name"],
                "description": t["description"],
                "input_schema": t["parameters"],
            }
            for t in tools
        ]

    def chat(self, system: str, messages: list, tools: list) -> tuple[str, list[ToolCall]]:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=system,
            messages=messages,
            tools=self._to_claude_tools(tools),
        )
        text = ""
        tool_calls = []
        # Build the raw content for message history
        self._last_content = response.content
        for block in response.content:
            if block.type == "text":
                text += block.text
            elif block.type == "tool_use":
                tool_calls.append(ToolCall(id=block.id, name=block.name, input=block.input))
        return text, tool_calls

    def format_assistant_message(self, text: str, tool_calls: list[ToolCall]) -> dict:
        # Use the raw content blocks stored from the last API call
        return {"role": "assistant", "content": self._last_content}

    def format_tool_result(self, tool_call: ToolCall, content: str) -> dict:
        return {
            "type": "tool_result",
            "tool_use_id": tool_call.id,
            "content": content,
        }


class GeminiProvider(LLMProvider):
    """Gemini via google-generativeai SDK."""

    def __init__(self, api_key: str, model: str = "gemini-2.5-pro-preview-05-06"):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        self._genai = genai
        self.model_name = model
        self._tool_call_counter = 0
        # Build Gemini tools once
        self._gemini_tools = None

    def _build_gemini_tools(self, tools: list):
        genai = self._genai
        declarations = []
        for t in tools:
            params = t["parameters"].copy()
            # Gemini requires properties, ensure it exists
            if "properties" not in params:
                params["properties"] = {}
            declarations.append(
                genai.protos.FunctionDeclaration(
                    name=t["name"],
                    description=t["description"],
                    parameters=params,
                )
            )
        return genai.protos.Tool(function_declarations=declarations)

    def _convert_messages(self, system: str, messages: list) -> tuple[str, list]:
        """Convert Anthropic-format messages to Gemini contents."""
        contents = []
        for msg in messages:
            role = msg["role"]
            content = msg.get("content", "")

            if role == "user":
                if isinstance(content, str):
                    contents.append(
                        self._genai.protos.Content(
                            role="user",
                            parts=[self._genai.protos.Part(text=content)]
                        )
                    )
                elif isinstance(content, list):
                    # Tool results
                    parts = []
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "tool_result":
                            parts.append(
                                self._genai.protos.Part(
                                    function_response=self._genai.protos.FunctionResponse(
                                        name=item["_function_name"],
                                        response={"result": item["content"]},
                                    )
                                )
                            )
                        elif isinstance(item, dict) and "text" in item:
                            parts.append(self._genai.protos.Part(text=item["text"]))
                    if parts:
                        contents.append(
                            self._genai.protos.Content(role="user", parts=parts)
                        )
            elif role == "assistant" or role == "model":
                if isinstance(content, str):
                    contents.append(
                        self._genai.protos.Content(
                            role="model",
                            parts=[self._genai.protos.Part(text=content)]
                        )
                    )
                elif isinstance(content, list):
                    parts = []
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "function_call":
                            parts.append(
                                self._genai.protos.Part(
                                    function_call=self._genai.protos.FunctionCall(
                                        name=item["name"],
                                        args=item["args"],
                                    )
                                )
                            )
                        elif isinstance(item, dict) and "text" in item:
                            parts.append(self._genai.protos.Part(text=item["text"]))
                    if parts:
                        contents.append(
                            self._genai.protos.Content(role="model", parts=parts)
                        )
        return contents

    def chat(self, system: str, messages: list, tools: list) -> tuple[str, list[ToolCall]]:
        genai = self._genai

        gemini_tool = self._build_gemini_tools(tools)
        model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system,
        )

        contents = self._convert_messages(system, messages)
        response = model.generate_content(
            contents,
            tools=[gemini_tool],
        )

        text = ""
        tool_calls = []
        self._last_parts = []

        for part in response.candidates[0].content.parts:
            if part.text:
                text += part.text
                self._last_parts.append({"type": "text", "text": part.text})
            if part.function_call:
                fc = part.function_call
                self._tool_call_counter += 1
                tc_id = f"gemini_tc_{self._tool_call_counter}"
                args = dict(fc.args) if fc.args else {}
                tool_calls.append(ToolCall(id=tc_id, name=fc.name, input=args))
                self._last_parts.append({
                    "type": "function_call",
                    "name": fc.name,
                    "args": args,
                })

        return text, tool_calls

    def format_assistant_message(self, text: str, tool_calls: list[ToolCall]) -> dict:
        return {"role": "assistant", "content": self._last_parts}

    def format_tool_result(self, tool_call: ToolCall, content: str) -> dict:
        return {
            "type": "tool_result",
            "tool_use_id": tool_call.id,
            "content": content,
            "_function_name": tool_call.name,
        }


def get_provider(provider_name: str, api_key: str, model: str = "") -> LLMProvider:
    """Factory: create an LLM provider by name."""
    if provider_name == "anthropic":
        return AnthropicProvider(api_key=api_key, model=model or "claude-sonnet-4-20250514")
    elif provider_name == "gemini":
        return GeminiProvider(api_key=api_key, model=model or "gemini-2.5-pro-preview-05-06")
    else:
        raise ValueError(f"Unknown LLM provider: {provider_name}. Use 'anthropic' or 'gemini'.")
