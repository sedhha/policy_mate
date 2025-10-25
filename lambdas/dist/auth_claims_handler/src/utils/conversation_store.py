# src/utils/conversation_store.py
from datetime import datetime, timedelta, timezone
from typing import Any, cast
from uuid6 import uuid7
from decimal import Decimal
from src.utils.services.dynamoDB import get_table, DynamoDBTable

def decimal_to_native(obj: Any) -> Any:
    """Convert DynamoDB Decimal types to native Python types"""
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in cast(list[Any], obj)]
    elif isinstance(obj, dict):
        return {str(k): decimal_to_native(v) for k, v in cast(dict[Any, Any], obj).items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

class ConversationStore:
    """Manages conversation history in DynamoDB"""
    
    def __init__(self):
        self.table = get_table(DynamoDBTable.CONVERSATION_HISTORY)
    
    def save_message(
        self,
        session_id: str,
        user_id: str,
        role: str,
        content: str
    ) -> dict[str, Any]:
        """Save a message to conversation history"""
        now = datetime.now(timezone.utc)
        timestamp = now.isoformat().replace('+00:00', 'Z')
        message_id = str(uuid7())
        ttl = int((now + timedelta(days=90)).timestamp())
        
        item: dict[str, str | int] = {
            'session_id': session_id,
            'timestamp': timestamp,
            'user_id': user_id,
            'message_id': message_id,
            'role': role,
            'content': content,
            'ttl': ttl
        }
        
        self.table.put_item(Item=item)  # type: ignore[arg-type]
        return cast(dict[str, Any], item)
    
    def get_messages(
        self,
        session_id: str,
        limit: int = 20,
        last_key: dict[str, Any] | None = None,
        newest_first: bool = True
    ) -> dict[str, Any]:
        """Get paginated messages for a session"""
        query_params: dict[str, Any] = {
            'KeyConditionExpression': 'session_id = :sid',
            'ExpressionAttributeValues': {':sid': session_id},
            'Limit': limit,
            'ScanIndexForward': not newest_first
        }
        
        if last_key:
            query_params['ExclusiveStartKey'] = last_key
        
        response = self.table.query(**query_params)
        
        return {
            'messages': decimal_to_native(response['Items']),
            'next_page_token': decimal_to_native(response.get('LastEvaluatedKey')),
            'has_more': 'LastEvaluatedKey' in response
        }
    
    def get_user_sessions(
        self,
        user_id: str,
        limit: int = 10,
        last_key: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Get paginated list of user's sessions"""
        query_params: dict[str, Any] = {
            'IndexName': 'UserSessionsIndex',
            'KeyConditionExpression': 'user_id = :uid',
            'ExpressionAttributeValues': {':uid': user_id},
            'Limit': limit,
            'ScanIndexForward': False
        }
        
        if last_key:
            query_params['ExclusiveStartKey'] = last_key
        
        response = self.table.query(**query_params)
        
        # Deduplicate sessions
        sessions: dict[str, dict[str, str]] = {}
        for item in response['Items']:
            sid = str(item['session_id'])
            if sid not in sessions:
                sessions[sid] = {
                    'session_id': sid,
                    'last_message_time': str(item['timestamp']),
                    'user_id': str(item['user_id'])
                }
        
        return {
            'sessions': list(sessions.values()),
            'next_page_token': decimal_to_native(response.get('LastEvaluatedKey')),
            'has_more': 'LastEvaluatedKey' in response
        }
