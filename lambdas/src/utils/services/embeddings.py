# filePath: lambdas/src/utils/services/embeddings.py
import json
import boto3
from src.utils.settings import OPEN_SEARCH_REGION

bedrock = boto3.client('bedrock-runtime', region_name=OPEN_SEARCH_REGION)

def generate_embedding(text: str) -> list[float]:
    """Generate embedding using Bedrock Titan"""
    response = bedrock.invoke_model(
        modelId='amazon.titan-embed-text-v1',
        body=json.dumps({"inputText": text})
    )
    result = json.loads(response['body'].read())
    return result['embedding']
