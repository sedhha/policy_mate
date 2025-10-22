from typing import Any
from pydantic import BaseModel, Field
from strands import Agent, tool # pyright: ignore[reportUnknownVariableType]
from strands.hooks import HookProvider, HookRegistry
from strands.hooks.events import AfterInvocationEvent, AfterToolCallEvent

from src.agents.v2.prompts import COMPLIANCE_AGENT_SYSTEM_PROMPT, DRAFTING_AGENT_SYSTEM_PROMPT, ANNOTATIONS_AGENT_SYSTEM_PROMPT
from src.tools.compliance_check import compliance_check_tool, get_all_controls_tool
from src.agents.v2.v2_tools.comprehensive_check_v2 import comprehensive_check_tool, deserialize_dynamodb_item as replace_decimal
from src.tools.doc_status import doc_status_tool
from src.utils.settings import AGENT_CLAUDE_HAIKU_4_5 as AGENT_MODEL
from strands.models import BedrockModel
from src.tools.show_doc import show_doc_tool
from src.agents.v2.agent_core_drafting_agent import browser_tool
from src.agents.v2.agent_core_annotations_agent import (
    load_annotations,
    update_annotation_status,
    update_annotation_details,
    remove_annotation,
    start_annotation_conversation,
    add_conversation_message,
    get_annotation_conversation,
    get_conversation_history
)
import json

def parse_agent_json(agent_response: str) -> dict[str, Any]:
    """Parse the agent response JSON string into a dictionary."""
    try:
        parsed = json.loads(agent_response)
        return parsed
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse agent response JSON: {str(e)}")


class CleanupHook(HookProvider):
    """Hook to clean up model responses after generation completes."""
    def register_hooks(self, registry: HookRegistry) -> None: # type: ignore
        registry.add_callback(AfterInvocationEvent, self.after_model_call)
        registry.add_callback(AfterToolCallEvent, self.after_tool_call)
    def after_tool_call(self, event: AfterToolCallEvent) -> None:
        """No-op for tool calls."""
        print("tool result received")
        print("------------------------------------------------------------")

    def after_model_call(self, event: AfterInvocationEvent) -> None:
        """
        Modify the model's response after it completes generation.
        This fires after EVERY model call (including tool-use and final response).
        """
        complete_message:dict[str, Any] = event.agent.messages[-1] if event.agent.messages else {} # type: ignore
        if complete_message['role'] != 'assistant':
            return  # Only process assistant messages
        messages: list[dict[str, Any]] = complete_message.get('content', [])
        if isinstance(messages, list): # type: ignore
            for each_message in messages:
                if "text" in each_message and isinstance(each_message["text"], str):
                    each_message["text"] = each_message["text"].strip().replace("```json", "").replace("```", "")

class SuggestedAction(BaseModel):
    """A suggested next action for the user."""
    action: str = Field(description="Short human-readable action identifier")
    description: str = Field(description="Prompt that helps agent execute this action")


class ResponseModel(BaseModel):
    """Complete agent response structure."""
    session_id: str | None = Field(description="Session identifier")
    error_message: str = Field(default="", description="Error description (empty on success)")
    tool_used: str = Field(description="Name of the tool that was called (e.g., 'list_docs', 'doc_status')")
    tool_payload: dict[str, Any] = Field(description="Raw tool data - MUST be actual tool response, not fabricated")
    summarised_markdown: str = Field(default="", description="Formatted markdown summary")
    suggested_next_actions: list[SuggestedAction] = Field(
        default_factory=list[SuggestedAction],
        description="List of contextual next actions"
    )


# ==================== COMPLIANCE ANALYSIS TOOLS ====================

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string", "description": "User ID to fetch documents for"}
            },
            "required": ["user_id"]
        }
    }
)
def list_docs(user_id: str) -> str:
    """Get all documents for a user. Returns stringified JSON."""
    result = show_doc_tool(user_id)
    result = replace_decimal(result)
    return json.dumps(result)


@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "document_id": {"type": "string", "description": "Document ID"}
            },
            "required": ["document_id"]
        }
    }
)
def doc_status(document_id: str) -> str:
    """Get compliance status for a document. Returns stringified JSON."""
    result = doc_status_tool(document_id)
    result = replace_decimal(result)
    return json.dumps(result)


