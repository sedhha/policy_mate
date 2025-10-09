# lambdas/agent_gateway_handler.py
import json
import boto3
from uuid6 import uuid7
from typing import Any
from mypy_boto3_bedrock_agent_runtime.client import AgentsforBedrockRuntimeClient
from aws_lambda_typing import context as context_
from src.utils.decorators.cognito_auth import require_cognito_auth
from src.utils.logger import log_with_context
from src.utils.settings import AGENT_ID, AGENT_ALIAS_ID
from src.utils.conversation_store import ConversationStore

bedrock_agent: AgentsforBedrockRuntimeClient = boto3.client('bedrock-agent-runtime', region_name='us-east-1') # pyright: ignore[reportUnknownMemberType]
conversation_store = ConversationStore()

@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """API Gateway handler that invokes Bedrock Agent"""
    try:
        body = json.loads(event.get('body', '{}'))
        prompt = body.get('prompt', '')
        
        # Get validated token and user info from decorator
        access_token = event['validated_token']
        user_id = event['user_claims']['sub']  # Cognito user ID (uid)
        
        # Use user_id as default, or generate new UUID7 if not provided
        session_id = body.get('session_id', f"{user_id}-{uuid7()}" if body.get('new_conversation') else user_id)
        
        log_with_context("INFO", f"Invoking agent: session={session_id}", request_id=context.aws_request_id)
        
        # Invoke Bedrock Agent
        response = bedrock_agent.invoke_agent(
            agentId=AGENT_ID,
            agentAliasId=AGENT_ALIAS_ID,
            sessionId=session_id,
            inputText=f"bearer_token: {access_token}\n\n{prompt}"
        )
        
        # Collect streaming response
        result: str = ''
        for event_chunk in response['completion']:
            if 'chunk' in event_chunk and 'bytes' in event_chunk['chunk']:
                chunk_bytes: bytes = event_chunk['chunk']['bytes']
                result += chunk_bytes.decode('utf-8')
        
        # Save conversation to DynamoDB
        conversation_store.save_message(session_id, user_id, 'user', prompt)
        conversation_store.save_message(session_id, user_id, 'assistant', result)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'response': result, 'session_id': session_id})
        }
        
    except Exception as e:
        log_with_context("ERROR", f"Agent invocation failed: {str(e)}", request_id=context.aws_request_id)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
