import json
import os
from unittest.mock import MagicMock
import boto3
from typing import Any, Dict
from dotenv import load_dotenv
from show_doc_handler import lambda_handler
from aws_lambda_typing import context as context_

load_dotenv(override=True)

if os.environ.get('AWS_PROFILE'):
    boto3.setup_default_session(profile_name=os.environ.get('AWS_PROFILE'))

def get_id_token() -> str:
    """Load ID token from secrets.json"""
    with open('secrets.json', 'r') as f:
        secrets: Dict[str, Any] = json.load(f)
    
    id_token = secrets.get('id_token')
    if id_token:
        return str(id_token)
    
    raise ValueError("ID token not found in secrets.json")

if __name__ == "__main__":
    # Get ID token from secrets
    id_token = get_id_token()
    
    # Create test event in Bedrock Agent format
    payload: dict[str, Any] = {
        "actionGroup": "ShowDocumentsActionGroup",
        "apiPath": "/documents",
        "httpMethod": "GET",
        "parameters": [
            {
                "name": "bearer_token",
                "value": id_token
            }
        ]
    }
    
    # Create mock Lambda context
    ctx: context_.Context = MagicMock()
    ctx.aws_request_id = 'test-request-id'
    
    # Call the handler
    response = lambda_handler(payload, ctx)
    
    # Print the response
    print("\n" + "="*80)
    print("Response from show_doc handler:")
    print("="*80)
    
    # Parse and pretty print the response body
    if response.get('response', {}).get('responseBody', {}).get('application/json', {}).get('body'):
        body_str = response['response']['responseBody']['application/json']['body']
        body = json.loads(body_str)
        print(json.dumps(body, indent=2))
    else:
        print(json.dumps(response, indent=2))
    
    print("="*80)

    