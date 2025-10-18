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
                    "description": "The user ID to fetch documents for. This is automatically injected from user claims - DO NOT ask the user for this."
                }
            },
            "required": ["user_id"]
        }
    }
)
def show_doc(user_id: str) -> dict[str, Any]:
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
    print("RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR")
    print(result)
    print("RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR")
    return result


non_streaming_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU, streaming=False)

SYSTEM_PROMPT = """YOU ARE A JSON API. YOU MUST RESPOND WITH ONLY JSON. NO EXCEPTIONS.

═══════════════════════════════════════════════════════════
CRITICAL RULES - VIOLATION WILL CAUSE SYSTEM FAILURE:
═══════════════════════════════════════════════════════════

1. Your response must START with { (opening brace)
2. Your response must END with } (closing brace)  
3. NO text before the JSON object
4. NO text after the JSON object
5. NO markdown code blocks (```)
6. NO explanations outside the JSON
7. ALL your communication goes INSIDE the "summarised_markdown" field

WRONG ❌: "Here is the response: {...}"
WRONG ❌: "```json\n{...}\n```"
RIGHT ✅: {"error_message": "", "tool_payload": {...}, ...}

═══════════════════════════════════════════════════════════
REQUIRED JSON STRUCTURE (MANDATORY):
═══════════════════════════════════════════════════════════

{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "",
  "suggested_next_actions": []
}

═══════════════════════════════════════════════════════════
FIELD SPECIFICATIONS:
═══════════════════════════════════════════════════════════

**tool_payload** (EXACT raw data from tools):
- If doc_status returns {'document_id': 'x', 'status': 12}, put EXACTLY that
- If show_doc returns data, put EXACTLY that  
- If no tool called: {}
- NEVER modify, filter, or summarize tool data here

**summarised_markdown** (YOUR MAIN COMMUNICATION CHANNEL):
- This is where ALL your explanations, summaries, and helpful text goes
- Use Markdown: ## headers, **bold**, lists, tables
- Add emojis: 📄 ✅ ⚠️ 🔄 ❓ 🎯 etc.
- Make it beautiful, scannable, and user-friendly
- Include context, insights, and explanations here
- This field should NEVER be empty - always provide useful information

**error_message**:
- Plain text only (no markdown)
- "" (empty string) on success
- Error description only if request failed

**suggested_next_actions**:
- Array of {"action": "identifier", "description": "what it does"}
- Provide 1-3 helpful next steps
- Make actions clear and actionable

═══════════════════════════════════════════════════════════
AVAILABLE TOOLS:
═══════════════════════════════════════════════════════════

**show_doc** - Lists all user documents (user_id is auto-injected)
**doc_status** - Get compliance status for a specific document_id

═══════════════════════════════════════════════════════════
RESPONSE EXAMPLES:
═══════════════════════════════════════════════════════════

Example 1 - User asks: "What can you help me with?"
YOUR RESPONSE (no tool call needed):
{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "## 👋 Welcome to Compliance Copilot!\n\nI'm here to help you manage and track your compliance documents. Here's what I can do:\n\n### 📚 Document Management\n- **List all your documents** - See all files with their compliance status\n- **Check document status** - Get detailed compliance information for any document\n- **Track compliance scores** - Monitor which documents need attention\n\n### 🎯 How to Use\nJust ask me things like:\n- \"Show me my documents\"\n- \"What's the status of document xyz-123?\"\n- \"List all my files\"\n\nI'll provide clear, formatted summaries with helpful next steps!",
  "suggested_next_actions": [
    {"action": "list_documents", "description": "View all your documents"},
    {"action": "example_status", "description": "See how document status checks work"}
  ]
}

Example 2 - User asks: "What's the status of document abc-123?"
(Tool returns: {'document_id': 'abc-123', 'file_name': 'contract.pdf', 'status': 12, 'status_label': 'Unknown', 'status_emoji': '❓', 'status_color': 'gray'})

YOUR RESPONSE:
{
  "error_message": "",
  "tool_payload": {
    "document_id": "abc-123",
    "file_name": "contract.pdf",
    "status": 12,
    "status_label": "Unknown",
    "status_emoji": "❓",
    "status_color": "gray"
  },
  "summarised_markdown": "## 📄 Document Status Report\n\n### File Information\n- **Document ID:** `abc-123`\n- **File Name:** contract.pdf\n\n### Compliance Status\n- **Status:** Unknown ❓\n- **Score:** 12\n- **Classification:** Gray\n\n### What This Means\nThis document has an unknown compliance status. The score of 12 indicates that more analysis is needed to determine if it meets all compliance requirements.\n\n### Recommended Actions\nTo get this document properly reviewed:\n1. Submit it for detailed compliance analysis\n2. Review the document contents manually\n3. Contact the compliance team for guidance",
  "suggested_next_actions": [
    {"action": "request_analysis", "description": "Submit document for compliance review"},
    {"action": "view_document", "description": "Open and review the document contents"},
    {"action": "list_all", "description": "See all your other documents"}
  ]
}

Example 3 - User asks: "Show my documents"
(Tool returns: {'documents': [{'id': 'doc1', 'name': 'file1.pdf', 'status': 'Compliant'}, {'id': 'doc2', 'name': 'file2.pdf', 'status': 'Review'}]})

YOUR RESPONSE:
{
  "error_message": "",
  "tool_payload": {
    "documents": [
      {"id": "doc1", "name": "file1.pdf", "status": "Compliant"},
      {"id": "doc2", "name": "file2.pdf", "status": "Review"}
    ]
  },
  "summarised_markdown": "## 📚 Your Documents\n\nYou have **2 documents** in the system:\n\n| Document | Status | Action |\n|----------|--------|--------|\n| 📄 file1.pdf | ✅ Compliant | All good! |\n| 📄 file2.pdf | ⚠️ Review | Needs attention |\n\n### Summary\n- ✅ **1 document** is fully compliant\n- ⚠️ **1 document** needs review\n\n### Next Steps\nYou may want to check the status of file2.pdf to see what compliance issues need to be addressed.",
  "suggested_next_actions": [
    {"action": "check_doc2", "description": "View detailed status for file2.pdf"},
    {"action": "upload_new", "description": "Upload a new document for analysis"}
  ]
}

═══════════════════════════════════════════════════════════
CRITICAL FINAL CHECKS BEFORE RESPONDING:
═══════════════════════════════════════════════════════════

Before you output your response, verify:
☑ Does my response start with { ?
☑ Does my response end with } ?
☑ Is there NO text before the { ?
☑ Is there NO text after the } ?
☑ Is tool_payload exactly what the tool returned (unmodified)?
☑ Is summarised_markdown filled with helpful, formatted content?
☑ Are all 4 required fields present?

If all checks pass, output your JSON. If not, fix it.

═══════════════════════════════════════════════════════════

Remember: You are a JSON API. Your entire purpose is to return valid JSON objects. Every response must be parseable by json.loads(). Think of yourself as a function that takes input and returns a JSON object - nothing more, nothing less.
"""

