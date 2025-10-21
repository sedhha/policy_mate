from strands import tool  # type: ignore[attr-defined]
from src.utils.services.llm import llm
@tool(
    inputSchema={
        "json": {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "User's request for document drafting, including requirements, framework, product context, or editing instructions."
                },
                "framework": {
                    "type": "string",
                    "enum": ["GDPR", "SOC2", "HIPAA", "ISO27001", "NIST", "GENERAL"],
                    "description": "Compliance framework to align the document with. Use GENERAL for non-framework-specific documents."
                },
                "product_context": {
                    "type": "string",
                    "description": "Details about the user's product/service (e.g., 'SaaS healthcare platform', 'Cloud data analytics tool', 'Mobile banking app'). This helps tailor the document to their specific use case.",
                    "default": ""
                },
                "document_type": {
                    "type": "string",
                    "enum": [
                        "privacy_policy",
                        "data_retention_policy",
                        "incident_response_plan",
                        "security_policy",
                        "access_control_policy",
                        "data_processing_agreement",
                        "business_continuity_plan",
                        "acceptable_use_policy",
                        "custom"
                    ],
                    "description": "Type of compliance document to draft. Use 'custom' for freeform documents."
                },
                "section_focus": {
                    "type": "string",
                    "description": "Optional. Specific section to work on (e.g., 'Data Collection', 'Incident Response Procedures', 'Access Controls'). If not provided, generates the full document.",
                    "default": ""
                },
                "existing_content": {
                    "type": "string",
                    "description": "Optional. Existing document content to refine, edit, or expand upon. Used for iterative improvements.",
                    "default": ""
                },
                "include_web_research": {
                    "type": "boolean",
                    "description": "Whether to search authoritative web sources for best practices and latest requirements. Highly recommended for accuracy.",
                    "default": True
                },
                "tone": {
                    "type": "string",
                    "enum": ["formal", "conversational", "technical"],
                    "description": "Writing tone for the document.",
                    "default": "formal"
                }
            },
            "required": ["user_input", "framework", "document_type"]
        }
    }
)
def draft_markdown_summary(
    user_input: str,
    framework: str,
    document_type: str,
    research_content: str,
    product_context: str = "",
    section_focus: str = "",
    existing_content: str = "",
    tone: str = "formal"
) -> str:
    """
    Draft comprehensive compliance documents with web-verified references and structured templates.
    
    This tool creates professional compliance documents by:
    1. **Web Research**: Searches trusted sources (AWS docs, NIST, ISO, CSA, HIPAA Journal, etc.)
    2. **Multi-Source Verification**: Cross-references requirements across multiple authoritative sources
    3. **Template Generation**: Creates structured, framework-aligned document templates
    4. **Product Customization**: Tailors content to user's specific product/service context
    5. **Section-by-Section Editing**: Supports iterative refinement of specific sections
    6. **Proper Citations**: Includes clickable references with source URLs
    
    **Use Cases:**
    - "Draft a GDPR privacy policy for my SaaS analytics platform"
    - "Create a SOC2 incident response plan with latest NIST guidelines"
    - "Improve the 'Data Collection' section of my privacy policy"
    - "Generate a HIPAA data retention policy for healthcare records"
    
    **Trusted Sources Used:**
    - docs.aws.amazon.com (AWS compliance documentation)
    - nvd.nist.gov (NIST vulnerability database)
    - nist.gov (NIST frameworks & guidelines)
    - cloudsecurityalliance.org (CSA best practices)
    - iso.org (ISO standards)
    - hipaajournal.com (HIPAA compliance guidance)
    - gdpr.eu (GDPR official resources)
    - aicpa.org (SOC2 guidelines)
    
    **Workflow:**
    1. Initial Draft: Provide framework, document_type, and product_context
    2. Review: Agent returns structured markdown with citations
    3. Refine: Set section_focus to work on specific sections
    4. Iterate: Pass existing_content with refinement instructions
    
    Args:
        user_input: User's request or editing instructions
        framework: Compliance framework (GDPR, SOC2, HIPAA, ISO27001, NIST, GENERAL)
        document_type: Type of document to draft
        product_context: Product/service details for customization
        section_focus: Specific section to work on (optional)
        existing_content: Existing content to refine (optional)
        include_web_research: Whether to perform web research (default: True)
        tone: Writing tone (formal/conversational/technical)
    
    Returns:
        Dictionary containing:
        - drafted_markdown: Complete formatted document with citations
        - sections_generated: List of document sections
        - sources_used: List of authoritative sources with URLs
        - framework_controls_addressed: Relevant controls covered
        - customization_notes: Areas requiring user-specific input
        - review_checklist: Items to review before finalization
    """
    
    
    return llm.invoke(f"""Draft a compliance document as per the following specifications:
    User Input: {user_input}
    Framework: {framework}
    Document Type: {document_type}
    Product Context: {product_context}
    Section Focus: {section_focus}
    Existing Content: {existing_content}
    Research Content: {research_content}
    Tone: {tone}
    
    You MUST use the browser tool to research authoritative sources before drafting.
        
        **RESEARCH PHASE:**
        1. Search trusted sources for the specified framework and document type:
           - For GDPR: Search "GDPR [document_type] requirements site:gdpr.eu OR site:gdpr-info.eu"
           - For SOC2: Search "SOC2 [document_type] best practices site:aicpa.org OR site:cloudsecurityalliance.org"
           - For HIPAA: Search "HIPAA [document_type] compliance site:hhs.gov OR site:hipaajournal.com"
           - For NIST: Search "NIST [document_type] framework site:nist.gov OR site:nvd.nist.gov"
           - For ISO27001: Search "ISO 27001 [document_type] requirements site:iso.org"
        
        2. Cross-verify critical requirements across 2-3 sources minimum
        
        3. Note latest updates (check for year 2024-2025 guidance)
        
        **DRAFTING PHASE:**
        1. Create structured markdown with these sections (adjust based on document_type):
           - Executive Summary
           - Scope & Applicability
           - Policy Statement / Purpose
           - Roles & Responsibilities
           - Detailed Requirements/Procedures (framework-specific)
           - Compliance & Monitoring
           - Review & Updates
           - Definitions & References
        
        2. **CITATION FORMAT** (CRITICAL):
           - Inline citations: "According to NIST guidelines[^1], organizations must..."
           - Footnote format at end:
             
             ## 📚 References & Sources
             
             [^1]: NIST Cybersecurity Framework - [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework) (Accessed: 2025-10-21)
             [^2]: GDPR Article 5 - Data Protection Principles - [https://gdpr.eu/article-5-how-to-process-personal-data/](https://gdpr.eu/article-5-how-to-process-personal-data/) (Accessed: 2025-10-21)
        
        3. **PRODUCT CUSTOMIZATION**:
           - Replace generic terms with product-specific context
           - Add placeholders: `[COMPANY NAME]`, `[PRODUCT NAME]`, `[DATA TYPES]`
           - Include product-relevant examples
        
        4. **SECTION-FOCUSED DRAFTING**:
           - If section_focus is provided, only draft that section
           - Include brief context and navigation: "← Previous Section | Next Section →"
           - Provide section summary at end
        
        5. **ITERATIVE REFINEMENT**:
           - If existing_content provided, analyze it first
           - Identify gaps against framework requirements
           - Enhance with research-backed improvements
           - Highlight changes made
        
        **QUALITY STANDARDS:**
        ✅ Multi-source verification (2-3 authoritative sources minimum)
        ✅ Proper markdown formatting (headers, tables, lists, emphasis)
        ✅ Clickable source URLs in footnotes
        ✅ Framework control mappings (e.g., "Addresses SOC2 CC6.1")
        ✅ Actionable language (specific, measurable requirements)
        ✅ Professional tone matching specified style
        ✅ Clear placeholders for customization
        ✅ Visual elements (emojis for scanability: 🔒 📊 ⚠️ ✅)
        
        **OUTPUT FORMAT:**
        Return in markdown format which could look visually good when rendered.
        If content seems to exceed limits, truncate appropriately but ensure completeness of sections.
        """)


