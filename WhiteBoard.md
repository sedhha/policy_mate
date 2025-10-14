# Agentic Compliance - Compliance CoPilot

4 Agents -

## Ingestion Agent

- Ingests documents located at s3 file.
- Refresh ingestion based on batch jobs schedule in certain frequency.
- S3 pipeline to ingest documents and auto process them.

Two locations -

- standard docs (These are the docs which would be used as reference for comparison)
- compliance docs (These are the docs which would be used for compliance check)

For end user -

- Chat UI for day to day queries - list of docs, in review, in progress, completed etc
- Compliance dashboard to see stats
- Configuration UI to manage ingestion and compliance jobs
- Admin UI to upload standard docs
- SVG support to view live documents with highlights
- CSV Export support for compliance reports
- Manual live editor for compliance docs
- Config UI to mark checks that needs to be done for given organisation. This will be stored so that it could be re-used for future compliance docs.
- Guard rails to avoid revealing sensitive information with respect to client

standard doc flow:

- on manual doc/standard doc upload -
  - entry created in dynamoDB with status 'initialized'
  - batch job picks the file from s3 and marks it as 'in progress'
  - file is processed and is ready to be utilised in AWS knowledge base as 'completed'
  - standard doc will go to standard doc knowledge base and manual doc will go to manual doc knowledge base

standard doc structure:

- standard doc

  - public

    - gdpr
    - soc2

  - <org_id>
    - custom_gdpr
    - custom_soc2

Manual doc structure:

- manual doc
  - <org_id>
    - doc_1
    - doc_2
    - doc_3

Compliance template structure:

- gdpr template
- soc2 template
- hipaa template
- org specific template 1 <org_id>`* (Active)`
- org specific template 2 <org_id>

Chat Bot Flow:

Queries:

- List all docs (skip/limit, state filter, owned by filter, needs manual review filter - ambigous docs as per AI - needs human review)
- Show doc details (doc id)
- Show compliance summary (doc id)
- Open doc in interactive editor (doc id)
- Go to compliance dashboard (Just a response to open compliance dashboard link)
- Go to configuration dashboard (Just a response to open configuration dashboard link)
- Go to admin dashboard (Just a response to open admin dashboard link)
- Early request - analyse doc for compliance (doc id, template id)

For user tables -
cognito
standard docs - dynamoDB
manual docs - dynamoDB
compliance jobs - dynamoDB
compliance reports - dynamoDB
compliance templates - dynamoDB
org config - dynamoDB

### Tasks

1. Setup S3 buckets for standard docs and compliance docs.

This is what we're imagining:

1. User comes to chat bot with following intent:

- Upload a document for compliance check
- Check compliance status of a document
- List all documents he can see
- Request active action items on each document he can see
- Re request indexing of his documents or his organisation documents in Knowledge base
- Request dashboard link for compliance dashboard
- Request configuration dashboard link for configuration dashboard
- Request manual review link of a document for compliance issues

### Compliance Agent Step by Step process:

Key Focus Areas for Compliance Review

1. Gap Analysis (Primary Focus)

- Missing required sections/controls
- Incomplete policy statements
- Outdated references or timeframes
- Unclear ownership/responsibilities

2. Clarity Assessment

- Ambiguous language ("may", "should" vs "must", "will")
- Vague metrics or thresholds
- Undefined terms or acronyms
- Contradictory statements

3. Coverage Verification

- Required controls present vs missing
- Scope alignment with standard
- Exception handling documented

4. Recommended Approach (Resource-Efficient)
   Instead of full side-by-side comparison, use a control-based checklist approach:

- Standard Framework → Extract Control Requirements → Score Document Against Controls

Unclear ownership/responsibilities

2. Clarity Assessment

Ambiguous language ("may", "should" vs "must", "will")

Vague metrics or thresholds

Undefined terms or acronyms

Contradictory statements

3. Coverage Verification

Required controls present vs missing

Scope alignment with standard

Exception handling documented

Recommended Approach (Resource-Efficient)
Instead of full side-by-side comparison, use a control-based checklist approach:

Standard Framework → Extract Control Requirements → Score Document Against Controls

### Document Lifecycle:

SQS listens to the documents in pipeline - where status = 'in_progress'
-> Runs analysis on this document

Agent Response structure:

1. compliance check
2. comprehensive check
3. doc status
4. list docs

Response payload for:

- compliance check

```json
{
            "verdict": "UNCLEAR",
            "summary": content[:200],
            "detailed_analysis": content,
            "matched_controls": [],
            "gaps": [],
            "recommendations": []
        }
```

```json
{
  "error_message": "", // If error occurs, this will be given highest priority above all other fields
  "data": {
    "response_type": "<agent_id>",
    {...}
  },
  "summarised_markdown": "## Summary\n\nYour document is largely compliant with minor gaps needing attention.",
}
```
