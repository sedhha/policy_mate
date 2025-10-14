# filePath: lambdas/show_doc_handler.py
from typing import Any
from datetime import datetime
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import DocumentStatus, get_table, DynamoDBTable
from src.utils.bedrock_response import bedrock_response
from boto3.dynamodb.conditions import Attr

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


def get_status_details(status: Any) -> dict[str, str]:
    """Return user-friendly label, color, and emoji for a given DocumentStatus."""
    
    # Normalize input: accept Enum, int, or str
    if isinstance(status, DocumentStatus):
        status_value = status.value
    elif isinstance(status, int):
        status_value = status
    elif isinstance(status, str):
        try:
            # Try parsing numeric strings like "12"
            status_value = int(status)
        except ValueError:
            # Fallback: unknown string
            return {'label': 'Unknown', 'color': 'gray', 'emoji': '❓'}
    else:
        return {'label': 'Unknown', 'color': 'gray', 'emoji': '❓'}

    # Map by range or specific value
    if 1 <= status_value <= 10:
        return {'label': 'Processing', 'color': 'yellow', 'emoji': '⚙️'}
    elif status_value == DocumentStatus.UPLOAD_FAILED.value:
        return {'label': 'Upload Failed', 'color': 'red', 'emoji': '❌'}
    elif status_value == DocumentStatus.UPLOAD_SUCCESS.value:
        return {'label': 'Upload Successful', 'color': 'green', 'emoji': '✅'}
    elif status_value == DocumentStatus.ANALYSIS_INITIATED.value:
        return {'label': 'Analysis Started', 'color': 'blue', 'emoji': '🔍'}
    elif status_value == DocumentStatus.ANALYSIS_SUCCEEDED.value:
        return {'label': 'Analysis Complete', 'color': 'green', 'emoji': '🧠'}
    elif status_value == DocumentStatus.ANALYSIS_FAILED.value:
        return {'label': 'Analysis Failed', 'color': 'red', 'emoji': '💥'}
    elif status_value == DocumentStatus.REPORT_GENERATED.value:
        return {'label': 'Report Ready', 'color': 'purple', 'emoji': '📄'}
    else:
        return {'label': 'Unknown', 'color': 'gray', 'emoji': '❓'}


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
        
    # Query from files table to get metadata file_id in ids and  status = completed 
    response = get_table(DynamoDBTable.FILES).scan(
        FilterExpression=Attr("file_id").is_in(
            list(complete_id_set)
            ) & Attr("status").gte(DocumentStatus.UPLOAD_SUCCESS.value)
        )
    
    log_with_context("INFO", f"Fetched {response.get('Count', 0)} documents from Files table", request_id=context.aws_request_id)

    documents: list[dict[str, Any]] = []
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
