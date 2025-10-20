# src/tools/doc_status.py
# Shared business logic for document status retrieval

from typing import Any
from src.utils.services.dynamoDB import get_table, DynamoDBTable, DocumentStatus
from src.utils.services.document_extractor import get_status_details


def doc_status_tool(
    document_id: str
) -> dict[str, Any]:
    """
    Core document status retrieval logic - shared between Bedrock and Strands agents.
    
    Args:
        document_id: The document ID to check
        user_id: Optional user ID for logging
        org_id: Optional organization ID for logging
    
    Returns:
        Dictionary with document status information
    """
    if not document_id:
        raise ValueError('document_id is required')
    
    # Query FILES table
    response = get_table(DynamoDBTable.FILES).get_item(
        Key={'file_id': document_id}
    )
    
    if 'Item' not in response:
        raise ValueError(f'Document {document_id} not found')
    
    document = response['Item']
    status = int(str(document.get('status', str(DocumentStatus.UNKNOWN.value))))
    
    # Get human-readable status details
    status_details = get_status_details(status)
    
    # Ensure all Decimal objects are converted for JSON serialization
    return {
        'document_id': document_id,
        'file_name': str(document.get('s3_key', '')).split('/')[-1] if document.get('s3_key') else 'Unknown',
        'status': status,
        'status_label': status_details['label'],
        'status_emoji': status_details['emoji'],
        'status_color': status_details['color']
    }
