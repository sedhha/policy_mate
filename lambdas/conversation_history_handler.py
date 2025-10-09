# lambdas/conversation_history_handler.py
import json
from typing import Any
from aws_lambda_typing import context as context_
from src.utils.decorators.cognito_auth import require_cognito_auth
from src.utils.logger import log_with_context
from src.utils.conversation_store import ConversationStore

conversation_store = ConversationStore()

@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """API Gateway handler to retrieve conversation history"""
    try:
        params: dict[str, str] = event.get('queryStringParameters') or {}
        user_id: str = str(event['user_claims']['sub'])
        
        action: str = str(params.get('action', 'get_messages'))
        
        if action == 'get_messages':
            session_id: str | None = params.get('session_id')
            if not session_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'session_id is required'})
                }
            
            limit = int(params.get('limit', '20'))
            last_key: dict[str, Any] | None = json.loads(params.get('last_key', 'null'))
            newest_first: bool = params.get('newest_first', 'true').lower() == 'true'
            
            result = conversation_store.get_messages(session_id, limit, last_key, newest_first)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(result)
            }
        
        elif action == 'get_sessions':
            limit = int(params.get('limit', '10'))
            last_key: dict[str, Any] | None = json.loads(params.get('last_key', 'null'))
            
            result = conversation_store.get_user_sessions(user_id, limit, last_key)
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps(result)
            }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': f'Invalid action: {action}'})
            }
        
    except Exception as e:
        log_with_context("ERROR", f"History retrieval failed: {str(e)}", request_id=context.aws_request_id)
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