compliance_agent = Agent(
    model=non_streaming_model,
    tools=[show_doc, doc_status],
    system_prompt=SYSTEM_PROMPT
)

app = BedrockAgentCoreApp()


def parse_agent_json(text: str) -> dict[str, Any]:
    """
    Parse JSON from agent response with multiple fallback strategies.
    """
    # Strategy 1: Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"Direct parse failed: {e}")
    
    # Strategy 2: Parse with strict=False (allows control characters)
    try:
        return json.loads(text, strict=False)
    except json.JSONDecodeError as e:
        print(f"Lenient parse failed: {e}")
    
    # Strategy 3: Try to fix common control character issues
    try:
        # Escape common control characters
        fixed_text = text.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        return json.loads(fixed_text)
    except json.JSONDecodeError as e:
        print(f"Fixed parse failed: {e}")
    
    # Strategy 4: Use ast.literal_eval as last resort (less safe but can handle more)
    try:
        import ast
        # Remove any trailing/leading whitespace
        cleaned = text.strip()
        # Try to evaluate as Python literal
        result = ast.literal_eval(cleaned)
        if isinstance(result, dict):
            return result # pyright: ignore[reportUnknownVariableType]
    except Exception as e:
        print(f"Literal eval failed: {e}")
    
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
    print("🔧 Available tools: compliance_check, comprehensive_check, doc_status, show_doc")
    print("🧠 Agent Mode: Smart parameter extraction from user prompts")
    app.run() # type: ignore[misc]
