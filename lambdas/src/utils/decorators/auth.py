from functools import wraps
from typing import Any, Callable, TypeVar, cast
from aws_lambda_typing import context as context_
from src.utils.validator import validate_user_and_get_claims
from src.utils.logger import log_with_context
import json

F = TypeVar('F', bound=Callable[..., dict[str, Any]])

def require_auth(handler: F) -> F:
    """Decorator to validate JWT token and inject claims into event."""
    @wraps(handler)
    def wrapper(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
        try:
            # Extract bearer_token from event (passed by agent)
            bearer_token = event.get('bearer_token', '')
            if not bearer_token:
                return {'statusCode': 401, 'body': json.dumps({'error': 'Missing bearer_token'})}
            
            # Validate token and get claims
            claims = validate_user_and_get_claims(bearer_token)
            
            # SECURITY: Remove bearer_token and any user-provided claims from event
            event.pop('bearer_token', None)
            event.pop('claims', None)
            
            # Inject validated claims from token
            event['claims'] = claims
            
            return handler(event, context)
        except ValueError as e:
            log_with_context("ERROR", f"Auth failed: {str(e)}", request_id=context.aws_request_id)
            return {'statusCode': 401, 'body': json.dumps({'error': 'Unauthorized'})}
        except Exception as e:
            log_with_context("ERROR", f"Auth error: {str(e)}", request_id=context.aws_request_id)
            return {'statusCode': 500, 'body': json.dumps({'error': 'Internal error'})}
    
    return cast(F, wrapper)
