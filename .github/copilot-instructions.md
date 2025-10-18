# Policy Mate - AI Coding Agent Instructions

## Project Overview

Policy Mate is an **AWS-native compliance management platform** that analyzes documents (policies, procedures) against compliance frameworks (GDPR, SOC2, HIPAA). It uses AWS Bedrock Agents with Claude models for AI-powered compliance analysis, with dual authentication patterns for different entry points.

**Architecture**: Serverless AWS (Lambda + Bedrock Agents + DynamoDB + OpenSearch) + Next.js 15 frontend with AWS Cognito auth.

## Critical Structural Knowledge

### Dual Authentication Pattern

The project has **two distinct authentication flows** - don't confuse them:

1. **Agent Handler (`agent_v2_handler.py`)**: Uses `@require_cognito_auth` decorator

   - Direct API Gateway → Lambda invocation
   - Expects `Authorization: Bearer <token>` header from API Gateway
   - Used for frontend-to-Lambda communication

2. **Bedrock Action Group Handlers** (`comprehensive_check_handler.py`, `doc_status_handler.py`, etc.): Use `@require_auth` decorator
   - Bedrock Agent → Lambda invocation
   - Expects `bearer_token` in Bedrock's `requestBody.content.application/json.properties[]` format
   - Uses `get_bedrock_parameters()` to extract params from Bedrock's nested structure

**Rule**: New agent action handlers MUST use `@require_auth` and extract params via `bedrock_response()` utilities.

### Lambda Handler Convention

All Lambda handlers follow this pattern:

```python
from src.utils.decorators.auth import require_auth
from src.utils.bedrock_response import bedrock_response, get_bedrock_parameters

@require_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    params = get_bedrock_parameters(event)
    document_id = params.get('document_id', '').strip()
    # ... business logic ...
    return bedrock_response(event, 200, {'message': 'Success', 'data': result})
```

### DynamoDB Table Access Pattern

**Always** use the enum-based table accessor:

```python
from src.utils.services.dynamoDB import get_table, DynamoDBTable

table = get_table(DynamoDBTable.FILES)  # NOT 'PolicyMateFiles' string
doc_response = table.query(
    KeyConditionExpression='file_id = :doc_id',
    ExpressionAttributeValues={':doc_id': document_id}
)
```

Available tables: `COMPLIANCE_CONTROLS`, `CONVERSATION_HISTORY`, `COMPLIANCE_REPORTS`, `FILES`, `ORGANIZATIONS`, `INFERRED_FILES`

### Document Lifecycle States

Documents flow through states defined in `DocumentStatus` enum:

- `PROCESSING` (1-10): Initial upload/indexing
- `UPLOAD_SUCCESS` (12): Ready for analysis
- `ANALYSIS_INITIATED` (21): Analysis queued
- `ANALYSIS_SUCCEEDED` (31): Analysis complete - **this is when UI shows results**
- `ANALYSIS_FAILED` (32): Retry needed

**Critical**: Check `compliance_status` before running analysis. Return HTTP 202 if status is `initialized` or `in_progress`.

### Agent Response Structure

The Bedrock Agent expects structured JSON responses wrapped in `bedrock_response()`:

- Use `summarised_markdown` key for human-readable summaries with proper Markdown formatting
- Use `tool_payload` for raw data
- For cached/existing results, return `dynamo_db_document_id`, `dynamo_db_table_name`, `dynamo_db_query_key`, `dynamo_db_value_key`
- See `lambdas/src/instructions/policyMateDocumentAgent.md` for the agent's system prompt

## Development Workflows

### Backend (Lambda) Development

**Setup**:

```bash
cd lambdas
curl -LsSf https://astral.sh/uv/install.sh | sh  # Install uv package manager
uv pip install --python 3.12 --target build .    # Install deps locally for testing
```

**Local Testing** (requires OpenSearch):

```bash
# Start local OpenSearch first
./scripts/opensearch-local.sh start

# Test individual handlers
uv run python test_local.py  # Uses secrets.json for auth tokens
```

**Deployment**:

```bash
export AWS_PROFILE=policy-mate
./lambdas/deploy.sh                    # Deploy all handlers
./lambdas/deploy.sh --handler agent    # Deploy specific handler
./lambdas/deploy.sh --force            # Force redeploy (bypass hash check)
```

The deploy script:

- Auto-creates Lambda functions if they don't exist
- Uses MD5 hashing to skip unchanged handlers (use `--force` to override)
- Auto-injects `.env` vars as Lambda environment variables
- Force-sets `OPEN_SEARCH_ENV=aws` for Lambda deployments

### Frontend (Next.js) Development

**Setup**:

```bash
cd policy_mate_ui
pnpm install
cp .env.example .env.local  # Create and configure
```

**Required env vars** (in `.env.local`):

