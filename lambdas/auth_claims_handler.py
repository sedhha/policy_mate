# filePath: lambdas/auth_claims_handler.py
import json
from typing import Any
from aws_lambda_typing import context as context_
from src.utils.decorators.cognito_fe_auth import require_fe_auth
from src.utils.logger import log_with_context


@require_fe_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Simple Lambda handler that returns user claims if authenticated.
    Uses the require_fe_auth decorator to validate Cognito JWT.
    
    Returns:
        200: User claims if authentication successful
        401: If authentication fails (handled by decorator)
    """
    try:
        request_id = context.aws_request_id
        
        # Extract claims injected by the decorator
        claims = event.get('claims', {})
        
        log_with_context(
            "INFO", 
            f"Claims retrieved for user: {claims.get('sub')}", 
            request_id=request_id
        )
        
        # Return the claims
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({
                'success': True,
                'claims': claims,
                'userId': claims.get('sub'),
                'email': claims.get('email'),
                'username': claims.get('cognito:username')
            })
        }
        
    except Exception as e:
        log_with_context(
            "ERROR", 
            f"Error retrieving claims: {str(e)}", 
            request_id=context.aws_request_id
        )
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps({
                'success': False,
                'error': 'Failed to retrieve claims',
                'details': str(e)
            })
        }
