# src/utils/services/annotations.py
# DynamoDB operations for managing annotations
from typing import Any, List, Dict
import hashlib
from datetime import datetime, timezone

from src.utils.services.dynamoDB import DynamoDBTable, get_table


def generate_annotation_hash(annotation: Dict[str, Any]) -> str:
    """
    Generate a deterministic hash for an annotation to prevent duplicates.
    Hash is based ONLY on: document_id, page_number, and bbox coordinates (x, y, width, height)
    Does NOT include review_comments or bookmark_type as they may change over time.
    
    Args:
        annotation: Annotation dictionary
    
    Returns:
        SHA256 hash string (first 16 characters for shorter IDs)
    """
    # Extract only location-based fields that uniquely identify an annotation's position
    # Note: file_id in annotation dict maps to document_id in DynamoDB
    hash_components: list[str] = [
        str(annotation.get('file_id', '')),  # This becomes document_id
        str(annotation.get('page_number', 0)),
        str(annotation.get('x', 0)),
        str(annotation.get('y', 0)),
        str(annotation.get('width', 0)),
        str(annotation.get('height', 0))
    ]
    
    # Create deterministic string
    hash_string = '|'.join(hash_components)
    
    # Generate SHA256 hash and take first 16 chars
    hash_digest = hashlib.sha256(hash_string.encode('utf-8')).hexdigest()[:16]
    
    return hash_digest


def serialize_for_dynamodb(item: Any) -> Any:
    """
    Recursively convert Python types to DynamoDB-compatible types
    Converts float to Decimal for DynamoDB compatibility
    
    Args:
        item: Python object with potential float values
    
    Returns:
        DynamoDB-compatible object
    """
    from decimal import Decimal
    
    if isinstance(item, dict):
        return {k: serialize_for_dynamodb(v) for k, v in item.items()} # pyright: ignore[reportUnknownVariableType]
    elif isinstance(item, list):
        return [serialize_for_dynamodb(v) for v in item] # pyright: ignore[reportUnknownVariableType]
    elif isinstance(item, float):
        # Convert float to Decimal for DynamoDB
        return Decimal(str(item))
    else:
        return item


