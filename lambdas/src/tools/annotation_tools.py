# src/tools/annotation_tools.py
# Annotation tools for processing and managing document annotations

from typing import Any, Dict
from datetime import datetime, timezone
from uuid6 import uuid7


from src.tools.comprehensive_check import auto_analyse_pdf
from src.utils.services.dynamoDB import DynamoDBTable, get_table
from src.utils.services.annotations import (
    get_annotations_for_document,
    mark_annotation_resolved,
    serialize_for_dynamodb
)


def get_annotations_tool(
    document_id: str,
    framework_id: str | None = None,
    include_resolved: bool = False
) -> Dict[str, Any]:
    """
    Retrieve all annotations for a document.
    
    Args:
        document_id: Document identifier
        framework_id: Optional framework filter (GDPR, SOC2, HIPAA)
        include_resolved: Whether to include resolved annotations (default: False)
    
    Returns:
        Dictionary with status and annotations list
    """
    try:
        annotations = get_annotations_for_document(
            document_id=document_id,
            framework_id=framework_id,
            include_resolved=include_resolved
        )
        
        if len(annotations) == 0:
            analysis_result = auto_analyse_pdf(
                document_id=document_id,
                compliance_framework='GDPR' if not framework_id else framework_id,
                force_reanalysis=False
                )
            annotations = analysis_result.get('annotations', [])
        
        return {
            'status': 200,
            'message': f'Retrieved {len(annotations)} annotations',
            'document_id': document_id,
            'framework_id': framework_id,
            'total_annotations': len(annotations),
            'annotations': annotations
        }
        
    except Exception as e:
        print(f"✗ Error in get_annotations_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to retrieve annotations: {str(e)}',
            'document_id': document_id,
            'annotations': []
        }


def update_annotation_status_tool(
    annotation_id: str,
    resolved: bool
) -> Dict[str, Any]:
    """
    Mark an annotation as resolved or unresolved.
    
    Args:
        annotation_id: Annotation identifier
        resolved: True to mark as resolved, False for unresolved
    
    Returns:
        Dictionary with status and update result
    """
    try:
        success = mark_annotation_resolved(
            annotation_id=annotation_id,
            resolved=resolved
        )
        
        if success:
            status_text = "resolved" if resolved else "unresolved"
            return {
                'status': 200,
                'message': f'Annotation marked as {status_text}',
                'annotation_id': annotation_id,
                'resolved': resolved
            }
        else:
            return {
                'status': 500,
                'message': 'Failed to update annotation status',
                'annotation_id': annotation_id
            }
            
    except Exception as e:
        print(f"✗ Error in update_annotation_status_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to update annotation: {str(e)}',
            'annotation_id': annotation_id
        }


