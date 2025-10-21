# lambdas/bedrock_handler.py

import json
import logging
from typing import Any
import boto3
from aws_lambda_typing import context as context_
from src.utils.decorators.cognito_auth import require_cognito_auth
from mypy_boto3_bedrock_agent_runtime.client import AgentsforBedrockRuntimeClient
from src.utils.secrets import AGENT_CORE_ALIAS_ID as AGENT_ALIAS, AGENT_CORE_ID as AGENT_ID

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Bedrock Agent Runtime client
client: "AgentsforBedrockRuntimeClient" = boto3.client("bedrock-agent-runtime", region_name="us-east-1") # pyright: ignore[reportUnknownMemberType]


@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Minimal handler to invoke an AgentCore runtime (Bedrock).
    Requires authentication via @require_cognito_auth decorator.
    """
    try:
        body_str = event.get("body", "{}")
        body: dict[str, Any] = json.loads(body_str) if isinstance(body_str, str) else body_str
        prompt: str = body.get("prompt", "Hello from Lambda!")
        session_id: str = body.get("session_id", "default-session")

        # Get user info from validated claims
        user_claims: dict[str, Any] = event.get("user_claims", {})
        user_id: str = user_claims.get("sub", "unknown")

        logger.info(f"User {user_id} invoking AgentCore ({AGENT_ID}) with prompt: {prompt[:100]}...")

        response = client.invoke_agent(
            agentId=AGENT_ID,
            agentAliasId=AGENT_ALIAS,
            sessionId=session_id,
            inputText=prompt
        )

        # The response stream is an iterator — collect final text
        result_text = ""
        completion = response.get("completion", [])
        for event_chunk in completion:
            if "chunk" in event_chunk:
                chunk_bytes = event_chunk["chunk"].get("bytes", b"")
                result_text += chunk_bytes.decode("utf-8")

        logger.info(f"AgentCore responded with {len(result_text)} chars")

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
            "body": json.dumps({"session_id": session_id, "response": result_text, "user_id": user_id}),
        }

    except Exception as e:
        logger.error(f"Invocation failed: {e}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)}),
        }
