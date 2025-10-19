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
    result = show_doc_tool(user_id)
    # Ensure result is JSON-serializable (show_doc_tool already uses replace_decimals)
    return result
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

SYSTEM_PROMPT = """⚠️ CRITICAL CHARACTER ENCODING RULES ⚠️

When including quoted text in your JSON response:
- Use STRAIGHT quotes: "text" and 'text'
- NEVER use curly/smart quotes: " " ' '
- Escape quotes inside strings: \\"text\\"

Example CORRECT: "the right to erasure (\\"right to be forgotten\\")"
Example WRONG: "the right to erasure ("right to be forgotten")"

You are a compliance analysis API that returns ONLY valid JSON.

🚨 CRITICAL: DO NOT USE XML-LIKE TAGS 🚨
❌ WRONG: <result>...</result> or <suggested_next_actions>...</suggested_next_actions>
✅ CORRECT: Valid JSON object only

🚨 OUTPUT FORMAT: Your entire response must be a single JSON object with this exact structure:

{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "",
  "suggested_next_actions": []
}

📋 CRITICAL JSON RULES:
- Response MUST start with { and end with }
- Use double quotes for all strings: "text" not 'text'
- Use lowercase booleans: true/false not True/False
- Use null not None
- Escape newlines as \\n inside strings
- NO trailing commas
- NO markdown code blocks (no ```)
- NO text before { or after }

📊 FIELD DESCRIPTIONS:

1. **error_message** (string): Empty "" on success, error description on failure

2. **tool_payload** (object): Raw unmodified data from tool execution
   - Empty {} if no tool was called
   - Must be valid JSON (convert Python types: True→true, None→null, Decimal→number)

3. **summarised_markdown** (string): Human-readable formatted response
   - Use markdown headers (##), tables, emojis (📄 ✅ ⚠️ ❌)
   - Escape newlines as \\n: "## Title\\n\\nContent"
   - Make it clear, concise, and actionable

4. **suggested_next_actions** (array): 1-3 suggested actions
   - Each: {"action": "identifier", "description": "What user can do"}
   - Examples: {"action": "check_document", "description": "Analyze compliance"}

🛠️ AVAILABLE TOOLS:

**list_docs(user_id)** - Get all documents for a user
Use when: "show my documents", "list files"

**doc_status(document_id)** - Get compliance status of specific document
Use when: "status of doc-123", "check document xyz"

**list_controls(framework_id)** - Get all controls for framework (GDPR/SOC2/HIPAA)
Use when: "what are GDPR controls?", "list SOC2 requirements", "show HIPAA rules"

**comprehensive_check(document_id, framework_id, force_reanalysis)** - Analyze entire document against all framework controls
Use when: "analyze my document for GDPR", "check full compliance", "is doc-123 HIPAA compliant?"
Parameters:
  - document_id: Document to analyze
  - framework_id: "GDPR", "SOC2", or "HIPAA"
  - force_reanalysis: false (default) | true (only if user says "re-analyze", "check again")

**phrase_wise_compliance_check(text, question, framework_id, control_id)** - Analyze specific text snippet
Use when: "does this text comply?", "check this phrase for GDPR", user provides specific text to evaluate
Parameters:
  - text: The text snippet to analyze
  - question: Compliance question about the text
  - framework_id: "GDPR", "SOC2", or "HIPAA"
  - control_id: Optional specific control (e.g., "GDPR.ART.15")

⚠️ CRITICAL TOOL USAGE RULES:
1. ALWAYS call tools when user requests data - NEVER fabricate responses
2. Use tool_payload to store exact tool response (no modifications)
3. Use summarised_markdown to format tool data beautifully for users
4. If tool fails, set error_message and explain in summarised_markdown

📝 EXAMPLE VALID RESPONSES:

User: "What can you do?"
{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "## 👋 Compliance Copilot\\n\\nI help you analyze compliance documents:\\n\\n**📚 Document Management**\\n- List your documents\\n- Check document status\\n\\n**🔍 Compliance Analysis**\\n- Analyze full documents (GDPR, SOC2, HIPAA)\\n- Check specific text snippets\\n- View framework controls\\n\\nTry: *'Show my documents'* or *'What are GDPR controls?'*",
  "suggested_next_actions": [
    {"action": "list_documents", "description": "View all your uploaded documents"},
    {"action": "list_controls", "description": "Browse compliance framework controls"}
  ]
}

User: "Show my documents"
[Tool called: list_docs(user_id="user-123")]
[Tool returns: {"documents": [{"id": "doc-1", "name": "Privacy Policy.pdf", "status": "COMPLIANT"}]}]
{
  "error_message": "",
  "tool_payload": {
    "documents": [
      {"id": "doc-1", "name": "Privacy Policy.pdf", "status": "COMPLIANT"}
    ]
  },
  "summarised_markdown": "## 📚 Your Documents\\n\\n| Document ID | Name | Status |\\n|-------------|------|--------|\\n| doc-1 | Privacy Policy.pdf | ✅ COMPLIANT |\\n\\n*1 document found*",
  "suggested_next_actions": [
    {"action": "analyze_document", "description": "Run compliance analysis on a document"},
    {"action": "check_status", "description": "Get detailed status of a document"}
  ]
}

User: "What are GDPR controls?"
[Tool called: list_controls(framework_id="GDPR")]
{
  "error_message": "",
  "tool_payload": {
    "framework_id": "GDPR",
    "controls": [
      {"id": "GDPR.ART.5.1.a", "requirement": "Lawfulness, fairness, transparency"},
      {"id": "GDPR.ART.6", "requirement": "Lawful basis for processing"}
    ]
  },
  "summarised_markdown": "## 📋 GDPR Controls\\n\\n**Total Controls:** 2\\n\\n### Key Requirements:\\n\\n**GDPR.ART.5.1.a** - Lawfulness, fairness, transparency\\n**GDPR.ART.6** - Lawful basis for processing\\n\\n*Use these control IDs for targeted compliance checks*",
  "suggested_next_actions": [
    {"action": "comprehensive_check", "description": "Analyze a document against GDPR"},
    {"action": "check_specific_control", "description": "Check text against specific control"}
  ]
}

🎯 FINAL CHECKLIST (verify before responding):
☑ Response is valid JSON starting with { and ending with }
☑ All strings use double quotes
☑ All booleans are true/false (lowercase)
☑ All null values are null (not None)
☑ Newlines in strings are escaped as \\n
☑ No trailing commas
☑ No markdown code blocks
☑ No text before { or after }

Your response will be parsed by JSON.parse() - invalid JSON will crash the system.
"""

