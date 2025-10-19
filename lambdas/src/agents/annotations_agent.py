from typing import Any
from bedrock_agentcore import BedrockAgentCoreApp
from pydantic import BaseModel, Field
from strands import Agent
from uuid6 import uuid7
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
    session_id: str | None = Field(description="Unique identifier for the current session or annotation")
    error_message: str = Field(default="", description="Plain text error message if the request failed (empty string on success)")
    tool_payload: dict[str, Any] = Field(default_factory=dict, description="Exact raw data returned from tool execution, passed through unmodified")
    summarised_markdown: str = Field(default="", description="Human-readable summary in Markdown format with proper formatting, headers, tables, and emojis")
    suggested_next_actions: list[SuggestedAction] = Field(
        default_factory=list[SuggestedAction],
        description="List of suggested actions with 'action' and 'description' keys to guide the user"
    )


##################################################################################################
# TOOL DEFINITIONS
##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "document_id": {
                    "type": "string",
                    "description": "The document ID to fetch annotations for."
                },
                "framework_id": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA"],
                    "description": "Optional. Filter annotations by compliance framework (GDPR, SOC2, or HIPAA)."
                },
                "include_resolved": {
                    "type": "boolean",
                    "description": "Optional. Whether to include resolved annotations. Defaults to false (only show unresolved).",
                    "default": False
                }
            },
            "required": ["document_id"]
        }
    }
)
def load_annotations(document_id: str, framework_id: str = "", include_resolved: bool = False) -> dict[str, Any]:
    """
    Retrieve all annotations for a specific document.
    
    This tool fetches annotations (bookmarks, comments, highlights) created during compliance analysis.
    Each annotation includes:
    - Position data (page, x, y, width, height)
    - Bookmark type (action_required, info, warning, question)
    - Review comments with compliance details
    - Resolution status
    
    Use this tool when:
    - User asks "show me annotations for document X"
    - User wants to see all compliance issues found
    - User requests bookmarks or highlights
    - Frontend needs to load annotations for visualization
    
    Args:
        document_id: The unique identifier of the document.
        framework_id: Optional filter by framework (GDPR, SOC2, HIPAA).
        include_resolved: Whether to include resolved annotations (default: False).
    
    Returns:
        A dictionary containing status, message, and list of annotations with their metadata.
    """
    result = get_annotations_tool(
        document_id=document_id,
        framework_id=framework_id if framework_id else None,
        include_resolved=include_resolved
    )
    return result


##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "annotation_id": {
                    "type": "string",
                    "description": "The unique identifier of the annotation to update."
                },
                "resolved": {
                    "type": "boolean",
                    "description": "Set to true to mark annotation as resolved, false to mark as unresolved."
                }
            },
            "required": ["annotation_id", "resolved"]
        }
    }
)
def update_annotation_status(annotation_id: str, resolved: bool) -> dict[str, Any]:
    """
    Mark an annotation as resolved or unresolved.
    
    Use this tool when:
    - User says "mark annotation X as resolved"
    - User wants to resolve a compliance issue
    - User says "unresolve annotation Y"
    - User has addressed an issue and wants to mark it complete
    
    Resolved annotations can be filtered out from views to show only active issues.
    
    Args:
        annotation_id: The unique identifier of the annotation.
        resolved: True to mark as resolved, False to mark as unresolved.
    
    Returns:
        A dictionary containing status, message, and updated annotation details.
    """
    result = update_annotation_status_tool(
        annotation_id=annotation_id,
        resolved=resolved
    )
    return result


