from typing import Any
from pydantic import BaseModel, Field
from strands import Agent

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
from src.utils.settings import AGENT_CLAUDE_HAIKU_4_5
from strands.models import BedrockModel
from strands import tool  # type: ignore[attr-defined]
from src.agents.v2.prompts import ANNOTATIONS_AGENT_SYSTEM_PROMPT


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

non_streaming_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU_4_5, streaming=False)


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
    system_prompt=ANNOTATIONS_AGENT_SYSTEM_PROMPT
)
