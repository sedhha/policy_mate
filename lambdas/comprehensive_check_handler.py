import json
from typing import Any
from aws_lambda_typing import context as context_
import boto3
from src.utils.logger import log_with_context
from src.utils.decorators.auth import require_auth
from src.utils.bedrock_response import bedrock_response
from src.utils.services.dynamoDB import get_table, DynamoDBTable
from src.utils.services.embeddings import generate_embedding
from src.utils.services.document_extractor import extract_text_from_s3, cosine_similarity
from src.utils.settings import OPEN_SEARCH_REGION
from collections import defaultdict

bedrock = boto3.client('bedrock-runtime', region_name=OPEN_SEARCH_REGION)  # type: ignore

def get_all_controls(framework_id: str) -> list[dict[str, Any]]:
    """Get all controls for a framework"""
    table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)
    response = table.scan(
        FilterExpression='framework_id = :fid',
        ExpressionAttributeValues={':fid': f'{framework_id.lower()}_2025'}
    )
    return response.get('Items', [])

def find_relevant_chunks(chunks: list[dict[str, Any]], controls: list[dict[str, Any]], top_k: int = 3) -> dict[str, list[dict[str, Any]]]:
    """Find relevant chunks for each control using embeddings"""
    control_chunks: dict[str, list[dict[str, Any]]] = {}
    
    # Pre-compute chunk embeddings
    chunk_embeddings = [generate_embedding(chunk['text']) for chunk in chunks]
    
    for control in controls:
        query = f"{control['requirement']} {' '.join(control.get('keywords', []))}"
        query_embedding = generate_embedding(query)
        
        # Calculate similarity with each chunk
        chunk_scores = [
            (cosine_similarity(query_embedding, chunk_emb), chunk)
            for chunk_emb, chunk in zip(chunk_embeddings, chunks)
        ]
        
        # Get top K chunks
        chunk_scores.sort(reverse=True, key=lambda x: x[0])
        control_chunks[control['control_id']] = [c[1] for c in chunk_scores[:top_k] if c[0] > 0.3]
    
    return control_chunks

def analyze_chunks_batch(chunks: list[dict[str, Any]], controls: list[dict[str, Any]], category: str) -> list[dict[str, Any]]:
    """Analyze chunks against multiple controls in one Bedrock call"""
    
    chunks_text = '\n\n'.join([
        f"[TEXT_{i}, chars {c['start_char']}-{c['end_char']}]: {c['text']}"
        for i, c in enumerate(chunks)
    ])
    
    controls_text = '\n\n'.join([
        f"Control {c['control_id']} ({c['severity']}): {c['requirement']}"
        for c in controls
    ])
    
    prompt = f"""Analyze these document text snippets against {category} compliance controls.

DOCUMENT TEXT SNIPPETS:
{chunks_text}

CONTROLS TO CHECK:
{controls_text}

For EACH text snippet, identify which controls it addresses and provide analysis.
Return JSON array with this structure:
[
  {{
    "text_index": 0,
    "text_snippet": "exact text from document",
    "start_char": number,
    "end_char": number,
    "controls_addressed": [
      {{
        "control_id": "GDPR-X.X",
        "status": "COMPLIANT" | "NON_COMPLIANT" | "PARTIAL" | "UNCLEAR",
        "reasoning": "specific reasoning"
      }}
    ],
    "verdict": "overall verdict for this text",
    "summary": "brief summary",
    "gaps": ["list of gaps"],
    "recommendations": ["actionable recommendations"],
    "clarity_issues": ["ambiguous language issues"]
  }}
]

Return ONLY valid JSON array, no additional text."""

    response = bedrock.invoke_model(  # type: ignore
        modelId='anthropic.claude-3-haiku-20240307-v1:0',
        body=json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": [{"role": "user", "content": prompt}]
        })
    )
    
    result = json.loads(response['body'].read())  # type: ignore
    content = result['content'][0]['text']
    
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return []

