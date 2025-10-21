# src/tools/comprehensive_check.py
# Optimized for speed and accuracy with top 10-15 findings
from typing import Any, List, Dict, Literal, Tuple
from dataclasses import dataclass
import json
from pydantic import BaseModel
from uuid6 import uuid7
import fitz
from decimal import Decimal
from concurrent.futures import ThreadPoolExecutor, as_completed

from src.utils.settings import AGENT_CLAUDE_HAIKU
from src.utils.services.dynamoDB import DocumentStatus, DynamoDBTable, get_table
from src.utils.services.annotations import save_annotations_to_dynamodb, serialize_for_dynamodb
from src.utils.services.llm_models import get_bedrock_model
from src.utils.settings import AGENT_REGION
from datetime import datetime, timezone

bedrock = get_bedrock_model(region_name=AGENT_REGION)


class SimpleAnnotation(BaseModel):
    """Simplified annotation model"""
    file_id: str
    analysis_id: str
    annotation_id: str
    resolved: bool
    page_number: int
    x: int
    y: int
    width: int
    height: int
    bookmark_type: str
    review_comments: str


@dataclass
class EnhancedTextBlock:
    """Enhanced text block with metadata"""
    page_number: int
    block_number: int
    block_type: int
    text: str
    bbox: Tuple[float, float, float, float]
    font_names: List[str]
    font_sizes: List[float]
    is_bold: bool
    is_italic: bool
    is_header: bool
    is_footer: bool
    is_toc: bool
    is_boilerplate: bool
    block_index: int
    char_count: int
    line_count: int


def deserialize_dynamodb_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """Convert DynamoDB Decimal types to JSON-serializable types"""
    if isinstance(item, dict): # pyright: ignore[reportUnnecessaryIsInstance]
        return {k: deserialize_dynamodb_item(v) for k, v in item.items()}
    elif isinstance(item, list): # pyright: ignore[reportUnnecessaryIsInstance]
        return [deserialize_dynamodb_item(v) for v in item]
    elif isinstance(item, Decimal): # pyright: ignore[reportUnnecessaryIsInstance]
        return int(item) if item % 1 == 0 else float(item)
    return item


def generate_compliance_verdict(analysis_result: Dict[str, Any]) -> Dict[str, Any]:
    """Generate compliance verdict and update document status"""
    document_id = analysis_result.get('document_id')
    framework_id = analysis_result.get('framework')
    annotations = analysis_result.get('annotations', [])
    
    print(f"📊 Generating verdict for {document_id} ({framework_id})")
    
    # Calculate severity distribution
    severity_counts = {'high': 0, 'medium': 0, 'low': 0}
    critical_issues: List[str] = []
    
    for annotation in annotations:
        comment = annotation.get('review_comments', '').lower()
        if '- high' in comment or '🔴' in comment:
            severity_counts['high'] += 1
            full_comment = annotation.get('review_comments', '')
            if '**Issue:**' in full_comment:
                try:
                    issue = full_comment.split('**Issue:**')[1].split('**Recommended Action:**')[0].strip()
                    critical_issues.append(issue[:200])
                except IndexError:
                    pass
        elif '- medium' in comment or '🟡' in comment:
            severity_counts['medium'] += 1
        elif '- low' in comment or '🟢' in comment:
            severity_counts['low'] += 1
    
    high_count = severity_counts['high']
    medium_count = severity_counts['medium']
    low_count = severity_counts['low']
    
    # Calculate compliance score
    deduction = (high_count * 10) + (medium_count * 3) + (low_count * 1)
    compliance_score = max(0.0, 100.0 - min(deduction, 100))
    
    # Determine verdict
    if high_count == 0 and medium_count == 0 and low_count <= 2:
        verdict: Literal['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL'] = 'COMPLIANT'
        document_status = DocumentStatus.COMPLIANT
        summary = f"Document is compliant with {framework_id}."
    elif high_count >= 3 or (high_count >= 1 and medium_count >= 5):
        verdict = 'NON_COMPLIANT'
        document_status = DocumentStatus.NON_COMPLIANT
        summary = f"Document has {high_count} critical issues requiring immediate attention."
    else:
        verdict = 'PARTIAL'
        document_status = DocumentStatus.PARTIALLY_COMPLIANT
        summary = f"Document partially complies with {framework_id}."
    
    final_verdict: dict[str, Any] = {
        "verdict": verdict,
        "document_status": document_status.value,
        "total_annotations": len(annotations),
        "high_severity_count": high_count,
        "medium_severity_count": medium_count,
        "low_severity_count": low_count,
        "compliance_score": compliance_score,
        "critical_issues": critical_issues[:5],
        "summary": summary
    }
    
    # Update DynamoDB
    try:
        files_table = get_table(DynamoDBTable.FILES)
        files_table.update_item(
            Key={'file_id': document_id},
            UpdateExpression='SET document_status = :status, compliance_verdict = :verdict, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':status': document_status.value,
                ':verdict': verdict,
                ':updated_at': datetime.now(timezone.utc).isoformat()
            }
        )
        print(f"✓ Updated document status: {document_status.name}")
    except Exception as e:
        print(f"⚠ Failed to update document status: {e}")
    
    analysis_result['final_verdict'] = final_verdict
    return analysis_result


