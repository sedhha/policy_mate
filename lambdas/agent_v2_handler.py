# lambdas/agent_v2_handler.py


from typing import Any
import json
import traceback
from aws_lambda_typing import context as context_
from src.utils.decorators.cognito_auth import require_cognito_auth
from src.utils.compliance_agent import compliance_agent, parse_agent_json
from uuid6 import uuid7


def create_user_metadata_str(claims: dict[str, Any]) -> str:
    """
    Create a user metadata string from claims for the agent prompt.
    """
    user_email = claims["email"]
    user_id = claims["sub"]
    return f"[UserMetadata - user_email: {user_email}\nuser_id: {user_id}]"

@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Invokes the Bedrock AgentCore runtime.
    Assumes @require_cognito_auth verified the JWT and added event["validated_token"] and event["user_claims"].
    """

    try:
        
        body = json.loads(event.get("body", "{}"))
        prompt = body.get('prompt', '')
        user_meta = create_user_metadata_str(event['user_claims'])
        
        # Get validated token and user info from decorator
        # access_token = event['validated_token']
        
        # Use user_id as default, or generate new UUID7 if not provided
        session_id = body.get('session_id', str(uuid7()))
        # TODO: This might be a little insecure if user tries to highjack the prompt
        # But we can address that after hackathon
        prompt = f'{prompt}\n\n{user_meta}'
        res = str(compliance_agent(prompt))
        agent_response = str(res)
        parsed = parse_agent_json(agent_response)
        parsed["session_id"] = session_id
        # Use user_id as default, or get from body
        # runtimeSessionId must be at least 33 characters
        session_id = body.get("session_id", str(uuid7()))
        return {
            "statusCode": 200,
            "body": json.dumps(parsed), # TODO: Maybe we can avoid re-parsing later
        }
    except Exception as e:
        print("Error invoking AgentCore runtime:", str(e))
        print(traceback.format_exc())
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
        }
