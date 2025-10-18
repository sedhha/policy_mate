from typing import Any
from bedrock_agentcore import BedrockAgentCoreApp
from pydantic import BaseModel, Field
from strands import Agent
from uuid6 import uuid7
from src.tools.compliance_check import compliance_check_tool, get_all_controls_tool
from src.utils.services.cached_response import cached_response
from src.tools.comprehensive_check import comprehensive_check_tool
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

##################################################################################################
@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "The unique identifier of the document to analyze. This is the file_id returned from document upload or listing."
                },
                "framework_id": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA"],
                    "description": "The compliance framework to check against. Must be one of: GDPR (EU data protection), SOC2 (security controls), or HIPAA (healthcare data privacy)."
                },
                "force_reanalysis": {
                    "type": "boolean",
                    "description": "Optional. Force a new analysis even if cached results exist. Set to true only when user explicitly requests fresh analysis or re-analysis. Defaults to false to use cached results when available.",
                    "default": False
                }
            },
            "required": ["document_id", "framework_id"]
        }
    }
)
def comprehensive_check(document_id: str, framework_id: str, force_reanalysis: bool = False) -> dict[str, Any]:
    """
    Perform comprehensive compliance analysis on an entire document against all controls in a compliance framework.
    
    This tool analyzes the full document text against every control in the specified framework (GDPR, SOC2, or HIPAA) and returns:
    - Text-level findings with character positions and control mappings
    - Overall compliance verdict (COMPLIANT/NON_COMPLIANT/PARTIAL)
    - Missing controls that aren't addressed in the document
    - Statistical summary of compliance status
    - Detailed recommendations and gap analysis
    
    Use this tool when:
    - User requests full/comprehensive compliance analysis
    - User wants to check entire document against framework
    - User asks "is my document compliant with [framework]?"
    - User needs detailed findings with specific text references
    
    Results are cached by (document_id, framework_id). Use force_reanalysis=true only when:
    - User explicitly requests fresh/new/re-analysis
    - User mentions existing analysis might be outdated
    - User says "run it again" or "check again"
    
    Args:
        document_id: The unique identifier of the document.
        framework_id: Compliance framework (GDPR, SOC2, or HIPAA).
        force_reanalysis: Force new analysis even if cached results exist (default: False).
    
    Returns:
        A dictionary containing detailed compliance analysis results or reference to cached analysis in DynamoDB.
    """
    result = comprehensive_check_tool(document_id, framework_id, force_reanalysis)
    updated_response = cached_response(result)
    return updated_response
##############################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The policy text or document content to analyze for compliance."
                },
                "question": {
                    "type": "string",
                    "description": "Specific compliance question to answer about the text."
                },
                "framework_id": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA"],
                    "description": "The compliance framework to check against. Must be one of: GDPR (EU data protection), SOC2 (security controls), or HIPAA (healthcare data privacy)."
                },
                "control_id": {
                    "type": "string",
                    "description": "Optional. Specific control ID within the framework to check against (e.g., 'GDPR.ART.5.1.a', 'SOC2.CC1.1'). If not provided, analyzes against all relevant controls."
                }
            },
            "required": ["text", "question", "framework_id"]
        }
    }
)
def phrase_wise_compliance_check(text: str, question: str, framework_id: str, control_id: str = "") -> dict[str, Any]:
    """
    Perform targeted compliance analysis on specific text snippets against a compliance framework.
    
    This tool analyzes specific text passages or phrases against compliance requirements in GDPR, SOC2, or HIPAA frameworks and returns:
    - Compliance verdict for the specific text (COMPLIANT/NON_COMPLIANT/UNCLEAR/PARTIAL)
    - Detailed analysis of how the text addresses the compliance question
    - Matched controls and their status
    - Identified gaps and recommendations
    - Reasoning for the compliance assessment
    
    Use this tool when:
    - User wants to check a specific text snippet or phrase for compliance
    - User asks "does this text comply with [framework]?"
    - User wants to analyze a particular section or paragraph
    - User provides specific text to be evaluated against compliance requirements
    - User asks targeted questions about specific policy language
    
    This is different from comprehensive_check which analyzes entire documents.
    
    Args:
        text: The specific text snippet to analyze.
        question: The compliance question to answer about the text.
        framework_id: Compliance framework (GDPR, SOC2, or HIPAA).
        control_id: Optional specific control ID to check against.
    
    Returns:
        A dictionary containing targeted compliance analysis with verdict, matched controls, gaps, and recommendations.
    """
    result = compliance_check_tool(text, question, framework_id, control_id)
    return result

