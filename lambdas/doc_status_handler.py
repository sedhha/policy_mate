# filePath: lambdas/doc_status_handler.py
from typing import Any
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import get_table, DynamoDBTable
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
    
    response = get_table(DynamoDBTable.DOCUMENTS).query(
        KeyConditionExpression='document_id = :doc_id',
        ExpressionAttributeValues={':doc_id': document_id},
        Limit=1
    )
    
    if not response.get('Items'):
        log_with_context("ERROR", f"Document {document_id} not found", request_id=context.aws_request_id)
        return bedrock_response(event, 404, {'error': 'Document not found'})
    
    document = response['Items'][0]
    compliance_status = document.get('compliance_status', 'unknown')
    log_with_context("INFO", f"Document {document_id} compliance status: {compliance_status}", request_id=context.aws_request_id)
    
    return bedrock_response(event, 200, {
        'document_id': document_id, 
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