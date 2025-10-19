from typing import Any
from bedrock_agentcore import BedrockAgentCoreApp
from pydantic import BaseModel, Field
from strands import Agent
from uuid6 import uuid7
from src.utils.settings import AGENT_CLAUDE_HAIKU
from strands.models import BedrockModel
from strands import tool  # type: ignore[attr-defined]
import traceback
import json
import re


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


##################################################################################################
# CHILD AGENT INITIALIZATION
##################################################################################################

# Import child agents and their dependencies
from src.tools.compliance_check import compliance_check_tool, get_all_controls_tool
from src.tools.comprehensive_check import comprehensive_check_tool
from src.tools.doc_status import doc_status_tool
from src.tools.show_doc import show_doc_tool
from src.tools.annotation_tools import (
    get_annotations_tool,
    update_annotation_status_tool,
    update_annotation_details_tool,
    create_annotation_conversation_tool,
    add_message_to_conversation_tool,
    get_conversation_history_tool,
    get_annotation_conversations_tool,
    delete_annotation_tool
)

# Initialize the base model for child agents
child_agent_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU, streaming=False)


class ChildAgentTools:
    """Container for child agent tools following the tool-agent pattern."""
    
    def __init__(self):
        """Initialize child agents with their respective tools."""
        
        # Import full system prompts from child agents
        from src.agents.compliance_agent import SYSTEM_PROMPT as COMPLIANCE_SYSTEM_PROMPT
        from src.agents.annotations_agent import SYSTEM_PROMPT as ANNOTATIONS_SYSTEM_PROMPT
        
        # Create compliance agent tools (wrapped from compliance_agent.py)
        @tool
        def list_docs(user_id: str) -> dict[Any, Any]:
            """Retrieve all documents accessible by the authenticated user."""
            return show_doc_tool(user_id)
        
        @tool
        def doc_status(document_id: str) -> dict[Any, Any]:
            """Retrieve the compliance status of a specific document by its ID."""
            return doc_status_tool(document_id)
        
        @tool
        def comprehensive_check(document_id: str, framework_id: str, force_reanalysis: bool = False) -> dict[Any, Any]:
            """Perform comprehensive compliance analysis on an entire document."""
            return comprehensive_check_tool(document_id, framework_id, force_reanalysis)
        
        @tool
        def phrase_wise_compliance_check(text: str, question: str, framework_id: str, control_id: str = "") -> dict[Any, Any]:
            """Perform targeted compliance analysis on specific text snippets."""
            return compliance_check_tool(text, question, framework_id, control_id)
        
        @tool
        def list_controls(framework_id: str) -> dict[Any, Any]:
            """Retrieve all compliance controls for a specified framework."""
            return get_all_controls_tool(framework_id)
        
        # Create annotations agent tools (wrapped from annotations_agent.py)
        @tool
        def load_annotations(document_id: str, framework_id: str = "", include_resolved: bool = False) -> dict[Any, Any]:
            """Retrieve all annotations for a specific document."""
            return get_annotations_tool(document_id, framework_id if framework_id else None, include_resolved)
        
        @tool
        def update_annotation_status(annotation_id: str, resolved: bool) -> dict[Any, Any]:
            """Mark an annotation as resolved or unresolved."""
            return update_annotation_status_tool(annotation_id, resolved)
        
        @tool
        def update_annotation_details(annotation_id: str, bookmark_type: str = "", review_comments: str = "") -> dict[Any, Any]:
            """Update annotation bookmark type and/or review comments."""
            return update_annotation_details_tool(annotation_id, bookmark_type if bookmark_type else None, review_comments if review_comments else None)
        
        @tool
        def remove_annotation(annotation_id: str) -> dict[Any, Any]:
            """Delete an annotation permanently."""
            return delete_annotation_tool(annotation_id)
        
        @tool
        def start_annotation_conversation(annotation_id: str, user_message: str, user_id: str = "") -> dict[Any, Any]:
            """Start a new conversation thread on an annotation."""
            return create_annotation_conversation_tool(annotation_id, user_message, user_id if user_id else None)
        
        @tool
        def add_conversation_message(session_id: str, message: str, role: str = "user", user_id: str = "") -> dict[Any, Any]:
            """Add a message to an existing annotation conversation."""
            return add_message_to_conversation_tool(session_id, message, role, user_id if user_id else None)
        
        @tool
        def get_annotation_conversation(annotation_id: str) -> dict[Any, Any]:
            """Retrieve all conversation messages for a specific annotation."""
            return get_annotation_conversations_tool(annotation_id)
        
        @tool
        def get_conversation_history(session_id: str, limit: int = 0) -> dict[Any, Any]:
            """Retrieve full conversation history for any session."""
            return get_conversation_history_tool(session_id, limit if limit > 0 else None)
        
        # Initialize child agents with their tools
        self.compliance_agent = Agent(
            model=child_agent_model,
            tools=[list_docs, doc_status, comprehensive_check, phrase_wise_compliance_check, list_controls],
            system_prompt=COMPLIANCE_SYSTEM_PROMPT,
            callback_handler=None
        )
        
        self.annotations_agent = Agent(
            model=child_agent_model,
            tools=[
                load_annotations,
                update_annotation_status,
                update_annotation_details,
                remove_annotation,
                start_annotation_conversation,
                add_conversation_message,
                get_annotation_conversation,
                get_conversation_history
            ],
            system_prompt=ANNOTATIONS_SYSTEM_PROMPT,
            callback_handler=None
        )


