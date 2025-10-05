from typing import Any
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import get_table, DynamoDBTable
from src.utils.bedrock_response import bedrock_response

@require_auth
def document_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", "Document handler invoked", request_id=context.aws_request_id)
    
    # Access claims injected by decorator
    claims: dict[str, Any] = event['claims']
    user_id = claims.get('sub')
    org_id = claims.get('custom:org_id')  # Adjust based on your Cognito attributes    
    log_with_context("INFO", f"Processing for user: {user_id}, org: {org_id}", request_id=context.aws_request_id)
    file_id = event.get('file_id')
    if not file_id:
        log_with_context("ERROR", "Missing file_id in event", request_id=context.aws_request_id)
        return bedrock_response(event, 400, {'error': 'Missing file_id'})
    
    document = get_table(DynamoDBTable.DOCUMENTS).get_item(Key={'document_id': file_id})
    
    if 'Item' not in document:
        log_with_context("ERROR", f"Document {file_id} not found", request_id=context.aws_request_id)
        return bedrock_response(event, 404, {'error': 'Document not found'})
    
    # Obtain compliance status field
    compliance_status = document['Item'].get('compliance_status', 'unknown')
    log_with_context("INFO", f"Document {file_id} compliance status: {compliance_status}", request_id=context.aws_request_id)
    
    return bedrock_response(event, 200, {
        'document_id': file_id, 
        'compliance_status': compliance_status
        })

# Dynamo DB Document structure
# primary Key: document_id (string)
# Attributes:
# user id: string
# org id: string
# mime type: string
# document size: string
# compliance status: initialized, in progress, completed, failed
# compliance issues: list of strings
# timestamp: number in milliseconds
# S3 URL: string
# Completed Analysis ID: string (UUID - optional)