class OptimizedComplianceAnalyzer:
    """Optimized analyzer with parallel processing and smart limits"""
    
    # Optimized constants
    MAX_PAGES = 10  # Reduced from 15
    MAX_TOTAL_FINDINGS = 15  # Hard limit on total findings
    MAX_FINDINGS_PER_BATCH = 5  # Reduced from unlimited
    MAX_TOKENS_PER_BATCH = 10000  # Slightly reduced
    MAX_PARALLEL_BATCHES = 3  # Process batches in parallel
    
    def __init__(self):
        self.controls_table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)
        self.cache_table = get_table(DynamoDBTable.INFERRED_FILES)
    
    def check_cached_analysis(self, document_id: str, framework_id: str) -> Dict[str, Any] | None:
        """Check cache for existing analysis"""
        try:
            response = self.cache_table.query(
                IndexName='document-framework-index',
                KeyConditionExpression='document_id = :doc_id AND framework_id = :fw_id',
                ExpressionAttributeValues={
                    ':doc_id': document_id,
                    ':fw_id': framework_id
                },
                Limit=1
            )
            
            items = response.get('Items', [])
            if items:
                print(f"✓ Cache hit for {document_id} + {framework_id}")
                cached_item = deserialize_dynamodb_item(items[0])
                return {
                    'success': True,
                    'document_id': document_id,
                    'analysis_id': cached_item.get('analysis_id'),
                    'framework': framework_id,
                    'annotations_count': cached_item.get('annotations_count', 0),
                    'annotations': cached_item.get('annotations', []),
                    'final_verdict': cached_item.get('final_verdict', {}),
                    'cached': True,
                    'cached_at': cached_item.get('created_at')
                }
            return None
        except Exception as e:
            print(f"⚠ Cache check error: {e}")
            return None
    
    def save_analysis_to_cache(
        self,
        document_id: str,
        framework_id: str,
        analysis_result: Dict[str, Any]
    ) -> bool:
        """Save analysis to cache"""
        try:
            record_id = str(uuid7())
            cache_item: dict[str,Any] = {
                'record_id': record_id,
                'document_id': document_id,
                'framework_id': framework_id,
                'analysis_id': analysis_result.get('analysis_id'),
                'annotations_count': analysis_result.get('annotations_count', 0),
                'annotations': analysis_result.get('annotations', []),
                'final_verdict': analysis_result.get('final_verdict', {}),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'success': analysis_result.get('success', False)
            }
            
            cache_item_serialized = serialize_for_dynamodb(cache_item)
            self.cache_table.put_item(Item=cache_item_serialized)
            print(f"✓ Cached analysis: {document_id} + {framework_id}")
            return True
        except Exception as e:
            print(f"⚠ Cache save error: {e}")
            return False
    
    def extract_enhanced_blocks(self, pdf_bytes: bytes) -> List[EnhancedTextBlock]:
        """Fast block extraction with smart filtering"""
        all_blocks: list[EnhancedTextBlock] = []
        
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            num_pages = min(len(doc), self.MAX_PAGES)
            
            for page_num in range(num_pages):
                page = doc[page_num]
                page_dict: dict[str, Any] = page.get_text("dict") # type: ignore
                page_height = page_dict.get("height", 792)
                
                for block in page_dict.get("blocks", []):
                    if block.get("type") != 0:  # Skip non-text blocks
                        continue
                    
                    full_text = ""
                    font_names: set[str] = set()
                    font_sizes: list[float] = []
                    is_bold = is_italic = False
                    line_count = 0
                    min_x = min_y = float('inf')
                    max_x = max_y = 0
                    
                    for line in block.get("lines", []):
                        line_count += 1
                        for span in line.get("spans", []):
                            text = span.get("text", "")
                            full_text += text + " "
                            font_names.add(span.get("font", ""))
                            font_sizes.append(span.get("size", 10))
                            flags = span.get("flags", 0)
                            is_bold = is_bold or bool(flags & 16)
                            is_italic = is_italic or bool(flags & 2)
                            bbox = span.get("bbox", [0, 0, 0, 0])
                            min_x = min(min_x, bbox[0])
                            min_y = min(min_y, bbox[1])
                            max_x = max(max_x, bbox[2])
                            max_y = max(max_y, bbox[3])
                    
                    text = full_text.strip()
                    if not text or len(text) < 10:  # Skip very short blocks
                        continue
                    
                    avg_font_size = sum(font_sizes) / len(font_sizes) if font_sizes else 10
                    
                    enhanced_block = EnhancedTextBlock(
                        page_number=page_num + 1,
                        block_number=block.get("number", 0),
                        block_type=block.get("type", 0),
                        text=text,
                        bbox=(min_x, min_y, max_x, max_y),
                        font_names=list(font_names),
                        font_sizes=font_sizes,
                        is_bold=is_bold,
                        is_italic=is_italic,
                        is_header=self._is_header(text, avg_font_size, is_bold),
                        is_footer=self._is_footer(text, min_y, page_height),
                        is_toc=self._is_table_of_contents(text),
                        is_boilerplate=False,  # Will set later
                        block_index=len(all_blocks),
                        char_count=len(text),
                        line_count=line_count
                    )
                    
                    # Set boilerplate after creating block
                    enhanced_block.is_boilerplate = self._is_boilerplate(
                        text, enhanced_block.is_footer, enhanced_block.is_toc
                    )
                    
                    all_blocks.append(enhanced_block)
        
        return all_blocks
    
    def _is_header(self, text: str, font_size: float, is_bold: bool) -> bool:
        """Detect headers"""
        return (
            (font_size > 12 or is_bold) and
            len(text) < 200 and
            (text.isupper() or text.istitle())
        )
    
    def _is_footer(self, text: str, y_pos: float, page_height: float) -> bool:
        """Detect footers"""
        bottom_threshold = page_height * 0.9
        footer_keywords = ['page ', 'copyright', '©', 'confidential', 'proprietary']
        return (
            y_pos > bottom_threshold or
            (any(kw in text.lower() for kw in footer_keywords) and len(text) < 100)
        )
    
    def _is_table_of_contents(self, text: str) -> bool:
        """Detect TOC patterns"""
        toc_patterns = [
            '…' in text,
            '.....' in text,
            text.strip().endswith(tuple('0123456789')),
            text.startswith('•')
        ]
        return any(toc_patterns) and len(text) < 150
    
    def _is_boilerplate(self, text: str, is_footer: bool, is_toc: bool) -> bool:
        """Detect boilerplate"""
        if is_footer or is_toc or len(text) < 20:
            return True
        
        boilerplate_keywords = [
            'table of contents', 'contents', 'introduction',
            'appendix', 'reference', 'index'
        ]
        text_lower = text.lower().strip()
        
        if len(text.split()) <= 3 and any(kw in text_lower for kw in boilerplate_keywords):
            return True
        
        return False
    
    def filter_important_blocks(self, blocks: List[EnhancedTextBlock]) -> List[EnhancedTextBlock]:
        """Filter for compliance-relevant content - optimized keyword matching"""
        # Consolidated high-value compliance keywords
        compliance_keywords = {
            'must', 'shall', 'required', 'mandatory', 'policy', 'procedure',
            'compliance', 'regulation', 'gdpr', 'data protection', 'personal data',
            'privacy', 'consent', 'soc2', 'security', 'hipaa', 'phi',
            'access control', 'encryption', 'risk', 'breach', 'audit',
            'vendor', 'third party', 'retention', 'monitoring', 'incident'
        }
        
        important_blocks: list[EnhancedTextBlock] = []
        
        for block in blocks:
            if block.is_boilerplate:
                continue
            
            # Always keep headers
            if block.is_header:
                important_blocks.append(block)
                continue
            
            text_lower = block.text.lower()
            
            # Fast keyword check
            if any(keyword in text_lower for keyword in compliance_keywords):
                important_blocks.append(block)
                continue
            
            # Keep substantive paragraphs with action verbs
            if block.char_count > 100 and len(block.text.split()) > 15:
                action_verbs = ['ensure', 'maintain', 'implement', 'provide', 'establish']
                if any(verb in text_lower for verb in action_verbs):
                    important_blocks.append(block)
        
        return important_blocks
    
    def create_smart_batches(
        self,
        blocks: List[EnhancedTextBlock],
        controls: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Create optimized batches"""
        batches: list[dict[str, Any]] = []
        controls_summary = self._create_controls_summary(controls)
        base_overhead = len(controls_summary) // 4
        
        current_batch: dict[str, Any] = {
            'blocks': [],
            'pages': set(),
            'estimated_tokens': base_overhead,
            'has_header': False
        }
        
        for block in blocks:
            # Truncate long blocks early
            block_text = block.text[:400] if len(block.text) > 400 else block.text
            block_metadata: dict[str, Any] = {
                'page': block.page_number,
                'block_idx': block.block_index,
                'text': block_text,
                'is_header': block.is_header
            }
            
            block_tokens = len(json.dumps(block_metadata)) // 4
            
            if current_batch['estimated_tokens'] + block_tokens > self.MAX_TOKENS_PER_BATCH:
                if current_batch['blocks']:
                    batches.append(current_batch)
                
                current_batch = {
                    'blocks': [block],
                    'pages': {block.page_number},
                    'estimated_tokens': base_overhead + block_tokens,
                    'has_header': block.is_header
                }
            else:
                current_batch['blocks'].append(block)
                current_batch['pages'].add(block.page_number)
                current_batch['estimated_tokens'] += block_tokens
                current_batch['has_header'] = current_batch['has_header'] or block.is_header
        
        if current_batch['blocks']:
            batches.append(current_batch)
        
        return batches
    
    def _create_controls_summary(self, controls: List[Dict[str, Any]]) -> str:
        """Create concise controls summary - top 10 only"""
        summary_parts: list[str] = []
        for control in controls[:10]:
            summary_parts.append(
                f"- **{control.get('control_id', 'N/A')}** "
                f"[{control.get('severity', 'medium')}]: "
                f"{control.get('requirement', '')[:100]}"
            )
        return "\n".join(summary_parts)
    
    def create_analysis_prompt(
        self,
        batch: Dict[str, Any],
        controls: List[Dict[str, Any]],
        framework: str
    ) -> str:
        """Create optimized prompt - prioritizes high-severity findings"""
        controls_summary = self._create_controls_summary(controls)
        
        pages_content: list[dict[str, Any]] = []
        for block in batch['blocks']:
            text = block.text[:400] if len(block.text) > 400 else block.text
            pages_content.append({
                'page': block.page_number,
                'block_idx': block.block_index,
                'text': text,
                'is_header': block.is_header
            })
        
        return f"""You are an expert {framework} compliance auditor. Identify the TOP {self.MAX_FINDINGS_PER_BATCH} MOST CRITICAL compliance issues.

**CONTROLS:**
{controls_summary}

**CONTENT:**
{json.dumps(pages_content, indent=2)}

**PRIORITY:** Focus ONLY on:
1. HIGH severity issues (missing requirements, violations)
2. MEDIUM severity gaps (incomplete policies, ambiguity)
3. Skip LOW severity unless critical

**OUTPUT (JSON array, max {self.MAX_FINDINGS_PER_BATCH} findings):**
```json
[
{{
    "page_number": 1,
    "block_index": 5,
    "control_id": "GDPR-12.1",
    "severity": "high|medium",
    "issue_description": "Specific problem",
    "bookmark_type": "action_required|verify",
    "suggested_action": "Fix recommendation"
}}
]
```

Return ONLY the {self.MAX_FINDINGS_PER_BATCH} most important findings. Empty array if compliant."""
    
    def analyze_batch(
        self,
        batch: Dict[str, Any],
        controls: List[Dict[str, Any]],
        framework: str,
        batch_num: int
    ) -> List[Dict[str, Any]]:
        """Analyze single batch"""
        print(f"🤖 Analyzing batch {batch_num}...")
        
        prompt = self.create_analysis_prompt(batch, controls, framework)
        
        try:
            response = bedrock.invoke_model( # type: ignore
                modelId=AGENT_CLAUDE_HAIKU,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 2000,  # Reduced from 4000
                    "temperature": 0.2,  # Lower temperature for consistency
                    "messages": [{"role": "user", "content": prompt}]
                })
            )
            
            response_body: dict[str, Any] = json.loads(response['body'].read()) # type: ignore
            content = response_body['content'][0]['text']
            findings = self._parse_claude_response(content)
            
            print(f"  ✓ Found {len(findings)} issues")
            return findings
            
        except Exception as e:
            print(f"  ✗ Batch error: {e}")
            return []
    
    def analyze_document(
        self,
        s3_path: str,
        compliance_framework: str,
        file_id: str,
        analysis_id: str
    ) -> List[SimpleAnnotation]:
        """Optimized analysis with parallel processing"""
        print(f"🔍 Starting analysis: {s3_path} ({compliance_framework})")
        
        # Load and extract
        pdf_bytes = self._load_pdf_from_s3(s3_path)
        all_blocks = self.extract_enhanced_blocks(pdf_bytes)
        print(f"📄 Extracted {len(all_blocks)} blocks")
        
        important_blocks = self.filter_important_blocks(all_blocks)
        print(f"✂️ Filtered to {len(important_blocks)} important blocks")
        
        controls = self._get_framework_controls(compliance_framework)
        print(f"📋 Loaded {len(controls)} controls")
        
        batches = self.create_smart_batches(important_blocks, controls)
        print(f"📦 Created {len(batches)} batches")
        
        # Parallel batch processing
        all_findings: list[dict[str, Any]] = []
        
        with ThreadPoolExecutor(max_workers=self.MAX_PARALLEL_BATCHES) as executor:
            future_to_batch = {
                executor.submit(
                    self.analyze_batch,
                    batch,
                    controls,
                    compliance_framework,
                    i + 1
                ): i for i, batch in enumerate(batches)
            }
            
            for future in as_completed(future_to_batch):
                try:
                    findings = future.result()
                    all_findings.extend(findings)
                except Exception as e:
                    print(f"⚠ Batch failed: {e}")
        
        # Apply strict limits and sort by severity
        top_findings = self._get_top_findings(all_findings)
        print(f"🎯 Selected top {len(top_findings)} findings")
        
        annotations = self._create_annotations(top_findings, all_blocks, file_id, analysis_id)
        
        # Save to DynamoDB
        save_annotations_to_dynamodb(
            annotations=annotations,
            document_id=file_id,
            framework_id=compliance_framework,
            analysis_id=analysis_id
        )
        
        print(f"✅ Generated {len(annotations)} annotations")
        return annotations
    
    def _get_top_findings(self, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get top N findings by severity"""
        severity_order = {'high': 0, 'medium': 1, 'low': 2}
        
        # Sort by severity
        sorted_findings = sorted(
            findings,
            key=lambda x: (
                severity_order.get(x.get('severity', 'low'), 3),
                x.get('page_number', 999)
            )
        )
        
        # Take top N
        return sorted_findings[:self.MAX_TOTAL_FINDINGS]
    
    def _load_pdf_from_s3(self, s3_path: str) -> bytes:
        """Load PDF from S3"""
        from src.utils.services.s3 import s3_client
        from src.utils.settings import S3_BUCKET_NAME as BUCKET_NAME
        
        document = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_path)
        return document['Body'].read()
    
    def _get_framework_controls(self, framework: str) -> List[Dict[str, Any]]:
        """Get controls from DynamoDB"""
        try:
            framework_id = f'{framework.lower()}_2025'
            response = self.controls_table.query(
                KeyConditionExpression='framework_id = :fw_id',
                ExpressionAttributeValues={':fw_id': framework_id}
            )
            
            controls = response.get('Items', [])
            formatted_controls: List[Dict[str, Any]] = []
            
            for control in controls:
                formatted_controls.append({
                    'control_id': control.get('control_id', ''),
                    'framework_id': control.get('framework_id', ''),
                    'requirement': control.get('requirement', ''),
                    'severity': control.get('severity', 'medium'),
                    'category': control.get('category', ''),
                    'keywords': control.get('keywords', [])
                })
            
            return formatted_controls
        except Exception as e:
            print(f"✗ Error loading controls: {e}")
            return []
    
    def _parse_claude_response(self, content: str) -> List[Dict[str, Any]]:
        """Parse Claude JSON response"""
        try:
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            
            findings = json.loads(content.strip())
            return findings if isinstance(findings, list) else [] # type: ignore
        except Exception as e:
            print(f"Parse error: {e}")
            return []
    
    def _create_annotations(
        self,
        findings: List[Dict[str, Any]],
        all_blocks: List[EnhancedTextBlock],
        file_id: str,
        analysis_id: str
    ) -> List[SimpleAnnotation]:
        """Create annotations from findings"""
        annotations: list[SimpleAnnotation] = []
        block_map = {block.block_index: block for block in all_blocks}
        
        for finding in findings:
            block_idx = finding.get('block_index')
            if block_idx not in block_map:
                continue
            
            block = block_map[block_idx]
            bbox = block.bbox
            
            annotation = SimpleAnnotation(
                file_id=file_id,
                analysis_id=analysis_id,
                annotation_id=str(uuid7()),
                resolved=False,
                page_number=finding.get('page_number', block.page_number),
                x=int(bbox[0]) - 4,
                y=int(bbox[1]) - 4,
                width=int(bbox[2] - bbox[0]) + 16,
                height=int(bbox[3] - bbox[1]) + 8,
                bookmark_type=finding.get('bookmark_type', 'review'),
                review_comments=self._format_review_comment(finding)
            )
            
            annotations.append(annotation)
        
        return annotations
    
    def _format_review_comment(self, finding: Dict[str, Any]) -> str:
        """Format review comment"""
        emoji_map = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
        severity = finding.get('severity', 'medium')
        
        return f"""{emoji_map.get(severity, '⚪')} **{finding.get('control_id', 'General')}** - {severity.upper()}

**Issue:** {finding.get('issue_description', 'Compliance issue identified')}

**Recommended Action:** {finding.get('suggested_action', 'Review and address this finding')}

---
*AI-generated compliance analysis*"""


