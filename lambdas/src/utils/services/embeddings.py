# filePath: lambdas/src/utils/services/embeddings.py
import json
import boto3
from src.utils.settings import OPEN_SEARCH_REGION
from mypy_boto3_bedrock_agent_runtime.client import AgentsforBedrockRuntimeClient

bedrock: AgentsforBedrockRuntimeClient = boto3.client('bedrock-runtime', region_name=OPEN_SEARCH_REGION) # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]

def generate_embedding(text: str) -> list[float]:
    """Generate embedding using Bedrock Titan"""
    response = bedrock.invoke_model( # type: ignore
        modelId='amazon.titan-embed-text-v1',
        body=json.dumps({"inputText": text})
    )
    result = json.loads(response['body'].read()) # type: ignore
    return result['embedding']
