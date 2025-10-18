# lambdas/agent_v2_handler.py


from typing import Any
import json
import boto3
import traceback
from aws_lambda_typing import context as context_
from mypy_boto3_bedrock_agentcore import BedrockAgentCoreDataPlaneFrontingLayerClient
from src.utils.decorators.cognito_auth import require_cognito_auth
from src.utils.settings import AGENT_CORE_REGION, AGENT_RUNTIME_ARN
from uuid6 import uuid7

# Create client for Bedrock AgentCore runtime
bedrock_agent: BedrockAgentCoreDataPlaneFrontingLayerClient = boto3.client("bedrock-agentcore", region_name=AGENT_CORE_REGION)  # pyright: ignore[reportUnknownMemberType]


@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Invokes the Bedrock AgentCore runtime.
    Assumes @require_cognito_auth verified the JWT and added event["validated_token"] and event["user_claims"].
    """

    try:
        
        body = json.loads(event.get("body", "{}"))
        prompt = body.get('prompt', '')
        
        # Get validated token and user info from decorator
        access_token = event['validated_token']
        
        # Use user_id as default, or generate new UUID7 if not provided
        session_id = body.get('session_id', str(uuid7()))
        input_text = f'access_token: {access_token}\n\n{prompt}'
        
        
        # Use user_id as default, or get from body
        # runtimeSessionId must be at least 33 characters
        session_id = body.get("session_id", str(uuid7()))
        
        # Ensure session_id is at least 33 characters
        if len(session_id) < 33:
            session_id = f"{session_id}-{str(uuid7())}"

        # Prepare JSON payload as bytes
        payload_dict = {"inputText": input_text}
        payload_bytes = json.dumps(payload_dict).encode("utf-8")

        # Invoke the AgentCore runtime
        response = bedrock_agent.invoke_agent_runtime(
            agentRuntimeArn=AGENT_RUNTIME_ARN,
            runtimeSessionId=session_id,
            payload=payload_bytes,
        )

        # Decode returned payload (binary)
        raw_payload = response.get("payload", b"")
        try:
            output_obj = json.loads(raw_payload.decode("utf-8"))
        except Exception:
            output_obj = {"raw": raw_payload.decode("utf-8", errors="ignore")}

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "output": output_obj,
                    "session_id": session_id,
                    "user": event['user_claims'].get("email", "unknown"),
                }
            ),
        }

    except Exception as e:
        print("Error invoking AgentCore runtime:", str(e))
        print(traceback.format_exc())
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
        }
