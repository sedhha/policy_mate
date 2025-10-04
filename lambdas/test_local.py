import json
import base64
import os
import boto3
from typing import Any, Dict
from dotenv import load_dotenv
from ingestion_handler import lambda_handler
from mypy_boto3_cognito_idp import CognitoIdentityProviderClient

# Load .env from current directory
load_dotenv(override=True)

# Set AWS profile from env
if os.environ.get('AWS_PROFILE'):
    boto3.setup_default_session(profile_name=os.environ.get('AWS_PROFILE'))



def add_user_claims(username: str, claims: Dict[str, str]) -> None:
    """Add custom claims to Cognito user"""
    client: "CognitoIdentityProviderClient" = boto3.client('cognito-idp', region_name=os.environ.get('COGNITO_REGION', 'us-east-1')) # pyright: ignore[reportUnknownMemberType]
    
    attributes = [{'Name': f'custom:{key}', 'Value': value} for key, value in claims.items()]
    
    client.admin_update_user_attributes(
        UserPoolId=os.environ.get('COGNITO_USER_POOL_ID', ''),
        Username=username,
        UserAttributes=attributes # pyright: ignore[reportArgumentType]
    )
    print(f"✓ Added claims to user {username}: {claims}")

def get_cognito_token() -> str:
    with open('secrets.json', 'r') as f:
        secrets: Dict[str, Any] = json.load(f)
    
    # Try using existing access token
    id_token = secrets.get('id_token')
    if id_token:
        return str(id_token)
    
    # Authenticate with Cognito
    client = boto3.client('cognito-idp', region_name=os.environ.get('COGNITO_REGION', 'us-east-1')) # pyright: ignore[reportUnknownMemberType]
    
    response = client.initiate_auth(
        ClientId=os.environ.get('COGNITO_CLIENT_ID', ''),
        AuthFlow='USER_PASSWORD_AUTH',
        AuthParameters={
            'USERNAME': str(secrets['username']),
            'PASSWORD': str(secrets['password'])
        }
    )
    
    # Save tokens
    auth_result = response['AuthenticationResult']  # type: ignore[index]
    secrets['access_token'] = auth_result['AccessToken']  # type: ignore[index]
    secrets['refresh_token'] = auth_result['RefreshToken']  # type: ignore[index]
    secrets['id_token'] = auth_result['IdToken']  # type: ignore[index]
    
    with open('secrets.json', 'w') as f:
        json.dump(secrets, f, indent=2)
    
    return str(secrets['id_token'])

# Uncomment to add claims to user
# add_user_claims('your-username', {'org_id': 'org456', 'user_role': 'admin'})

# Read a test file
with open('test_file.txt', 'rb') as f:
    file_content = base64.b64encode(f.read()).decode('utf-8')

# Get Cognito JWT token
token = get_cognito_token()


def _update_user_claims():
    # Add custom claims
    claims = {
        'org_id': '0199ae2a-eff6-773b-8a46-c05bc01735f7',
        'role': 'admin'
    }
    add_user_claims('sedhha', claims)
    
def _test_lambda():
    event: Dict[str, Any] = {
        'headers': {
            'Authorization': f'Bearer {token}'
        },
        'body': json.dumps({
            'filename': 'test_file.txt',
            'file': file_content,
            'type': 'custom'  # or 'standard'
        })
    }
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2))

def _test_global_lambda():
    lambda_client = boto3.client('lambda', region_name=os.environ.get('COGNITO_REGION', 'us-east-1')) # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
    
    payload = { # pyright: ignore[reportUnknownVariableType]
        'headers': {
            'Authorization': f'Bearer {token}'
        },
        'body': json.dumps({
            'filename': 'test_file_2.txt',
            'file': file_content,
            'type': 'custom'
        })
    }
    
    response = lambda_client.invoke( # type: ignore
        FunctionName='policy-mate-ingestion',
        InvocationType='RequestResponse',
        Payload=json.dumps(payload)
    )
    
    result = json.loads(response['Payload'].read()) # type: ignore
    print(json.dumps(result, indent=2))
    
operation = '_test_global_lambda' 

if __name__ == "__main__":
    if operation == '_update_user_claims': # pyright: ignore[reportUnnecessaryComparison]
        _update_user_claims()
    elif operation == '_test_lambda': # pyright: ignore[reportUnnecessaryComparison]
        _test_lambda()
    elif operation == '_test_global_lambda':
        _test_global_lambda()
