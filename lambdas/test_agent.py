# filePath: lambdas/test_local.py
import json
import os
from unittest.mock import MagicMock
import boto3
from typing import Any, Dict
from dotenv import load_dotenv
from agent_handler import lambda_handler as test_agent_local
from aws_lambda_typing import context as context_

load_dotenv(override=True)

if os.environ.get('AWS_PROFILE'):
    boto3.setup_default_session(profile_name=os.environ.get('AWS_PROFILE'))

def get_id_token() -> str:
    with open('secrets.json', 'r') as f:
        secrets: Dict[str, Any] = json.load(f)
    
    id_token = secrets.get('id_token')
    if id_token:
        return str(id_token)
    
    raise ValueError("ID token not found in secrets.json")

if __name__ == "__main__":
    # Regenerate secrets (uncomment if tokens expired)
    id_token = get_id_token()
    payload:dict[str, Any] = {
        "headers": {
            'Authorization': f'Bearer {id_token}'
        },
        "body": json.dumps({
                "prompt": "[META:file_id=ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c] What is the status of this document? return response in JSON format",
                "session_id": "b4d8b4d8-1031-705e-a4a8-849522fb20b2"
            })
    }
    ctx:context_.Context = MagicMock()
    ctx.aws_request_id = 'test-request-id'
    
    response = test_agent_local(payload, ctx)
    print("Response from local test:")
    print(response['body'])
    # Local tests
    # test_authentication_local()
    # print("\n" + "="*50 + "\n")
    # test_ingestion_local()
    
    # Global tests (uncomment to test deployed Lambdas)    
    
    # Add dynamo DB
    # add_entry_to_dynamo_db()