# Initialize child agent tools container
_child_agents = ChildAgentTools()


##################################################################################################
# SUPERVISOR AGENT TOOLS (Tool-Agent Pattern)
##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": """Natural language query about compliance analysis, document status, or framework controls.

Examples of queries to route here:
- "Show me all my documents"
- "List documents for user user-123"
- "What's the compliance status of document doc-456?"
- "Analyze document ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c against GDPR"
- "Check my policy document for SOC2 compliance"
- "What are all the HIPAA controls?"
- "List GDPR requirements"
- "Does this text comply with GDPR: [text snippet]"
- "Run comprehensive analysis on document X"
- "Check if this policy meets SOC2 standards"
- "What can you help me with?" (general questions)
- "Tell me about compliance frameworks"

This agent handles:
- Document listing and status
- Full document compliance analysis (GDPR/SOC2/HIPAA)
- Text snippet compliance checks
- Framework controls listing
- Compliance verdicts and recommendations"""
                }
            },
            "required": ["query"]
        }
    }
)
def compliance_agent(query: str) -> str:
    """
    Process compliance-related queries using the specialized compliance agent.
    
    This agent handles:
    - Document compliance analysis (GDPR, SOC2, HIPAA)
    - Listing user documents
    - Document compliance status checks
    - Listing compliance controls for frameworks
    - Comprehensive document analysis against frameworks
    - Phrase-wise compliance checks on specific text
    
    Use this agent when the user asks about:
    - "Show my documents"
    - "Check document X against GDPR"
    - "What are the SOC2 controls?"
    - "Analyze this document for compliance"
    - "Is my document compliant with HIPAA?"
    - "What's the status of document Y?"
    - Any compliance framework analysis or checks
    
    Args:
        query: Natural language query about compliance analysis
    
    Returns:
        JSON string with agent response (error_message, tool_payload, summarised_markdown, suggested_next_actions)
    """
    try:
        print("🔀 Routed to Compliance Agent")
        
        # Invoke the compliance agent directly
        response = str(_child_agents.compliance_agent(query))
        print("Compliance Agent Response:", type(response), response)
        print("###")
        
        # Return the response as JSON string for the supervisor
        return response
        
    except Exception as e:
        error_response: dict[str,Any] = {
            "error_message": f"Compliance agent error: {str(e)}",
            "tool_payload": {},
            "summarised_markdown": f"## ❌ Error\\n\\nCompliance agent failed: {str(e)}",
            "suggested_next_actions": []
        }
        return json.dumps(error_response)


@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": """Natural language query about annotation management, bookmarks, or conversation threads.

