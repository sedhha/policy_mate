# filePath: lambdas/show_doc_handler.py
from typing import Any
from datetime import datetime
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import get_table, DynamoDBTable
from src.utils.bedrock_response import bedrock_response

def format_file_size(bytes_size: int | None) -> str:
    """Format bytes to human readable format"""
    if not bytes_size:
        return "Unknown"
    
    if bytes_size < 1024:
        return f"{bytes_size} B"
    elif bytes_size < 1048576:
        return f"{bytes_size / 1024:.1f} KB"
    else:
        return f"{bytes_size / 1048576:.1f} MB"

def format_timestamp(timestamp_ms: int | None) -> str:
    """Format Unix timestamp to readable date"""
    if not timestamp_ms:
        return "Unknown"
    
    try:
        dt = datetime.fromtimestamp(int(timestamp_ms) / 1000)
        return dt.strftime("%b %d, %Y")
    except Exception:
        return "Unknown"

def get_status_details(status: str) -> dict[str, str]:
    """Get status label, color, and emoji based on compliance status"""
    status_map = {
        'initialized': {'label': 'Initialized', 'color': 'blue', 'emoji': '🔵'},
        'in_progress': {'label': 'In Progress', 'color': 'yellow', 'emoji': '⏳'},
        'completed': {'label': 'Completed', 'color': 'green', 'emoji': '✅'},
        'failed': {'label': 'Failed', 'color': 'red', 'emoji': '❌'},
    }
    return status_map.get(status, {'label': 'Unknown', 'color': 'gray', 'emoji': '❓'})

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
    
    documents: list[dict[str, Any]] = []
    for item in response.get('Items', []):
        status = str(item.get('compliance_status', 'unknown'))
        status_details = get_status_details(status)
        
        doc_size = item.get('document_size')
        timestamp = item.get('timestamp')
        
        # Convert DynamoDB types to Python types
        size_int = int(doc_size) if doc_size is not None else None  # type: ignore
        timestamp_int = int(timestamp) if timestamp is not None else None  # type: ignore
        
        documents.append({
            'document_id': item.get('document_id'),
            'file_name': str(item.get('s3_url', '')).split('/')[-1] if item.get('s3_url') else 'Unknown',
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
