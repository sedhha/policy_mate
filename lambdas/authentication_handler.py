from typing import Any, Dict
import json
import os
import requests
from jose import jwt, JWTError
from dotenv import load_dotenv
from src.utils.bedrock_response import bedrock_response, is_bedrock_agent, get_bedrock_parameters

load_dotenv(override=True)

REGION = os.environ.get('AWS_REGION', 'us-east-1')
USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
JWKS_URL = f'https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json'

jwks_cache = None

def get_jwks():
    global jwks_cache
    if not jwks_cache:
        jwks_cache = requests.get(JWKS_URL).json()
    return jwks_cache

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    if is_bedrock_agent(event):
        return handle_bedrock_agent(event)
    
    try:
        body_str = event.get('body', '{}')
        body = json.loads(body_str) if isinstance(body_str, str) else body_str
        
        jwt_token = body if isinstance(body, str) else body.get('token', '')
        if not isinstance(jwt_token, str):
            return {'statusCode': 400, 'body': json.dumps({'error': 'Invalid token format'})}
            
        header = jwt.get_unverified_header(jwt_token)
        jwks = get_jwks()
        key = next((k for k in jwks['keys'] if k['kid'] == header['kid']), None)
        
        if not key:
            return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid token key'})}
        
        claims = jwt.decode(jwt_token, key, algorithms=['RS256'], options={'verify_aud': False})
        return {'statusCode': 200, 'body': json.dumps(claims)}
    
    except JWTError as e:
        return {'statusCode': 401, 'body': json.dumps({'error': f'Invalid token: {str(e)}'})}
    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def handle_bedrock_agent(event: Dict[str, Any]) -> Dict[str, Any]:
    try:
        # Token comes in requestBody for POST requests
        request_body = event.get('requestBody', {}).get('content', {}).get('application/json', [])
        token = next((p['value'] for p in request_body if p['name'] == 'token'), None)
        
        if not token:
            return bedrock_response(event, 400, {'error': 'Token required'})
        
        header = jwt.get_unverified_header(token)
        jwks = get_jwks()
        key = next((k for k in jwks['keys'] if k['kid'] == header['kid']), None)
        
        if not key:
            return bedrock_response(event, 401, {'error': 'Invalid token'})
        
        claims = jwt.decode(token, key, algorithms=['RS256'], options={'verify_aud': False})
        return bedrock_response(event, 200, claims)
    
    except JWTError as e:
        return bedrock_response(event, 401, {'error': f'Invalid token: {str(e)}'})
    except Exception as e:
        return bedrock_response(event, 500, {'error': str(e)})