def auto_analyse_pdf(
    document_id: str,
    compliance_framework: str,
    analysis_id: str | None = None,
    force_reanalysis: bool = False
) -> Dict[str, Any]:
    """Main analysis function with caching"""
    analysis_id = analysis_id or str(uuid7())
    analyzer = OptimizedComplianceAnalyzer()
    
    # Check cache
    print(f"🔍 Checking cache for {document_id} + {compliance_framework}")
    cached_result = analyzer.check_cached_analysis(document_id, compliance_framework)
    
    if cached_result and not force_reanalysis:
        print(f"✓ Returning cached result")
        return cached_result
    
    if force_reanalysis:
        print(f"ℹ Force re-analysis requested")
    
    # Fresh analysis
    print(f"ℹ Performing fresh analysis...")
    
    files_table = get_table(DynamoDBTable.FILES)
    file_record = files_table.get_item(Key={'file_id': document_id}).get('Item')
    
    if not file_record:
        raise ValueError(f"Document {document_id} not found")
    
    s3_path: str = file_record.get('s3_key') # pyright: ignore[reportAssignmentType]
    
    try:
        annotations = analyzer.analyze_document(
            s3_path=s3_path,
            compliance_framework=compliance_framework,
            file_id=document_id,
            analysis_id=analysis_id
        )
        
        result: dict[str, Any] = {
            'success': True,
            'document_id': document_id,
            'analysis_id': analysis_id,
            'framework': compliance_framework,
            'annotations_count': len(annotations),
            'annotations': [ann.model_dump() for ann in annotations],
            'cached': False
        }
        
        # Generate verdict
        complete_analysis = generate_compliance_verdict(result)
        
        # Cache the result
        analyzer.save_analysis_to_cache(
            document_id=document_id,
            framework_id=compliance_framework,
            analysis_result=complete_analysis
        )
        
        return complete_analysis
        
    except Exception as e:
        print(f"✗ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'success': False,
            'error': str(e),
            'document_id': document_id,
            'analysis_id': analysis_id,
            'cached': False
        }