def save_annotations_to_dynamodb(
    annotations: List[Any],  # SimpleAnnotation objects
    document_id: str,
    framework_id: str,
    analysis_id: str
) -> Dict[str, Any]:
    """
    Save annotations to DynamoDB ANNOTATIONS table with update capability.
    Updates existing annotations at the same location (based on annotation_hash).
    
    Args:
        annotations: List of SimpleAnnotation objects (must have model_dump() method)
        document_id: Document identifier
        framework_id: Framework identifier (GDPR, SOC2, HIPAA)
        analysis_id: Analysis session identifier
    
    Returns:
        Dictionary with save statistics
    """
    if not annotations:
        print("ℹ No annotations to save")
        return {
            'created': 0,
            'updated': 0,
            'failed': 0,
            'total': 0
        }
    
    annotations_table = get_table(DynamoDBTable.ANNOTATIONS)
    
    created_count = 0
    updated_count = 0
    failed_count = 0
    
    print(f"💾 Saving {len(annotations)} annotations to DynamoDB...")
    
    # First, query existing annotations for this document to build a hash map
    existing_annotations: dict[str, dict[str, Any]] = {}
    try:
        # Scan for existing annotations with this document_id
        response = annotations_table.scan(
            FilterExpression='document_id = :doc_id',
            ExpressionAttributeValues={':doc_id': document_id}
        )
        
        for item in response.get('Items', []):
            hash_val = item.get('annotation_hash')
            if hash_val and isinstance(hash_val, str):
                existing_annotations[hash_val] = item
        
        print(f"  📊 Found {len(existing_annotations)} existing annotations for this document")
        
    except Exception as e:
        print(f"  ⚠️  Could not check for existing annotations: {e}")
        print(f"  ⚠️  Proceeding without deduplication check")
        existing_annotations = {}
    
    for annotation in annotations:
        try:
            # Convert to dict
            annotation_dict = annotation.model_dump()
            
            # Generate hash for deduplication
            annotation_hash = generate_annotation_hash(annotation_dict)
            
            # Check if annotation already exists
            is_update = annotation_hash in existing_annotations
            
            if is_update:
                # Get existing annotation_id to preserve it
                existing_annotation_id = existing_annotations[annotation_hash].get('annotation_id')
                print(f"  🔄 Updating existing annotation {existing_annotation_id} (hash: {annotation_hash})")
            else:
                existing_annotation_id = annotation_dict.get('annotation_id')
                print(f"  ➕ Creating new annotation {existing_annotation_id} (hash: {annotation_hash})")
            
            # Prepare item for DynamoDB
            annotation_item: dict[str, Any] = {
                'annotation_id': existing_annotation_id,  # Preserve existing ID or use new one
                'document_id': document_id,
                'framework_id': framework_id,
                'analysis_id': analysis_id,
                'annotation_hash': annotation_hash,
                'page_number': annotation_dict.get('page_number'),
                'x': annotation_dict.get('x'),
                'y': annotation_dict.get('y'),
                'width': annotation_dict.get('width'),
                'height': annotation_dict.get('height'),
                'bookmark_type': annotation_dict.get('bookmark_type'),
                'review_comments': annotation_dict.get('review_comments'),
                'resolved': annotation_dict.get('resolved', False),
                'generated_by_policy_mate': True,  # Mark as AI-generated
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            # Add created_at only for new annotations
            if not is_update:
                annotation_item['created_at'] = datetime.now(timezone.utc).isoformat()
            
            # Serialize for DynamoDB (handle Decimal types)
            annotation_item_serialized = serialize_for_dynamodb(annotation_item)
            
            # Save to DynamoDB (put_item will create or overwrite)
            annotations_table.put_item(Item=annotation_item_serialized)
            
            if is_update:
                updated_count += 1
            else:
                created_count += 1
            
        except Exception as e:
            print(f"  ✗ Failed to save annotation: {e}")
            failed_count += 1
            import traceback
            traceback.print_exc()
            continue
    
    print(f"✅ Annotation save complete: {created_count} created, {updated_count} updated, {failed_count} failed")
    
    return {
        'created': created_count,
        'updated': updated_count,
        'failed': failed_count,
        'total': len(annotations)
    }


def get_annotations_for_document(
    document_id: str,
    framework_id: str | None = None,
    include_resolved: bool = False
) -> List[Dict[str, Any]]:
    """
    Retrieve all annotations for a document from DynamoDB.
    
    Args:
        document_id: Document identifier
        framework_id: Optional framework filter (GDPR, SOC2, HIPAA)
        include_resolved: Whether to include resolved annotations
    
    Returns:
        List of annotation dictionaries
    """
    annotations_table = get_table(DynamoDBTable.ANNOTATIONS)
    
    try:
        # Build filter expression
        filter_parts = ['document_id = :doc_id']
        expression_values: dict[str, Any] = {':doc_id': document_id}
        
        if framework_id:
            filter_parts.append('framework_id = :fw_id')
            expression_values[':fw_id'] = framework_id
        
        if not include_resolved:
            filter_parts.append('resolved = :resolved')
            expression_values[':resolved'] = False
        
        filter_expression = ' AND '.join(filter_parts)
        
        response = annotations_table.scan(
            FilterExpression=filter_expression,
            ExpressionAttributeValues=expression_values
        )
        
        annotations = response.get('Items', [])
        print(f"✓ Retrieved {len(annotations)} annotations for document {document_id}")
        
        return annotations
        
    except Exception as e:
        print(f"✗ Error retrieving annotations: {e}")
        import traceback
        traceback.print_exc()
        return []


def mark_annotation_resolved(
    annotation_id: str,
    resolved: bool = True
) -> bool:
    """
    Mark an annotation as resolved or unresolved.
    
    Args:
        annotation_id: Annotation identifier
        resolved: Whether to mark as resolved (True) or unresolved (False)
    
    Returns:
        True if successful, False otherwise
    """
    annotations_table = get_table(DynamoDBTable.ANNOTATIONS)
    
    try:
        annotations_table.update_item(
            Key={'annotation_id': annotation_id},
            UpdateExpression='SET resolved = :resolved, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':resolved': resolved,
                ':updated_at': datetime.now(timezone.utc).isoformat()
            },
            ReturnValues='UPDATED_NEW'
        )
        
        status = "resolved" if resolved else "unresolved"
        print(f"✓ Marked annotation {annotation_id} as {status}")
        return True
        
    except Exception as e:
        print(f"✗ Failed to update annotation {annotation_id}: {e}")
        return False