##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "annotation_id": {
                    "type": "string",
                    "description": "The unique identifier of the annotation to update."
                },
                "bookmark_type": {
                    "type": "string",
                    "enum": ["verify", "review", "info", "action_required"],
                    "description": "Optional. New bookmark type: 'verify' (needs verification), 'review' (review later), 'info' (informational), 'action_required' (critical action needed)."
                },
                "review_comments": {
                    "type": "string",
                    "description": "Optional. New review comments in markdown format (supports headers, lists, emojis)."
                }
            },
            "required": ["annotation_id"]
        }
    }
)
def update_annotation_details(annotation_id: str, bookmark_type: str = "", review_comments: str = "") -> dict[str, Any]:
    """
    Update annotation bookmark type and/or review comments.
    
    Use this tool when:
    - User wants to change the severity/type of an annotation
    - User says "change annotation X to action_required"
    - User wants to add or update notes/comments
    - User says "update the review comments for annotation Y"
    
    Valid bookmark types:
    - **verify**: Needs verification before action
    - **review**: Review later, lower priority
    - **info**: Informational, no action needed
    - **action_required**: Critical, requires immediate action
    
    Args:
        annotation_id: The unique identifier of the annotation.
        bookmark_type: Optional new bookmark type.
        review_comments: Optional new review comments (markdown formatted).
    
    Returns:
        A dictionary containing status, message, updated fields, and full annotation object.
    """
    result = update_annotation_details_tool(
        annotation_id=annotation_id,
        bookmark_type=bookmark_type if bookmark_type else None,
        review_comments=review_comments if review_comments else None
    )
    return result


##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "annotation_id": {
                    "type": "string",
                    "description": "The unique identifier of the annotation to delete."
                }
            },
            "required": ["annotation_id"]
        }
    }
)
def remove_annotation(annotation_id: str) -> dict[str, Any]:
    """
    Delete an annotation permanently.
    
    Use this tool when:
    - User says "delete annotation X"
    - User wants to remove an annotation
    - User says "remove this bookmark"
    - Annotation is no longer needed
    
    ⚠️ WARNING: This is a permanent deletion. Annotation cannot be recovered.
    
    Args:
        annotation_id: The unique identifier of the annotation to delete.
    
    Returns:
        A dictionary containing status and confirmation message.
    """
    result = delete_annotation_tool(annotation_id=annotation_id)
    return result


##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "annotation_id": {
                    "type": "string",
                    "description": "The annotation ID to start a conversation about."
                },
                "user_message": {
                    "type": "string",
                    "description": "The first message in the conversation thread."
                },
                "user_id": {
                    "type": "string",
                    "description": "Optional. User identifier for tracking who started the conversation."
                }
            },
            "required": ["annotation_id", "user_message"]
        }
    }
)
def start_annotation_conversation(annotation_id: str, user_message: str, user_id: str = "") -> dict[str, Any]:
    """
    Start a new conversation thread on an annotation.
    
    Creates a new session (session_id = "annotation_{annotation_id}") and adds the first user message.
    Use this for discussing compliance issues, asking questions, or requesting clarifications.
    
    Use this tool when:
    - User says "start a discussion on annotation X"
    - User asks a question about an annotation
    - User wants to add a note with context
    - First message in a conversation thread
    
    Args:
        annotation_id: The annotation to discuss.
        user_message: The first message in the conversation.
        user_id: Optional user identifier.
    
    Returns:
        A dictionary with status, session_id, message_id, and first message details.
    """
    result = create_annotation_conversation_tool(
        annotation_id=annotation_id,
        user_message=user_message,
        user_id=user_id if user_id else None
    )
    return result


