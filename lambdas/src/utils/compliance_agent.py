from typing import Any
from bedrock_agentcore import BedrockAgentCoreApp
from pydantic import BaseModel, Field
from strands import Agent
from uuid6 import uuid7
from src.tools.doc_status import doc_status_tool
from src.utils.settings import AGENT_CLAUDE_HAIKU
from strands.models import BedrockModel
from strands import tool  # type: ignore[attr-defined]
from src.tools.show_doc import show_doc_tool
import traceback
import json



class SuggestedAction(BaseModel):
    """A suggested next action for the user."""
    action: str = Field(description="The action identifier or name")
    description: str = Field(description="Human-readable description of the action")


class ResponseModel(BaseModel):
    """Complete agent response information."""
    session_id: str | None = Field(description="Unique identifier for the current session")
    error_message: str = Field(default="", description="Plain text error message if the request failed (empty string on success)")
    tool_payload: dict[str, Any] = Field(default_factory=dict, description="Exact raw data returned from tool execution, passed through unmodified")
    summarised_markdown: str = Field(default="", description="Human-readable summary in Markdown format with proper formatting, headers, tables, and emojis")
    suggested_next_actions: list[SuggestedAction] = Field(
        default_factory=list[SuggestedAction],
        description="List of suggested actions with 'action' and 'description' keys to guide the user"
    )


@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "user_id": {
                    "type": "string",
                    "description": "The user ID to fetch documents for."
                }
            },
            "required": ["user_id"]
        }
    }
)
def list_docs(user_id: str) -> dict[str, Any]:
    """
    Retrieve all documents accessible by the authenticated user.
    
    Returns a list of documents with their metadata including:
    - Document ID, file name, and type
    - File size (both bytes and formatted)
    - Compliance analysis status with visual indicators
    - Upload timestamp and formatted date
    
    This tool returns raw data only. The agent will intelligently format
    the results into a beautiful markdown summary.
    """
    return show_doc_tool(user_id)
##################################################################################################
@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "The ID of the document to retrieve status for."
                }
            },
            "required": ["document_id"]
        }
    }
)
def doc_status(document_id: str) -> dict[str, Any]:
    """
    Retrieve the compliance status of a specific document by its ID.
    
    Args:
        document_id: The unique identifier of the document.
    
    Returns:
        A dictionary containing the document's compliance status and related metadata.
    """
    result = doc_status_tool(document_id)
    return result


non_streaming_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU, streaming=False)

SYSTEM_PROMPT = """You are a JSON API that returns structured compliance data.

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT):
═══════════════════════════════════════════════════════════

Your response MUST be valid JSON starting with { and ending with }
NO text before or after the JSON object
NO markdown code blocks (no ```)

Required structure:
{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "",
  "suggested_next_actions": []
}

═══════════════════════════════════════════════════════════
FIELD RULES:
═══════════════════════════════════════════════════════════

**tool_payload**: Exact unmodified data from tools. Empty {} if no tool called.

**summarised_markdown**: Your formatted response with headers, tables, emojis (📄 ✅ ⚠️). Make it beautiful and helpful.

**error_message**: Empty "" on success, error text on failure.

**suggested_next_actions**: 1-3 action objects with "action" and "description" keys.

═══════════════════════════════════════════════════════════
TOOLS:
═══════════════════════════════════════════════════════════

- **list_docs(user_id)**: Get all user documents
- **doc_status(document_id)**: Get specific document status

⚠️ CRITICAL: When users ask for documents or status, you MUST call the tool.
Never fabricate or use placeholder data. Always use real tool responses.

═══════════════════════════════════════════════════════════
EXAMPLES:
═══════════════════════════════════════════════════════════

User: "What can you do?"
Response:
{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "## 👋 Compliance Copilot\n\nI help you manage compliance documents:\n\n- **List documents** - View all your files\n- **Check status** - Get compliance details\n\nJust ask: 'Show my documents' or 'Status of doc xyz-123'",
  "suggested_next_actions": [
    {"action": "list_documents", "description": "View all your documents"}
  ]
}

─────────────────────────────────────────────────────────

User: "Show my documents"
Actions:
1. Call list_docs(user_id) with actual user_id
2. Put exact tool response in tool_payload
3. Format that data in summarised_markdown

Response structure:
{
  "error_message": "",
  "tool_payload": {<exact_tool_response>},
  "summarised_markdown": "## 📚 Your Documents\n\n[Create table with real data from tool]",
  "suggested_next_actions": [...]
}

─────────────────────────────────────────────────────────

User: "Status of document abc-123"
Actions:
1. Call doc_status(document_id="abc-123")
2. Put exact tool response in tool_payload
3. Format that data in summarised_markdown

═══════════════════════════════════════════════════════════
FINAL CHECK:
═══════════════════════════════════════════════════════════

Before responding:
✓ Response is valid JSON starting with { and ending with }
✓ Called appropriate tool if user asked for data
✓ tool_payload has real tool data (not placeholder/example data)
✓ All required fields present
"""

