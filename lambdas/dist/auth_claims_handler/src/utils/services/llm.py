from src.utils.settings import OPEN_SEARCH_REGION, AGENT_CLAUDE_HAIKU as AGENT_NAME
import boto3
import json

bedrock = boto3.client('bedrock-runtime', region_name=OPEN_SEARCH_REGION) # type: ignore

class LLM():
    def invoke(self, prompt: str) -> str:
        response = bedrock.invoke_model(  # type: ignore
            modelId=AGENT_NAME,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 4000,
                "messages": [{"role": "user", "content": prompt}]
            })
        )
        
        result = json.loads(response['body'].read())  # type: ignore
        content = result['content'][0]['text']
        return content


# Create a default instance
llm = LLM()

