# filePath: lambdas/src/utils/services/document_extractor.py
import boto3
from typing import Any

s3 = boto3.client('s3')  # type: ignore

def extract_text_from_s3(s3_url: str) -> list[dict[str, Any]]:
    """Extract text from S3 document with position metadata"""
    # Handle s3:// format
    if s3_url.startswith('s3://'):
        s3_url = s3_url.replace('s3://', '')
        parts = s3_url.split('/', 1)
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ''
    else:
        # Handle https:// format
        parts = s3_url.replace('https://', '').replace('http://', '').split('/')
        bucket = parts[0].split('.')[0]
        key = '/'.join(parts[1:])
    
    obj = s3.get_object(Bucket=bucket, Key=key)  # type: ignore
    content = obj['Body'].read().decode('utf-8', errors='ignore')  # type: ignore
    
    # Split into paragraphs with position tracking
    chunks:list[dict[str, Any]] = []
    pos = 0
    
    for para in content.split('\n\n'):
        para = para.strip()
        if para and len(para) > 20:  # Skip very short paragraphs
            chunks.append({
                'text': para,
                'start_char': pos,
                'end_char': pos + len(para)
            })
        pos += len(para) + 2
    
    return chunks

def cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    """Calculate cosine similarity between two vectors"""
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    magnitude1 = sum(a * a for a in vec1) ** 0.5
    magnitude2 = sum(b * b for b in vec2) ** 0.5
    
    if magnitude1 == 0 or magnitude2 == 0:
        return 0.0
    
    return dot_product / (magnitude1 * magnitude2)
