# src/tools/comprehensive_check.py
# Shared business logic for comprehensive document analysis
from typing import Any, List, Dict, Literal, Tuple
from dataclasses import dataclass
import json
from pydantic import BaseModel
from uuid6 import uuid7
import fitz
from decimal import Decimal

from src.utils.settings import AGENT_CLAUDE_HAIKU
from src.utils.services.dynamoDB import DocumentStatus, DynamoDBTable, get_table
from src.utils.services.annotations import save_annotations_to_dynamodb, serialize_for_dynamodb

from src.utils.services.llm_models import get_bedrock_model
from src.utils.settings import AWS_REGION
from datetime import datetime, timezone

bedrock = get_bedrock_model(region_name=AWS_REGION)

class SimpleAnnotation(BaseModel):
    """Same as before, omitted for brevity"""
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
    """Enhanced text block with all metadata from PyMuPDF"""
    page_number: int
    block_number: int
    block_type: int  # 0=text, 1=image
    text: str
    bbox: Tuple[float, float, float, float]
    
    # Font metadata
    font_names: List[str]  # Can have multiple fonts in one block
    font_sizes: List[float]
    is_bold: bool
    is_italic: bool
    
    # Contextual hints
    is_header: bool
    is_footer: bool
    is_toc: bool  # Table of contents
    is_boilerplate: bool
    
    # For tracking
    block_index: int
    char_count: int
    line_count: int


def deserialize_dynamodb_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively convert DynamoDB Decimal types to JSON-serializable types
    
    Args:
        item: DynamoDB item with potential Decimal values
    
    Returns:
        JSON-serializable dictionary
    """
    if isinstance(item, dict): # pyright: ignore[reportUnnecessaryIsInstance]
        return {k: deserialize_dynamodb_item(v) for k, v in item.items()}
    elif isinstance(item, list): # pyright: ignore[reportUnnecessaryIsInstance]
        return [deserialize_dynamodb_item(v) for v in item]
    elif isinstance(item, Decimal): # pyright: ignore[reportUnnecessaryIsInstance]
        # Convert Decimal to int if it's a whole number, otherwise float
        if item % 1 == 0:
            return int(str(item))
        else:
            return float(str(item))
    else:
        return item


def generate_compliance_verdict(
    analysis_result: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate compliance verdict from analysis results and update document status in DynamoDB
    
    Args:
        analysis_result: Output from auto_analyse_pdf containing annotations
    
    Returns:
        Enhanced analysis_result with 'final_verdict' attribute added
    """
    document_id = analysis_result.get('document_id')
    framework_id = analysis_result.get('framework')
    annotations = analysis_result.get('annotations', [])
    
    print(f"📊 Generating compliance verdict for {document_id} ({framework_id})")
    
    # Step 1: Calculate severity distribution
    severity_counts = {
        'high': 0,
        'medium': 0,
        'low': 0
    }
    
    critical_issues: List[str] = []
    
    for annotation in annotations:
        comment = annotation.get('review_comments', '').lower()
        # Parse severity from comment (format: "🔴 **CONTROL-ID** - HIGH")
        if '- high' in comment or '🔴' in comment:
            severity_counts['high'] += 1
            # Extract issue description
            full_comment = annotation.get('review_comments', '')
            if '**Issue:**' in full_comment:
                try:
                    issue = full_comment.split('**Issue:**')[1].split('**Recommended Action:**')[0].strip()
                    critical_issues.append(issue[:200])  # Limit length
                except IndexError:
                    pass
        elif '- medium' in comment or '🟡' in comment:
            severity_counts['medium'] += 1
        elif '- low' in comment or '🟢' in comment:
            severity_counts['low'] += 1
    
    total_issues = len(annotations)
    high_count = severity_counts['high']
    medium_count = severity_counts['medium']
    low_count = severity_counts['low'] 
    print(f"  Found {total_issues} total issues: {high_count} high, {medium_count} medium, {low_count} low")
    
    # Step 2: Calculate compliance score (0-100)
    # Weighted scoring: high=-10, medium=-3, low=-1
    max_deduction = 100
    deduction = (high_count * 10) + (medium_count * 3) + (low_count * 1)
    compliance_score = max(0.0, 100.0 - min(deduction, max_deduction))
    
    print(f"  Compliance score: {compliance_score:.1f}/100")
    
    # Step 3: Determine verdict based on severity and count
    if high_count == 0 and medium_count == 0 and low_count <= 2:
        verdict: Literal['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL'] = 'COMPLIANT'
        document_status = DocumentStatus.COMPLIANT
        summary = f"Document is compliant with {framework_id}. Minor recommendations identified."
    
    elif high_count >= 3 or (high_count >= 1 and medium_count >= 5):
        verdict = 'NON_COMPLIANT'
        document_status = DocumentStatus.NON_COMPLIANT
        summary = f"Document has significant compliance gaps with {framework_id}. {high_count} critical issues require immediate attention."
    
    else:
        verdict = 'PARTIAL'
        document_status = DocumentStatus.PARTIALLY_COMPLIANT
        summary = f"Document partially complies with {framework_id}. Some issues need addressing to achieve full compliance."
    
    print(f"  Verdict: {verdict} (Status: {document_status.name})")
    
    # Step 4: Create verdict object
    final_verdict: dict[str, Any] = {
        "verdict": verdict,
        "document_status": document_status.value,
        "total_annotations": total_issues,
        "high_severity_count": high_count,
        "medium_severity_count": medium_count,
        "low_severity_count": low_count,
        "compliance_score": compliance_score,
        "critical_issues": critical_issues[:5],
        "summary": summary
    }
    
    # Step 5: Update document status in DynamoDB FILES table
    try:
        files_table = get_table(DynamoDBTable.FILES)
        
        files_table.update_item(
            Key={'file_id': document_id},
            UpdateExpression='SET document_status = :status, compliance_verdict = :verdict, updated_at = :updated_at',
            ExpressionAttributeValues={
                ':status': document_status.value,
                ':verdict': verdict,
                ':updated_at': datetime.now(timezone.utc).isoformat()
            },
            ReturnValues='UPDATED_NEW'
        )
        
        print(f"✓ Updated document status in DynamoDB: {document_status.name} (value: {document_status.value})")
        
    except Exception as e:
        print(f"⚠ Failed to update document status in DynamoDB: {e}")
        import traceback
        traceback.print_exc()
        # Non-critical error, continue with response
    
    # Step 6: Add final_verdict to analysis result
    analysis_result['final_verdict'] = final_verdict
    
    print(f"✅ Compliance verdict generated and added to result")
    
    return analysis_result


