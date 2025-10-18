# filePath: lambdas/compliance_check_handler.py
# Bedrock Agent Lambda handler - uses shared tool logic from src/tools/

from typing import Any
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.bedrock_response import bedrock_response, get_bedrock_parameters
from src.tools.compliance_check import compliance_check_tool


@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", "Compliance check handler invoked", request_id=context.aws_request_id)
    
    try:
        # Extract from Bedrock Agent format
        params = get_bedrock_parameters(event)
        
        user_text = params.get('text', '').strip()
        question = params.get('question', '').strip()
        framework_id = params.get('framework_id', '').upper()
        control_id = params.get('control_id')
        
        log_with_context("INFO", f"Analyzing: framework={framework_id}, control={control_id}", request_id=context.aws_request_id)
        
        # Use shared tool logic
        result = compliance_check_tool(
            text=user_text,
            question=question,
            framework_id=framework_id,
            control_id=control_id
        )
        
        log_with_context("INFO", f"Analysis complete: {result['analysis']['verdict']}", request_id=context.aws_request_id)
        
        return bedrock_response(event, 200, result)
        
    except ValueError as e:
        log_with_context("ERROR", f"Validation error: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 400, {'error': str(e)})
    except Exception as e:
        log_with_context("ERROR", f"Error in compliance check: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 500, {'error': str(e)})
