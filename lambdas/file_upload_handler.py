# filePath: lambdas/file_upload_handler.py
import json
import uuid
from typing import Any, Literal
from datetime import datetime, timezone
from aws_lambda_typing import context as context_
from src.utils.logger import log_with_context
from src.utils.decorators.cognito_fe_auth import require_fe_auth
from src.utils.services.dynamoDB import DocumentStatus, get_table, DynamoDBTable
from src.utils.services.s3 import s3_client
from src.utils.settings import S3_BUCKET_NAME as BUCKET_NAME
from src.utils.response import response

STATIC_ORG_ID = "019a1b8a-f838-76fc-9e28-df3cacc710aa"
@require_fe_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """
    Step 1: Check if file hash exists, if not generate pre-signed URL for upload
    Supports both standard (admin-only) and custom (all users) uploads
    """
    log_with_context("INFO", "Prepare upload handler invoked", request_id=context.aws_request_id)
    
    # Handle OPTIONS preflight request FIRST (before any other logic)
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
    
    log_with_context("INFO", "Prepare upload handler invoked", request_id=context.aws_request_id)
    # Access claims injected by decorator
    claims: dict[str, Any] = event['claims']
    user_id: str | None = claims.get('sub')
    org_id: str | None = claims.get('custom:org_id') or STATIC_ORG_ID
    user_role: str | None = claims.get('custom:user_role', 'user')
    
    log_with_context("INFO", f"Processing for user: {user_id}, org: {org_id}, role: {user_role}", 
                     request_id=context.aws_request_id)
    
    # Validate org_id and user_id
    if not user_id:
        log_with_context("ERROR", "Missing user_id in user claims", 
                        request_id=context.aws_request_id)
        return response(400, {'error': 'Missing user ID'})
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        file_hash = body.get('fileHash')
        file_name = body.get('fileName')
        file_size = body.get('fileSize')
        file_type = body.get('fileType', 'application/pdf')
        upload_type: Literal['standard', 'custom'] = body.get('uploadType', 'custom')
        
        # Validate upload_type
        if upload_type not in ['standard', 'custom']:
            log_with_context("ERROR", f"Invalid uploadType: {upload_type}", 
                           request_id=context.aws_request_id)
            return response(400, {'error': 'uploadType must be either "standard" or "custom"'})
        
        # Check admin permissions for standard uploads
        if upload_type == 'standard' and user_role != 'admin':
            log_with_context("ERROR", f"User {user_id} does not have permission to upload standard files", 
                            request_id=context.aws_request_id)
            return response(403, {'error': 'Insufficient permissions. Standard uploads require admin role.'})
        
        # Validate required fields
        if not all([file_hash, file_name, file_size]):
            log_with_context("ERROR", "Missing required fields", request_id=context.aws_request_id)
            return response(400, {'error': 'Missing required fields: fileHash, fileName, or fileSize'})
        
        # Validate file size (5MB max)
        max_size = 5 * 1024 * 1024
        if file_size > max_size:
            log_with_context("ERROR", f"File size {file_size} exceeds 5MB limit", 
                           request_id=context.aws_request_id)
            return response(400, {'error': 'File size exceeds 5MB limit'})
        
        # Validate hash format (SHA-256 should be 64 hex characters)
        if not isinstance(file_hash, str) or len(file_hash) != 64:
            log_with_context("ERROR", "Invalid file hash format", request_id=context.aws_request_id)
            return response(400, {'error': 'Invalid file hash format'})
        
        # Check for duplicate file by hash (within same upload type and org)
        files_table = get_table(DynamoDBTable.FILES)
        hash_exists = files_table.query(
            IndexName='file_hash-index',
            KeyConditionExpression='file_hash = :hash_val',
            ExpressionAttributeValues={':hash_val': file_hash},
            Limit=1
        )
        
        # If hash exists, check if it matches the upload type and org
        if hash_exists.get('Items'):
            existing_file = hash_exists['Items'][0]
            file_id = existing_file.get('file_id')
            s3_key = existing_file.get('s3_key')
            existing_upload_type = existing_file.get('upload_type', 'custom')
            existing_org_id = existing_file.get('org_id')
            file_status = existing_file.get('status', 'unknown')
            
            if not file_id or not s3_key:
                log_with_context("ERROR", "Invalid file data in existing record", 
                               request_id=context.aws_request_id)
                return response(500, {'error': 'Invalid file data format'})
            
            # Cast to string for type safety
            file_id_str = str(file_id)
            
            # Only deduplicate if same org, same upload type, and status is not 'failed'
            if existing_org_id == org_id and existing_upload_type == upload_type and file_status == 'completed':
                # Add file to user's uploaded_files set
                users_table = get_table(DynamoDBTable.USERS)
                users_table.update_item(
                    Key={'user_id': user_id},
                    UpdateExpression='ADD uploaded_files :file_id',
                    ExpressionAttributeValues={':file_id': {file_id_str}}
                )
                
                log_with_context("INFO", 
                               f"Duplicate file detected. Linked user {user_id} to existing file {file_id}", 
                               request_id=context.aws_request_id)
                
                return response(200, {
                    'status': 'duplicate',
                    'file_id': file_id,
                    'file_hash': file_hash,
                    's3_key': s3_key,
                    'upload_type': upload_type,
                    'message': 'File already exists. Linked to existing file.'
                })
        
        # File doesn't exist - generate pre-signed URL
        file_id = str(uuid.uuid4())
        
        # Determine S3 key based on upload type
        if upload_type == 'standard':
            # Standard docs: org-level, shared across users
            s3_key = f"standard-docs/{org_id}/{file_id}/{file_name}"
        else:
            # Custom uploads: user-specific
            s3_key = f"custom-docs/{org_id}/{user_id}/{file_id}/{file_name}"
        
        # Generate pre-signed POST URL
        presigned_post = s3_client.generate_presigned_post(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Fields={
                'Content-Type': file_type,
                'x-amz-meta-file-id': file_id,
                'x-amz-meta-file-hash': file_hash,
                'x-amz-meta-uploaded-by': user_id,
                'x-amz-meta-org-id': org_id,
                'x-amz-meta-upload-type': upload_type
            },
            Conditions=[
                {'Content-Type': file_type},
                {'x-amz-meta-file-id': file_id},              
                {'x-amz-meta-file-hash': file_hash},          
                {'x-amz-meta-uploaded-by': user_id},          
                {'x-amz-meta-org-id': org_id},                
                {'x-amz-meta-upload-type': upload_type},      
                ['content-length-range', 0, file_size]
            ],
            ExpiresIn=300  # 5 minutes
        )
        
        log_with_context("INFO", 
                        f"Generated pre-signed URL for file_id: {file_id}, upload_type: {upload_type}", 
                        request_id=context.aws_request_id)
        log_with_context("INFO", f"Presigned POST: {json.dumps(presigned_post, indent=2)}", 
                request_id=context.aws_request_id)
        
        # Reserve the file_id in DynamoDB with PROCESSING status
        timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
        file_metadata: dict[str, Any] = {
            'file_id': file_id,
            'file_hash': file_hash,
            'file_name': file_name,
            'file_type': file_type,
            'file_size': file_size,
            's3_key': s3_key,
            'uploaded_by': user_id,
            'org_id': org_id,
            'upload_type': upload_type,
            'status': DocumentStatus.PROCESSING.value,
            'created_at': timestamp_ms,
            'updated_at': timestamp_ms
        }
        
        files_table.put_item(Item=file_metadata)
        log_with_context("INFO", f"Reserved file metadata in DynamoDB: {file_id}", 
                        request_id=context.aws_request_id)
        
        return response(200, {
            'status': 'new',
            'file_id': file_id,
            's3_key': s3_key,
            'upload_type': upload_type,
            'upload_url': presigned_post['url'],
            'upload_fields': presigned_post['fields'],
            'message': 'Pre-signed URL generated. Please upload file to S3.'
        })
        
    except json.JSONDecodeError as e:
        log_with_context("ERROR", f"Invalid JSON in request body: {str(e)}", 
                        request_id=context.aws_request_id)
        return response(400, {'error': 'Invalid JSON in request body'})
    
    except Exception as e:
        log_with_context("ERROR", f"Error preparing upload: {str(e)}", 
                        request_id=context.aws_request_id)
        return response(500, {'error': 'Internal server error during upload preparation'})