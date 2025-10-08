# Comprehensive Document Analysis - Deployment Guide

## Overview
The comprehensive check handler performs full document compliance analysis with text-level findings for coordinate-based annotation in the UI.

## Files Created
1. `comprehensive_check_handler.py` - Main Lambda handler
2. `schemas/comprehensive_check_handler.yml` - OpenAPI schema for Bedrock Agent
3. `src/utils/services/document_extractor.py` - Document extraction utilities
4. Updated `instructions/policyMateDocumentAgent.md` - Agent instructions

## Features
- ✅ Analyzes entire document against ALL controls in framework
- ✅ Returns text-level findings with exact character positions
- ✅ Identifies missing controls not addressed in document
- ✅ Provides gap analysis, clarity issues, and recommendations
- ✅ Optimized for cost (~$0.12-0.16 per document)
- ✅ Supports coordinate-based annotation in UI

## Deployment Steps

### 1. Deploy Lambda Function
```bash
cd lambdas
./deploy.sh comprehensive_check
```

### 2. Add to Bedrock Agent Action Group

In AWS Console → Bedrock → Agents → Your Agent:

1. Go to "Action groups"
2. Click "Add action group"
3. Name: `comprehensive_check`
4. Action group type: "Define with API schemas"
5. Upload: `schemas/comprehensive_check_handler.yml`
6. Lambda function: Select `policy-mate-comprehensive_check`
7. Save and prepare agent

### 3. Test the Handler

```bash
# Test with sample document
aws lambda invoke \
  --function-name policy-mate-comprehensive_check \
  --payload '{
    "requestBody": {
      "content": {
        "application/json": {
          "properties": [
            {"name": "bearer_token", "value": "YOUR_TOKEN"},
            {"name": "document_id", "value": "YOUR_DOC_ID"},
            {"name": "framework_id", "value": "GDPR"}
          ]
        }
      }
    }
  }' \
  output.json

cat output.json
```

### 4. Update Agent Instructions

The agent instructions have been updated to include the new operation. Make sure to:
1. Go to Bedrock Agent console
2. Update the agent with new instructions from `instructions/policyMateDocumentAgent.md`
3. Prepare the agent

## Usage in Chat

User can now ask:
- "Analyze my document for GDPR compliance"
- "Run comprehensive check on document doc_123 for SOC2"
- "Check my policy document against HIPAA requirements"

## Output Structure

```json
{
  "document_id": "doc_123",
  "framework": "GDPR",
  "overall_verdict": "PARTIAL",
  "findings": [
    {
      "text_snippet": "We collect user email addresses...",
      "start_char": 245,
      "end_char": 356,
      "controls_addressed": [
        {
          "control_id": "GDPR-5.1",
          "status": "NON_COMPLIANT",
          "reasoning": "Missing legal basis"
        }
      ],
      "verdict": "NON_COMPLIANT",
      "summary": "Missing transparency requirements",
      "gaps": ["No legal basis specified"],
      "recommendations": ["Add legal basis statement"],
      "clarity_issues": ["Ambiguous retention period"]
    }
  ],
  "missing_controls": [
    {
      "control_id": "GDPR-32.1",
      "control_name": "Security measures",
      "severity": "critical",
      "reason": "No relevant text found"
    }
  ],
  "statistics": {
    "total_controls_checked": 28,
    "compliant": 8,
    "partial": 12,
    "non_compliant": 5,
    "not_addressed": 3
  }
}
```

## Cost Estimation

Per document analysis:
- Document extraction: Free (S3)
- Embeddings: ~$0.001 (100 chunks)
- Bedrock calls: ~$0.12 (6-8 category batches)
- Lambda: ~$0.003
- **Total: ~$0.124 per document**

## UI Integration

The findings include `start_char` and `end_char` for each text snippet, which can be used with your coordinate service to:
1. Highlight problematic text in the document viewer
2. Show annotations with gaps and recommendations
3. Allow users to click on highlighted text to see details

## Troubleshooting

### Issue: "Document not found"
- Verify document_id exists in DynamoDB
- Check that document has s3_url field

### Issue: "No text chunks extracted"
- Verify S3 file is readable text format
- Check file encoding (should be UTF-8)

### Issue: High costs
- Reduce top_k in find_relevant_chunks (default: 3)
- Increase similarity threshold (default: 0.3)
- Consider analyzing only critical controls

## Next Steps

1. Deploy the Lambda function
2. Add to Bedrock Agent action group
3. Test with sample documents
4. Integrate findings with UI coordinate service
5. Monitor costs and optimize as needed
