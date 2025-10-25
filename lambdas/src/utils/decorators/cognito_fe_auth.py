# filePath: lambdas/src/utils/decorators/cognito_fe_auth.py
from functools import wraps
import json
from typing import Any, Callable, TypeVar, cast
from aws_lambda_typing import context as context_
from src.utils.validator import validate_user_and_get_claims
from src.utils.logger import log_with_context

F = TypeVar('F', bound=Callable[..., dict[str, Any]])

def require_fe_auth(handler: F) -> F:
    """Decorator to validate Cognito JWT from API Gateway Authorization header"""
    @wraps(handler)
    def wrapper(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
        try:
            log_with_context("INFO", f"Event keys: {list(event.keys())}", request_id=context.aws_request_id)
            http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')
            if http_method == 'OPTIONS':
                return {
                    'statusCode': 200,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',  # or 'http://localhost:3000' for more security
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                        'Access-Control-Allow-Methods': 'POST,OPTIONS',
                        'Access-Control-Max-Age': '86400'
                    },
                    'body': '{}'
                }
            
            # Extract token from Authorization header
            headers = event.get('headers', {})
            
            log_with_context("INFO", f"Headers: {json.dumps(headers)}", request_id=context.aws_request_id)
            
            auth_header = (
                headers.get('Authorization') or 
                headers.get('authorization') or 
                headers.get('AUTHORIZATION') or
                ''
            )
            
            if not auth_header:
                log_with_context("ERROR", "No Authorization header found", request_id=context.aws_request_id)
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'Missing Authorization header',
                        'event_keys': list(event.keys())
                    })
                }
            
            if not auth_header.startswith('Bearer '):
                log_with_context("ERROR", "Invalid auth format", request_id=context.aws_request_id)
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json'},
                    'body': json.dumps({
                        'error': 'Invalid Authorization header format. Must be: Bearer <token>'
                    })
                }
            
            token = auth_header[7:]  # Remove 'Bearer ' prefix
            
            log_with_context("INFO", "Validating token...", request_id=context.aws_request_id)
            
            # Validate token
            claims = validate_user_and_get_claims(token)
            
            log_with_context("INFO", f"Token validated for user: {claims.get('sub')}", request_id=context.aws_request_id)
            
            # Inject validated token and claims
            event['validated_token'] = token
            event['claims'] = claims  # ✅ Changed from 'user_claims' to 'claims'
            
            return handler(event, context)
            
        except ValueError as e:
            return {
                'statusCode': 401,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid token - ' + str(e)})
            }
        except Exception as e:
            log_with_context("ERROR", f"Unexpected auth error: {str(e)}", request_id=context.aws_request_id)
            import traceback
            log_with_context("ERROR", f"Traceback: {traceback.format_exc()}", request_id=context.aws_request_id)
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',  # Add this
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                },
                'body': json.dumps({
                    'error': 'Internal authentication error',
                    'details': str(e)
                })
            }
    
    return cast(F, wrapper)