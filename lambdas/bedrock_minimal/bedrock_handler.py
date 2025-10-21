# lambdas/bedrock_handler.py

import json
import logging
from typing import Any
import boto3
from aws_lambda_typing import context as context_
from src.utils.decorators.cognito_auth import require_cognito_auth
from src.utils.secrets import AGENT_CORE_ARN_RUN_TIME
import traceback
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Bedrock Agent Runtime client
agent_core_client = boto3.client('bedrock-agentcore') # pyright: ignore[reportUnknownMemberType]

@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """Invoke an AgentCore runtime endpoint from AWS Lambda."""
    try:
        # Parse request body - handle both string and dict
        body = event.get("body", {})
        if isinstance(body, str):
            body = json.loads(body)
        
        prompt = body.get("prompt", "Hello from Lambda!")
        session_id = body.get("session_id", context.aws_request_id)
        
        # Prepare the payload
        payload = json.dumps({"prompt": prompt}).encode()
        
        logger.info(f"Invoking AgentCore with session_id={session_id}")

        # Invoke the agent
        response = agent_core_client.invoke_agent_runtime(
            agentRuntimeArn=AGENT_CORE_ARN_RUN_TIME,
            runtimeSessionId=session_id,
            payload=payload
        )

        # Gather output chunks from the streaming response
        # Process and print the response
        content: list[str] = []
        if "text/event-stream" in response.get("contentType", ""):
            # Handle streaming response
            for line in response["response"].iter_lines(chunk_size=10):
                if line:
                    line = line.decode("utf-8")
                    if line.startswith("data: "):
                        line = line[6:]
                        content.append(line)

        elif response.get("contentType") == "application/json":
            # Handle standard JSON response
            content: list[str] = []
            for chunk in response.get("response", []):
                content.append(chunk.decode('utf-8'))
            print(json.loads(''.join(content)))
        
        else:
            # Print raw response for other content types
            print(f"Unexpected content response: {response}")

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
            "body": json.dumps({
                "session_id": session_id,
                "agent_response": content
            }),
        }

    except Exception as e:
        trace = traceback.format_exc()
        logger.exception("Error invoking AgentCore")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
            "body": json.dumps({"error": str(e), "details": trace}),
        }