@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    log_with_context("INFO", "Comprehensive check handler invoked", request_id=context.aws_request_id)
    
    try:
        # Extract parameters from Bedrock Agent format (same pattern as other handlers)
        request_body = event.get('requestBody', {}).get('content', {}).get('application/json', {})
        properties = request_body.get('properties', [])
        params = {p['name']: p['value'] for p in properties}
        
        document_id = params.get('document_id', '').strip()
        framework_id = params.get('framework_id', '').upper()
        
        if not document_id:
            return bedrock_response(event, 400, {'error': 'document_id is required'})
        
        if framework_id not in ['GDPR', 'SOC2', 'HIPAA']:
            return bedrock_response(event, 400, {'error': 'framework_id must be GDPR, SOC2, or HIPAA'})
        
        log_with_context("INFO", f"Starting comprehensive analysis: doc={document_id}, framework={framework_id}", request_id=context.aws_request_id)
        
        # Get document from DynamoDB (same pattern as doc_status_handler)
        doc_table = get_table(DynamoDBTable.DOCUMENTS)
        doc_response = doc_table.query(
            KeyConditionExpression='document_id = :doc_id',
            ExpressionAttributeValues={':doc_id': document_id},
            Limit=1
        )
        
        if not doc_response.get('Items'):
            return bedrock_response(event, 404, {'error': 'Document not found'})
        
        document = doc_response['Items'][0]
        s3_url_raw = document.get('s3_url', '')
        
        if not s3_url_raw:
            return bedrock_response(event, 400, {'error': 'Document has no S3 URL'})
        
        # Ensure s3_url is a string
        s3_url = str(s3_url_raw)
        
        # Extract document text
        log_with_context("INFO", "Extracting document text", request_id=context.aws_request_id)
        chunks = extract_text_from_s3(s3_url)
        log_with_context("INFO", f"Extracted {len(chunks)} text chunks", request_id=context.aws_request_id)
        
        # Get all controls for framework
        log_with_context("INFO", f"Loading {framework_id} controls", request_id=context.aws_request_id)
        all_controls = get_all_controls(framework_id)
        log_with_context("INFO", f"Loaded {len(all_controls)} controls", request_id=context.aws_request_id)
        
        # Group controls by category
        controls_by_category: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for control in all_controls:
            controls_by_category[control['category']].append(control)
        
        # Find relevant chunks for each control
        log_with_context("INFO", "Finding relevant text for controls", request_id=context.aws_request_id)
        control_chunks = find_relevant_chunks(chunks, all_controls)
        
        # Analyze by category
        findings: list[dict[str, Any]] = []
        controls_status: dict[str, str] = {}
        
        for category, controls in controls_by_category.items():
            log_with_context("INFO", f"Analyzing category: {category}", request_id=context.aws_request_id)
            
            # Get unique chunks for this category
            category_chunks_set: set[tuple[tuple[str, Any], ...]] = set()
            for control in controls:
                for chunk in control_chunks.get(control['control_id'], []):
                    category_chunks_set.add(tuple(chunk.items()))
            
            category_chunks_list = [dict(c) for c in category_chunks_set]
            
            if category_chunks_list:
                batch_findings = analyze_chunks_batch(category_chunks_list, controls, category)
                findings.extend(batch_findings)
                
                # Track control status
                for finding in batch_findings:
                    for ctrl in finding.get('controls_addressed', []):
                        controls_status[ctrl['control_id']] = ctrl['status']
        
        # Identify missing controls
        missing_controls: list[dict[str, str]] = [
            {
                'control_id': str(c['control_id']),
                'control_name': str(c['requirement'])[:100],
                'severity': str(c['severity']),
                'reason': 'No relevant text found in document'
            }
            for c in all_controls
            if c['control_id'] not in controls_status
        ]
        
        # Calculate statistics
        stats = {
            'total_controls_checked': len(all_controls),
            'compliant': sum(1 for s in controls_status.values() if s == 'COMPLIANT'),
            'partial': sum(1 for s in controls_status.values() if s == 'PARTIAL'),
            'non_compliant': sum(1 for s in controls_status.values() if s == 'NON_COMPLIANT'),
            'not_addressed': len(missing_controls)
        }
        
        overall_verdict = 'COMPLIANT' if stats['non_compliant'] == 0 and stats['not_addressed'] == 0 else \
                         'NON_COMPLIANT' if stats['compliant'] < stats['total_controls_checked'] / 2 else 'PARTIAL'
        
        log_with_context("INFO", f"Analysis complete: {len(findings)} findings, verdict={overall_verdict}", request_id=context.aws_request_id)
        
        return bedrock_response(event, 200, {
            'document_id': document_id,
            'framework': framework_id,
            'overall_verdict': overall_verdict,
            'findings': findings,
            'missing_controls': missing_controls,
            'statistics': stats
        })
        
    except Exception as e:
        log_with_context("ERROR", f"Error in comprehensive check: {str(e)}", request_id=context.aws_request_id)
        return bedrock_response(event, 500, {'error': str(e)})
