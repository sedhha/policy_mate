# filePath: lambdas/doc_status_handler.py
# Bedrock Agent Lambda handler - uses shared tool logic from src/tools/

from typing import Any
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.bedrock_response import bedrock_response, get_bedrock_parameters
from src.tools.doc_status import doc_status_tool

@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", f"Document handler invoked with event: {event}", request_id=context.aws_request_id)
    
    try:
        # Extract parameters from Bedrock Agent format
        params = get_bedrock_parameters(event)
        log_with_context("INFO", f"Extracted params: {params}", request_id=context.aws_request_id)
        
        # Access claims injected by decorator
        claims: dict[str, Any] = event['claims']
        user_id = claims.get('sub')
        org_id = claims.get('custom:org_id')
        log_with_context("INFO", f"Processing for user: {user_id}, org: {org_id}", request_id=context.aws_request_id)
        
        document_id = params.get('document_id')
        
        if not document_id:
            raise ValueError('document_id is required')
        
        # Use shared tool logic
        result = doc_status_tool(
            document_id=document_id,
            user_id=user_id,
            org_id=org_id
        )
        
        log_with_context("INFO", f"Returning document status details: {result}", request_id=context.aws_request_id)
        
        return bedrock_response(event, 200, result)
        
    except ValueError as e:
        log_with_context("ERROR", f"Validation error: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 400, {'error': str(e)})
    except Exception as e:
        log_with_context("ERROR", f"Error in doc_status: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 500, {'error': str(e)})