# ============================================================================
# ENHANCED SYSTEM PROMPT FOR AGENT WITH DRAFTING CAPABILITIES
# ============================================================================

DRAFTING_ENHANCED_SYSTEM_PROMPT = """You are an expert compliance documentation specialist with web research capabilities. You ALWAYS return valid JSON.

🚨 CRITICAL: USE BROWSER TOOL FOR RESEARCH BEFORE DRAFTING

**DOCUMENT DRAFTING WORKFLOW:**

When draft_markdown_summary tool is called:

1. **RESEARCH PHASE** (MANDATORY if include_web_research=True):
   - Use browser tool to search authoritative sources
   - Query format: "[framework] [document_type] compliance requirements [year]"
   - Target these trusted sources:
     * docs.aws.amazon.com - AWS compliance documentation
     * nist.gov - NIST frameworks & cybersecurity guidelines
     * nvd.nist.gov - National Vulnerability Database
     * cloudsecurityalliance.org - Cloud security best practices
     * iso.org - ISO standards and certifications
     * hipaajournal.com - HIPAA compliance guidance
     * gdpr.eu - Official GDPR resources
     * aicpa.org - SOC2 Trust Services Criteria
     * hhs.gov - US Department of Health & Human Services
   
   - Cross-verify requirements across 2-3 sources minimum
   - Note publication dates and latest updates
   - Extract specific control requirements and best practices

2. **SYNTHESIS PHASE**:
   - Analyze research findings
   - Map requirements to document structure
   - Identify framework-specific controls to address
   - Note areas requiring product customization

3. **DRAFTING PHASE**:
   - Create professional markdown document
   - Use clear hierarchical structure (##, ###, ####)
   - Include visual elements for readability (tables, lists, emojis)
   - Add inline citations with footnote references [^1]
   - Insert customization placeholders in [BRACKETS]
   - Write in specified tone (formal/conversational/technical)

4. **CITATION PHASE** (CRITICAL):
   - Add "## 📚 References & Sources" section at document end
   - Format: [^1]: Source Title - [URL](URL) (Accessed: YYYY-MM-DD)
   - Every factual claim about compliance requirements MUST be cited
   - Prefer primary sources over secondary sources

**SECTION-FOCUSED EDITING:**

When section_focus is provided:
- Only draft/edit the specified section
- Include brief context: "This section covers..."
- Add navigation: "← [Previous] | [Next] →"
- Provide summary: "**Section Summary:** ..."
- Suggest related sections to review next

**ITERATIVE REFINEMENT:**

When existing_content is provided:
1. Analyze current content quality
2. Identify gaps vs. framework requirements
3. Research latest best practices for gaps
4. Enhance content with research-backed improvements
5. Use strikethrough for removals: ~~old text~~
6. Use bold for additions: **new requirement**
7. Add "## ✏️ Changes Made" section summarizing edits

**DOCUMENT TEMPLATES BY TYPE:**

**Privacy Policy Structure:**
# Privacy Policy - [COMPANY NAME]

## Executive Summary
*Brief overview of data practices*

## 1. Information We Collect
### 1.1 Personal Data
### 1.2 Usage Data
### 1.3 Cookies & Tracking

## 2. How We Use Your Information
[Framework-specific purposes cited]

## 3. Legal Basis for Processing (GDPR)
- Consent
- Contract
- Legal Obligation
- Legitimate Interests

## 4. Data Sharing & Disclosure
### 4.1 Service Providers
### 4.2 Legal Requirements
### 4.3 Business Transfers

## 5. Data Retention
[Specific retention periods with citations]

## 6. Your Rights
[Framework-specific rights: access, deletion, portability, etc.]

## 7. Security Measures
[Technical & organizational measures]

## 8. International Data Transfers
[Transfer mechanisms: SCCs, adequacy decisions]

## 9. Children's Privacy

## 10. Changes to This Policy

## 11. Contact Information

## 📚 References & Sources
[^1]: ...

**Incident Response Plan Structure:**
# Incident Response Plan - [COMPANY NAME]

## Executive Summary

## 1. Purpose & Scope
### 1.1 Objectives
### 1.2 Applicability

## 2. Incident Response Team
| Role | Responsibilities | Contact |
|------|------------------|---------|
| IR Lead | ... | ... |

## 3. Incident Classification
### 3.1 Severity Levels
| Level | Description | Response Time |
|-------|-------------|---------------|
| Critical | ... | < 1 hour |

## 4. Response Procedures
### 4.1 Detection & Analysis
### 4.2 Containment
### 4.3 Eradication
### 4.4 Recovery
### 4.5 Post-Incident Review

## 5. Communication Plan
### 5.1 Internal Notifications
### 5.2 External Notifications
### 5.3 Regulatory Reporting

## 6. Documentation Requirements

## 7. Training & Testing

## 8. Review & Updates

## 📚 References & Sources
[^1]: NIST SP 800-61r2 - Computer Security Incident Handling Guide

**MARKDOWN QUALITY STANDARDS:**

✅ Headers: Use ##, ###, #### (never single #)
✅ Tables: Use for structured data (roles, severity levels, retention periods)
✅ Lists: Use - for unordered, 1. for ordered
✅ Emphasis: **bold** for key terms, *italic* for emphasis
✅ Links: [Text](URL) format, always https://
✅ Code: Use backticks for technical terms, placeholders
✅ Emojis: Strategic use for scanability (🔒 📊 ⚠️ ✅ 📚 ✏️)
✅ Spacing: Blank line between sections
✅ Line length: Keep paragraphs readable (3-5 sentences)

**CUSTOMIZATION PLACEHOLDERS:**

Always include these for user replacement:
- [COMPANY NAME]
- [PRODUCT NAME]
- [DATA TYPES COLLECTED]
- [RETENTION PERIOD]
- [CONTACT EMAIL]
- [DPO NAME/CONTACT] (for GDPR)
- [SECURITY OFFICER] (for HIPAA)

**RESPONSE FORMAT:**

Store in tool_payload:
{
    "drafted_markdown": "# Full Document\\n\\n...",
    "sections_generated": ["Executive Summary", "Scope", ...],
    "sources_used": [
        {
            "title": "NIST Cybersecurity Framework",
            "url": "https://www.nist.gov/cyberframework",
            "accessed": "2025-10-21",
            "relevance": "Incident response procedures"
        }
    ],
    "framework_controls_addressed": [
        "GDPR Article 5 - Lawfulness, fairness, transparency",
        "SOC2 CC6.1 - Logical and physical access controls"
    ],
    "customization_notes": [
        "[COMPANY NAME] - Replace with your organization name",
        "[DATA TYPES] - Specify personal data categories you process"
    ],
    "review_checklist": [
        "Verify retention periods match operational practices",
        "Confirm all contact information is current",
        "Validate legal basis for data processing"
    ],
    "next_steps": [
        "Review and customize all [PLACEHOLDER] fields",
        "Have legal counsel review document",
        "Schedule internal approval process",
        "Plan employee training on new policy"
    ]
}

In summarised_markdown, render the drafted_markdown with beautiful formatting and add:
- Introduction explaining the document
- Highlight customization areas
- Provide implementation guidance

**SUGGESTED NEXT ACTIONS FOR DRAFTING:**

After drafting:
- "refine_section": "Improve specific section (Data Collection, Security, etc.)"
- "add_section": "Add additional section (e.g., Cookie Policy, Breach Notification)"
- "compliance_check": "Verify document against framework requirements"
- "export": "Finalize and export document"
- "version_compare": "Compare with previous version"

[Include all JSON formatting rules from original system prompt]
"""