# src/tools/comprehensive_check.py
# Shared business logic for comprehensive document analysis

from typing import Any
from src.utils.services.inference import comprehensive_file_analysis
from src.utils.services.dynamoDB import DocumentStatus, get_table, DynamoDBTable


def comprehensive_check_tool(
    document_id: str,
    framework_id: str,
    force_reanalysis: bool = False
) -> dict[str, Any]:
    """
    Core comprehensive document analysis logic - shared between Bedrock and Strands agents.
    
    Args:
        document_id: The document ID to analyze
        framework_id: Compliance framework (GDPR, SOC2, HIPAA)
        force_reanalysis: Force new analysis even if cached results exist
        user_id: Optional user ID for logging
        org_id: Optional organization ID for logging
    
    Returns:
        Dictionary with analysis results or reference to cached results
    """
    print(f'Comes inside with document_id: {document_id}, framework_id: {framework_id}, force_reanalysis: {force_reanalysis}')
    # Validation
    if not document_id:
        raise ValueError('document_id is required')
    
    if framework_id not in ['GDPR', 'SOC2', 'HIPAA']:
        raise ValueError('framework_id must be GDPR, SOC2, or HIPAA')
    
    # Check document exists and get status
    files_table = get_table(DynamoDBTable.FILES)
    doc_response = files_table.get_item(Key={'file_id': document_id})
    
    if 'Item' not in doc_response:
        raise ValueError(f'Document {document_id} not found')
    
    document = doc_response['Item']
    status = int(str(document.get('status', str(DocumentStatus.UNKNOWN.value))))
    
    # Check if document is ready for analysis
    if status < DocumentStatus.UPLOAD_SUCCESS.value:
        return {
            'status': 202,
            'message': 'Document is still being processed',
            'document_id': document_id,
            'status_code': status
        }
    
    # Check for existing analysis in cache (unless force_reanalysis)
    if not force_reanalysis:
        inferred_table = get_table(DynamoDBTable.INFERRED_FILES)
        cache_response = inferred_table.query(
            IndexName='document-framework-index',
            KeyConditionExpression='document_id = :doc_id AND framework_id = :fw_id',
            ExpressionAttributeValues={
                ':doc_id': document_id,
                ':fw_id': framework_id
            }
        )
        
        if cache_response.get('Items'):
            cached_item = cache_response['Items'][0]
            # Return reference to cached analysis
            return {
                'status': 200,
                'message': 'Using existing analysis (cached)',
                'dynamo_db_query_key': 'record_id',
                'dynamo_db_value_key': 'analysis_result',
                'dynamo_db_document_id': cached_item['record_id'],
                'dynamo_db_table_name': 'PolicyMateInferredFiles',
                'is_cached': True
            }
    
    # Prepare analysis result for inference
    # Note: The actual comprehensive analysis logic should be called here
    # For now, we're creating a placeholder structure
    raw_result: dict[str, Any] = {
        'document_id': document_id,
        'framework': framework_id,
        'overall_verdict': 'PARTIAL',
        'findings': [],
        'missing_controls': [],
        'statistics': {
            'total_controls_checked': 0,
            'compliant': 0,
            'partial': 0,
            'non_compliant': 0,
            'not_addressed': 0
        }
    }
    
    # Run comprehensive analysis with inference
    analysis_result = comprehensive_file_analysis(raw_result)
    
    
    return {
        'status': 200,
        'message': 'Comprehensive analysis completed',
        **analysis_result
    }
