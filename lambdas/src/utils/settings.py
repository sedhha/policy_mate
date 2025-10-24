# filePath: lambdas/src/utils/settings.py
"""
Settings module - imports hardcoded values from secrets.py
This allows values to be baked into the Docker image at build time,
avoiding environment variable issues with Bedrock AgentCore.
"""

# Import all hardcoded values from secrets.py
from dotenv import load_dotenv
load_dotenv()
from src.utils.secrets import (
    # AWS
    AWS_REGION,
    
    # Cognito
    COGNITO_REGION,
    COGNITO_USER_POOL_ID,    
    
    # Agent Details
    AGENT_CLAUDE_HAIKU,
    AGENT_CLAUDE_SONNET,
    AGENT_CLAUDE_HAIKU_4_5,
    AGENT_CLAUDE_SONNET_4_5,
    AGENT_CLAUDE_HAIKU_ARN,
    
    # S3
    S3_REGION,
    BUCKET_NAME as S3_BUCKET_NAME,
    
    # AgentCore
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
    'AGENT_CLAUDE_HAIKU',
    'AGENT_CLAUDE_SONNET',
    'AGENT_CLAUDE_HAIKU_4_5',
    'AGENT_CLAUDE_HAIKU_ARN',
    'AGENT_CLAUDE_SONNET_4_5',
    'S3_REGION',
    'S3_BUCKET_NAME',
    'AGENT_CORE_ID',
    'AGENT_RUNTIME_ARN',
    'AGENT_CORE_MODEL',
    'AGENT_CORE_EXPOSED_AGENT_ID',
    'AGENT_CORE_ALIAS_ID'
]