Examples of queries to route here:
- "Show me annotations for document ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c"
- "Load all annotations for document doc-123"
- "Get annotations with framework GDPR"
- "Show me resolved annotations"
- "Mark annotation 0199fbd0-981a-7f92-8851-ab87ef9caeac as resolved"
- "Mark annotation ann-456 as unresolved"
- "Update annotation ann-789 to action_required type"
- "Change bookmark type to verify for annotation ann-101"
- "Update review comments for annotation ann-202"
- "Delete annotation ann-303"
- "Remove annotation ann-404"
- "Start a discussion on annotation ann-505: Why is this critical?"
- "Start conversation on annotation ann-606"
- "Add message to conversation: I agree with this assessment"
- "Add this to conversation annotation_ann-707: Let's review this"
- "Get conversation for annotation ann-808"
- "Show me the conversation history for annotation ann-909"
- "Retrieve messages for session annotation_ann-010"

This agent handles:
- Loading/viewing annotations with filters
- Marking annotations resolved/unresolved
- Updating annotation types (action_required, verify, review, info)
- Updating annotation comments/notes
- Deleting annotations permanently
- Starting conversation threads on annotations
- Adding messages to conversations
- Retrieving conversation history"""
                }
            },
            "required": ["query"]
        }
    }
)
def annotations_agent(query: str) -> str:
    """
    Process annotation management queries using the specialized annotations agent.
    
    This agent handles:
    - Loading annotations for documents
    - Updating annotation status (resolved/unresolved)
    - Updating annotation details (type, comments)
    - Deleting annotations
    - Starting conversation threads on annotations
    - Adding messages to conversations
    - Retrieving conversation history
    
    Use this agent when the user asks about:
    - "Show me annotations for document X"
    - "Mark annotation Y as resolved"
    - "Update annotation Z to action_required"
    - "Delete annotation A"
    - "Start a discussion on annotation B"
    - "Get conversation for annotation C"
    - "Add this message to the conversation"
    - Any annotation or bookmark management operations
    
    Args:
        query: Natural language query about annotation management
    
    Returns:
        JSON string with agent response (error_message, tool_payload, summarised_markdown, suggested_next_actions)
    """
    try:
        print("🔀 Routed to Annotations Agent")
        
        # Invoke the annotations agent directly
        response = str(_child_agents.annotations_agent(query))
        
        # Return the response as JSON string for the supervisor
        return response
        
    except Exception as e:
        error_response:dict[str, Any] = {
            "error_message": f"Annotations agent error: {str(e)}",
            "tool_payload": {},
            "summarised_markdown": f"## ❌ Error\\n\\nAnnotations agent failed: {str(e)}",
            "suggested_next_actions": []
        }
        return json.dumps(error_response)


##################################################################################################
# SUPERVISOR AGENT CONFIGURATION
##################################################################################################

non_streaming_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU, streaming=False)

SUPERVISOR_SYSTEM_PROMPT = """You are a routing supervisor agent that ALWAYS returns valid JSON.

� CRITICAL: OUTPUT FORMAT

Your ENTIRE response must be a single valid JSON object with this exact structure:

{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "",
  "suggested_next_actions": []
}

📋 JSON REQUIREMENTS (MANDATORY):

✅ MUST DO:
- Start with { and end with }
- Use double quotes for all strings
- Return the child agent tool's JSON response EXACTLY as received
- NO text before { or after }
- NO empty responses
- NO explanatory text

❌ NEVER DO:
- Return empty response after calling tool
- Add text: "I called the tool and..."
- Create your own JSON instead of tool's JSON
- Return anything except valid JSON object

� WORKFLOW - FOLLOW EXACTLY:

**Step 1:** Route user query to appropriate child agent tool:
- compliance_agent → documents, compliance, frameworks, controls, general questions
- annotations_agent → annotations, bookmarks, conversations

**Step 2:** Call that ONE tool with the user's query

**Step 3:** The tool returns JSON. Return that EXACT JSON as your response. Do NOT add commentary, do NOT return empty response.

🎯 CONCRETE EXAMPLES:

