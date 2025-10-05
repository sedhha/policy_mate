from typing import Any, Dict, Union
import json

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
                    'body': json.dumps(body) if isinstance(body, dict) else body
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