class ImprovedComplianceAnalyzer:
    """Improved analyzer with smarter batch creation and caching"""
    
    MAX_PAGES = 15
    MAX_ANNOTATIONS_PER_PAGE = 3
    MAX_TOKENS_PER_BATCH = 12000  # Conservative for Bedrock
    
    def __init__(self):
        self.controls_table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)
        self.cache_table = get_table(DynamoDBTable.INFERRED_FILES)
    
    def check_cached_analysis(
        self,
        document_id: str,
        framework_id: str
    ) -> Dict[str, Any] | None:
        """
        Check if analysis already exists in cache
        
        Args:
            file_id: Document ID
            framework_id: Framework identifier (e.g., "GDPR", "SOC2")
        
        Returns:
            Cached analysis result if exists, None otherwise
        """
        try:
            # Query using the secondary index (document-framework-index)
            # The table's primary key is 'record_id', not document_id + framework_id
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
                print(f"✓ Found cached analysis for {document_id} + {framework_id}")
                
                # Deserialize the entire item to handle Decimal types
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
                    'cached_at': cached_item.get('created_at'),
                    'cache_metadata': {
                        'pages_analyzed': cached_item.get('pages_analyzed'),
                        'blocks_processed': cached_item.get('blocks_processed')
                    }
                }
            else:
                print(f"ℹ No cached analysis found for {document_id} + {framework_id}")
                return None
                
        except Exception as e:
            print(f"⚠ Error checking cache: {e}")
            import traceback
            traceback.print_exc()
            # Don't fail the entire process if cache check fails
            return None
    
    def save_analysis_to_cache(
        self,
        document_id: str,
        framework_id: str,
        analysis_result: Dict[str, Any],
        metadata: Dict[str, Any] | None = None
    ) -> bool:
        """
        Save analysis result to cache
        
        Args:
            file_id: Document ID
            framework_id: Framework identifier
            analysis_result: Complete analysis result
            metadata: Optional metadata (pages_analyzed, blocks_processed, etc.)
        
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            # Generate a unique record_id (primary key)
            record_id = str(uuid7())
            cache_item:dict[str, Any] = {
                'record_id': record_id,  # Primary key
                'document_id': document_id,
                'framework_id': framework_id,
                'analysis_id': analysis_result.get('analysis_id'),
                'annotations_count': analysis_result.get('annotations_count', 0),
                'annotations': analysis_result.get('annotations', []),
                'final_verdict': analysis_result.get('final_verdict', {}),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'success': analysis_result.get('success', False)
            }
            
            # Add optional metadata
            if metadata:
                cache_item.update({
                    'pages_analyzed': metadata.get('pages_analyzed'),
                    'blocks_processed': metadata.get('blocks_processed'),
                    'batches_created': metadata.get('batches_created')
                })
            
            # Convert all float values to Decimal for DynamoDB compatibility
            cache_item_serialized = serialize_for_dynamodb(cache_item)
            
            self.cache_table.put_item(Item=cache_item_serialized)
            print(f"✓ Saved analysis to cache: {document_id} + {framework_id} (record_id: {record_id})")
            return True
            
        except Exception as e:
            print(f"⚠ Error saving to cache: {e}")
            return False
    
    def extract_enhanced_blocks(self, pdf_bytes: bytes) -> List[EnhancedTextBlock]:
        """
        Extract blocks with full metadata and smart classification
        """
        all_blocks:list[EnhancedTextBlock] = []
        
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            num_pages = min(len(doc), self.MAX_PAGES)
            
            for page_num in range(num_pages):
                page = doc[page_num]
                page_dict: dict[str, Any] = page.get_text("dict") # pyright: ignore[reportUnknownVariableType, reportAssignmentType, reportUnknownMemberType]
                page_height = page_dict.get("height", 792)
                
                for block in page_dict.get("blocks", []):
                    # Skip image blocks (type 1) for now
                    if block.get("type") != 0:
                        continue
                    
                    # Extract all text and metadata from lines/spans
                    full_text = ""
                    font_names:set[str] = set()
                    font_sizes:list[float] = []
                    is_bold = False
                    is_italic = False
                    line_count = 0
                    
                    # Merge bbox
                    min_x = min_y = float('inf')
                    max_x = max_y = 0
                    
                    for line in block.get("lines", []):
                        line_count += 1
                        for span in line.get("spans", []):
                            text = span.get("text", "")
                            full_text += text + " "
                            
                            # Collect font metadata
                            font_names.add(span.get("font", ""))
                            font_sizes.append(span.get("size", 10))
                            
                            # Check flags (16=bold, 2=italic, 20=bold+italic)
                            flags = span.get("flags", 0)
                            is_bold = is_bold or bool(flags & 16)
                            is_italic = is_italic or bool(flags & 2)
                            
                            # Update bbox
                            bbox = span.get("bbox", [0, 0, 0, 0])
                            min_x = min(min_x, bbox[0])
                            min_y = min(min_y, bbox[1])
                            max_x = max(max_x, bbox[2])
                            max_y = max(max_y, bbox[3])
                    
                    text = full_text.strip()
                    if not text:
                        continue
                    
                    # Calculate average font size
                    avg_font_size = sum(font_sizes) / len(font_sizes) if font_sizes else 10
                    
                    # Classify block type
                    is_header = self._is_header(text, avg_font_size, is_bold)
                    is_footer = self._is_footer(text, min_y, page_height)
                    is_toc = self._is_table_of_contents(text)
                    is_boilerplate = self._is_boilerplate(text, is_footer, is_toc)
                    
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
                        is_header=is_header,
                        is_footer=is_footer,
                        is_toc=is_toc,
                        is_boilerplate=is_boilerplate,
                        block_index=len(all_blocks),
                        char_count=len(text),
                        line_count=line_count
                    )
                    
                    all_blocks.append(enhanced_block)
        
        return all_blocks
    
    def _is_header(self, text: str, font_size: float, is_bold: bool) -> bool:
        """Detect if block is a header"""
        # Headers are usually:
        # - Large font (>12)
        # - Bold
        # - Short text (<200 chars)
        # - Capitalized or title case
        return (
            (font_size > 12 or is_bold) and
            len(text) < 200 and
            (text.isupper() or text.istitle())
        )
    
    def _is_footer(self, text: str, y_pos: float, page_height: float) -> bool:
        """Detect footer (bottom 10% of page)"""
        # Footers usually contain:
        # - Page numbers
        # - Copyright
        # - Located in bottom 10% of page
        bottom_threshold = page_height * 0.9
        
        footer_keywords = ['page ', 'copyright', '©', 'confidential', 'proprietary']
        
        return (
            y_pos > bottom_threshold or
            any(kw in text.lower() for kw in footer_keywords) and len(text) < 100
        )
    
    def _is_table_of_contents(self, text: str) -> bool:
        """Detect table of contents patterns"""
        # TOC usually has:
        # - Dots/ellipsis (…)
        # - Page numbers at end
        # - Bullet points
        toc_patterns = [
            '…' in text,  # Ellipsis
            '.....' in text,  # Dots
            text.strip().endswith(tuple('0123456789')),  # Ends with number
            text.startswith('•'),  # Bullet point
            text.startswith('\t•')  # Tab + bullet
        ]
        
        return any(toc_patterns) and len(text) < 150
    
    def _is_boilerplate(self, text: str, is_footer: bool, is_toc: bool) -> bool:
        """Comprehensive boilerplate detection"""
        if is_footer or is_toc:
            return True
        
        # Very short text (likely page numbers, headers)
        if len(text) < 20:
            return True
        
        boilerplate_keywords = [
            'table of contents',
            'contents',
            'introduction',  # Often just title
            'closing note',
            'appendix',
            'reference',
            'index'
        ]
        
        text_lower = text.lower().strip()
        
        # Single word or very short phrase that's just a section title
        if len(text.split()) <= 3 and any(kw in text_lower for kw in boilerplate_keywords):
            return True
        
        return False
    
    def filter_important_blocks(self, blocks: List[EnhancedTextBlock]) -> List[EnhancedTextBlock]:
        """
        Filter to keep only compliance-relevant content
        Much smarter than before
        """
        important_blocks:list[EnhancedTextBlock] = []
        
        # Compliance-related keywords (expanded)
        compliance_keywords = {
            # Core compliance (15)
            'must', 'shall', 'required', 'mandatory', 'obligatory',
            'policy', 'procedure', 'guideline', 'standard', 'framework',
            'compliance', 'regulation', 'requirement', 'obligation', 'directive',
            
            # GDPR (15)
            'gdpr', 'data protection', 'personal data', 'privacy',
            'consent', 'data subject', 'controller', 'processor', 'subprocessor',
            'retention', 'deletion', 'breach', 'dpo', 'dpa',
            'lawful basis',
            
            # SOC2 (10)
            'soc2', 'soc 2', 'trust services', 'security',
            'availability', 'confidentiality', 'processing integrity',
            'audit', 'control', 'evidence',
            
            # HIPAA (8)
            'hipaa', 'phi', 'protected health information', 'ephi',
            'covered entity', 'business associate', 'breach notification',
            'minimum necessary',
            
            # Security & Access (8)
            'access control', 'authentication', 'authorization',
            'encryption', 'mfa', 'multi-factor', 'secure', 'protection',
            
            # Risk Management (6)
            'risk', 'assessment', 'threat', 'vulnerability', 'safeguard', 'impact',
            
            # Third-Party (6) ← NEW, HIGH VALUE
            'vendor', 'supplier', 'third party', 'service provider',
            'contractor', 'partner',
            
            # Temporal (7) ← NEW, CATCHES VAGUENESS
            'annually', 'quarterly', 'monthly', 'regularly', 'periodically',
            'timeframe', 'promptly',
            
            # Organizational (7) ← NEW
            'responsibility', 'accountability', 'designated', 'officer',
            'committee', 'oversight', 'governance',
            
            # Data Lifecycle (6) ← NEW
            'collection', 'processing', 'storage', 'transfer', 'disposal', 'destruction',
            
            # Monitoring & Evidence (7) ← NEW
            'monitoring', 'logging', 'log', 'audit trail', 'record',
            'review', 'surveillance',
            
            # Incident Response (6)
            'incident', 'response', 'notification', 'disclosure',
            'remediation', 'mitigation',
            
            # Action Verbs (8)
            'ensure', 'verify', 'demonstrate', 'document', 'maintain',
            'implement', 'establish', 'conduct'
        }
        
        for block in blocks:
            # Skip boilerplate
            if block.is_boilerplate:
                continue
            
            text_lower = block.text.lower()
            
            # ALWAYS keep headers (section titles are important)
            if block.is_header:
                important_blocks.append(block)
                continue
            
            # Keep blocks with compliance keywords
            if any(keyword in text_lower for keyword in compliance_keywords):
                important_blocks.append(block)
                continue
            
            # Keep substantive paragraphs (likely policy statements)
            if block.char_count > 100 and len(block.text.split()) > 15:
                # Check if it's actually substantive (not just filler)
                # Look for action verbs
                action_verbs = ['ensure', 'maintain', 'implement', 'provide', 
                               'establish', 'conduct', 'perform', 'document']
                if any(verb in text_lower for verb in action_verbs):
                    important_blocks.append(block)
        
        return important_blocks
    
    def create_smart_batches(
        self,
        blocks: List[EnhancedTextBlock],
        controls: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        MUCH SMARTER batching strategy
        
        Strategy:
        1. Group by semantic sections (headers + following paragraphs)
        2. Respect page boundaries for better context
        3. Include headers for context even if short
        4. Optimize for token limits
        """
        batches:list[dict[str, Any]] = []
        
        # Estimate base prompt overhead
        controls_summary = self._create_controls_summary(controls)
        base_overhead = len(controls_summary) // 4  # Rough token estimate
        
        current_batch:dict[str, Any] = {
            'blocks': [],
            'pages': set(),
            'estimated_tokens': base_overhead,
            'has_header': False
        }
        
        for _, block in enumerate(blocks):
            # Estimate tokens for this block
            # Include metadata overhead
            block_text = block.text[:500] if len(block.text) > 500 else block.text
            block_metadata:dict[str, Any] = {
                'page': block.page_number,
                'block_idx': block.block_index,
                'text': block_text,
                'is_header': block.is_header,
                'font_size': max(block.font_sizes) if block.font_sizes else 10
            }
            
            block_tokens = len(json.dumps(block_metadata)) // 4
            
            # Check if adding this block would exceed limit
            if current_batch['estimated_tokens'] + block_tokens > self.MAX_TOKENS_PER_BATCH:
                # Save current batch if it has content
                if current_batch['blocks']:
                    batches.append(current_batch)
                
                # Start new batch
                current_batch = {
                    'blocks': [block],
                    'pages': {block.page_number},
                    'estimated_tokens': base_overhead + block_tokens,
                    'has_header': block.is_header
                }
            else:
                # Add to current batch
                current_batch['blocks'].append(block)
                current_batch['pages'].add(block.page_number)
                current_batch['estimated_tokens'] += block_tokens
                current_batch['has_header'] = current_batch['has_header'] or block.is_header
        
        # Add last batch
        if current_batch['blocks']:
            batches.append(current_batch)
        
        return batches
    
    def _create_controls_summary(self, controls: List[Dict[str, Any]]) -> str:
        """Create concise controls summary"""
        summary_parts:list[str] = []
        for control in controls[:15]:  # Top 15 only
            summary_parts.append(
                f"- **{control.get('control_id', 'N/A')}** "
                f"[{control.get('severity', 'medium')}]: "
                f"{control.get('description', '')[:120]}"
            )
        return "\n".join(summary_parts)
    
    def create_analysis_prompt(
        self,
        batch: Dict[str, Any],
        controls: List[Dict[str, Any]],
        framework: str
    ) -> str:
        """
        Create optimized prompt with smart text representation
        """
        controls_summary = self._create_controls_summary(controls)
        
        # Build structured content
        pages_content:list[dict[str, Any]] = []
        for block in batch['blocks']:
            # Truncate very long blocks
            text = block.text
            if len(text) > 500:
                text = text[:497] + "..."
            
            # Create structured entry
            entry:dict[str, Any] = {
                'page': block.page_number,
                'block_idx': block.block_index,
                'text': text,
                'is_header': block.is_header,
                'font_size': round(max(block.font_sizes), 1) if block.font_sizes else 10.0
            }
            pages_content.append(entry)
        
        return f"""You are an expert compliance auditor analyzing a {framework} document.
                **FRAMEWORK CONTROLS TO CHECK:**
                {controls_summary}

                **CRITICAL:** Also use your extensive knowledge of {framework} to identify:
                - Missing required policies, procedures, or statements
                - Vague, ambiguous, or incomplete compliance statements
                - Contradictory requirements or conflicting information
                - Gaps where specific details should be provided (e.g., retention periods, encryption methods)
                - Best practice violations even if not explicitly listed in controls

                **DOCUMENT CONTENT:**
                {json.dumps(pages_content, indent=2)}

                **YOUR TASK:**
                Identify compliance issues, gaps, missing requirements, or areas needing clarification.

                **STRICT OUTPUT FORMAT (JSON array only):**
                ```json
                [
                {{
                    "page_number": 1,
                    "block_index": 5,
                    "control_id": "GDPR-12.1",
                    "severity": "high|medium|low",
                    "issue_description": "Specific, clear description of what's wrong or missing",
                    "bookmark_type": "verify|review|info|action_required",
                    "suggested_action": "Concrete action needed to fix this"
                }}
                ]
                ```

                **RULES:**
                - Maximum {self.MAX_ANNOTATIONS_PER_PAGE} findings per page
                - Prioritize HIGH and MEDIUM severity issues
                - Be SPECIFIC - cite exact problems, don't make vague observations
                - Use "action_required" for critical missing requirements
                - Use "verify" for ambiguous/unclear statements
                - Use "review" for potential issues needing human judgment
                - Use "info" for minor best practice suggestions
                - Return empty array [] if no issues found

                **Output only valid JSON, no explanations:**"""
    
    def analyze_document(
        self,
        s3_path: str,
        compliance_framework: str,
        file_id: str,
        analysis_id: str
    ) -> List[SimpleAnnotation]:
        """
        Complete improved analysis pipeline
        """
        print(f"🔍 Starting analysis: {s3_path} ({compliance_framework})")
        
        # Step 1: Load PDF
        pdf_bytes = self._load_pdf_from_s3(s3_path)
        
        # Step 2: Extract enhanced blocks
        all_blocks = self.extract_enhanced_blocks(pdf_bytes)
        print(f"📄 Extracted {len(all_blocks)} blocks from {min(self.MAX_PAGES, 999)} pages")
        
        # Step 3: Filter to important content
        important_blocks = self.filter_important_blocks(all_blocks)
        print(f"✂️ Filtered to {len(important_blocks)} important blocks")
        
        # Step 4: Get controls
        controls = self._get_framework_controls(compliance_framework)
        print(f"📋 Loaded {len(controls)} controls for {compliance_framework}")
        
        # Step 5: Create smart batches
        batches = self.create_smart_batches(important_blocks, controls)
        print(f"📦 Created {len(batches)} optimized batches")
        
        # Debug batch info
        for i, batch in enumerate(batches):
            print(f"  Batch {i+1}: {len(batch['blocks'])} blocks, "
                  f"~{batch['estimated_tokens']} tokens, "
                  f"pages {sorted(batch['pages'])}")
        
        # Step 6: Analyze with Claude
        all_findings:list[dict[str, Any]] = []
        for i, batch in enumerate(batches):
            print(f"🤖 Analyzing batch {i+1}/{len(batches)}...")
            
            prompt = self.create_analysis_prompt(batch, controls, compliance_framework)
            
            try:
                response = bedrock.invoke_model( # type: ignore
                    modelId=AGENT_CLAUDE_HAIKU,
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 4000,
                        "temperature": 0.3,
                        "messages": [{
                            "role": "user",
                            "content": prompt
                        }]
                    })
                )

                response_body:dict[str, Any] = json.loads(response['body'].read()) # type: ignore
                content = response_body['content'][0]['text']
                
                findings = self._parse_claude_response(content)
                all_findings.extend(findings)
                print(f"  ✓ Found {len(findings)} issues in this batch")
                
            except Exception as e:
                print(f"  ✗ Error in batch {i+1}: {e}")
                continue
        
        # Step 7: Apply per-page limits and create annotations
        limited_findings = self._apply_page_limits(all_findings)
        print(f"🎯 Total findings after limits: {len(limited_findings)}")
        
        annotations = self._create_annotations(
            limited_findings,
            all_blocks,  # Use ALL blocks for bbox lookup
            file_id,
            analysis_id
        )
        
        print(f"✅ Generated {len(annotations)} annotations")
        
        # Step 8: Save annotations to DynamoDB
        save_stats = save_annotations_to_dynamodb(
            annotations=annotations,
            document_id=file_id,
            framework_id=compliance_framework,
            analysis_id=analysis_id
        )
        
        print(f"💾 Annotation persistence: {save_stats}")
        
        return annotations
    
    def _load_pdf_from_s3(self, s3_path: str) -> bytes:
        """Load PDF from S3"""
        from src.utils.services.s3 import s3_client
        from src.utils.settings import S3_BUCKET_NAME as BUCKET_NAME
        
        document = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_path)
        return document['Body'].read()
    
    def _get_framework_controls(self, framework: str) -> List[Dict[str, Any]]:
        """
        Get controls from DynamoDB using high-level resource client
        
        Table Schema:
        - Partition Key: framework_id (String) - e.g., "gdpr_2025"
        - Sort Key: control_id (String) - e.g., "GDPR-12.1"
        
        Args:
            framework: Framework name (GDPR, SOC2, HIPAA)
        
        Returns:
            List of formatted control dictionaries
        """
        try:
            # Build framework_id for partition key
            framework_id = f'{framework.lower()}_2025'
            
            # Query all controls for this framework
            response = self.controls_table.query(
                KeyConditionExpression='framework_id = :fw_id',
                ExpressionAttributeValues={
                    ':fw_id': framework_id
                }
            )
            
            controls = response.get('Items', [])
            formatted_controls: List[Dict[str, Any]] = []
            
            # High-level resource client automatically deserializes
            # No need for .get('S'), .get('L'), etc.
            for control in controls:
                formatted_controls.append({
                    'control_id': control.get('control_id', ''),
                    'framework_id': control.get('framework_id', ''),
                    'article': control.get('article', ''),
                    'category': control.get('category', ''),
                    'framework_name': control.get('framework_name', ''),
                    'requirement': control.get('requirement', ''),  # This is the description
                    'severity': control.get('severity', 'medium'),
                    'trust_service': control.get('trust_service', ''),  # For SOC2
                    'version': control.get('version', ''),
                    
                    # Lists are already deserialized by high-level client
                    'keywords': control.get('keywords', []),
                    'verification_points': control.get('verification_points', [])
                })
            
            print(f"✓ Loaded {len(formatted_controls)} controls for {framework}")
            return formatted_controls
            
        except Exception as e:
            print(f"✗ Error loading controls from DynamoDB: {e}")
            import traceback
            traceback.print_exc()
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
            
            content = content.strip()
            findings = json.loads(content)
            
            return findings if isinstance(findings, list) else [] # pyright: ignore[reportUnknownVariableType]
            
        except Exception as e:
            print(f"Failed to parse response: {e}")
            return []
    
    def _apply_page_limits(self, findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Limit to 3 per page, sorted by severity"""
        severity_order = {'high': 0, 'medium': 1, 'low': 2}

        by_page: dict[int, list[Dict[str, Any]]] = {}
        for finding in findings:
            page = finding.get('page_number', 1)
            if page not in by_page:
                by_page[page] = []
            by_page[page].append(finding)

        limited: list[dict[str, Any]] = []
        for page, page_findings in by_page.items():
            page_findings.sort(
                key=lambda x: severity_order.get(x.get('severity', 'low'), 3)
            )
            limited.extend(page_findings[:self.MAX_ANNOTATIONS_PER_PAGE])
        
        return limited
    
    def _create_annotations(
        self,
        findings: List[Dict[str, Any]],
        all_blocks: List[EnhancedTextBlock],
        file_id: str,
        analysis_id: str
    ) -> List[SimpleAnnotation]:
        """Create annotations from findings"""
        annotations: list[SimpleAnnotation] = []
        
        # Create lookup map
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
        """Format markdown comment"""
        emoji_map = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
        severity = finding.get('severity', 'medium')
        
        return f"""{emoji_map.get(severity, '⚪')} **{finding.get('control_id', 'General')}** - {severity.upper()}

                **Issue:**
                {finding.get('issue_description', 'Compliance issue identified')}

                **Recommended Action:**
                {finding.get('suggested_action', 'Review and address this finding')}

                ---
                *AI-generated compliance analysis*
                """


# Updated main function
def auto_analyse_pdf(
    document_id: str,
    compliance_framework: str,
    analysis_id: str | None = None,
    force_reanalysis: bool = False
) -> Dict[str, Any]:
    """
    Enhanced auto-analysis with caching support
    
    Args:
        compliance_framework: Framework to analyze against (GDPR, SOC2, HIPAA)
        file_id: Unique document identifier
        analysis_id: Optional analysis session ID
        force_reanalysis: Optional. If True, ignore cache and perform fresh analysis
    Returns:
        Dictionary with analysis results (either cached or newly generated)
    """
    analysis_id = analysis_id or str(uuid7())
    
    analyzer = ImprovedComplianceAnalyzer()
    
    # Step 1: Check cache first
    print(f"🔍 Checking cache for {document_id} + {compliance_framework}")
    cached_result = analyzer.check_cached_analysis(document_id, compliance_framework)
    
    if cached_result:
        
        if force_reanalysis:
            print(f"ℹ Force re-analysis requested, ignoring cached result")
        
        else:
            print(f"✓ Returning cached analysis (created at: {cached_result.get('cached_at')})")
            return cached_result
    
    # Step 2: No cache hit, perform fresh analysis
    print(f"ℹ No cache found, performing fresh analysis...")
    
    files_table = get_table(DynamoDBTable.FILES)
    file_record = files_table.get_item(
        Key={'file_id': document_id}
    ).get('Item')
    if not file_record:
        raise ValueError(f"Document with ID {document_id} not found in Files table")
    s3_path:str = file_record.get('s3_key') # pyright: ignore[reportAssignmentType]
    
    try:
        annotations = analyzer.analyze_document(
            s3_path=s3_path,
            compliance_framework=compliance_framework,
            file_id=document_id,
            analysis_id=analysis_id
        )
        
        # Prepare result
        result: dict[str, Any] = {
            'success': True,
            'document_id': document_id,
            'analysis_id': analysis_id,
            'framework': compliance_framework,
            'annotations_count': len(annotations),
            'annotations': [ann.model_dump() for ann in annotations],
            'cached': False
        }
        
        # Step 3: Save to cache for future requests
        metadata = {
            'pages_analyzed': analyzer.MAX_PAGES,
            'blocks_processed': len(annotations),
            'batches_created': 0  # Could be tracked if needed
        }
        
        complete_analysis = generate_compliance_verdict(result)
        
        cache_saved = analyzer.save_analysis_to_cache(
            document_id=document_id,
            framework_id=compliance_framework,
            analysis_result=complete_analysis,
            metadata=metadata
        )
        
        if cache_saved:
            print(f"✓ Analysis cached successfully")
        else:
            print(f"⚠ Analysis completed but caching failed (non-critical)")
        
        return result
        
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
    Core comprehensive document analysis logic - shared between Bedrock and Strands agents.
    
    Args:
        document_id: The document ID to analyze
        framework_id: Compliance framework (GDPR, SOC2, HIPAA)
        force_reanalysis: Force new analysis even if cached results exist
        user_id: Optional user ID for logging
        org_id: Optional organization ID for logging
    
    Returns:
        Dictionary with analysis results or reference to cached results
    """
    print(f'Comes inside with document_id: {document_id}, framework_id: {framework_id}, force_reanalysis: {force_reanalysis}')
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
