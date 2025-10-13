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
        chunk_count = 0
        for event_chunk in response['completion']:
            chunk_count += 1
            log_with_context("DEBUG", f"Chunk {chunk_count}: {event_chunk.keys()}", request_id=context.aws_request_id)
            
            if 'chunk' in event_chunk and 'bytes' in event_chunk['chunk']:
                chunk_bytes: bytes = event_chunk['chunk']['bytes']
                decoded_chunk = chunk_bytes.decode('utf-8')
                log_with_context("DEBUG", f"Decoded chunk {chunk_count}: {decoded_chunk[:200]}", request_id=context.aws_request_id)
                result += decoded_chunk
        
        log_with_context("INFO", f"Full agent response (first 500 chars): {result[:500]}", request_id=context.aws_request_id)
        log_with_context("INFO", f"Full agent response length: {len(result)} characters", request_id=context.aws_request_id)
        
        # Try to parse as JSON, fall back to plain text if it fails
        try:
            parsed_response = json.loads(result)
            log_with_context("INFO", f"Successfully parsed JSON response with keys: {parsed_response.keys()}", request_id=context.aws_request_id)
            
            # If it's a proper structured response, use it directly
            if 'response_type' in parsed_response:
                response_data = parsed_response
            else:
                # Legacy format - wrap it
                response_data = {
                    'response_type': 'conversation',
                    'content': {
                        'markdown': parsed_response.get('response', str(parsed_response)),
                        'metadata': {'timestamp': parsed_response.get('timestamp', '')}
                    },
                    'data': parsed_response
                }
        except json.JSONDecodeError as e:
            log_with_context("WARNING", f"Agent returned plain text instead of JSON (error: {str(e)}). This should not happen. Check agent instructions.", request_id=context.aws_request_id)
            # Wrap plain text in expected structure
            response_data:dict[str,Any] = {
                'response_type': 'conversation',
                'content': {
                    'markdown': result,
                    'metadata': {'timestamp': ''}
                },
                'response': result  # Keep backwards compatibility
            }
        
        # Save conversation to DynamoDB
        conversation_store.save_message(session_id, user_id, 'user', prompt)
        conversation_store.save_message(session_id, user_id, 'assistant', result)
        
        final_response:dict[str, Any] = {**response_data, 'session_id': session_id}
        log_with_context("INFO", f"Returning response with keys: {final_response.keys()}", request_id=context.aws_request_id)
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(final_response)
        }
        
    except Exception as e:
        log_with_context("ERROR", f"Agent invocation failed: {str(e)}", request_id=context.aws_request_id)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }