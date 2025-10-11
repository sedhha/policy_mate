import json
from typing import Any
from datetime import datetime, timezone
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.services.dynamoDB import get_table, DynamoDBTable
from src.utils.services.s3 import s3_client
from src.utils.settings import S3_BUCKET_NAME as BUCKET_NAME
from src.utils.response import response
from botocore.exceptions import ClientError


@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Step 2: Confirm upload - check if file exists in S3 and update status
    """
    log_with_context("INFO", "Confirm upload handler invoked", request_id=context.aws_request_id)
    
    # Access claims injected by decorator
    claims: dict[str, Any] = event['claims']
    user_id: str | None = claims.get('sub')
    org_id: str | None = claims.get('custom:org_id')
    
    log_with_context("INFO", f"Processing for user: {user_id}, org: {org_id}", 
                     request_id=context.aws_request_id)
    
    # Validate org_id and user_id
    if not org_id or not user_id:
        log_with_context("ERROR", "Missing org_id or user_id in user claims", 
                        request_id=context.aws_request_id)
        return response(400, {'error': 'Missing organization ID or user ID'})
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        file_id = body.get('fileId')
        
        if not file_id:
            log_with_context("ERROR", "Missing fileId", request_id=context.aws_request_id)
            return response(400, {'error': 'Missing fileId'})
        
        # Get file metadata from DynamoDB
        files_table = get_table(DynamoDBTable.FILES)
        file_item_response = files_table.get_item(Key={'file_id': {'S': file_id}})
        
        file_item = file_item_response.get('Item')
        if not file_item:
            log_with_context("ERROR", f"File not found: {file_id}", request_id=context.aws_request_id)
            return response(404, {'error': 'File not found'})
        
        # Extract file metadata
        s3_key_attr = file_item.get('s3_key', {})
        s3_key = s3_key_attr.get('S', '') if isinstance(s3_key_attr, dict) else ''
        file_hash_attr = file_item.get('file_hash', {})
        file_hash = file_hash_attr.get('S', '') if isinstance(file_hash_attr, dict) else ''
        file_name_attr = file_item.get('file_name', {})
        file_name = file_name_attr.get('S', '') if isinstance(file_name_attr, dict) else ''
        file_status_attr = file_item.get('status', {})
        file_status = file_status_attr.get('S', 'unknown') if isinstance(file_status_attr, dict) else 'unknown'
        upload_type_attr = file_item.get('upload_type', {})
        upload_type = upload_type_attr.get('S', 'custom') if isinstance(upload_type_attr, dict) else 'custom'
        
        
        
        # Check if already completed
        if file_status == 'completed':
            log_with_context("INFO", f"File {file_id} already completed", 
                           request_id=context.aws_request_id)
            return response(200, {
                'file_id': file_id,
                'file_hash': file_hash,
                's3_key': s3_key,
                'upload_type': upload_type,
                'message': 'File upload already confirmed'
            })
        
        # Check if file exists in S3
        try:
            s3_client.head_object(Bucket=BUCKET_NAME, Key=s3_key)
            log_with_context("INFO", f"S3 object verified: {s3_key}", 
                           request_id=context.aws_request_id)
            
            # File exists - mark as completed
            timestamp = datetime.now(timezone.utc).isoformat()
            files_table.update_item(
                Key={'file_id': {'S': file_id}},
                UpdateExpression='SET #status = :status, updated_at = :timestamp',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': {'S': 'completed'},
                    ':timestamp': {'S': timestamp}
                }
            )
            log_with_context("INFO", f"Updated file status to completed: {file_id}", 
                            request_id=context.aws_request_id)
            
            # Link file to user's uploaded_files set
            users_table = get_table(DynamoDBTable.USERS)
            users_table.update_item(
                Key={'user_id': {'S': user_id}},
                UpdateExpression='ADD uploaded_files :file_id SET updated_at = :timestamp',
                ExpressionAttributeValues={
                    ':file_id': {'SS': [file_id]},
                    ':timestamp': {'S': timestamp}
                }
            )
            log_with_context("INFO", f"Linked file {file_id} to user {user_id}", 
                            request_id=context.aws_request_id)
            
            return response(200, {
                'file_id': file_id,
                'file_hash': file_hash,
                'file_name': file_name,
                's3_key': s3_key,
                'upload_type': upload_type,
                'message': 'File upload confirmed successfully'
            })
            
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', '')
            if error_code == '404':
                # File not found in S3 - mark as failed
                log_with_context("ERROR", f"S3 object not found: {s3_key}", 
                               request_id=context.aws_request_id)
                
                timestamp = datetime.now(timezone.utc).isoformat()
                files_table.update_item(
                    Key={'file_id': {'S': file_id}},
                    UpdateExpression='SET #status = :status, updated_at = :timestamp',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':status': {'S': 'failed'},
                        ':timestamp': {'S': timestamp}
                    }
                )
                log_with_context("INFO", f"Marked file as failed: {file_id}", 
                               request_id=context.aws_request_id)
                
                return response(400, {
                    'file_id': file_id,
                    'error': 'File not found in S3. Upload may have failed.',
                    'status': 'failed'
                })
            raise
        
    except json.JSONDecodeError as e:
        log_with_context("ERROR", f"Invalid JSON in request body: {str(e)}", 
                        request_id=context.aws_request_id)
        return response(400, {'error': 'Invalid JSON in request body'})
    
    except Exception as e:
        log_with_context("ERROR", f"Error confirming upload: {str(e)}", 
                        request_id=context.aws_request_id)
        return response(500, {'error': 'Internal server error during upload confirmation'})