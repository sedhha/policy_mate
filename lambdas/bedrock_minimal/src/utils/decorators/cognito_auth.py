# lambdas/src/utils/decorators/cognito_auth.py
from functools import wraps
import json
from typing import Any, Callable, TypeVar, cast
from aws_lambda_typing import context as context_
from src.utils.validator import validate_user_and_get_claims
from src.utils.logger import log_with_context

F = TypeVar('F', bound=Callable[..., dict[str, Any]])

def require_cognito_auth(handler: F) -> F:
    """Decorator to validate Cognito JWT from API Gateway Authorization header"""
    @wraps(handler)
    def wrapper(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
        try:
            # Extract token from Authorization header
            headers = event.get('headers', {})
            auth_header = headers.get(
                'Authorization', 
                headers.get(
                    'authorization', 
                    headers.get(
                        'AUTHORIZATION',
                        '')
                    )
                )
            if not auth_header.startswith('Bearer '):
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json',"Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"},
                    'body': json.dumps({'error': 'Missing or invalid Authorization header'})
                }
            
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            
            # Validate token
            claims = validate_user_and_get_claims(token)
            
            # Inject validated token and claims
            event['validated_token'] = token
            event['user_claims'] = claims
            
            return handler(event, context)
            
        except ValueError as e:
            log_with_context("ERROR", f"Auth failed: {str(e)}", request_id=context.aws_request_id)
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json',"Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",},
                'body': json.dumps({'error': f'Authentication failed: {str(e)}'})
            }
        except Exception as e:
            log_with_context("ERROR", f"Auth error: {str(e)}", request_id=context.aws_request_id)
            return {
                'statusCode': 500,
                'headers': {'Content-Type': 'application/json',"Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",},
                'body': json.dumps({'error': 'Authentication error'})
            }
    
    return cast(F, wrapper)
