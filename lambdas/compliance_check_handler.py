# filePath: lambdas/compliance_check_handler.py
import json
from typing import Any
from aws_lambda_typing import context as context_
import boto3
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.bedrock_response import bedrock_response
from src.utils.services.dynamoDB import get_table, DynamoDBTable
from src.utils.settings import OPEN_SEARCH_REGION

bedrock = boto3.client('bedrock-runtime', region_name=OPEN_SEARCH_REGION)  # type: ignore

def get_relevant_controls(query: str, framework_id: str, control_id: str | None = None) -> list[dict[str, Any]]:
    """Get relevant compliance controls"""
    table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)
    
    # If specific control_id provided, get it from DynamoDB
    if control_id:
        response = table.get_item(Key={'framework_id': f'{framework_id.lower()}_2025', 'control_id': control_id})
        if 'Item' in response:
            return [response['Item']]
        return []
    
    # Get all controls for framework and use simple keyword matching
    response = table.scan(
        FilterExpression='framework_id = :fid',
        ExpressionAttributeValues={':fid': f'{framework_id.lower()}_2025'}
    )
    return response.get('Items', [])[:5]

def analyze_compliance(user_text: str, question: str, controls: list[dict[str, Any]]) -> dict[str, Any]:
    """Use Bedrock to analyze compliance"""
    
    controls_text = "\n\n".join([
        f"Control: {c['control_id']}\n"
        f"Requirement: {c['requirement']}\n"
        f"Category: {c['category']}\n"
        f"Severity: {c['severity']}"
        for c in controls
    ])
    
    prompt = f"""You are a compliance expert. Analyze the user's policy text against the relevant compliance requirements.
                User's Policy Text:
                {user_text}

                User's Question:
                {question}

                Relevant Compliance Requirements:
                {controls_text}

                Provide a detailed analysis in the following JSON format:
                {{
                "verdict": "COMPLIANT" | "NON_COMPLIANT" | "UNCLEAR" | "PARTIAL",
                "summary": "Brief 2-3 sentence summary of compliance status",
                "detailed_analysis": "Detailed explanation of how the text aligns or doesn't align with requirements",
                "matched_controls": [
                    {{
                    "control_id": "control identifier",
                    "status": "COMPLIANT" | "NON_COMPLIANT" | "UNCLEAR",
                    "reasoning": "specific reasoning for this control"
                    }}
                ],
                "gaps": ["list of missing elements if any"],
                "recommendations": ["actionable suggestions for improvement if needed"]
                }}

                Return ONLY valid JSON, no additional text."""

    response = bedrock.invoke_model(  # type: ignore
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })
    )
    
    result = json.loads(response['body'].read())  # type: ignore
    content = result['content'][0]['text']
    
    # Parse JSON response
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # Fallback if AI doesn't return valid JSON
        return {
            "verdict": "UNCLEAR",
            "summary": content[:200],
            "detailed_analysis": content,
            "matched_controls": [],
            "gaps": [],
            "recommendations": []
        }

@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", "Compliance check handler invoked", request_id=context.aws_request_id)
    
    try:
        # Extract from Bedrock Agent format
        request_body = event.get('requestBody', {}).get('content', {}).get('application/json', {})
        properties = request_body.get('properties', [])
        params = {p['name']: p['value'] for p in properties}
        
        user_text = params.get('text', '').strip()
        question = params.get('question', '').strip()
        framework_id = params.get('framework_id', '').upper()
        control_id = params.get('control_id')
        
        # Validation
        if not user_text:
            return bedrock_response(event, 400, {'error': 'text is required'})
        
        if not question:
            return bedrock_response(event, 400, {'error': 'question is required'})
        
        if framework_id not in ['GDPR', 'SOC2', 'HIPAA']:
            return bedrock_response(event, 400, {'error': 'framework_id must be GDPR, SOC2, or HIPAA'})
        
        log_with_context("INFO", f"Analyzing: framework={framework_id}, control={control_id}", request_id=context.aws_request_id)
        
        # Get relevant controls
        controls = get_relevant_controls(f"{user_text} {question}", framework_id, control_id)
        
        if not controls:
            return bedrock_response(event, 404, {'error': 'No relevant controls found'})
        
        log_with_context("INFO", f"Found {len(controls)} relevant controls", request_id=context.aws_request_id)
        
        # Analyze compliance
        analysis = analyze_compliance(user_text, question, controls)
        
        log_with_context("INFO", f"Analysis complete: {analysis['verdict']}", request_id=context.aws_request_id)
        
        return bedrock_response(event, 200, {
            'analysis': analysis,
            'controls_analyzed': [
                {
                    'control_id': c['control_id'],
                    'requirement': c['requirement'],
                    'category': c['category']
                } for c in controls
            ]
        })
        
    except Exception as e:
        log_with_context("ERROR", f"Error in compliance check: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 500, {'error': str(e)})
