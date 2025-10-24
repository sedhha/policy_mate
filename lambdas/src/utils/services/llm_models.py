import boto3
from mypy_boto3_bedrock_agent_runtime.client import AgentsforBedrockRuntimeClient
from src.utils.settings import AWS_REGION
from botocore.config import Config

# Configure bedrock with aggressive retry strategy
retry_config = Config(
    retries={
        'max_attempts': 10,  # Increased from default 4
        'mode': 'adaptive'    # Uses exponential backoff with jitter
    },
    read_timeout=60,
    connect_timeout=10
)

def get_bedrock_model(region_name: str = AWS_REGION, config: Config|None = retry_config) -> AgentsforBedrockRuntimeClient:
    """Get Bedrock model with optional retry configuration"""
    bedrock: AgentsforBedrockRuntimeClient = boto3.client( # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType, reportArgumentType]
        'bedrock-runtime', 
        region_name=region_name,
        config=config
    ) 
    return bedrock # pyright: ignore[reportUnknownVariableType]