compliance_agent = Agent(
    model=non_streaming_model,
    tools=[list_docs, doc_status],
    system_prompt=SYSTEM_PROMPT
)

app = BedrockAgentCoreApp()


def parse_agent_json(text: str) -> dict[str, Any]:
    """
    Parse JSON from agent response with multiple fallback strategies.
    Handles mixed format where outer JSON has double quotes but nested dicts have single quotes.
    """
    import ast
    
    # Strategy 1: Direct parse (valid JSON)
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"Direct parse failed: {e}")
    
    # Strategy 2: Replace single quotes with double quotes (handles mixed format)
    try:
        # Use regex to replace single quotes with double quotes, but preserve apostrophes in strings
        # This is a heuristic approach that works for most cases
        fixed_text = text.replace("'", '"')
        return json.loads(fixed_text)
    except json.JSONDecodeError as e:
        print(f"Quote replacement parse failed: {e}")
    
    # Strategy 3: Parse with strict=False (allows control characters)
    try:
        return json.loads(text, strict=False)
    except json.JSONDecodeError as e:
        print(f"Lenient parse failed: {e}")
    
    # Strategy 4: Use ast.literal_eval to handle Python dict syntax, then convert to JSON-safe dict
    try:
        # Remove any trailing/leading whitespace
        cleaned = text.strip()
        # Try to evaluate as Python literal
        result = ast.literal_eval(cleaned)
        if isinstance(result, dict):
            # Convert to JSON and back to ensure proper serialization
            json_str = json.dumps(result, default=str)
            return json.loads(json_str) # pyright: ignore[reportUnknownVariableType]
    except Exception as e:
        print(f"Literal eval with JSON conversion failed: {e}")
    
    # Strategy 5: Try to fix common control character issues
    try:
        # Escape common control characters
        fixed_text = text.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        return json.loads(fixed_text)
    except json.JSONDecodeError as e:
        print(f"Fixed parse failed: {e}")
    
    # If all strategies fail, raise the original error
    raise ValueError(f"Could not parse JSON after all attempts. Text preview: {text[:200]}")



@app.entrypoint  # type: ignore[misc]
def invoke(event: dict[str, Any]) -> dict[str, Any]:
    """Entrypoint for Bedrock AgentCoreApp to invoke the agent."""
    try:
        user_message = event.get("inputText") or event.get("prompt", "")
        session_id = event.get("session_id", str(uuid7()))
        res = str(compliance_agent(user_message))
        agent_response = str(res)
        # Clean the response: remove code blocks and control characters
        print("##############################################################")
        print(agent_response)
        with open("./agent_response.txt", "w") as f:
            f.write(agent_response)
        print("##############################################################")
        parsed = parse_agent_json(agent_response)
        parsed["session_id"] = session_id
        return parsed
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Agent invocation failed: {str(e)}\nTraceback:\n{error_traceback}")
        return {
            "error_message": f"Agent invocation failed: {str(e)}",
            "tool_payload": {},
            "summarised_markdown": "",
            "suggested_next_actions": []
        }
        
if __name__ == "__main__":
    print("🤖 Compliance Copilot Agent starting on port 8080...")
    print("📋 System prompt loaded - Agent will intelligently route queries")
    print("🔧 Available tools: compliance_check, comprehensive_check, doc_status, list_docs")
    print("🧠 Agent Mode: Smart parameter extraction from user prompts")
    app.run() # type: ignore[misc]
