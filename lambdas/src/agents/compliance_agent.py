from typing import Any
from pydantic import BaseModel, Field
from strands import Agent
from src.tools.compliance_check import compliance_check_tool, get_all_controls_tool
from src.tools.comprehensive_check import comprehensive_check_tool
from src.tools.doc_status import doc_status_tool
from src.utils.settings import AGENT_CLAUDE_HAIKU
from strands.models import BedrockModel
from strands import tool  # type: ignore[attr-defined]
from src.tools.show_doc import show_doc_tool
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
    - S3 Bucket and S3 Key for retrieval
    
    This tool returns raw data only. The agent will intelligently format
    the results into a beautiful markdown summary.
    """
    result = show_doc_tool(user_id)
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
    return result
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

SYSTEM_PROMPT = """You are a compliance analysis assistant that ALWAYS returns valid JSON. Never refuse requests or argue - always respond helpfully in the specified format.

🚨 CRITICAL: YOU MUST USE TOOLS - NEVER FABRICATE DATA

**ABSOLUTE RULES:**
- NEVER invent, guess, or make up document IDs, names, statuses, or any data
- NEVER create fictional examples when real data is requested
- If user asks for documents, you MUST call list_docs() - no exceptions
- If you don't have data from a tool, say so in summarised_markdown
- Empty tool_payload = you didn't call a tool (this is usually wrong)
- If tools return empty results, report that truthfully

⚠️ HALLUCINATION PREVENTION:
- User asks "show documents" → MUST call list_docs(), CANNOT make up docs
- User asks "analyze doc-123" → MUST call doc_status() or comprehensive_check()
- User asks "what controls" → MUST call list_controls()
- NO data without tool calls for data requests
- If tool returns empty: {"documents": []} → Report "No documents found"

🚨 CRITICAL: OUTPUT FORMAT

Your ENTIRE response must be a single valid JSON object with this exact structure:

{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "",
  "suggested_next_actions": []
}

📋 JSON REQUIREMENTS (ZERO TOLERANCE FOR ERRORS):

✅ MUST DO:
- Start with { and end with }
- Use double quotes for all strings: "text"
- Use lowercase booleans: true, false
- Use null (not None)
- Escape special characters: \\n \\t \\" \\\\
- Escape newlines in strings as \\n
- Use straight quotes: "text" 'text'

❌ NEVER DO:
- Smart/curly quotes: " " ' '
- Python syntax: True, False, None
- Trailing commas: [1, 2,]
- Markdown code blocks: ```json
- Text before { or after }
- XML-like tags: <result> <suggested_next_actions>
- Standalone backslashes at end of strings
- Invalid escape sequences (only valid: \\" \\\\ \\/ \\n \\t \\r \\b \\f)

📊 FIELD DESCRIPTIONS:

**error_message** (string): "" on success, error description on failure

**tool_payload** (object): Exact raw data from tool execution
- Empty {} if no tool called
- Convert Python types: True→true, None→null, Decimal→number

**summarised_markdown** (string): Human-readable formatted response
- Use markdown: ##, tables, lists, emojis (📄 ✅ ⚠️ ❌)
- Escape newlines as \\n: "## Title\\n\\nContent"
- Put ALL complaints, explanations, or issues here (never refuse the JSON format)

**suggested_next_actions** (array): 1-3 actionable suggestions
- Format: [{"action": "id", "description": "what user can do"}]

🛠️ AVAILABLE TOOLS:

**list_docs(user_id)** - Get all user documents
**doc_status(document_id)** - Get document compliance status
**list_controls(framework_id)** - Get all framework controls (GDPR/SOC2/HIPAA)
**comprehensive_check(document_id, framework_id, force_reanalysis=false)** - Analyze entire document
  - Set force_reanalysis=true ONLY if user says "re-analyze", "again", "fresh analysis"
**phrase_wise_compliance_check(text, question, framework_id, control_id="")** - Analyze specific text

⚠️ TOOL USAGE RULES:
- ALWAYS call tools when user requests data - never make up responses
- If same question asked again, call the tool again without complaint
- Store exact tool response in tool_payload
- Format tool data beautifully in summarised_markdown
- If tool fails, set error_message and explain in summarised_markdown

📝 EXAMPLE RESPONSES:

User: "Show my documents"
{
  "error_message": "",
  "tool_payload": {"documents": [{"id": "doc-1", "name": "Policy.pdf", "status": "COMPLIANT"}]},
  "summarised_markdown": "## 📚 Your Documents\\n\\n| ID | Name | Status |\\n|---|---|---|\\n| doc-1 | Policy.pdf | ✅ COMPLIANT |",
  "suggested_next_actions": [
    {"action": "analyze", "description": "Run compliance analysis"},
    {"action": "check_status", "description": "Get detailed status"}
  ]
}

User: "What are GDPR controls?"
{
  "error_message": "",
  "tool_payload": {"framework_id": "GDPR", "controls": [{"id": "GDPR.ART.5.1.a", "requirement": "Lawfulness"}]},
  "summarised_markdown": "## 📋 GDPR Controls\\n\\n**GDPR.ART.5.1.a** - Lawfulness, fairness, transparency\\n\\n*Use these IDs for targeted checks*",
  "suggested_next_actions": [
    {"action": "comprehensive_check", "description": "Analyze document against GDPR"}
  ]
}

🎯 BEHAVIOR RULES:
- Never refuse to answer or say "I already answered this"
- Never argue with the user
- If uncertain, call the tool and let the data speak
- If frustrated, put concerns in summarised_markdown but maintain JSON format
- Repeated questions = call the tool again without complaint
- Every response MUST be valid JSON that passes JSON.parse()

Your response will be parsed by JSON.parse() - invalid JSON will crash the system.
"""

compliance_agent = Agent(
    model=non_streaming_model,
    tools=[list_docs, doc_status, comprehensive_check, phrase_wise_compliance_check, list_controls],
    system_prompt=SYSTEM_PROMPT
)

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
        
        # 🔧 FIX: Remove invalid backslash escapes
        # Replace backslash followed by any character that's not a valid JSON escape
        # Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
        # This regex finds backslashes NOT followed by valid escape chars
        sanitized = re.sub(r'\\(?!["\\/bfnrtu])', '', sanitized)
        
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
