# filePath: lambdas/file_confirmation_handler.py
import json
from typing import Any
from datetime import datetime, timezone
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.cognito_fe_auth import require_fe_auth
from src.utils.services.dynamoDB import DocumentStatus, get_table, DynamoDBTable
from src.utils.services.s3 import s3_client
from src.utils.settings import S3_BUCKET_NAME as BUCKET_NAME
from src.utils.response import response
from botocore.exceptions import ClientError


@require_fe_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Step 2: Confirm upload - check if file exists in S3 and update status
    """
    log_with_context("INFO", "Confirm upload handler invoked", request_id=context.aws_request_id)
    http_method = event.get('httpMethod') or event.get('requestContext', {}).get('http', {}).get('method')
    if http_method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',  # or 'http://localhost:3000' for more security
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
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
        query: dict[str, Any] = event.get('queryStringParameters') or {}
        file_id = query.get('fileId')
        
        if not file_id:
            log_with_context("ERROR", "Missing fileId", request_id=context.aws_request_id)
            return response(400, {'error': 'Missing fileId', **event})

        # Get file metadata from DynamoDB
        files_table = get_table(DynamoDBTable.FILES)
        file_item_response = files_table.get_item(Key={'file_id': file_id})
        
        file_item = file_item_response.get('Item')
        if not file_item:
            log_with_context("ERROR", f"File not found: {file_id}", request_id=context.aws_request_id)
            return response(404, {'error': 'File not found'})
        
        # Extract file metadata (using high-level syntax)
        s3_key = str(file_item.get('s3_key', ''))
        file_hash = str(file_item.get('file_hash', ''))
        file_name = str(file_item.get('file_name', ''))
        file_status = file_item.get('status', DocumentStatus.UNKNOWN.value)
        upload_type = str(file_item.get('upload_type', 'custom'))
        
        # Check if already completed
        if file_status == DocumentStatus.UPLOAD_SUCCESS.value:
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
                Key={'file_id': file_id},
                UpdateExpression='SET #status = :status, updated_at = :timestamp',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': DocumentStatus.UPLOAD_SUCCESS.value,
                    ':timestamp': timestamp
                }
            )
            log_with_context("INFO", f"Updated file status to completed: {file_id}", 
                            request_id=context.aws_request_id)
            
            # Link file to user's uploaded_files set
            users_table = get_table(DynamoDBTable.USERS)
            users_table.update_item(
                Key={'user_id': user_id},
                UpdateExpression='ADD uploaded_files :file_id SET updated_at = :timestamp',
                ExpressionAttributeValues={
                    ':file_id': {file_id},
                    ':timestamp': timestamp
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
                    Key={'file_id': file_id},
                    UpdateExpression='SET #status = :status, updated_at = :timestamp',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':status': 'failed',
                        ':timestamp': timestamp
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