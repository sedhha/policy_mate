# filePath: lambdas/src/utils/settings.py
"""
Settings module - imports hardcoded values from secrets.py
This allows values to be baked into the Docker image at build time,
avoiding environment variable issues with Bedrock AgentCore.
"""

# Import all hardcoded values from secrets.py
from src.utils.secrets import (
    # AWS
    AWS_REGION,
    
    # Cognito
    COGNITO_REGION,
    COGNITO_USER_POOL_ID,
    
    # DynamoDB
    DYNAMO_DB_REGION,
    
    # OpenSearch
    OPEN_SEARCH_ENV,
    OPEN_SEARCH_HOST,
    OPEN_SEARCH_REGION,
    OPEN_SEARCH_LOCAL_HOST,
    OPEN_SEARCH_LOCAL_PORT,
    
    # Agent Details
    AGENT_NAME,
    AGENT_ID,
    AGENT_ALIAS_ID,
    AGENT_REGION,
    AGENT_CLAUDE_HAIKU,
    AGENT_CLAUDE_SONNET,
    AGENT_CLAUDE_SONNET_4_5,
    
    # S3
    S3_REGION,
    BUCKET_NAME as S3_BUCKET_NAME,
    
    # AgentCore
    AGENT_CORE_REGION,
    AGENT_CORE_ID,
    AGENT_RUNTIME_ARN,
    AGENT_CORE_MODEL,
    AGENT_CORE_EXPOSED_AGENT_ID,
    AGENT_CORE_ALIAS_ID
)

# Re-export all for backwards compatibility
__all__ = [
    'AWS_REGION',
    'COGNITO_REGION',
    'COGNITO_USER_POOL_ID',
    'DYNAMO_DB_REGION',
    'OPEN_SEARCH_ENV',
    'OPEN_SEARCH_HOST',
    'OPEN_SEARCH_REGION',
    'OPEN_SEARCH_LOCAL_HOST',
    'OPEN_SEARCH_LOCAL_PORT',
    'AGENT_NAME',
    'AGENT_ID',
    'AGENT_ALIAS_ID',
    'AGENT_REGION',
    'AGENT_CLAUDE_HAIKU',
    'AGENT_CLAUDE_SONNET',
    'AGENT_CLAUDE_SONNET_4_5',
    'S3_REGION',
    'S3_BUCKET_NAME',
    'AGENT_CORE_REGION',
    'AGENT_CORE_ID',
    'AGENT_RUNTIME_ARN',
    'AGENT_CORE_MODEL',
    'AGENT_CORE_EXPOSED_AGENT_ID',
    'AGENT_CORE_ALIAS_ID'
]

