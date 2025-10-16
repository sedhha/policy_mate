# lambdas/agent_gateway_handler.py
import json
import boto3
from uuid6 import uuid7
from typing import Any, Optional
from mypy_boto3_bedrock_agent_runtime.client import AgentsforBedrockRuntimeClient
from aws_lambda_typing import context as context_
from src.utils.decorators.cognito_auth import require_cognito_auth
from src.utils.logger import log_with_context
from src.utils.settings import AGENT_ID, AGENT_ALIAS_ID
from src.utils.conversation_store import ConversationStore

bedrock_agent: AgentsforBedrockRuntimeClient = boto3.client('bedrock-agent-runtime', region_name='us-east-1') # pyright: ignore[reportUnknownMemberType]
conversation_store = ConversationStore()

def extract_json_from_response(text: str) -> str:
    """
    Extract JSON from agent response that may have preamble text.
    
    Returns:
        tuple: (extracted_json_string, was_extraction_needed)
    """
    # Check if response is already pure JSON
    text_stripped = text.strip()
    if text_stripped.startswith('{') and text_stripped.endswith('}'):
        try:
            json.loads(text_stripped)
            return text_stripped  # Already valid JSON, no extraction needed
        except json.JSONDecodeError:
            pass  # Continue to extraction logic
    
    # Find first { and last }
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    
    if first_brace == -1 or last_brace == -1 or first_brace >= last_brace:
        return text  # No valid JSON structure found
    
    # Extract potential JSON
    potential_json = text[first_brace:last_brace + 1]
    
    # Validate it's actually JSON
    try:
        json.loads(potential_json)
        return potential_json  # Extraction successful
    except json.JSONDecodeError:
        return text  # Extraction failed, return original


def create_fallback_response(text: str, error_msg: Optional[str] = None) -> dict[str, Any]:
    """
    Create a fallback response when agent returns invalid JSON.
    
    Args:
        text: The original text from the agent
        error_msg: Optional error message for logging
    
    Returns:
        dict: A valid JSON response structure
    """
    return {
        'response_type': 'conversation',
        'content': {
            'markdown': text,
            'metadata': {
                'timestamp': '',
                'fallback': True,
                'parse_error': error_msg
            }
        },
        'data': {},
        'response': text  # Keep backwards compatibility
    }


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
        session_id = body.get('session_id', str(uuid7()))
        
        log_with_context("INFO", f"Invoking agent: session={session_id}", request_id=context.aws_request_id)
        log_with_context("INFO",f"Agent details: agentId={AGENT_ID}, agentAliasId={AGENT_ALIAS_ID}", request_id=context.aws_request_id)
        # Invoke Bedrock Agent
        response = bedrock_agent.invoke_agent(
            agentId=AGENT_ID,
            agentAliasId=AGENT_ALIAS_ID,
            sessionId=session_id,
            enableTrace=True,
            inputText=f"bearer_token: {access_token}\n\n{prompt}"
        )
        
        # Collect streaming response
        result: str = ''
        chunk_count = 0
        trace_info:list[dict[str,Any]] = []
        for event_chunk in response['completion']:
            chunk_count += 1
            
            # Log trace information if available
            if 'trace' in event_chunk:
                trace_data = event_chunk['trace']
                trace_info.append(trace_data) # pyright: ignore[reportArgumentType]
                log_with_context("DEBUG", f"Trace data: {json.dumps(trace_data, default=str)[:1000]}", request_id=context.aws_request_id)
            
            if 'chunk' in event_chunk and 'bytes' in event_chunk['chunk']:
                chunk_bytes: bytes = event_chunk['chunk']['bytes']
                decoded_chunk = chunk_bytes.decode('utf-8')
                log_with_context("INFO", f"Decoded chunk {chunk_count}: {decoded_chunk[:500]}", request_id=context.aws_request_id)
                result += decoded_chunk
        
        if trace_info:
            log_with_context("INFO", f"Collected {len(trace_info)} trace events", request_id=context.aws_request_id)
        
        log_with_context("INFO", f"Full agent response length: {len(result)} characters", request_id=context.aws_request_id)
        log_with_context("INFO", f"Full agent response: {result}", request_id=context.aws_request_id)
        # Try to extract JSON if there's preamble text
        extracted_json = extract_json_from_response(result)
        # log_with_context("INFO", f"Extracted JSON: {extracted_json}", request_id=context.aws_request_id)
        
        # Try to parse as JSON
        try:
            response_data = json.loads(extracted_json)
            log_with_context("INFO", f"Successfully parsed JSON response with keys: {response_data.keys()}", request_id=context.aws_request_id)
        except json.JSONDecodeError as e:
            log_with_context("WARNING", f"Agent returned plain text instead of JSON (error: {str(e)}). This should not happen. Check agent instructions.", request_id=context.aws_request_id)
            # Create fallback response
            response_data: dict[str, Any] = create_fallback_response(result, str(e))
        
        # Save conversation to DynamoDB
        conversation_store.save_message(session_id, user_id, 'user', prompt)
        conversation_store.save_message(session_id, user_id, 'assistant', result)
        
        final_response: dict[str, Any] = {**response_data, 'session_id': session_id}
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