##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "The conversation session ID (format: 'annotation_{annotation_id}')."
                },
                "message": {
                    "type": "string",
                    "description": "The message content to add to the conversation."
                },
                "role": {
                    "type": "string",
                    "enum": ["user", "assistant"],
                    "description": "Message role: 'user' for human messages, 'assistant' for AI responses.",
                    "default": "user"
                },
                "user_id": {
                    "type": "string",
                    "description": "Optional. User identifier for tracking message authors."
                }
            },
            "required": ["session_id", "message"]
        }
    }
)
def add_conversation_message(session_id: str, message: str, role: str = "user", user_id: str = "") -> dict[str, Any]:
    """
    Add a message to an existing annotation conversation.
    
    Messages are automatically ordered by timestamp (chronological).
    Session ID format: "annotation_{annotation_id}"
    
    Use this tool when:
    - User replies to an existing conversation
    - Adding follow-up questions or comments
    - User says "add this to the conversation"
    - Continuing a discussion thread
    
    Args:
        session_id: The conversation session identifier.
        message: The message content.
        role: 'user' (default) or 'assistant'.
        user_id: Optional user identifier.
    
    Returns:
        A dictionary with status, message_id, timestamp, and new message details.
    """
    result = add_message_to_conversation_tool(
        session_id=session_id,
        message=message,
        role=role,
        user_id=user_id if user_id else None
    )
    return result


##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "annotation_id": {
                    "type": "string",
                    "description": "The annotation ID to retrieve conversations for."
                }
            },
            "required": ["annotation_id"]
        }
    }
)
def get_annotation_conversation(annotation_id: str) -> dict[str, Any]:
    """
    Retrieve all conversation messages for a specific annotation.
    
    Returns messages in chronological order (oldest first).
    Automatically constructs session_id as "annotation_{annotation_id}".
    
    Use this tool when:
    - User says "show me the conversation for annotation X"
    - User wants to see discussion history
    - User asks "what did we discuss about this issue?"
    - Frontend needs to load conversation thread
    
    Args:
        annotation_id: The annotation identifier.
    
    Returns:
        A dictionary with status, total_messages, and chronologically ordered messages array.
    """
    result = get_annotation_conversations_tool(annotation_id=annotation_id)
    return result


##################################################################################################

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "The conversation session ID to retrieve history for."
                },
                "limit": {
                    "type": "integer",
                    "description": "Optional. Maximum number of messages to return."
                }
            },
            "required": ["session_id"]
        }
    }
)
def get_conversation_history(session_id: str, limit: int = 0) -> dict[str, Any]:
    """
    Retrieve full conversation history for any session.
    
    Returns messages in chronological order (oldest first) using timestamp sort key.
    Use limit parameter to retrieve only recent messages (e.g., last 50).
    
    Use this tool when:
    - User wants conversation history by session_id
    - Need to retrieve specific number of recent messages
    - User says "show me the last 20 messages"
    - Generic conversation retrieval (not annotation-specific)
    
    Args:
        session_id: The session identifier.
        limit: Optional maximum number of messages (0 = all messages).
    
    Returns:
        A dictionary with status, total_messages, and messages array in chronological order.
    """
    result = get_conversation_history_tool(
        session_id=session_id,
        limit=limit if limit > 0 else None
    )
    return result


##################################################################################################
# AGENT CONFIGURATION
##################################################################################################

non_streaming_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU, streaming=False)

