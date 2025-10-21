# lambdas/annotations_agent_handler.py

from typing import Any
import json
import traceback
import logging
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.cognito_auth import require_cognito_auth
from src.agents.annotations_agent import annotations_agent, parse_agent_json
from uuid6 import uuid7

logging.getLogger('boto3').setLevel(logging.WARNING)
logging.getLogger('botocore').setLevel(logging.WARNING)
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('strands').setLevel(logging.WARNING)


def create_user_metadata_str(claims: dict[str, Any]) -> str:
    """
    Create a user metadata string from claims for the agent prompt.
    """
    user_email = claims["email"]
    user_id = claims["sub"]
    return f"[user_email={user_email}] [user_id={user_id}]"


@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Invokes the Bedrock AgentCore runtime.
    Assumes @require_cognito_auth verified the JWT and added event["validated_token"] and event["user_claims"].
    """
    agent_response: str = ""
    try:
        body = json.loads(event.get("body", "{}"))
        prompt = body.get('prompt', '')
        # user_meta = create_user_metadata_str(event['user_claims'])
        
        # Use user_id as default, or generate new UUID7 if not provided
        session_id = body.get('session_id', str(uuid7()))
        
        # Append user metadata to prompt
        prompt_with_meta = f'{prompt}'
        
        log_with_context(
            "INFO", 
            f"Invoking annotations agent. Prompt length: {len(prompt_with_meta)} chars",
            context.aws_request_id
        )
        
        # Get agent response
        res = annotations_agent(prompt_with_meta)
        agent_response = str(res)
        
        # Log response size, NOT content (prevents CloudWatch fragmentation)
        log_with_context(
            "INFO",
            f"Agent response received: {len(agent_response)} characters",
            context.aws_request_id
        )
        
        # Parse the JSON response
        parsed = parse_agent_json(agent_response)
        parsed["session_id"] = session_id
        
        log_with_context(
            "INFO",
            "Successfully parsed agent response",
            context.aws_request_id
        )
        
        return {
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Content-Type": "application/json; charset=utf-8"
            },
            "statusCode": 200,
            "body": json.dumps(parsed, ensure_ascii=False),
        }
        
    except json.JSONDecodeError as e:
        error_msg = f"JSON parsing failed: {str(e)}"
        log_with_context("ERROR", error_msg, context.aws_request_id)
        
        # Log parsing context for debugging
        if 'agent_response' in locals():
            log_with_context(
                "ERROR",
                f"Response preview - First 300 chars: {agent_response[:300]}",
                context.aws_request_id
            )
            log_with_context(
                "ERROR",
                f"Response preview - Last 300 chars: {agent_response[-300:]}",
                context.aws_request_id
            )
        
        return {
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Content-Type": "application/json; charset=utf-8"
            },
            "statusCode": 500,
            "body": json.dumps({
                "error": "Failed to parse agent response",
                "details": str(e)
            }, ensure_ascii=False),
        }
        
    except Exception as e:
        error_msg = f"Error invoking AgentCore runtime: {str(e)}"
        log_with_context("ERROR", error_msg, context.aws_request_id)
        log_with_context("ERROR", traceback.format_exc(), context.aws_request_id)
        
        return {
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                "Content-Type": "application/json; charset=utf-8"
            },
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}, ensure_ascii=False),
        }