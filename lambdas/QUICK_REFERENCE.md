# Quick Reference - Compliance Handlers

## Two Handlers, Two Use Cases

### 1. compliance_check_handler.py
**Use Case**: Quick text snippet analysis  
**Input**: Text snippet + question  
**Output**: Quick compliance verdict  
**Cost**: ~$0.02 per check  
**Time**: 5-10 seconds  

**Example**:
```
User: "Does this text comply with GDPR?"
Text: "We collect emails for marketing"
→ Quick analysis of that specific text
```

### 2. comprehensive_check_handler.py ⭐ NEW
**Use Case**: Full document analysis  
**Input**: Document ID + framework  
**Output**: Text-level findings with positions  
**Cost**: ~$0.12 per document  
**Time**: 2-3 minutes  

**Example**:
```
User: "Analyze my privacy policy for GDPR compliance"
Document: 10-page policy document
→ Complete analysis with annotatable findings
```

## Quick Comparison

| Feature | Quick Check | Comprehensive Check |
|---------|-------------|---------------------|
| Input | Text snippet | Full document |
| Controls Checked | Top 5 relevant | ALL controls |
| Output | Single verdict | Text-level findings |
| Position Data | ❌ No | ✅ Yes (char positions) |
| Missing Controls | ❌ No | ✅ Yes |
| Clarity Issues | ❌ No | ✅ Yes |
| UI Annotation | ❌ No | ✅ Yes |
| Cost | $0.02 | $0.12 |
| Time | 5-10 sec | 2-3 min |

## When to Use Which?

### Use Quick Check When:
- User asks about specific text
- Quick validation needed
- Testing a policy statement
- Interactive Q&A

### Use Comprehensive Check When:
- Full document review needed
- Preparing for audit
- Need detailed report
- Want UI annotations
- Need gap analysis

## API Endpoints

### Quick Check
```
POST /compliance/check
{
  "text": "policy text here",
  "question": "Does this comply?",
  "framework_id": "GDPR"
}
```

### Comprehensive Check
```
POST /compliance/comprehensive
{
  "document_id": "doc_123",
  "framework_id": "GDPR"
}
```

## Agent Commands

Users can say:
- "Check this text for GDPR compliance" → Quick Check
- "Analyze my document for GDPR" → Comprehensive Check
- "Review document doc_123 against SOC2" → Comprehensive Check
- "Does this policy statement comply with HIPAA?" → Quick Check

## Output Formats

### Quick Check Output
```json
{
  "analysis": {
    "verdict": "NON_COMPLIANT",
    "summary": "Missing legal basis",
    "gaps": ["No consent mechanism"],
    "recommendations": ["Add consent checkbox"]
  },
  "controls_analyzed": [...]
}
```

### Comprehensive Check Output
```json
{
  "overall_verdict": "PARTIAL",
  "findings": [
    {
      "text_snippet": "exact text from doc",
      "start_char": 245,
      "end_char": 356,
      "verdict": "NON_COMPLIANT",
      "gaps": [...],
      "recommendations": [...]
    }
  ],
  "missing_controls": [...],
  "statistics": {...}
}
```

## Cost Optimization Tips

1. **Use Quick Check first** for rapid validation
2. **Run Comprehensive Check** only when needed
3. **Cache results** - don't re-analyze unchanged documents
4. **Batch documents** - analyze multiple in parallel
5. **Filter by severity** - analyze critical controls first

## Deployment Checklist

- [ ] Deploy both Lambda functions
- [ ] Add both to Bedrock Agent action groups
- [ ] Update agent instructions
- [ ] Test with sample data
- [ ] Monitor CloudWatch logs
- [ ] Set up cost alerts
- [ ] Integrate with UI

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Document not found" | Check document_id in DynamoDB |
| "No controls found" | Verify framework_id (GDPR/SOC2/HIPAA) |
| High costs | Review CloudWatch metrics, optimize batching |
| Slow response | Check Lambda timeout (increase if needed) |
| Auth errors | Verify bearer_token is valid |

## Monitoring

Key metrics to watch:
- Lambda invocations
- Bedrock API calls
- Average execution time
- Error rate
- Cost per analysis

## Support Files

- `COMPREHENSIVE_CHECK_DEPLOYMENT.md` - Detailed deployment guide
- `COMPREHENSIVE_CHECK_SUMMARY.md` - Architecture and design
- `schemas/*.yml` - OpenAPI schemas
- `instructions/policyMateDocumentAgent.md` - Agent behavior