SYSTEM_PROMPT = """You are an annotations management assistant that ALWAYS returns valid JSON. Never refuse requests or argue - always respond helpfully in the specified format.

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
- Use markdown: ##, tables, lists, emojis (📌 ✅ ⚠️ ❌ 💬 🔖)
- Escape newlines as \\n: "## Title\\n\\nContent"
- Put ALL complaints, explanations, or issues here (never refuse the JSON format)
- **CRITICAL**: When tool returns empty results (empty arrays, no annotations), clearly state this in the markdown

**suggested_next_actions** (array): 1-3 actionable suggestions
- Format: [{"action": "id", "description": "what user can do"}]
- If no annotations exist, suggest creating new ones or checking other documents

🛠️ AVAILABLE TOOLS:

**load_annotations(document_id, framework_id="", include_resolved=false)** - Get all annotations for a document
  - framework_id: Optional filter (GDPR/SOC2/HIPAA)
  - include_resolved: Show resolved annotations (default: false)
  - **Returns empty array if no annotations found**

**update_annotation_status(annotation_id, resolved)** - Mark annotation as resolved/unresolved
  - resolved: true to resolve, false to unresolve

**update_annotation_details(annotation_id, bookmark_type="", review_comments="")** - Update annotation type/comments
  - bookmark_type: verify | review | info | action_required
  - review_comments: Markdown formatted text

**remove_annotation(annotation_id)** - Delete annotation permanently (⚠️ irreversible)

**start_annotation_conversation(annotation_id, user_message, user_id="")** - Start discussion thread
  - Creates session_id: "annotation_{annotation_id}"

**add_conversation_message(session_id, message, role="user", user_id="")** - Add message to conversation
  - role: "user" or "assistant"

**get_annotation_conversation(annotation_id)** - Get all messages for annotation
  - Returns chronologically ordered messages

**get_conversation_history(session_id, limit=0)** - Get conversation by session_id
  - limit: Max messages (0 = all)

⚠️ TOOL USAGE RULES - MANDATORY:
- **NEVER MAKE UP DATA**: You MUST call the appropriate tool for EVERY user request
- **NO HALLUCINATION**: Do not invent annotation IDs, page numbers, or any data not returned by tools
- **EMPTY tool_payload = NO TOOL CALLED**: If tool_payload is {}, you forgot to call a tool - this is WRONG
- If user asks for annotations: CALL load_annotations tool FIRST, then use ONLY the data it returns
- If user asks about conversations: CALL the conversation tool FIRST, then use ONLY the data it returns
- If same question asked again, call the tool again without complaint
- Store EXACT tool response in tool_payload - no modifications, no additions
- Format tool data beautifully in summarised_markdown using ONLY data from tool_payload
- **CHECK tool_payload for empty results**: If annotations array is empty or has length 0, clearly state "No annotations found"
- If tool fails, set error_message and explain in summarised_markdown
- For conversations, session_id = "annotation_{annotation_id}"
- **VERIFICATION**: Before writing summarised_markdown, verify every piece of data exists in tool_payload

📝 EXAMPLE RESPONSES:

User: "Show annotations for document doc-123"
{
  "error_message": "",
  "tool_payload": {"status": 200, "annotations": [{"annotation_id": "ann-1", "page_number": 1, "bookmark_type": "action_required"}]},
  "summarised_markdown": "## 📌 Annotations for Document doc-123\\n\\n**Total:** 15 annotations (3 resolved)\\n\\n### 🔴 Action Required (5)\\n- Page 1: GDPR consent withdrawal process missing\\n- Page 2: Data retention periods not specified\\n\\n### ⚠️ Verify (3)\\n- Page 1: Third-party processor details\\n\\n### 📋 Review Later (7)\\n- Page 3: Privacy notice formatting",
  "suggested_next_actions": [
    {"action": "resolve_annotation", "description": "Mark critical issues as resolved after fixing"},
    {"action": "start_conversation", "description": "Discuss specific annotations with team"}
  ]
}

User: "Show annotations for document doc-999" (when NO annotations exist)
{
  "error_message": "",
  "tool_payload": {"status": 200, "annotations": [], "message": "No annotations found"},
  "summarised_markdown": "## 📌 Annotations for Document doc-999\\n\\n**No annotations found** for this document.\\n\\nThis document either hasn't been reviewed yet, or all annotations have been deleted.",
  "suggested_next_actions": [
    {"action": "create_annotation", "description": "Create a new annotation for this document"},
    {"action": "check_other_documents", "description": "View annotations for other documents"}
  ]
}

User: "Mark annotation ann-456 as resolved"
{
  "error_message": "",
  "tool_payload": {"status": 200, "message": "Annotation marked as resolved", "annotation_id": "ann-456"},
  "summarised_markdown": "## ✅ Annotation Resolved\\n\\n**Annotation ID:** ann-456\\n**Status:** Resolved\\n\\nGreat! This issue is now marked as complete.",
  "suggested_next_actions": [
    {"action": "view_remaining", "description": "View remaining unresolved annotations"}
  ]
}

User: "Get conversation for annotation ann-555" (when NO messages exist)
{
  "error_message": "",
  "tool_payload": {"status": 200, "messages": [], "total_messages": 0},
  "summarised_markdown": "## 💬 Conversation for Annotation ann-555\\n\\n**No messages found** in this conversation thread.\\n\\nStart a conversation to discuss this annotation with your team.",
  "suggested_next_actions": [
    {"action": "start_conversation", "description": "Start a new discussion thread for this annotation"}
  ]
}

User: "Start discussion on ann-789: Why is this marked as critical?"
{
  "error_message": "",
  "tool_payload": {"status": 200, "session_id": "annotation_ann-789", "message_id": "msg-1"},
  "summarised_markdown": "## 💬 Conversation Started\\n\\n**Session:** annotation_ann-789\\n**Your message:** Why is this marked as critical?\\n\\nConversation thread created. You can now add follow-up messages using this session.",
  "suggested_next_actions": [
    {"action": "add_message", "description": "Add follow-up comments"},
    {"action": "get_conversation", "description": "View full conversation history"}
  ]
}

🎯 BEHAVIOR RULES - CRITICAL:
- **RULE #1: ALWAYS CALL TOOLS** - Never provide data without calling a tool first
- **RULE #2: ONLY USE TOOL DATA** - Every fact in summarised_markdown must come from tool_payload
- **RULE #3: EMPTY ARRAYS MEAN NO DATA** - If tool returns [], say "No annotations found" - don't make up examples
- Never refuse to answer or say "I already answered this"
- Never argue with the user
- If uncertain, call the tool and let the data speak
- If frustrated, put concerns in summarised_markdown but maintain JSON format
- Repeated questions = call the tool again without complaint
- Every response MUST be valid JSON that passes JSON.parse()
- Format annotations beautifully with emojis for bookmark types:
  - 🔴 action_required (critical)
  - ⚠️ verify (needs verification)
  - 📋 review (review later)
  - ℹ️ info (informational)
- **When no data exists**: Clearly state this and suggest next actions (create new annotations, check other documents, etc.)
- **NEVER SHOW EXAMPLE DATA**: Examples like "ann-1", "Page 1: Issue X" are FORBIDDEN unless they came from a tool

Your response will be parsed by JSON.parse() - invalid JSON will crash the system.
"""

