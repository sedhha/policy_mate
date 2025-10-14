# filePath: lambdas/src/utils/extract_json.py
import json
import re
from typing import Any


def extract_json_from_response(response_text: str) -> dict[str, Any] | None:
    """
    Extract JSON from agent response, handling markdown code blocks and mixed content.
    """
    # Try to find JSON in markdown code block
    json_block_pattern = r'```json\s*(\{.*?\})\s*```'
    match = re.search(json_block_pattern, response_text, re.DOTALL)
    
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    
    # Try to find raw JSON object
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.finditer(json_pattern, response_text, re.DOTALL)
    
    for match in matches:
        try:
            parsed = json.loads(match.group(0))
            # Validate it has required structure
            if 'response_type' in parsed and 'content' in parsed:
                return parsed
        except json.JSONDecodeError:
            continue
    
    return None


def create_fallback_response(raw_response: str, session_id: str) -> dict[str, Any]:
    """
    Create a structured response when agent doesn't return JSON.
    """
    return {
        'response_type': 'conversation',
        'content': {
            'markdown': raw_response,
            'metadata': {
                'session_id': session_id,
                'timestamp': None,
                'is_fallback': True
            }
        }
    }