def update_annotation_details_tool(
    annotation_id: str,
    bookmark_type: str | None = None,
    review_comments: str | None = None
) -> Dict[str, Any]:
    """
    Update annotation bookmark type and/or review comments.
    
    Args:
        annotation_id: Annotation identifier
        bookmark_type: New bookmark type (verify|review|info|action_required)
        review_comments: New review comments (markdown formatted)
    
    Returns:
        Dictionary with status and update result
    """
    try:
        annotations_table = get_table(DynamoDBTable.ANNOTATIONS)
        
        # Build update expression dynamically
        update_parts = ['updated_at = :updated_at']
        expression_values: Dict[str, Any] = {
            ':updated_at': datetime.now(timezone.utc).isoformat()
        }
        
        if bookmark_type:
            # Validate bookmark type
            valid_types = ['verify', 'review', 'info', 'action_required']
            if bookmark_type not in valid_types:
                return {
                    'status': 400,
                    'message': f'Invalid bookmark_type. Must be one of: {", ".join(valid_types)}',
                    'annotation_id': annotation_id
                }
            update_parts.append('bookmark_type = :bookmark_type')
            expression_values[':bookmark_type'] = bookmark_type
        
        if review_comments:
            update_parts.append('review_comments = :review_comments')
            expression_values[':review_comments'] = review_comments
        
        update_expression = 'SET ' + ', '.join(update_parts)
        
        response = annotations_table.update_item(
            Key={'annotation_id': annotation_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values,
            ReturnValues='ALL_NEW'
        )
        
        updated_item = response.get('Attributes', {})
        
        print(f"✓ Updated annotation {annotation_id}")
        
        return {
            'status': 200,
            'message': 'Annotation updated successfully',
            'annotation_id': annotation_id,
            'updated_fields': {
                'bookmark_type': bookmark_type,
                'review_comments': review_comments
            },
            'annotation': updated_item
        }
        
    except Exception as e:
        print(f"✗ Error in update_annotation_details_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to update annotation details: {str(e)}',
            'annotation_id': annotation_id
        }


def create_annotation_conversation_tool(
    annotation_id: str,
    user_message: str,
    user_id: str | None = None
) -> Dict[str, Any]:
    """
    Start a conversation thread on an annotation.
    Creates a new session and adds the first user message.
    
    Table Schema: session_id (PK), timestamp (SK)
    
    Args:
        annotation_id: Annotation identifier
        user_message: First user message in the conversation
        user_id: Optional user identifier
    
    Returns:
        Dictionary with conversation details
    """
    try:
        from uuid6 import uuid7
        
        conversations_table = get_table(DynamoDBTable.CONVERSATION_HISTORY)
        
        # Use annotation_id as session_id for easy grouping
        session_id = f"annotation_{annotation_id}"
        timestamp = datetime.now(timezone.utc).isoformat()
        message_id = str(uuid7())
        
        # Create first message item
        message_item: Dict[str, Any] = {
            'session_id': session_id,
            'timestamp': timestamp,
            'message_id': message_id,
            'annotation_id': annotation_id,
            'user_id': user_id or 'anonymous',
            'role': 'user',
            'content': user_message,
            'message_type': 'annotation_discussion'
        }
        
        # Serialize and save
        message_item_serialized = serialize_for_dynamodb(message_item)
        conversations_table.put_item(Item=message_item_serialized)
        
        print(f"✓ Created conversation session {session_id} for annotation {annotation_id}")
        
        return {
            'status': 200,
            'message': 'Conversation created successfully',
            'session_id': session_id,
            'annotation_id': annotation_id,
            'message_id': message_id,
            'first_message': message_item
        }
        
    except Exception as e:
        print(f"✗ Error in create_annotation_conversation_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to create conversation: {str(e)}',
            'annotation_id': annotation_id
        }


def add_message_to_conversation_tool(
    session_id: str,
    message: str,
    role: str = 'user',
    user_id: str | None = None
) -> Dict[str, Any]:
    """
    Add a message to an existing conversation session.
    
    Table Schema: session_id (PK), timestamp (SK)
    Messages are naturally ordered by timestamp (sort key)
    
    Args:
        session_id: Session identifier (e.g., "annotation_{annotation_id}")
        message: Message content
        role: Message role ('user' or 'assistant')
        user_id: Optional user identifier
    
    Returns:
        Dictionary with new message details
    """
    try:
        
        conversations_table = get_table(DynamoDBTable.CONVERSATION_HISTORY)
        
        # Validate role
        if role not in ['user', 'assistant']:
            return {
                'status': 400,
                'message': 'Invalid role. Must be "user" or "assistant"',
                'session_id': session_id
            }
        
        message_id = str(uuid7())
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Extract annotation_id from session_id if it follows the pattern
        annotation_id = session_id.replace('annotation_', '') if session_id.startswith('annotation_') else None
        
        new_message: Dict[str, Any] = {
            'session_id': session_id,
            'timestamp': timestamp,
            'message_id': message_id,
            'role': role,
            'content': message,
            'user_id': user_id or 'anonymous',
            'message_type': 'annotation_discussion'
        }
        
        if annotation_id:
            new_message['annotation_id'] = annotation_id
        
        # Serialize and save
        new_message_serialized = serialize_for_dynamodb(new_message)
        conversations_table.put_item(Item=new_message_serialized)
        
        print(f"✓ Added {role} message to session {session_id}")
        
        return {
            'status': 200,
            'message': 'Message added successfully',
            'session_id': session_id,
            'message_id': message_id,
            'timestamp': timestamp,
            'new_message': new_message
        }
        
    except Exception as e:
        print(f"✗ Error in add_message_to_conversation_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to add message: {str(e)}',
            'session_id': session_id
        }


def get_conversation_history_tool(
    session_id: str,
    limit: int | None = None
) -> Dict[str, Any]:
    """
    Retrieve full conversation history for a session.
    Messages are returned in chronological order (oldest first) using the timestamp sort key.
    
    Table Schema: session_id (PK), timestamp (SK)
    
    Args:
        session_id: Session identifier (e.g., "annotation_{annotation_id}")
        limit: Optional limit on number of messages to return
    
    Returns:
        Dictionary with conversation messages in chronological order
    """
    try:
        conversations_table = get_table(DynamoDBTable.CONVERSATION_HISTORY)
        
        # Query by partition key (session_id) - automatically sorted by timestamp (SK)
        query_params: Dict[str, Any] = {
            'KeyConditionExpression': 'session_id = :session_id',
            'ExpressionAttributeValues': {':session_id': session_id},
            'ScanIndexForward': True  # True = ascending (oldest first), False = descending (newest first)
        }
        
        if limit:
            query_params['Limit'] = limit
        
        response = conversations_table.query(**query_params)
        
        messages = response.get('Items', [])
        
        if not messages:
            return {
                'status': 404,
                'message': 'No conversation found for this session',
                'session_id': session_id,
                'messages': []
            }
        
        print(f"✓ Retrieved {len(messages)} messages for session {session_id}")
        
        return {
            'status': 200,
            'message': f'Retrieved {len(messages)} messages',
            'session_id': session_id,
            'total_messages': len(messages),
            'messages': messages,
            'annotation_id': messages[0].get('annotation_id') if messages else None
        }
        
    except Exception as e:
        print(f"✗ Error in get_conversation_history_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to retrieve conversation: {str(e)}',
            'session_id': session_id,
            'messages': []
        }


def get_annotation_conversations_tool(
    annotation_id: str
) -> Dict[str, Any]:
    """
    Get all conversation messages for a specific annotation.
    Messages are returned in chronological order.
    
    Uses the session naming convention: session_id = "annotation_{annotation_id}"
    
    Args:
        annotation_id: Annotation identifier
    
    Returns:
        Dictionary with list of messages in chronological order
    """
    try:
        session_id = f"annotation_{annotation_id}"
        
        # Reuse get_conversation_history_tool for consistency
        result = get_conversation_history_tool(session_id=session_id)
        
        # Enhance response with annotation context
        if result['status'] == 200:
            result['annotation_id'] = annotation_id
            print(f"✓ Retrieved {result.get('total_messages', 0)} messages for annotation {annotation_id}")
        elif result['status'] == 404:
            result['annotation_id'] = annotation_id
            result['message'] = f'No conversations found for annotation {annotation_id}'
        
        return result
        
    except Exception as e:
        print(f"✗ Error in get_annotation_conversations_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to retrieve conversations: {str(e)}',
            'annotation_id': annotation_id,
            'messages': []
        }


def delete_annotation_tool(
    annotation_id: str
) -> Dict[str, Any]:
    """
    Delete an annotation from DynamoDB.
    
    Args:
        annotation_id: Annotation identifier
    
    Returns:
        Dictionary with deletion status
    """
    try:
        annotations_table = get_table(DynamoDBTable.ANNOTATIONS)
        
        # Delete the annotation
        annotations_table.delete_item(
            Key={'annotation_id': annotation_id}
        )
        
        print(f"✓ Deleted annotation {annotation_id}")
        
        return {
            'status': 200,
            'message': 'Annotation deleted successfully',
            'annotation_id': annotation_id
        }
        
    except Exception as e:
        print(f"✗ Error in delete_annotation_tool: {e}")
        import traceback
        traceback.print_exc()
        return {
            'status': 500,
            'message': f'Failed to delete annotation: {str(e)}',
            'annotation_id': annotation_id
        }


def get_session_id_from_annotation(annotation_id: str) -> str:
    """
    Helper function to generate session_id from annotation_id.
    
    Args:
        annotation_id: Annotation identifier
    
    Returns:
        Session ID for conversation history table
    """
    return f"annotation_{annotation_id}"


def get_annotation_id_from_session(session_id: str) -> str | None:
    """
    Helper function to extract annotation_id from session_id.
    
    Args:
        session_id: Session identifier
    
    Returns:
        Annotation ID if session follows convention, None otherwise
    """
    if session_id.startswith('annotation_'):
        return session_id.replace('annotation_', '', 1)
    return None