compliance_agent = Agent(
    model=non_streaming_model,
    tools=[list_docs, doc_status, comprehensive_check, phrase_wise_compliance_check, list_controls],
    system_prompt=SYSTEM_PROMPT
)

app = BedrockAgentCoreApp()


def parse_agent_json(text: str) -> dict[str, Any]:
    """
    Parse JSON from agent response with comprehensive error handling.
    Handles: smart quotes, Python syntax, malformed JSON, truncation, XML-like tags.
    """
    import re
    sanitized: str = "{}"
    if not text or not text.strip():
        raise ValueError("Empty response from agent")
    
    # Step 0: Handle XML-like tag format from agent
    # Agent sometimes wraps response in <result> and <suggested_next_actions> tags
    if '<result>' in text or '<suggested_next_actions>' in text:
        try:
            # Extract content from XML-like tags
            result_match = re.search(r'<result>\s*(.*?)\s*</result>', text, re.DOTALL)
            actions_match = re.search(r'<suggested_next_actions>\s*(.*?)\s*</suggested_next_actions>', text, re.DOTALL)
            
            summarised_markdown = result_match.group(1).strip() if result_match else ""
            suggested_actions_str = actions_match.group(1).strip() if actions_match else "[]"
            
            # Parse suggested actions JSON array
            try:
                suggested_actions = json.loads(suggested_actions_str)
            except json.JSONDecodeError:
                suggested_actions = []
            
            # Construct proper response object
            return {
                "error_message": "",
                "tool_payload": {},
                "summarised_markdown": summarised_markdown,
                "suggested_next_actions": suggested_actions
            }
        except Exception as e:
            print(f"⚠️ Failed to parse XML-like tags: {e}")
            # Fall through to regular JSON parsing
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass  # Continue to extraction logic
    
    # Step 1: Clean and extract JSON
    text = text.strip()
    
    # Remove markdown code blocks
    if '```' in text:
        text = re.sub(r'^```(?:json)?\s*\n?', '', text)
        text = re.sub(r'\n?```\s*$', '', text)
    
    # Find JSON object boundaries
    start_idx = text.find('{')
    end_idx = text.rfind('}')
    
    if start_idx == -1 or end_idx == -1:
        raise ValueError(
            f"No JSON object found in response.\n"
            f"Response preview: {text[:500]}"
        )
    
    json_str = text[start_idx:end_idx + 1]
    
    # Step 2: Pre-process common issues
    
    # Fix smart/curly quotes to straight quotes
    json_str = (json_str
        .replace('"', '"')  # Left double quote
        .replace('"', '"')  # Right double quote  
        .replace(''', "'")  # Left single quote
        .replace(''', "'")  # Right single quote
    )
    
    # Step 3: Attempt parsing
    try:
        # Try 1: Direct parse (best case)
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass  # Continue to sanitization
    
    # Step 4: Sanitize Python syntax
    try:
        sanitized = json_str
        
        # Fix Python types to JSON types
        sanitized = re.sub(r'\bTrue\b', 'true', sanitized)
        sanitized = re.sub(r'\bFalse\b', 'false', sanitized)
        sanitized = re.sub(r'\bNone\b', 'null', sanitized)
        
        # Remove trailing commas
        sanitized = re.sub(r',(\s*[}\]])', r'\1', sanitized)
        
        # Fix Decimal objects: Decimal('123.45') -> 123.45
        sanitized = re.sub(r'Decimal\([\'"]([0-9.]+)[\'"]\)', r'\1', sanitized)
        
        # Try 2: Parse sanitized version
        return json.loads(sanitized)
    except json.JSONDecodeError as second_error:
        # Both attempts failed - provide detailed error
        error_pos = second_error.pos
        
        # Extract context around error
        context_start = max(0, error_pos - 150)
        context_end = min(len(sanitized), error_pos + 150)
        error_context = sanitized[context_start:context_end]
        
        # Check for truncation
        is_truncated = not sanitized.rstrip().endswith('}')
        
        error_details = [
            f"JSON parsing failed after sanitization",
            f"Error at position {error_pos}: {second_error.msg}",
            f"Context: ...{error_context}...",
            f"Total length: {len(sanitized)} characters",
        ]
        
        if is_truncated:
            error_details.append("⚠️ JSON appears TRUNCATED (doesn't end with })")
            error_details.append(f"Ends with: {sanitized[-200:]}")
        
        raise ValueError("\n".join(error_details))



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