@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "document_id": {"type": "string", "description": "Document ID"},
                "framework_id": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA"],
                    "description": "Compliance framework"
                },
                "force_reanalysis": {
                    "type": "boolean",
                    "description": "Force fresh analysis (default: false)",
                    "default": False
                }
            },
            "required": ["document_id", "framework_id"]
        }
    }
)
def comprehensive_check(document_id: str, framework_id: str, force_reanalysis: bool = False) -> str:
    """Analyze entire document against framework. Returns stringified JSON."""
    result = comprehensive_check_tool(document_id, framework_id, force_reanalysis)
    result = replace_decimal(result)
    return json.dumps(result)


@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to analyze"},
                "question": {"type": "string", "description": "Compliance question"},
                "framework_id": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA"],
                    "description": "Compliance framework"
                },
                "control_id": {
                    "type": "string",
                    "description": "Optional specific control ID",
                    "default": ""
                }
            },
            "required": ["text", "question", "framework_id"]
        }
    }
)
def phrase_wise_compliance_check(text: str, question: str, framework_id: str, control_id: str = "") -> str:
    """Analyze specific text snippet for compliance. Returns stringified JSON."""
    result = compliance_check_tool(text, question, framework_id, control_id)
    result = replace_decimal(result)
    return json.dumps(result)


@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "framework_id": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA"],
                    "description": "Framework to list controls for"
                }
            },
            "required": ["framework_id"]
        }
    }
)
def list_controls(framework_id: str) -> str:
    """Get all controls for a framework. Returns stringified JSON."""
    result = get_all_controls_tool(framework_id)
    result = replace_decimal(result)
    return json.dumps(result)


@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "json_string": {"type": "string", "description": "JSON string to parse"}
            },
            "required": ["json_string"]
        }
    }
)
def parse_json(json_string: str) -> str:
    """Parse JSON string and return it. Use this to parse tool outputs before including in tool_payload."""
    try:
        parsed = json.loads(json_string)
        return json.dumps({"success": True, "data": parsed})
    except json.JSONDecodeError as e:
        return json.dumps({"success": False, "error": str(e)})


# ==================== ANNOTATION MANAGEMENT SUB-AGENT ====================

@tool(
    inputSchema={
        "json": {
            "type": "object", 
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Natural language query about annotation management, bookmarks, or conversation threads"
                }
            },
            "required": ["query"]
        }
    }
)
def annotations_manager(query: str) -> str:
    """
    Route annotation-related queries to the specialized annotations agent.
    
    This tool handles all annotation operations:
    - Loading/viewing annotations for documents
    - Managing annotation status (resolved/unresolved) 
    - Updating annotation details (type, comments)
    - Deleting annotations
    - Starting and managing conversation threads
    
    Use this when users ask about:
    - "Show annotations for document X"
    - "Mark annotation Y as resolved"
    - "Update annotation details"
    - "Delete annotation Z"
    - "Start discussion on annotation"
    - "Get conversation history"
    
    Args:
        query: Natural language query about annotations
        
    Returns:
        JSON string with agent response from annotations specialist
    """
    try:
        # Create specialized annotations agent with Sonnet for better output
        annotations_agent = Agent(
            model=BedrockModel(model_id=AGENT_MODEL, streaming=False),
            system_prompt=ANNOTATIONS_AGENT_SYSTEM_PROMPT,
            tools=[load_annotations,
                   update_annotation_status,
                   update_annotation_details,
                   remove_annotation,
                   start_annotation_conversation,
                   add_conversation_message,
                   get_annotation_conversation,
                   get_conversation_history
                   ],
            callback_handler=None  # Suppress intermediate output
        )
        
        result = annotations_agent(query)
        return str(result)
        
    except Exception as e:
        error_response: dict[str, Any] = {
            "error_message": f"Annotations agent error: {str(e)}",
            "tool_payload": {},
            "summarised_markdown": f"## ❌ Annotation Error\\n\\nFailed to process annotation request: {str(e)}",
            "suggested_next_actions": [
                {"action": "retry_request", "description": "Please try your annotation request again"}
            ]
        }
        return json.dumps(error_response)


