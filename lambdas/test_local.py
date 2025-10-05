import json
import os
import boto3
from typing import Any, Dict
from dotenv import load_dotenv
from src.utils.services.dynamoDB import get_table, DynamoDBTable

load_dotenv(override=True)

if os.environ.get('AWS_PROFILE'):
    boto3.setup_default_session(profile_name=os.environ.get('AWS_PROFILE'))

def regenerate_secrets():
    with open('secrets.json', 'r') as f:
        secrets: Dict[str, Any] = json.load(f)
    
    client = boto3.client('cognito-idp', region_name=os.environ.get('COGNITO_REGION', 'us-east-1')) # pyright: ignore[reportUnknownMemberType]
    
    response = client.initiate_auth(
        ClientId=os.environ.get('COGNITO_CLIENT_ID', ''),
        AuthFlow='USER_PASSWORD_AUTH',
        AuthParameters={
            'USERNAME': str(secrets['username']),
            'PASSWORD': str(secrets['password'])
        }
    )
    
    auth_result = response['AuthenticationResult']  # type: ignore[index]
    secrets['access_token'] = auth_result['AccessToken']  # type: ignore[index]
    secrets['refresh_token'] = auth_result['RefreshToken']  # type: ignore[index]
    secrets['id_token'] = auth_result['IdToken']  # type: ignore[index]
    
    with open('secrets.json', 'w') as f:
        json.dump(secrets, f, indent=2)
    
    print("✓ Secrets regenerated and saved")

def get_cognito_token() -> str:
    with open('secrets.json', 'r') as f:
        secrets: Dict[str, Any] = json.load(f)
    
    id_token = secrets.get('id_token')
    if id_token:
        return str(id_token)
    
    regenerate_secrets()
    return str(secrets['id_token'])
    
def add_entry_to_dynamo_db():
    table = get_table(DynamoDBTable.DOCUMENTS)
    table.put_item(Item={
        'document_id': '0199b414-f3a9-79d8-9c43-99a7730ae8b0',
        'user_id': '34083418-e001-7023-e5cf-fd0488408b82',
        'org_id': '0199ae2a-eff6-773b-8a46-c05bc01735f7',
        'mime_type': 'application/pdf',
        'document_size': 200000,
        'compliance_status': 'in-progress',
        'compliance_issues': [],
        'timestamp': 1759663547474,
        's3_url': 's3://policy-mate/custom-docs/0199ae2a-eff6-773b-8a46-c05bc01735f7/34083418-e001-7023-e5cf-fd0488408b82/id_card.pdf',
    }
    )

if __name__ == "__main__":
    # Regenerate secrets (uncomment if tokens expired)
    # regenerate_secrets()
    
    # Local tests
    # test_authentication_local()
    # print("\n" + "="*50 + "\n")
    # test_ingestion_local()
    
    # Global tests (uncomment to test deployed Lambdas)    
    
    # Add dynamo DB
    add_entry_to_dynamo_db()
