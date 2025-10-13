from typing import Any
from datetime import datetime
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import get_table, DynamoDBTable
from src.utils.bedrock_response import bedrock_response


def format_file_size(size_bytes: int) -> str:
    """Convert bytes to human-readable format"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def format_timestamp(timestamp_ms: int) -> str:
    """Convert timestamp to readable date"""
    try:
        dt = datetime.fromtimestamp(timestamp_ms / 1000)
        return dt.strftime('%b %d, %Y')
    except Exception:
        return 'Unknown'


def get_status_info(status: str) -> dict[str, str]:
    """Get status display information"""
    status_map = {
        'initialized': {
            'label': 'Queued for Analysis',
            'color': 'blue',
            'emoji': '📝'
        },
        'in_progress': {
            'label': 'Analyzing',
            'color': 'yellow',
            'emoji': '⚙️'
        },
        'completed': {
            'label': 'Analysis Complete',
            'color': 'green',
            'emoji': '✅'
        },
        'failed': {
            'label': 'Analysis Failed',
            'color': 'red',
            'emoji': '❌'
        }
    }
    return status_map.get(status, {
        'label': 'Unknown',
        'color': 'gray',
        'emoji': '❓'
    })


@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", f"Show documents handler invoked with event: {event}", 
                     request_id=context.aws_request_id)
    
    claims: dict[str, Any] = event['claims']
    user_id = claims.get('sub')
    
    log_with_context("INFO", f"Fetching documents for user: {user_id}", 
                     request_id=context.aws_request_id)
    
    try:
        # Get user's file IDs from Users table
        users_table = get_table(DynamoDBTable.USERS)
        user_response = users_table.get_item(Key={'user_id': user_id})
        
        if 'Item' not in user_response:
            log_with_context("INFO", f"User {user_id} has no documents yet", 
                           request_id=context.aws_request_id)
            return bedrock_response(event, 200, {
                'documents': [],
                'total_count': 0,
                'by_status': {}
            })
        
        user_item = user_response['Item']
        uploaded_file_ids:set[str] = user_item.get('uploaded_file_ids', set()) # pyright: ignore[reportAssignmentType]
        
        if not uploaded_file_ids:
            log_with_context("INFO", f"User {user_id} has no uploaded files", 
                           request_id=context.aws_request_id)
            return bedrock_response(event, 200, {
                'documents': [],
                'total_count': 0,
                'by_status': {}
            })
        
        # Get file metadata from Files table
        files_table = get_table(DynamoDBTable.FILES)
        documents_table = get_table(DynamoDBTable.DOCUMENTS)
        
        documents: list[dict[str, Any]] = []
        status_counts = {'completed': 0, 'in_progress': 0, 'failed': 0, 'initialized': 0}
        
        for file_id in uploaded_file_ids:
            # Get file metadata
            file_response = files_table.get_item(Key={'file_id': file_id})
            
            if 'Item' not in file_response:
                continue
            
            file_item = file_response['Item']
            
            # Get compliance status from Documents table if available
            doc_response = documents_table.query(
                KeyConditionExpression='document_id = :doc_id',
                ExpressionAttributeValues={':doc_id': file_id},
                Limit=1
            )
            
            compliance_status = 'initialized'
            if doc_response.get('Items'):
                compliance_status: str = doc_response['Items'][0].get('compliance_status', 'initialized') # pyright: ignore[reportAssignmentType]
            
            # Count status
            status_counts[compliance_status] = status_counts.get(compliance_status, 0) + 1
            
            # Get status display info
            status_info = get_status_info(compliance_status)
            
            # Build document object
            file_size = int(file_item.get('file_size', 0)) # pyright: ignore[reportArgumentType]
            timestamp = int(file_item.get('created_at', 0)) if isinstance(file_item.get('created_at'), (int, float)) else 0 # pyright: ignore[reportArgumentType]
            
            documents.append({
                'file_id': str(file_item.get('file_id', '')),
                'file_name': str(file_item.get('file_name', 'Unknown')),
                'file_type': str(file_item.get('file_type', 'application/pdf')),
                'document_size': file_size,
                'formatted_size': format_file_size(file_size),
                'compliance_status': compliance_status,
                'status_label': status_info['label'],
                'status_color': status_info['color'],
                'status_emoji': status_info['emoji'],
                'timestamp': timestamp,
                'formatted_date': format_timestamp(timestamp),
                'upload_type': str(file_item.get('upload_type', 'custom')),
                's3_key': str(file_item.get('s3_key', ''))
            })
        
        # Sort by timestamp (most recent first)
        documents.sort(key=lambda x: x['timestamp'], reverse=True)
        
        log_with_context("INFO", f"Found {len(documents)} documents for user {user_id}", 
                        request_id=context.aws_request_id)
        
        return bedrock_response(event, 200, {
            'documents': documents,
            'total_count': len(documents),
            'by_status': status_counts
        })
        
    except Exception as e:
        log_with_context("ERROR", f"Error fetching documents: {str(e)}", 
                        request_id=context.aws_request_id)
        return bedrock_response(event, 500, {'error': str(e)})