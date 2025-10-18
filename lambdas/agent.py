from strands import Agent
from src.utils.settings import AGENT_CLAUDE_HAIKU
from strands.models import BedrockModel

non_streaming_model = BedrockModel(model_id=AGENT_CLAUDE_HAIKU, streaming=False)
agent = Agent(model=non_streaming_model)

result = agent("What is the capital of France?")
print(result)