**Example 1:**
User: "Check status of document doc-123"
Action: Call compliance_agent("Check status of document doc-123")
Tool returns: {"error_message": "", "tool_payload": {...}, "summarised_markdown": "...", "suggested_next_actions": [...]}
YOUR RESPONSE: {"error_message": "", "tool_payload": {...}, "summarised_markdown": "...", "suggested_next_actions": [...]}

**Example 2:**
User: "Show annotations"
Action: Call annotations_agent("Show annotations")
Tool returns: {"error_message": "", "tool_payload": {...}, "summarised_markdown": "...", "suggested_next_actions": [...]}
YOUR RESPONSE: {"error_message": "", "tool_payload": {...}, "summarised_markdown": "...", "suggested_next_actions": [...]}

✅ CORRECT: Return tool's JSON exactly
❌ WRONG: Return empty string
❌ WRONG: Return "I routed this to..."
❌ WRONG: Create new JSON structure

🎯 ROUTING DECISION TREE:

**Step 1: Identify Keywords**

If query contains ANY of these keywords → **compliance_agent**:
- "document" + "compliance" / "analyze" / "check" / "status"
- "framework" (GDPR, SOC2, HIPAA)
- "controls" / "requirements"
- "list documents" / "show documents" / "my documents"
- "compliant" / "non-compliant"
- "analyze" + document_id
- "check" + document_id
- Generic questions: "what can you do", "help", "capabilities"

If query contains ANY of these keywords → **annotations_agent**:
- "annotation" (any context)
- "bookmark" (any context)
- "mark as resolved" / "unresolved"
- "update annotation"
- "delete annotation" / "remove annotation"
- "conversation" / "discussion" / "message"
- "show annotations" / "load annotations"
- annotation_id pattern (long UUID strings)
- "session" + "annotation_"

**Step 2: Apply Logic**

DEFAULT RULE: If unclear → **compliance_agent**
(Compliance is the primary workflow, annotations are secondary)

EXPLICIT OVERRIDE: If "annotation" appears anywhere → **annotations_agent**
(Annotation operations are highly specific)

🔍 ROUTING EXAMPLES:

✅ **compliance_agent**:
- "Show my documents" → document listing
- "Check document X against GDPR" → compliance analysis
- "What are SOC2 controls?" → framework controls
- "Analyze this document" → comprehensive check
- "What can you help with?" → generic question

✅ **annotations_agent**:
- "Show annotations for doc-123" → contains "annotation"
- "Mark annotation X as resolved" → contains "annotation" + "resolved"
- "Delete annotation Y" → contains "annotation" + "delete"
- "Start conversation on annotation Z" → contains "annotation" + "conversation"
- "Get annotation conversation" → contains "annotation"

📋 RESPONSE FORMAT:

After calling the appropriate child agent tool, you receive a JSON string. Parse it and return EXACTLY:

{
  "error_message": "<from child agent>",
  "tool_payload": {<from child agent>},
  "summarised_markdown": "<from child agent>",
  "suggested_next_actions": [<from child agent>]
}

🔍 EXAMPLE WORKFLOW:

User: "What can you help me with?"

Step 1: Identify → Generic question → route to compliance_agent
Step 2: Call compliance_agent("What can you help me with?")
Step 3: Receive JSON string:
{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "## 🔍 Compliance Analysis Assistant...",
  "suggested_next_actions": [{"action": "list_docs", "description": "..."}]
}

Step 4: Return EXACTLY that JSON (parse the string and return the object):

✅ CORRECT RESPONSE (PURE JSON):
{
  "error_message": "",
  "tool_payload": {},
  "summarised_markdown": "## 🔍 Compliance Analysis Assistant\n\nI can help you with the following compliance-related tasks:\n\n- **List Documents**: Retrieve all documents accessible by you.\n- **Check Document Status**: Get the compliance status of a specific document.\n- **Comprehensive Check**: Perform a comprehensive compliance analysis on a document.\n- **Targeted Check**: Analyze specific text snippets for compliance issues.\n- **List Controls**: Retrieve all compliance controls for a given framework (GDPR, SOC2, HIPAA, etc).\n\nTo use any of these capabilities, just tell me what you'd like to do and I'll invoke the relevant tool.",
  "suggested_next_actions": [
    {"action": "list_docs", "description": "List all your accessible documents"},
    {"action": "doc_status", "description": "Check the compliance status of a document"},
    {"action": "comprehensive_check", "description": "Analyze a document for compliance"}
  ]
}

