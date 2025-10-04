import json
import base64
import os
import boto3
from typing import Any, Dict
from dotenv import load_dotenv
from authentication_handler import lambda_handler as auth_handler
from ingestion_handler import lambda_handler as ingestion_handler

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

def test_authentication():
    token = get_cognito_token()
    lambda_client = boto3.client('lambda', region_name=os.environ.get('COGNITO_REGION', 'us-east-1')) # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
    
    response = lambda_client.invoke( # type: ignore
        FunctionName='policy-mate-authentication',
        InvocationType='RequestResponse',
        Payload=json.dumps({'body': json.dumps({'token': token})})
    )
    
    result = json.loads(response['Payload'].read()) # type: ignore
    print("Authentication Result:")
    print(json.dumps(result, indent=2))

def test_ingestion():
    token = get_cognito_token()
    
    with open('test_file.txt', 'rb') as f:
        file_content = base64.b64encode(f.read()).decode('utf-8')
    
    lambda_client = boto3.client('lambda', region_name=os.environ.get('COGNITO_REGION', 'us-east-1')) # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
    
    response = lambda_client.invoke( # type: ignore
        FunctionName='policy-mate-ingestion',
        InvocationType='RequestResponse',
        Payload=json.dumps({
            'headers': {'Authorization': f'Bearer {token}'},
            'body': json.dumps({
                'filename': 'test_file.txt',
                'file': file_content,
                'type': 'custom'
            })
        })
    )
    
    result = json.loads(response['Payload'].read()) # type: ignore
    print("Ingestion Result:")
    print(json.dumps(result, indent=2))

def test_authentication_local():
    token = get_cognito_token()
    result = auth_handler({'body': json.dumps({'token': token})}, None)
    print("Authentication Result (Local):")
    print(json.dumps(result, indent=2))

def test_ingestion_local():
    token = get_cognito_token()
    
    with open('test_file.txt', 'rb') as f:
        file_content = base64.b64encode(f.read()).decode('utf-8')
    
    result = ingestion_handler({
        'headers': {'Authorization': f'Bearer {token}'},
        'body': json.dumps({
            'filename': 'test_file.txt',
            'file': file_content,
            'type': 'custom'
        })
    }, None)
    print("Ingestion Result (Local):")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    # Regenerate secrets (uncomment if tokens expired)
    regenerate_secrets()
    
    # Local tests
    # test_authentication_local()
    # print("\n" + "="*50 + "\n")
    # test_ingestion_local()
    
    # Global tests (uncomment to test deployed Lambdas)
    test_authentication()
    # print("\n" + "="*50 + "\n")
    # test_ingestion()
