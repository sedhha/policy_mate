# filePath: lambdas/show_doc_handler.py
from typing import Any
from datetime import datetime
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import DocumentStatus, get_table, DynamoDBTable
from src.utils.bedrock_response import bedrock_response
from src.utils.services.document_extractor import format_file_size, format_timestamp, get_status_details
from boto3.dynamodb.conditions import Attr


@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", f"Show documents handler invoked with event: {event}", request_id=context.aws_request_id)
    
    claims: dict[str, Any] = event['claims']
    user_id = claims.get('sub')
    log_with_context("INFO", f"Fetching documents for user: {user_id}", request_id=context.aws_request_id)
    
    user_files_response = get_table(DynamoDBTable.DOCUMENTS).scan(
        FilterExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    results = user_files_response.get('Items', [])
    complete_id_set:set[str] = set()
    
    for row in results:
        id_set:set[str] = row.get("uploaded_files", set()) # pyright: ignore[reportAssignmentType]
        complete_id_set = complete_id_set.union(id_set)
    
    log_with_context("INFO", f"User {user_id} has {len(complete_id_set)} uploaded files", request_id=context.aws_request_id)
    
    documents: list[dict[str, Any]] = []
    
    # If user has no files, return empty list
    if not complete_id_set:
        log_with_context("INFO", "No uploaded files found for user", request_id=context.aws_request_id)
        return bedrock_response(
            event,
            200,
            {
                'documents': [],
                'count': 0,
                'timestamp': datetime.now().isoformat()
            }
        )
        
    # Query from files table to get metadata file_id in ids and  status = completed 
    response = get_table(DynamoDBTable.FILES).scan(
        FilterExpression=Attr("file_id").is_in(
            list(complete_id_set)
            ) & Attr("status").gte(DocumentStatus.UPLOAD_SUCCESS.value)
        )
    
    log_with_context("INFO", f"Fetched {response.get('Count', 0)} documents from Files table", request_id=context.aws_request_id)
    for item in response.get('Items', []):
        status:int = item.get('status', DocumentStatus.UNKNOWN.value) # pyright: ignore[reportAssignmentType]
        status_details = get_status_details(status)
        
        doc_size = item.get('file_size')
        timestamp = item.get('created_at')
        
        # Convert DynamoDB types to Python types
        size_int = int(doc_size) if doc_size is not None else None  # type: ignore
        timestamp_int = int(timestamp) if timestamp is not None else None  # type: ignore
        
        documents.append({
            'document_id': item.get('file_id'),
            'file_name': str(item.get('s3_key', '')).split('/')[-1] if item.get('s3_key') else 'Unknown',
            'file_type': item.get('mime_type', 'Unknown'),
            'document_size': size_int,
            'formatted_size': format_file_size(size_int),
            'compliance_status': status,
            'status_label': status_details['label'],
            'status_color': status_details['color'],
            'status_emoji': status_details['emoji'],
            'timestamp': timestamp_int,
            'formatted_date': format_timestamp(timestamp_int)
        })
    
    log_with_context("INFO", f"Found {len(documents)} documents for user {user_id}", request_id=context.aws_request_id)
    
    # Return documents in a format that allows agent to choose formatting style
    # Agent will decide based on user's request whether to return structured or formatted
    result:dict[str, Any] = {
        'documents': documents,
        'count': len(documents),
        'timestamp': datetime.now().isoformat()
    }
    
    log_with_context("INFO", f"Returning {len(documents)} documents for agent to format", request_id=context.aws_request_id)
    
    return bedrock_response(event, 200, result)
