from typing import Any
from bedrock_agentcore import BedrockAgentCoreApp
from uuid6 import uuid7
import traceback
from src.agents.v2.agent_core_compliance_agent import compliance_agent
import json
app = BedrockAgentCoreApp()


@app.entrypoint  # type: ignore[misc]
def invoke(event: dict[str, Any]) -> dict[str, Any]:
    """Entrypoint for Bedrock AgentCoreApp to invoke the agent."""
    try:
        user_message = event.get("inputText") or event.get("prompt", "")
        session_id = event.get("session_id", str(uuid7()))
        res = str(compliance_agent(user_message))
        agent_response = str(res)
        # Clean the response: remove code blocks and control characters
        # print("##############################################################")
        # print(agent_response)
        # with open("./agent_response.json", "w") as f:
        #     f.write(agent_response)
        # print("##############################################################")
        parsed = json.loads(agent_response)
        parsed["session_id"] = session_id
        return parsed
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        print(f"Agent invocation failed: {str(e)}\nTraceback:\n{error_traceback}")
        return {
            "error_message": f"Agent invocation failed: {str(e)}",
            "tool_payload": {},
            "summarised_markdown": "",
            "suggested_next_actions": []
        }
        
if __name__ == "__main__":
    print("🤖 Compliance Copilot Agent starting on port 8080...")
    print("📋 System prompt loaded - Agent will intelligently route queries")
    print("🔧 Available tools: compliance_check, comprehensive_check, doc_status, show_doc")
    print("🧠 Agent Mode: Smart parameter extraction from user prompts")
    app.run() # type: ignore[misc]
    
# Test: agentcore invoke '{"prompt":"Doc status for - ed9dbabf-517f-4a77-b3f4-dc5b8c44be9c"}'