##############################################################################################################
@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "framework_id": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA"],
                    "description": "The compliance framework to retrieve controls for. Must be one of: GDPR (EU data protection), SOC2 (security controls), or HIPAA (healthcare data privacy)."
                }
            },
            "required": ["framework_id"]
        }
    }
)
def list_controls(framework_id: str) -> dict[str, Any]:
    """
    Retrieve all compliance controls for a specified framework.
    
    This tool returns the complete list of controls for a given compliance framework, including:
    - Control ID (e.g., 'GDPR.ART.5.1.a', 'SOC2.CC1.1')
    - Requirement description
    - Control category
    - Severity level
    
    Use this tool when:
    - User asks "what are the GDPR controls?"
    - User wants to see all requirements for a framework
    - User asks "list all SOC2 controls"
    - User wants to understand what controls exist before analysis
    - User asks "show me HIPAA requirements"
    
    Args:
        framework_id: Compliance framework (GDPR, SOC2, or HIPAA).
    
    Returns:
        A dictionary containing the framework ID and a list of all controls with their details.
    """
    result = get_all_controls_tool(framework_id)
    return result

non_streaming_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU, streaming=False)

SYSTEM_PROMPT = """You are a JSON API that returns structured compliance data.

═══════════════════════════════════════════════════════════
OUTPUT FORMAT (STRICT):
═══════════════════════════════════════════════════════════

Your response MUST be valid JSON starting with { and ending with }
NO text before or after the JSON object
NO markdown code blocks (no ```)

⚠️ CRITICAL JSON RULES:
- Use \\n for newlines inside strings (NOT literal newlines)
- Escape all quotes inside strings with \"
- Escape all backslashes with \\\\
- Do NOT use literal tab or control characters

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
- **list_controls(framework_id)**: Get all compliance controls for a framework (GDPR/SOC2/HIPAA). Use when user asks "what are the controls?", "list requirements", or "show me all GDPR controls"
- **comprehensive_check(document_id, framework_id, force_reanalysis=False)**: Perform comprehensive compliance analysis on entire document against all controls in framework (GDPR/SOC2/HIPAA)
- **phrase_wise_compliance_check(text, question, framework_id, control_id=None)**: Analyze specific text snippets or phrases for compliance against a framework. Use when user provides specific text to evaluate or asks about particular passages.

⚠️ CRITICAL: When users ask for documents or status, you MUST call the tool.
Never fabricate or use placeholder data. Always use real tool responses.

Tool Selection Guide:
- Use **list_controls** to show available controls/requirements (e.g., "what are GDPR controls?")
- Use **comprehensive_check** for full document analysis (e.g., "analyze my entire document")
- Use **phrase_wise_compliance_check** for specific text evaluation (e.g., "does this text comply?", "check this phrase")

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
3. Format that data in summarised_markdown WITH PROPER \\n ESCAPING

Example response:
{
  "error_message": "",
  "tool_payload": {<exact_tool_response>},
  "summarised_markdown": "## 📚 Your Documents\\n\\n| ID | Name | Type | Size | Status |\\n|---|---|---|---|---|\\n| abc-123 | Policy.docx | docx | 41 KB | ✅ COMPLIANT |",
  "suggested_next_actions": [...]
}

⚠️ NOTE: Use \\n for newlines, NOT literal newlines!

─────────────────────────────────────────────────────────

User: "Status of document abc-123"
Actions:
1. Call doc_status(document_id="abc-123")
2. Put exact tool response in tool_payload
3. Format markdown with \\n escaping

─────────────────────────────────────────────────────────

User: "Check document xyz-789 for GDPR compliance"
Actions:
1. Call comprehensive_check(document_id="xyz-789", framework_id="GDPR", force_reanalysis=False)
2. Put exact tool response in tool_payload
3. Format markdown WITH \\n ESCAPING

Example response:
{
  "error_message": "",
  "tool_payload": {<exact_tool_response>},
  "summarised_markdown": "## 🔍 GDPR Compliance Analysis\\n\\n**Verdict**: ✅ COMPLIANT\\n\\n**Stats:**\\n- Total: 34\\n- Passed: 32\\n- Failed: 2\\n\\n**Findings:**\\n| Text | Control |\\n|---|---|\\n| We may share... | GDPR.ART.5.1.b |",
  "suggested_next_actions": [...]
}

⚠️ REMEMBER: Always use \\n for line breaks, NEVER literal newlines!

─────────────────────────────────────────────────────────

User: "What are all the GDPR controls?"
Actions:
1. Call list_controls(framework_id="GDPR")
2. Put exact tool response in tool_payload
3. Format markdown WITH \\n ESCAPING

Example response:
{
  "error_message": "",
  "tool_payload": {<exact_tool_response>},
  "summarised_markdown": "## 📋 GDPR Compliance Controls\\n\\n**Framework**: GDPR\\n**Total Controls**: 34\\n\\n| Control ID | Category | Requirement | Severity |\\n|---|---|---|---|\\n| GDPR.ART.5.1.a | Data Processing | Lawfulness, fairness... | HIGH |\\n| GDPR.ART.5.1.b | Data Processing | Purpose limitation | HIGH |",
  "suggested_next_actions": [
    {"action": "analyze_document", "description": "Check a document against these controls"}
  ]
}

─────────────────────────────────────────────────────────

User: "Does this text comply with GDPR: 'We collect and process user data for analytics'"
Actions:
1. Call phrase_wise_compliance_check(text="We collect and process user data for analytics", question="Does this comply with GDPR data processing requirements?", framework_id="GDPR")
2. Put exact tool response in tool_payload
3. Format markdown WITH \\n ESCAPING

Example response:
{
  "error_message": "",
  "tool_payload": {<exact_tool_response>},
  "summarised_markdown": "## 🔍 Text Compliance Check\\n\\n**Text Analyzed**: 'We collect and process...'\\n**Framework**: GDPR\\n\\n**Verdict**: ⚠️ PARTIAL\\n\\n**Issues:**\\n- Missing legal basis\\n- No purpose limitation\\n\\n**Recommendations:**\\n- Add specific purpose\\n- Document legal basis",
  "suggested_next_actions": [...]
}

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
    tools=[list_docs, doc_status, comprehensive_check, phrase_wise_compliance_check, list_controls],
    system_prompt=SYSTEM_PROMPT
)

app = BedrockAgentCoreApp()


def parse_agent_json(text: str) -> dict[str, Any]:
    """
    Parse JSON from agent response with aggressive sanitization.
    Handles control characters, unescaped newlines, and mixed quote formats.
    """
    import re
    
    # Strategy 1: Direct parse (valid JSON)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Strategy 2: Aggressive sanitization
    try:
        # Remove any leading/trailing whitespace
        cleaned = text.strip()
        
        # Find the actual JSON object (between first { and last })
        start_idx = cleaned.find('{')
        end_idx = cleaned.rfind('}')
        
        if start_idx == -1 or end_idx == -1:
            raise ValueError("No JSON object found")
        
        cleaned = cleaned[start_idx:end_idx + 1]
        
        # Fix common issues:
        # 1. Replace literal newlines in strings with \n
        # This regex finds quoted strings and escapes newlines within them
        def escape_newlines_in_strings(match: re.Match[str]) -> str:
            """Escape newlines and tabs within quoted strings."""
            quoted_str = match.group(0)
            # Escape control characters
            quoted_str = quoted_str.replace('\n', '\\n')
            quoted_str = quoted_str.replace('\r', '\\r')
            quoted_str = quoted_str.replace('\t', '\\t')
            return quoted_str
        
        # Find all quoted strings (accounting for escaped quotes)
        # This pattern matches "..." strings while handling \" inside
        pattern = r'"(?:[^"\\]|\\.)*"'
        cleaned = re.sub(pattern, escape_newlines_in_strings, cleaned)
        
        return json.loads(cleaned)
    except Exception:
        pass
    
    # Strategy 3: Character-by-character sanitization
    try:
        # Build valid JSON by escaping control characters
        result: list[str] = []
        in_string = False
        escape_next = False
        
        for char in text:
            if escape_next:
                result.append(char)
                escape_next = False
                continue
            
            if char == '\\':
                result.append(char)
                escape_next = True
                continue
            
            if char == '"' and not escape_next:
                in_string = not in_string
                result.append(char)
                continue
            
            if in_string:
                # Escape control characters inside strings
                if char == '\n':
                    result.append('\\n')
                elif char == '\r':
                    result.append('\\r')
                elif char == '\t':
                    result.append('\\t')
                elif ord(char) < 32:  # Other control characters
                    result.append(f'\\u{ord(char):04x}')
                else:
                    result.append(char)
            else:
                # Outside strings, skip whitespace control chars
                if char not in ['\n', '\r', '\t']:
                    result.append(char)
        
        sanitized = ''.join(result)
        return json.loads(sanitized)
    except Exception:
        pass
    
    # If all strategies fail, raise error with more context
    raise ValueError(
        f"Could not parse JSON after all attempts.\n"
        f"Text length: {len(text)}\n"
        f"Preview: {text[:500]}\n"
        f"Last 200 chars: {text[-200:]}"
    )



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
    print("🔧 Available tools: list_controls, phrase_wise_compliance_check, comprehensive_check, doc_status, list_docs")
    print("🧠 Agent Mode: Smart parameter extraction from user prompts")
    app.run() # type: ignore[misc]
