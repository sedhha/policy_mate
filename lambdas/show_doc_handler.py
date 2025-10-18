# filePath: lambdas/show_doc_handler.py
# Bedrock Agent Lambda handler - uses shared tool logic from src/tools/

from typing import Any
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.bedrock_response import bedrock_response
from src.tools.show_doc import show_doc_tool


@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", f"Show documents handler invoked with event: {event}", request_id=context.aws_request_id)
    
    try:
        claims: dict[str, Any] = event['claims']
        user_id = claims.get('sub')
        log_with_context("INFO", f"Fetching documents for user: {user_id}", request_id=context.aws_request_id)
        
        if not user_id:
            raise ValueError('user_id is required')
        
        # Use shared tool logic
        result = show_doc_tool(user_id=user_id)
        
        log_with_context("INFO", f"Found {result['count']} documents for user {user_id}", request_id=context.aws_request_id)
        
        return bedrock_response(event, 200, result)
        
    except ValueError as e:
        log_with_context("ERROR", f"Validation error: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 400, {'error': str(e)})
    except Exception as e:
        log_with_context("ERROR", f"Error in show_doc: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 500, {'error': str(e)})