# ==================== DOCUMENT DRAFTING SUB-AGENT ====================

@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "user_request": {
                    "type": "string",
                    "description": "User's request for document drafting or editing"
                },
                "framework": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA", "ISO27001", "NIST", "GENERAL"],
                    "description": "Compliance framework to align with"
                },
                "document_type": {
                    "type": "string",
                    "enum": [
                        "privacy_policy",
                        "data_retention_policy",
                        "incident_response_plan",
                        "security_policy",
                        "access_control_policy",
                        "data_processing_agreement",
                        "business_continuity_plan",
                        "acceptable_use_policy",
                        "custom"
                    ],
                    "description": "Type of compliance document to draft"
                },
                "product_context": {
                    "type": "string",
                    "description": "Product/service details for customization",
                    "default": ""
                },
                "section_focus": {
                    "type": "string",
                    "description": "Specific section to work on (optional)",
                    "default": ""
                },
                "existing_content": {
                    "type": "string",
                    "description": "Existing content to refine (optional)",
                    "default": ""
                },
                "tone": {
                    "type": "string",
                    "enum": ["formal", "conversational", "technical"],
                    "description": "Writing tone",
                    "default": "formal"
                }
            },
            "required": ["user_request", "framework", "document_type"]
        }
    }
)
def document_drafting_assistant(
    user_request: str,
    framework: str,
    document_type: str,
    product_context: str = "",
    section_focus: str = "",
    existing_content: str = "",
    tone: str = "formal"
) -> str:
    """
    Draft or refine compliance documents using specialized drafting agent.
    
    Creates professional compliance documents including:
    - Privacy policies
    - Security policies
    - Incident response plans
    - Data processing agreements
    - Custom compliance documents
    
    Features:
    - Framework-aligned content (GDPR, SOC2, HIPAA, etc.)
    - Proper citations and references
    - Customizable placeholders
    - Section-by-section editing
    - Professional formatting
    
    Use this when users ask to:
    - "Draft a privacy policy"
    - "Create a GDPR data retention policy"
    - "Write an incident response plan"
    - "Generate a security policy"
    - "Improve my existing policy"
    """
    try:
        
        # Create specialized drafting agent with Sonnet for better output
        drafting_agent = Agent(
            model=BedrockModel(model_id=AGENT_MODEL, streaming=False),
            system_prompt=DRAFTING_AGENT_SYSTEM_PROMPT,
            tools=[browser_tool.browser],  # Drafting agent doesn't need additional tools
            callback_handler=None  # Suppress intermediate output
        )
        
        # Format comprehensive query
        query_parts = [
            f"User Request: {user_request}",
            f"Framework: {framework}",
            f"Document Type: {document_type}"
        ]
        
        if product_context:
            query_parts.append(f"Product Context: {product_context}")
        if section_focus:
            query_parts.append(f"Section Focus: {section_focus}")
        if existing_content:
            query_parts.append(f"Existing Content to Refine:\n{existing_content}")
        if tone:
            query_parts.append(f"Tone: {tone}")
        
        formatted_query = "\n\n".join(query_parts)
        
        # Get response from drafting agent
        response = drafting_agent(formatted_query)
        
        # Extract text from response
        if hasattr(response, 'content'):
            if isinstance(response.content, list): # type: ignore
                drafted_content = "\n".join(
                    block.get('text', '') if isinstance(block, dict) else str(block) # type: ignore
                    for block in response.content # type: ignore
                )
            else:
                drafted_content = str(response.content) # type: ignore
        else:
            drafted_content = str(response)
        
        # Structure the response
        result:dict[str,Any] = {
            "success": True,
            "document_type": document_type,
            "framework": framework,
            "drafted_markdown": drafted_content,
            "sections_included": _extract_sections(drafted_content),
            "customization_required": _find_placeholders(drafted_content),
            "word_count": len(drafted_content.split())
        }
        
        return json.dumps(result)
        
    except Exception as e:
        print(f"❌ Document drafting error: {e}")
        return json.dumps({
            "success": False,
            "error": f"Failed to draft document: {str(e)}",
            "document_type": document_type,
            "framework": framework
        })