❌ WRONG RESPONSE (Adding explanatory text):
The compliance agent can help you with a variety of compliance-related tasks, including:
- Listing all your accessible documents
- Checking the compliance status of a specific document
...

❌ WRONG RESPONSE (Modifying structure):
{
  "supervisor_message": "I've routed your query to the compliance agent",
  "child_response": { ... }
}

⚠️ CRITICAL:
- Return ONLY the JSON object structure shown in ✅ CORRECT RESPONSE
- NO text before the JSON
- NO text after the JSON
- NO modifications to the JSON structure
- EXACTLY match the format from the child agent

🛡️ JSON SANITIZATION:
The supervisor has built-in JSON sanitization that will:
- Fix unescaped newlines and control characters
- Convert smart/curly quotes to straight quotes
- Fix Python syntax (True/False/None → true/false/null)
- Remove invalid escape sequences
- Handle malformed JSON from child agents

Your job is just to route correctly - the supervisor will handle JSON parsing issues.
"""

supervisor_agent = Agent(
    model=non_streaming_model,
    tools=[compliance_agent, annotations_agent],
    system_prompt=SUPERVISOR_SYSTEM_PROMPT,
    callback_handler=None  # Suppress intermediate output for cleaner experience
)

app = BedrockAgentCoreApp()


def sanitize_child_agent_json(json_str: str) -> str:
    """
    Sanitize JSON string from child agents to fix common parsability issues.
    
    Handles:
    - Unescaped newlines in strings
    - Unescaped quotes in strings
    - Invalid backslash escapes
    - Smart/curly quotes
    - Python syntax (True/False/None)
    - Trailing commas
    - Control characters
    
    Args:
        json_str: Raw JSON string from child agent
    
    Returns:
        Sanitized JSON string ready for parsing
    """
    if not json_str or not json_str.strip():
        return json_str
    
    # Step 1: Fix smart/curly quotes to straight quotes
    sanitized = json_str
    sanitized = sanitized.replace('"', '"').replace('"', '"')
    sanitized = sanitized.replace(''', "'").replace(''', "'")
    
    # Step 2: Fix Python types to JSON types
    sanitized = re.sub(r'\bTrue\b', 'true', sanitized)
    sanitized = re.sub(r'\bFalse\b', 'false', sanitized)
    sanitized = re.sub(r'\bNone\b', 'null', sanitized)
    
    # Step 3: Remove trailing commas before closing brackets/braces
    sanitized = re.sub(r',(\s*[}\]])', r'\1', sanitized)
    
    # Step 4: Fix Decimal objects
    sanitized = re.sub(r'Decimal\([\'"]([0-9.]+)[\'"]\)', r'\1', sanitized)
    
    # Step 5: Fix invalid backslash escapes
    # Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
    # This removes backslashes NOT followed by valid escape chars
    sanitized = re.sub(r'\\(?!["\\/bfnrtu])', '', sanitized)
    
    return sanitized


def parse_child_agent_response(response_str: str) -> dict[str, Any]:
    """
    Parse and validate child agent JSON response with comprehensive error recovery.
    
    This function handles responses from child agents (compliance_agent, annotations_agent)
    which may have JSON formatting issues. It attempts multiple strategies to parse
    the response successfully.
    
    Args:
        response_str: JSON string response from child agent
    
    Returns:
        Parsed dictionary matching ResponseModel structure
    
    Raises:
        ValueError: If response cannot be parsed after all recovery attempts
    """
    if not response_str or not response_str.strip():
        raise ValueError("Empty response from child agent")
    
    original_str = response_str
    
    # Remove any markdown code blocks
    if '```' in response_str:
        response_str = re.sub(r'^```(?:json)?\s*\n?', '', response_str)
        response_str = re.sub(r'\n?```\s*$', '', response_str)
    
    # Extract JSON object boundaries
    response_str = response_str.strip()
    start_idx = response_str.find('{')
    end_idx = response_str.rfind('}')
    
    if start_idx == -1 or end_idx == -1:
        raise ValueError(
            f"No JSON object found in child agent response.\n"
            f"Response preview: {original_str[:500]}"
        )
    
    json_str = response_str[start_idx:end_idx + 1]
    
    # Attempt 1: Direct parse (best case)
    try:
        parsed = json.loads(json_str)
        print("✅ Child agent response parsed successfully (direct parse)")
        return parsed
    except json.JSONDecodeError as e:
        print(f"⚠️ Direct parse failed: {e.msg} at position {e.pos}")
    
    # Attempt 2: Sanitize and parse
    sanitized = ""
    try:
        sanitized = sanitize_child_agent_json(json_str)
        parsed = json.loads(sanitized)
        print("✅ Child agent response parsed successfully (after sanitization)")
        return parsed
    except json.JSONDecodeError as e:
        print(f"⚠️ Sanitized parse failed: {e.msg} at position {e.pos}")
        
        # Show error context (sanitized is guaranteed to be set here)
        if sanitized:
            error_pos = e.pos
            context_start = max(0, error_pos - 100)
            context_end = min(len(sanitized), error_pos + 100)
            error_context = sanitized[context_start:context_end]
            print(f"Error context: ...{error_context}...")
    
    # Attempt 3: Manual field extraction as last resort
    try:
        print("⚠️ Attempting manual field extraction from child agent response...")
        
        # Extract fields using regex patterns
        error_msg_match = re.search(r'"error_message"\s*:\s*"([^"]*)"', json_str)
        summarised_match = re.search(r'"summarised_markdown"\s*:\s*"((?:[^"\\]|\\.)*)"', json_str, re.DOTALL)
        
        error_message = error_msg_match.group(1) if error_msg_match else ""
        summarised_markdown = summarised_match.group(1) if summarised_match else ""
        
        # Unescape the extracted strings
        if summarised_markdown:
            summarised_markdown = summarised_markdown.encode().decode('unicode_escape')
        
        # Try to extract tool_payload (more complex)
        tool_payload: dict[str, Any] = {}
        payload_match = re.search(r'"tool_payload"\s*:\s*(\{[^}]*\}|\{\})', json_str)
        if payload_match:
            try:
                tool_payload = json.loads(payload_match.group(1))
            except:
                tool_payload = {}
        
        # Try to extract suggested_next_actions
        suggested_actions: list[dict[str, str]] = []
        actions_match = re.search(r'"suggested_next_actions"\s*:\s*(\[[^\]]*\]|\[\])', json_str)
        if actions_match:
            try:
                suggested_actions = json.loads(actions_match.group(1))
            except:
                suggested_actions = []
        
        print("✅ Child agent response reconstructed via manual extraction")
        
        return {
            "error_message": error_message,
            "tool_payload": tool_payload,
            "summarised_markdown": summarised_markdown,
            "suggested_next_actions": suggested_actions
        }
        
    except Exception as extraction_error:
        print(f"❌ Manual extraction also failed: {extraction_error}")
        raise ValueError(
            f"Failed to parse child agent response after all recovery attempts.\n"
            f"Original response length: {len(original_str)} characters\n"
            f"Last error: {str(extraction_error)}\n"
            f"Response preview: {original_str[:500]}"
        )


def parse_agent_json(text: str) -> dict[str, Any]:
    """
    Parse JSON from agent response with comprehensive error handling.
    Handles: smart quotes, Python syntax, malformed JSON, truncation, XML-like tags.
    """
    sanitized: str = "{}"
    if not text or not text.strip():
        raise ValueError("Empty response from agent")
    
    # Step 0: Handle XML-like tag format from agent
    if '<result>' in text or '<suggested_next_actions>' in text:
        try:
            result_match = re.search(r'<result>\s*(.*?)\s*</result>', text, re.DOTALL)
            actions_match = re.search(r'<suggested_next_actions>\s*(.*?)\s*</suggested_next_actions>', text, re.DOTALL)
            
            summarised_markdown = result_match.group(1).strip() if result_match else ""
            suggested_actions_str = actions_match.group(1).strip() if actions_match else "[]"
            
            try:
                suggested_actions = json.loads(suggested_actions_str)
            except json.JSONDecodeError:
                suggested_actions = []
            
            return {
                "error_message": "",
                "tool_payload": {},
                "summarised_markdown": summarised_markdown,
                "suggested_next_actions": suggested_actions
            }
        except Exception as e:
            print(f"⚠️ Failed to parse XML-like tags: {e}")
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
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
    
    # Step 2: Fix smart/curly quotes
    json_str = (json_str
        .replace('"', '"')
        .replace('"', '"')
        .replace(''', "'")
        .replace(''', "'")
    )
    
    # Step 3: Attempt parsing
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass
    
    # Step 4: Sanitize Python syntax
    try:
        sanitized = json_str
        
        # Fix Python types
        sanitized = re.sub(r'\bTrue\b', 'true', sanitized)
        sanitized = re.sub(r'\bFalse\b', 'false', sanitized)
        sanitized = re.sub(r'\bNone\b', 'null', sanitized)
        
        # Remove trailing commas
        sanitized = re.sub(r',(\s*[}\]])', r'\1', sanitized)
        
        # Fix Decimal objects
        sanitized = re.sub(r'Decimal\([\'"]([0-9.]+)[\'"]\)', r'\1', sanitized)
        
        # Remove invalid backslash escapes
        sanitized = re.sub(r'\\(?!["\\/bfnrtu])', '', sanitized)
        
        return json.loads(sanitized)
    except json.JSONDecodeError as second_error:
        error_pos = second_error.pos
        context_start = max(0, error_pos - 150)
        context_end = min(len(sanitized), error_pos + 150)
        error_context = sanitized[context_start:context_end]
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
    """Entrypoint for Bedrock AgentCoreApp to invoke the supervisor agent."""
    try:
        user_message = event.get("inputText") or event.get("prompt", "")
        session_id = event.get("session_id", str(uuid7()))
        
        print("="*80)
        print("🎯 SUPERVISOR AGENT PROCESSING REQUEST")
        print(f"Query: {user_message[:100]}...")
        print("="*80)
        
        res = str(supervisor_agent(user_message))
        agent_response = str(res)
        
        print("\n" + "="*80)
        print("📤 SUPERVISOR AGENT RAW RESPONSE FROM CHILD")
        print("="*80)
        print(agent_response[:1000] + ("..." if len(agent_response) > 1000 else ""))
        with open("./supervisor_agent_response.txt", "w") as f:
            f.write(agent_response)
        print("="*80 + "\n")
        
        # Parse child agent response with robust error handling
        print("🔧 Parsing child agent response with sanitization...")
        parsed = parse_child_agent_response(agent_response)
        parsed["session_id"] = session_id
        
        print("✅ SUPERVISOR AGENT COMPLETED - Response forwarded from child agent\n")
        
        return parsed
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"❌ Supervisor agent invocation failed: {str(e)}\nTraceback:\n{error_traceback}")
        return {
            "session_id": event.get("session_id", str(uuid7())),
            "error_message": f"Supervisor agent invocation failed: {str(e)}",
            "tool_payload": {},
            "summarised_markdown": f"## ❌ Error\\n\\nFailed to process request: {str(e)}",
            "suggested_next_actions": []
        }


if __name__ == "__main__":
    print("🎯 Supervisor Agent starting on port 8080...")
    print("📋 Orchestrating child agents:")
    print("   - Compliance Agent: Document compliance analysis")
    print("   - Annotations Agent: Annotation and conversation management")
    print("🔀 Agent Mode: Smart routing to specialized agents")
    print("🧠 Response Mode: Forward child agent responses as-is")
    app.run()  # type: ignore[misc]
