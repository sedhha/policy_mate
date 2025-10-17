# filePath: lambdas/doc_status_handler.py
from typing import Any
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import get_table, DynamoDBTable, DocumentStatus
from src.utils.services.document_extractor import get_status_details
from src.utils.bedrock_response import bedrock_response, get_bedrock_parameters

@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", f"Document handler invoked with event: {event}", request_id=context.aws_request_id)
    
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
        log_with_context("ERROR", "Missing document_id in event", request_id=context.aws_request_id)
        return bedrock_response(event, 400, {'error': 'Missing document_id'})
    
    # Query FILES table (PolicyMateFiles) with file_id as the key
    response = get_table(DynamoDBTable.FILES).get_item(
        Key={'file_id': document_id}
    )
    
    if 'Item' not in response:
        log_with_context("ERROR", f"Document {document_id} not found in FILES table", request_id=context.aws_request_id)
        return bedrock_response(event, 404, {'error': 'Document not found'})
    
    document = response['Item']
    # Get status from FILES table (uses integer status codes)
    status = document.get('status', DocumentStatus.UNKNOWN.value)
    log_with_context("INFO", f"Document {document_id} status: {status}", request_id=context.aws_request_id)
    
    # Import status mapping function from show_doc_handler
    status_details = get_status_details(status)
    
    return bedrock_response(event, 200, {
        'document_id': document_id,
        'file_name': str(document.get('s3_key', '')).split('/')[-1] if document.get('s3_key') else 'Unknown',
        'status': status,
        'status_label': status_details['label'],
        'status_emoji': status_details['emoji'],
        'status_color': status_details['color']
    })

# Note: This handler queries the PolicyMateFiles table
# Primary Key: file_id (string)
# Attributes:
# - status: integer (DocumentStatus enum value)
# - user_id: string
# - org_id: string
# - mime_type: string
# - file_size: number
# - s3_key: string
# - created_at: number (timestamp in milliseconds)
# - updated_at: number (timestamp in milliseconds)