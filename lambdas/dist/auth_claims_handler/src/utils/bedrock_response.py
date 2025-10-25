# filePath: lambdas/src/utils/bedrock_response.py
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
    # Add user-friendly error message for agent
    if isinstance(body, dict) and status_code >= 400:
        error_msg = body.get('error', 'Unknown error')
        body['user_message'] = f"Error ({status_code}): {error_msg}"
    
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
    request_body = event.get('requestBody', {}).get('content', {}).get('application/json', {})
    print(f"DEBUG: request_body type={type(request_body)}, value={request_body}")
    if request_body:
        properties = request_body.get('properties', [])
        print(f"DEBUG: properties type={type(properties)}, value={properties}")
        if properties:
            result = {p['name']: p['value'] for p in properties}
            print(f"DEBUG: Returning from requestBody: {result}")
            return result
    # Fallback to parameters (for GET)
    parameters = event.get('parameters', [])
    print(f"DEBUG: parameters type={type(parameters)}, value={parameters}")
    result = {p['name']: p['value'] for p in parameters}
    print(f"DEBUG: Returning from parameters: {result}")
    return result