def comprehensive_check_tool(
    document_id: str,
    framework_id: str,
    force_reanalysis: bool = False
) -> dict[str, Any]:
    """
    Optimized comprehensive document analysis - shared between agents.
    
    Optimizations:
    - Reduced from 15 to 10 pages max
    - Parallel batch processing (up to 3 concurrent)
    - Hard limit of 15 total findings (top severity)
    - Reduced token limits per batch
    - Smart caching with DynamoDB
    - Early filtering of non-compliance blocks
    
    Args:
        document_id: Document ID to analyze
        framework_id: Compliance framework (GDPR, SOC2, HIPAA)
        force_reanalysis: Force new analysis even if cached
    
    Returns:
        Analysis results with top 10-15 findings
    """
    print(f'📥 Request: document_id={document_id}, framework_id={framework_id}, force={force_reanalysis}')
    
    # Validation
    if not document_id:
        raise ValueError('document_id is required')
    
    if framework_id not in ['GDPR', 'SOC2', 'HIPAA']:
        raise ValueError('framework_id must be GDPR, SOC2, or HIPAA')
    
    analysis_result = auto_analyse_pdf(
        document_id=document_id,
        compliance_framework=framework_id,
        force_reanalysis=force_reanalysis
    )
    
    return {
        'status': 200,
        'message': 'Comprehensive analysis completed',
        **analysis_result
    }