from functools import wraps
import json
from typing import Any, Callable, TypeVar, cast
from aws_lambda_typing import context as context_
from src.utils.validator import validate_user_and_get_claims
from src.utils.logger import log_with_context
from src.utils.bedrock_response import bedrock_response, get_bedrock_parameters

F = TypeVar('F', bound=Callable[..., dict[str, Any]])

def require_auth(handler: F) -> F:
    """Decorator to validate JWT token and inject claims into event."""
    @wraps(handler)
    def wrapper(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
        try:
            # Extract bearer_token from Bedrock Agent format
            log_with_context("INFO", f"JSON Details: {json.dumps(event)}", request_id=context.aws_request_id)
            log_with_context("INFO", f"Document context={context}, event={event}", request_id=context.aws_request_id)
            params = get_bedrock_parameters(event)
            log_with_context("INFO", f"Extracted params for auth: {params}", request_id=context.aws_request_id)
            bearer_token = params.get('bearer_token', '')
            if not bearer_token:
                log_with_context("ERROR", "Missing bearer_token", request_id=context.aws_request_id)
                return bedrock_response(event, 401, {'error': 'Missing bearer_token'})
            
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
            return bedrock_response(event, 401, {'error': 'Unauthorized'})
        except KeyError as e:
            log_with_context("ERROR", f"Missing required field: {str(e)}", request_id=context.aws_request_id)
            return bedrock_response(event, 500, {'error': 'Internal error'})
        except Exception as e:
            log_with_context("ERROR", f"Auth error: {str(e)}", request_id=context.aws_request_id)
            return bedrock_response(event, 500, {'error': 'Internal error'})
    
    return cast(F, wrapper)
