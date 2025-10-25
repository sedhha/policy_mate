# filePath: lambdas/src/utils/settings.py
"""
Settings module - imports hardcoded values from secrets.py
This allows values to be baked into the Docker image at build time,
avoiding environment variable issues with Bedrock AgentCore.
"""

# Import all hardcoded values from secrets.py
import os
from dotenv import load_dotenv
load_dotenv("./.env")

AWS_REGION = os.environ['ENV_AWS_REGION']
AWS_PROFILE = os.environ['ENV_AWS_PROFILE']

# Cognito
COGNITO_USER_POOL_ID=os.environ['COGNITO_USER_POOL_ID']
COGNITO_CLIENT_ID=os.environ['COGNITO_CLIENT_ID']

AGENT_CLAUDE_HAIKU = "anthropic.claude-3-haiku-20240307-v1:0"
AGENT_CLAUDE_SONNET = "anthropic.claude-3-5-sonnet-20240620-v1:0"
AGENT_CLAUDE_HAIKU_4_5="us.anthropic.claude-haiku-4-5-20251001-v1:0"
AGENT_CLAUDE_SONNET_4_5 = "us.anthropic.claude-sonnet-4-5-20250929-v1:0"

# S3
S3_BUCKET_NAME = os.environ['S3_BUCKET_NAME']



# Re-export all for backwards compatibility
__all__ = [
    'AWS_REGION',
    'COGNITO_USER_POOL_ID',
    'AGENT_CLAUDE_HAIKU',
    'AGENT_CLAUDE_SONNET',
    'AGENT_CLAUDE_HAIKU_4_5',
    'AGENT_CLAUDE_SONNET_4_5',
    'S3_BUCKET_NAME',
]