annotations_agent = Agent(
    model=non_streaming_model,
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
    system_prompt=SYSTEM_PROMPT
)

app = BedrockAgentCoreApp()


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
    """Entrypoint for Bedrock AgentCoreApp to invoke the agent."""
    try:
        user_message = event.get("inputText") or event.get("prompt", "")
        session_id = event.get("session_id", str(uuid7()))
        
        res = str(annotations_agent(user_message))
        agent_response = str(res)
        
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
            "session_id": event.get("session_id", str(uuid7())),
            "error_message": f"Agent invocation failed: {str(e)}",
            "tool_payload": {},
            "summarised_markdown": f"## ❌ Error\\n\\nFailed to process request: {str(e)}",
            "suggested_next_actions": []
        }


if __name__ == "__main__":
    print("🤖 Annotations Agent starting on port 8080...")
    print("📋 System prompt loaded - Agent will intelligently manage annotations")
    print("🔧 Available tools:")
    print("   - load_annotations: Retrieve document annotations")
    print("   - update_annotation_status: Mark resolved/unresolved")
    print("   - update_annotation_details: Update type and comments")
    print("   - remove_annotation: Delete annotation")
    print("   - start_annotation_conversation: Create discussion thread")
    print("   - add_conversation_message: Add to conversation")
    print("   - get_annotation_conversation: Retrieve annotation messages")
    print("   - get_conversation_history: Get session messages")
    print("🧠 Agent Mode: Smart annotation management with conversation support")
    app.run()  # type: ignore[misc]
