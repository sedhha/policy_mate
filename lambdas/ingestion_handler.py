import json
import base64
import os
import boto3
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Dict, Union
from src.utils.response import response
from src.utils.bedrock_response import bedrock_response, is_bedrock_agent

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client
    from mypy_boto3_dynamodb import DynamoDBServiceResource

# Load .env for local testing only
if os.path.exists('.env'):
    from dotenv import load_dotenv
    load_dotenv()

s3: 'S3Client' = boto3.client('s3')  # type: ignore[assignment]
dynamodb: 'DynamoDBServiceResource' = boto3.resource('dynamodb')  # type: ignore[assignment]

BUCKET_NAME = os.environ.get('BUCKET_NAME', '')
TABLE_NAME = os.environ.get('TABLE_NAME', '')
COGNITO_USER_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID', '')
COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-east-1')

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {'.csv', '.xls', '.xlsx', '.pdf', '.docx', '.pptx', '.txt', '.md', '.json'}

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    if is_bedrock_agent(event):
        return handle_bedrock_agent(event)
    
    try:
        claims = event.get('claims', {})
        user_id = claims.get('sub')
        org_id = claims.get('custom:org_id')
                
        if not user_id or not org_id:
            return response(401, {'error': 'Invalid token claims'})
        
        # Parse request body
        body_str = event.get('body', '{}')
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
        filename = body.get('filename')
        file_content = body.get('file')  # base64 encoded
        doc_type = body.get('type', 'custom')  # 'custom' or 'standard'
        
        if doc_type not in {'custom', 'standard'}:
            return response(400, {'error': 'Invalid document type'})
        
        if not filename or not file_content:
            return response(400, {'error': 'Missing filename or file content'})
        
        # Check authorization for standard docs
        if doc_type == 'standard':
            user_role = claims.get('custom:user_role')
            if user_role != 'admin':
                return response(403, {'error': 'Forbidden: Only admins can upload standard documents'})
        
        # Validate file extension
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            return response(400, {'error': f'File type not allowed. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'})
        
        # Check base64 size before decoding (base64 is ~33% larger than binary)
        estimated_size = (len(file_content) * 3) // 4
        if estimated_size > MAX_FILE_SIZE:
            return response(400, {'error': f'File size exceeds {MAX_FILE_SIZE // 1024 // 1024} MB limit'})
        
        # Decode and validate actual file size
        file_data = base64.b64decode(file_content)
        file_size = len(file_data)
        
        if file_size > MAX_FILE_SIZE:
            return response(400, {'error': f'File size exceeds 5MB limit. Size: {file_size} bytes'})
        
        # Upload to S3
        prefix = 'standard-docs' if doc_type == 'standard' else 'custom-docs'
        s3_key = f"{prefix}/{org_id}/{user_id}/{filename}"
        s3.put_object(Bucket=BUCKET_NAME, Key=s3_key, Body=file_data)
        
        # Store metadata in DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        upload_date = datetime.now(timezone.utc).isoformat()
        metadata: Dict[str, Union[str, int, bool]] = {
            'file_id': f"{org_id}#{user_id}#{filename}",
            'filename': filename,
            'file_size': file_size,
            'file_type': file_ext,
            'upload_date': upload_date,
            'user_id': user_id,
            'org_id': org_id,
            's3_path': f"s3://{BUCKET_NAME}/{s3_key}",
            'doc_type': doc_type,
            'is_shared': False
        }
        table.put_item(Item=metadata)  # type: ignore[arg-type]
        
        return response(200, {'message': 'File uploaded successfully', 'metadata': metadata})
    
    except Exception as e:
        return response(500, {'error': str(e)})

def handle_bedrock_agent(event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Extract parameters from properties
        properties = event.get('requestBody', {}).get('content', {}).get('application/json', {}).get('properties', [])
        body_params = {p['name']: p['value'] for p in properties}
        
        claims = json.loads(body_params.get('claims', '{}'))
        user_id = claims.get('sub')
        org_id = claims.get('custom:org_id')
        
        if not user_id or not org_id:
            return bedrock_response(event, 401, {'error': 'Invalid claims'})
        
        # Check for file attachments
        files = event.get('inputFiles', [])
        if not files:
            return bedrock_response(event, 400, {'error': 'No file attached. Please attach a file using the document attachment feature.'})
        
        file_obj = files[0]
        filename = body_params.get('filename', file_obj.get('name'))
        file_content = base64.b64decode(file_obj.get('bytes', ''))
        
        doc_type = body_params.get('type', 'custom')
        
        if doc_type not in {'custom', 'standard'}:
            return bedrock_response(event, 400, {'error': 'Invalid document type'})
        
        if not filename or not file_content:
            return bedrock_response(event, 400, {'error': 'Missing filename or file'})
        
        if doc_type == 'standard' and claims.get('custom:user_role') != 'admin':
            return bedrock_response(event, 403, {'error': 'Admin role required'})
        
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            return bedrock_response(event, 400, {'error': 'File type not allowed'})
        
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            return bedrock_response(event, 400, {'error': 'File too large'})
        
        prefix = 'standard-docs' if doc_type == 'standard' else 'custom-docs'
        s3_key = f"{prefix}/{org_id}/{user_id}/{filename}"
        s3.put_object(Bucket=BUCKET_NAME, Key=s3_key, Body=file_content)
        
        table = dynamodb.Table(TABLE_NAME)
        upload_date = datetime.now(timezone.utc).isoformat()
        metadata: Dict[str, Union[str, int, bool]] = {
            'file_id': f"{org_id}#{user_id}#{filename}",
            'filename': filename,
            'file_size': file_size,
            'file_type': file_ext,
            'upload_date': upload_date,
            'user_id': user_id,
            'org_id': org_id,
            's3_path': f"s3://{BUCKET_NAME}/{s3_key}",
            'doc_type': doc_type,
            'is_shared': False
        }
        table.put_item(Item=metadata)  # type: ignore[arg-type]
        
        return bedrock_response(event, 200, {'message': 'File uploaded', 'metadata': metadata})
    
    except Exception as e:
        return bedrock_response(event, 500, {'error': str(e)})

