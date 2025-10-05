from typing import Any, Dict, Union
import json
from decimal import Decimal

def convert_decimals(obj: Any) -> Any:
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]  # type: ignore[misc]
    elif isinstance(obj, dict):
        return {str(k): convert_decimals(v) for k, v in obj.items()}  # type: ignore[misc]
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj

def bedrock_response(event: Dict[str, Any], status_code: int, body: Union[Dict[str, Any], str]) -> Dict[str, Any]:
    return {
        'messageVersion': '1.0',
        'response': {
            'actionGroup': event.get('actionGroup', ''),
            'apiPath': event.get('apiPath', ''),
            'httpMethod': event.get('httpMethod', ''),
            'httpStatusCode': status_code,
            'responseBody': {
                'application/json': {
                    'body': json.dumps(convert_decimals(body)) if isinstance(body, dict) else body
                }
            }
        }
    }

def is_bedrock_agent(event: Dict[str, Any]) -> bool:
    return 'actionGroup' in event

def get_bedrock_parameters(event: Dict[str, Any]) -> Dict[str, str]:
    # Check requestBody first (for POST/PUT)
    request_body = event.get('requestBody', {}).get('content', {}).get('application/json', [])
    if request_body:
        return {p['name']: p['value'] for p in request_body}
    # Fallback to parameters (for GET)
    parameters = event.get('parameters', [])
    return {p['name']: p['value'] for p in parameters}
