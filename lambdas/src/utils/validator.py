# filePath: lambdas/src/utils/validator.py
from typing import Any
from jose import jwt, JWTError
from src.utils.settings import COGNITO_REGION, COGNITO_USER_POOL_ID
from src.utils.logger import log_with_context
import requests


JWKS_URL = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json'


jwks_cache = None

def get_jwks():
    global jwks_cache
    if not jwks_cache:
        try:
            response = requests.get(JWKS_URL, timeout=5)
            response.raise_for_status()
            jwks_cache = response.json()
        except Exception as e:
            log_with_context("ERROR", f'Failed to fetch JWKS: {str(e)}')
            raise
    return jwks_cache

def validate_user_and_get_claims(token: str) -> dict[str, Any]:
    """Validate the JWT token and return the claims."""
    try:
        header = jwt.get_unverified_header(token)
        jwks = get_jwks()
        key = next((k for k in jwks['keys'] if k['kid'] == header['kid']), None)
        
        if not key:
            raise ValueError("Invalid token key")
        
        claims = jwt.decode(token, key, algorithms=['RS256'], options={'verify_aud': False})
        return claims
    except JWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")
    except Exception as e:
        raise RuntimeError(f"Token validation error: {str(e)}")