- `NEXT_PUBLIC_AWS_REGION`: AWS region for Cognito
- `NEXT_PUBLIC_COGNITO_CLIENT_ID`: From AWS Cognito User Pool app client
- `NEXT_PUBLIC_API_BASE_URL`: Lambda/API Gateway URL

**Run**:

```bash
pnpm dev      # Development server on :3000
pnpm build    # Production build
pnpm format   # Biome formatting (NOT Prettier)
```

**Auth flow**: Cognito login → store `idToken` in session storage (via Zustand) → attach as `Authorization: Bearer` header

### OpenSearch Environment Switching

Set `OPEN_SEARCH_ENV` in `lambdas/.env`:

- `local`: Docker OpenSearch (development)
- `aws`: AWS OpenSearch Service (production)
- `serverless`: AWS OpenSearch Serverless

**Migration scripts**:

```bash
cd lambdas
uv run python pre/load_indexing.py     # Load docs to local OpenSearch
uv run python pre/load_embeddings.py   # Generate embeddings
uv run python pre/migrate_to_aws.py    # Migrate local → AWS
```

## Code Patterns & Conventions

### Error Handling in Handlers

```python
try:
    # Business logic
    return bedrock_response(event, 200, result)
except ValueError as e:
    log_with_context("ERROR", f"Validation error: {e}", request_id=context.aws_request_id)
    return bedrock_response(event, 400, {'error': str(e)})
except Exception as e:
    log_with_context("ERROR", f"Unexpected error: {e}", request_id=context.aws_request_id)
    return bedrock_response(event, 500, {'error': str(e)})
```

### DynamoDB Decimal Handling

DynamoDB returns `Decimal` objects that break JSON serialization. Always use:

```python
from src.utils.services.dynamoDB import replace_decimals
result = replace_decimals(table.query(...).get('Items', []))
```

### Bedrock Model Selection

Configured via env vars (see `src/utils/settings.py`):

- `AGENT_CLAUDE_HAIKU`: Fast, cheap analysis (default: `anthropic.claude-3-haiku-20240307-v1:0`)
- `AGENT_CLAUDE_SONNET`: Deep analysis (default: `anthropic.claude-3-5-sonnet-20240620-v1:0`)

**Pattern**: Use Haiku for per-control checks, Sonnet for comprehensive document analysis.

### Frontend State Management

Uses **Zustand** with persistence:

- `authStore.ts`: Auth state (session storage)
- `agentStore.ts`: Agent conversation state

**Pattern**: Check token expiry with `isTokenExpired()` before API calls.

## Project-Specific Gotchas

1. **Schema files** (`lambdas/schemas/*.yml`) define Bedrock Agent action schemas - update these when changing handler params
2. **Comprehensive check caching**: Results are cached in `PolicyMateInferredFiles` table by `(document_id, framework_id)` - use `force_reanalysis=true` to bypass
3. **Embedding similarity threshold**: `0.3` is the minimum in `find_relevant_chunks()` - lower = more chunks, slower analysis
4. **Deploy cache**: `.deploy_cache/` stores handler MD5s to skip unchanged deploys - delete to force rebuild
5. **Agent instructions**: Edit `lambdas/src/instructions/policyMateDocumentAgent.md` to change AI behavior (requires Bedrock Agent re-sync)

## Testing Approach

**Local Lambda testing**:

1. Create `lambdas/secrets.json` with Cognito credentials:
   ```json
   { "username": "...", "password": "...", "id_token": "..." }
   ```
2. Run `test_local.py` - it auto-refreshes tokens via Cognito

**No unit tests currently** - validation is manual via test scripts and AWS Lambda console.

## Key Files Reference

- `lambdas/pyproject.toml`: Python dependencies (managed by `uv`)
- `lambdas/src/utils/settings.py`: All env var config
- `lambdas/src/utils/decorators/`: Auth decorators (`@require_auth` vs `@require_cognito_auth`)
- `policy_mate_ui/src/utils/variables.ts`: Frontend env validation (Zod schemas)
- `WhiteBoard.md`: Product spec and compliance workflow documentation

## When Adding New Features

**New Lambda handler**:

1. Create `*_handler.py` in `lambdas/`
2. Use `@require_auth` decorator
3. Create OpenAPI schema in `lambdas/schemas/*_handler.yml`
4. Add to Bedrock Agent action group via AWS Console
5. Deploy: `./deploy.sh --handler <name>`

**New DynamoDB table**:

1. Add to `DynamoDBTable` enum in `src/utils/services/dynamoDB.py`
2. Create table in AWS Console or via IaC
3. Use `get_table(DynamoDBTable.YOUR_TABLE)` to access

**New compliance framework**:

1. Add to `framework_id` enum in all handler schemas
2. Load controls data via `pre/load_compliance.py`
3. Update frontend framework selector
