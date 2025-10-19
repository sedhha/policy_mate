import boto3
from mypy_boto3_bedrock_agent_runtime.client import AgentsforBedrockRuntimeClient
from src.utils.settings import AGENT_REGION

def get_bedrock_model(region_name: str = AGENT_REGION) -> AgentsforBedrockRuntimeClient:
    """Get Bedrock model"""
    bedrock: AgentsforBedrockRuntimeClient = boto3.client('bedrock-runtime', region_name=region_name) # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
    return bedrock # pyright: ignore[reportUnknownVariableType]