def _extract_sections(markdown: str) -> list[str]:
    """Extract section headers from markdown"""
    import re
    sections = re.findall(r'^##\s+(.+)$', markdown, re.MULTILINE)
    return sections[:10]  # Return first 10 sections


def _find_placeholders(markdown: str) -> list[str]:
    """Find customization placeholders in document"""
    import re
    placeholders = re.findall(r'\[([A-Z\s]+)\]', markdown)
    return list(set(placeholders))[:8]  # Return unique placeholders, max 8


# ==================== AGENT INITIALIZATION ====================

# Use Haiku for main orchestrator (fast routing)
orchestrator_model = BedrockModel(model_id=AGENT_MODEL, streaming=False)

# Main compliance agent with all tools including drafting sub-agent
compliance_agent = Agent(
    model=orchestrator_model,
    hooks=[CleanupHook()],
    tools=[
        # Compliance analysis tools
        list_docs,
        doc_status,
        comprehensive_check,
        phrase_wise_compliance_check,
        list_controls,
        parse_json,
        # Annotation management sub-agent
        annotations_manager,
        # Document drafting sub-agent
        document_drafting_assistant
    ],
    system_prompt=COMPLIANCE_AGENT_SYSTEM_PROMPT
)


# ==================== RESPONSE PARSER ====================

def parse_agent_response(text: str) -> dict[str, Any]:
    """Parse agent response into dictionary"""
    if not text or not text.strip():
        return {
            "session_id": None,
            "error_message": "Empty response from agent",
            "tool_payload": "{}",
            "summarised_markdown": "**Error:** No response received.",
            "suggested_next_actions": []
        }
    
    text = text.strip()
    
    # Remove markdown code blocks
    if text.startswith('```'):
        text = text.split('\n', 1)[1] if '\n' in text else text[3:]
    if text.endswith('```'):
        text = text.rsplit('\n', 1)[0] if '\n' in text else text[:-3]
    text = text.strip()
    
    try:
        response = json.loads(text)
        
        # Validate structure
        required_keys = {"session_id", "error_message", "tool_payload", "summarised_markdown", "suggested_next_actions"}
        if not all(key in response for key in required_keys):
            missing = required_keys - set(response.keys())
            return {
                "session_id": None,
                "error_message": f"Invalid structure: missing {missing}",
                "tool_payload": "{}",
                "summarised_markdown": f"**Error:** Missing fields: {missing}",
                "suggested_next_actions": []
            }
        
        return response
        
    except json.JSONDecodeError as e:
        return {
            "session_id": None,
            "error_message": f"JSON parse error: {str(e)}",
            "tool_payload": "{}",
            "summarised_markdown": f"**Error:** Invalid JSON response.\n\n```\n{text[:500]}\n```",
            "suggested_next_actions": [
                {"action": "Retry request", "description": "Please try again"}
            ]
        }


# ==================== HELPER FUNCTION FOR TESTING ====================

def test_compliance_agent(query: str, user_id: str = "test-user") -> dict[str, Any]:
    """
    Test the compliance agent with a query
    
    Args:
        query: User query
        user_id: User identifier for document operations
    
    Returns:
        Parsed agent response
    """
    try:
        # Inject user_id into query context if needed
        contextualized_query = f"[User ID: {user_id}] {query}"
        
        # Get response from agent
        response = compliance_agent(contextualized_query)
        
        # Extract text
        if hasattr(response, 'content'):
            if isinstance(response.content, list): # type: ignore
                response_text = "\n".join(
                    block.get('text', '') if isinstance(block, dict) else str(block) # type: ignore
                    for block in response.content # type: ignore
                )
            else:
                response_text = str(response.content) # type: ignore
        else:
            response_text = str(response)
        
        # Parse and return
        return parse_agent_response(response_text)
        
    except Exception as e:
        return {
            "session_id": None,
            "error_message": f"Agent execution error: {str(e)}",
            "tool_payload": "{}",
            "summarised_markdown": f"**Error:** {str(e)}",
            "suggested_next_actions": []
        }