from typing import Any
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import get_table, DynamoDBTable
from src.utils.bedrock_response import bedrock_response

@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", f"Show documents handler invoked with event: {event}", request_id=context.aws_request_id)
    
    claims: dict[str, Any] = event['claims']
    user_id = claims.get('sub')
    log_with_context("INFO", f"Fetching documents for user: {user_id}", request_id=context.aws_request_id)
    
    response = get_table(DynamoDBTable.DOCUMENTS).scan(
        FilterExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    documents: list[dict[str, Any]] = [{
        'file_name': str(item.get('s3_url', '')).split('/')[-1] if item.get('s3_url') else '',
        'file_type': item.get('mime_type'),
        'document_size': item.get('document_size'),
        'compliance_status': item.get('compliance_status'),
        'timestamp': item.get('timestamp')
    } for item in response.get('Items', [])]
    
    log_with_context("INFO", f"Found {len(documents)} documents for user {user_id}", request_id=context.aws_request_id)
    
    return bedrock_response(event, 200, {'documents': documents})
