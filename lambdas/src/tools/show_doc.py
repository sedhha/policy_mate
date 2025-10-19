# src/tools/show_doc.py
# Shared business logic for listing user documents

from typing import Any
from datetime import datetime
from src.utils.services.dynamoDB import DocumentStatus, get_table, DynamoDBTable
from src.utils.services.document_extractor import format_file_size, format_timestamp, get_status_details
from boto3.dynamodb.conditions import Attr


def show_doc_tool(user_id: str) -> dict[str, Any]:
    """
    Core document listing logic - shared between Bedrock and Strands agents.
    
    Args:
        user_id: The user ID to fetch documents for
        org_id: Optional organization ID for logging
    
    Returns:
        Dictionary with list of documents and metadata
    """
    if not user_id:
        raise ValueError('user_id is required')
    
    # Get user's uploaded files
    user_files_response = get_table(DynamoDBTable.DOCUMENTS).scan(
        FilterExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    results = user_files_response.get('Items', [])
    complete_id_set: set[str] = set()
    
    for row in results:
        id_set: set[str] = row.get("uploaded_files", set())  # pyright: ignore[reportAssignmentType]
        complete_id_set = complete_id_set.union(id_set)
    
    documents: list[dict[str, Any]] = []
    
    # If user has no files, return empty list
    if not complete_id_set:
        return {
            'documents': [],
            'count': 0,
            'timestamp': datetime.now().isoformat()
        }
    
    # Query from files table to get metadata
    response = get_table(DynamoDBTable.FILES).scan(
        FilterExpression=Attr("file_id").is_in(
            list(complete_id_set)
        ) & Attr("status").gte(DocumentStatus.UPLOAD_SUCCESS.value)
    )
    
    for item in response.get('Items', []):
        status: int = item.get('status', DocumentStatus.UNKNOWN.value)  # pyright: ignore[reportAssignmentType]
        status_details = get_status_details(str(status))
        
        doc_size = item.get('file_size')
        timestamp_int = int(str(item.get('created_at')))
        
        # Convert DynamoDB types to Python types
        size_int = int(str(doc_size))
        
        documents.append({
            'document_id': item.get('file_id'),
            'file_name': str(item.get('s3_key', '')).split('/')[-1] if item.get('s3_key') else 'Unknown',
            'file_type': item.get('file_type', 'Unknown'),
            'document_size': size_int,
            'formatted_size': format_file_size(size_int),
            'compliance_status': int(str(status)),
            'status_label': status_details['label'],
            'status_color': status_details['color'],
            'status_emoji': status_details['emoji'],
            'timestamp': timestamp_int,
            'formatted_date': format_timestamp(timestamp_int),
            'pages': int(str(item.get('page_count', 0)))
        })
    
    return {
        'documents': documents,
        'count': len(documents),
        'timestamp': datetime.now().isoformat()
    }
