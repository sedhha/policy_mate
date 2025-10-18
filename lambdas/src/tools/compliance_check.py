# src/tools/compliance_check.py
# Shared business logic for compliance check functionality

import json
from typing import Any
import boto3
from src.utils.services.dynamoDB import get_table, DynamoDBTable, replace_decimals
from src.utils.settings import OPEN_SEARCH_REGION

bedrock = boto3.client('bedrock-runtime', region_name=OPEN_SEARCH_REGION)  # type: ignore


def get_relevant_controls(query: str, framework_id: str, control_id: str | None = None) -> list[dict[str, Any]]:
    """Get relevant compliance controls from DynamoDB"""
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


def compliance_check_tool(
    text: str,
    question: str,
    framework_id: str,
    control_id: str | None = None
) -> dict[str, Any]:
    """
    Core compliance check logic - shared between Bedrock and Strands agents.
    
    Args:
        text: The policy text to analyze
        question: Specific compliance question to answer
        framework_id: Compliance framework (GDPR, SOC2, HIPAA)
        control_id: Optional specific control ID to check
        user_id: Optional user ID for logging
    
    Returns:
        Dictionary with analysis results
    """
    # Validation
    if not text:
        raise ValueError('text is required')
    
    if not question:
        raise ValueError('question is required')
    
    if framework_id not in ['GDPR', 'SOC2', 'HIPAA']:
        raise ValueError('framework_id must be GDPR, SOC2, or HIPAA')
    
    # Get relevant controls
    controls = get_relevant_controls(f"{text} {question}", framework_id, control_id)
    
    if not controls:
        raise ValueError('No relevant controls found')
    
    # Analyze compliance
    analysis = analyze_compliance(text, question, controls)
    
    # Ensure all Decimal objects are converted for JSON serialization
    return replace_decimals({
        'analysis': analysis,
        'controls_analyzed': [
            {
                'control_id': c['control_id'],
                'requirement': c['requirement'],
                'category': c['category']
            } for c in controls
        ]
    })
    
# List All Controls Tool
def get_all_controls_tool(framework_id: str) -> dict[str, Any]:
    """
    List all compliance controls for a given framework.
    
    Args:
        framework_id: Compliance framework (GDPR, SOC2, HIPAA)
    Returns:
        Dictionary with list of controls
    """
    if framework_id not in ['GDPR', 'SOC2', 'HIPAA']:
        raise ValueError('framework_id must be GDPR, SOC2, or HIPAA')
    
    table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)
    response = table.scan(
        FilterExpression='framework_id = :fid',
        ExpressionAttributeValues={':fid': f'{framework_id.lower()}_2025'}
    )
    controls = response.get('Items', [])
    
    # Ensure all Decimal objects are converted for JSON serialization
    return replace_decimals({
        'framework_id': framework_id,
        'controls': [
            {
                'control_id': c['control_id'],
                'requirement': c['requirement'],
                'category': c['category'],
                'severity': c['severity']
            } for c in controls
        ]
    })
