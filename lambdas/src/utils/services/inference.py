import json
from typing import Any
from src.utils.services.llm import llm

COMPREHENSIVE_FILE_ANALYSIS_PROMPT = """
    You must analyze the compliance data and return a valid JSON response that strictly follows this schema:
    {
        "error_message": "string (empty if successful)",
        "tool_payload": {
            "document_id": "string",
            "framework": "string (GDPR/SOC2/HIPAA)",
            "overall_verdict": "string (Compliant/Non-Compliant)",
            "findings": ["array of finding objects"],
            "missing_controls": ["array of control objects"],
            "statistics": {}
        },
        "summarised_markdown": "string (formatted markdown summary)",
        "suggested_next_actions": [
            {
                "action": "string",
                "description": "string"
            }
        ]
    }

    INPUT FORMAT:
    You will receive analysis results with these fields:
    - document_id: Document identifier
    - framework: Compliance framework (GDPR/SOC2/HIPAA)
    - overall_verdict: Compliant or Non-Compliant
    - findings: List of compliance findings
    - missing_controls: List of missing security controls
    - statistics: Numerical statistics about the analysis

    INSTRUCTIONS:
    1. Copy the entire input result into the "tool_payload" field exactly as received
    2. If processing fails, set "error_message" with a clear explanation and leave other fields empty/null
    3. If successful, leave "error_message" as an empty string
    4. Generate a concise, web-friendly markdown summary in "summarised_markdown" that includes:
       - Overall verdict with visual indicators
       - Key findings (top 3-5)
       - Critical missing controls
       - Summary statistics
    5. Suggest 2-4 actionable next steps based on the findings
    6. Ensure the output is valid, parsable JSON with no additional text
    7. CRITICAL: Keep your entire response under 16,000 characters total. The tool_payload must be complete and unmodified, but keep summarised_markdown and suggested_next_actions concise to stay within the character limit.

    Your response must contain ONLY the JSON object, nothing else.
    """

def comprehensive_file_analysis(result: dict[str, Any]) -> dict[str, Any]:
    """
    Use the LLM to process the comprehensive analysis result and obtain a structured inference.
    
    Args:
        result: The raw analysis result dictionary containing document_id, framework, overall_verdict, findings, missing_controls, and statistics.

    Returns:
        A JSON string containing the structured inference.
    """
    tool_payload = {
        "document_id": result.get("document_id", ""),
        "framework": result.get("framework", ""),
        "overall_verdict": result.get("overall_verdict", ""),
        "findings": result.get("findings", []),
        "missing_controls": result.get("missing_controls", []),
        "statistics": result.get("statistics", {})
    }
    
    request_prompt = f"{COMPREHENSIVE_FILE_ANALYSIS_PROMPT}\n\nINPUT RESULT:\n{tool_payload}"

    response = llm.invoke(prompt=request_prompt)
    
    return json.loads(response)