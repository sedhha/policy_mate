# filePath: lambdas/src/utils/services/document_extractor.py
import boto3
from typing import Any
from datetime import datetime
from src.utils.services.dynamoDB import DocumentStatus

s3 = boto3.client('s3')  # type: ignore

def extract_text_from_s3(s3_url: str) -> list[dict[str, Any]]:
    """Extract text from S3 document with position metadata"""
    # Handle s3:// format
    if s3_url.startswith('s3://'):
        s3_url = s3_url.replace('s3://', '')
        parts = s3_url.split('/', 1)
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ''
    elif s3_url.startswith('https://') or s3_url.startswith('http://'):
        # Handle https:// format
        parts = s3_url.replace('https://', '').replace('http://', '').split('/')
        bucket = parts[0].split('.')[0]
        key = '/'.join(parts[1:])
    else:
        # Handle plain S3 key (no protocol prefix)
        bucket = 'policy-mate'
        key = s3_url
    
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

def format_file_size(bytes_size: int | None) -> str:
    """Format bytes to human readable format"""
    if not bytes_size:
        return "Unknown"
    
    if bytes_size < 1024:
        return f"{bytes_size} B"
    elif bytes_size < 1048576:
        return f"{bytes_size / 1024:.1f} KB"
    else:
        return f"{bytes_size / 1048576:.1f} MB"

def format_timestamp(timestamp_ms: int | None) -> str:
    """Format Unix timestamp to readable date"""
    if not timestamp_ms:
        return "Unknown"
    
    try:
        dt = datetime.fromtimestamp(int(timestamp_ms) / 1000)
        return dt.strftime("%b %d, %Y")
    except Exception:
        return "Unknown"


def get_status_details(status: Any) -> dict[str, str]:
    """Return user-friendly label, color, and emoji for a given DocumentStatus."""
    
    # Normalize input: accept Enum, int, or str
    if isinstance(status, DocumentStatus):
        status_value = status.value
    elif isinstance(status, int):
        status_value = status
    elif isinstance(status, str):
        try:
            # Try parsing numeric strings like "12"
            status_value = int(status)
        except ValueError:
            # Fallback: unknown string
            return {'label': 'Unknown', 'color': 'gray', 'emoji': '❓'}
    else:
        return {'label': 'Unknown', 'color': 'gray', 'emoji': '❓'}

    # Map by range or specific value
    if 1 <= status_value <= 10:
        return {'label': 'Processing', 'color': 'yellow', 'emoji': '⚙️'}
    elif status_value == DocumentStatus.UPLOAD_FAILED.value:
        return {'label': 'Upload Failed', 'color': 'red', 'emoji': '❌'}
    elif status_value == DocumentStatus.UPLOAD_SUCCESS.value:
        return {'label': 'Upload Successful', 'color': 'green', 'emoji': '✅'}
    elif status_value == DocumentStatus.ANALYSIS_INITIATED.value:
        return {'label': 'Analysis Started', 'color': 'blue', 'emoji': '🔍'}
    elif status_value == DocumentStatus.ANALYSIS_SUCCEEDED.value:
        return {'label': 'Analysis Complete', 'color': 'green', 'emoji': '🧠'}
    elif status_value == DocumentStatus.ANALYSIS_FAILED.value:
        return {'label': 'Analysis Failed', 'color': 'red', 'emoji': '💥'}
    elif status_value == DocumentStatus.REPORT_GENERATED.value:
        return {'label': 'Report Ready', 'color': 'purple', 'emoji': '📄'}
    else:
        return {'label': 'Unknown', 'color': 'gray', 'emoji': '❓'}
