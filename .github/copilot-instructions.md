# Policy Mate - AI Agent Instructions

## Project Overview

**Policy Mate** is a compliance management platform that uses AWS Bedrock-powered AI agents to analyze documents against compliance frameworks (GDPR, SOC2, HIPAA). The system follows a **monorepo architecture** with:

- **Backend**: Python AWS Lambda handlers with multi-agent system (supervisor + specialized agents)
- **Frontend**: Next.js 15 App Router with AWS Cognito authentication
- **Infrastructure**: AWS OpenSearch (vector search), DynamoDB (storage), S3 (documents), Bedrock (AI)

## Architecture Patterns

### Multi-Agent System (Tool-Agent Pattern)

The backend uses a **supervisor-agent architecture** where a supervisor routes queries to specialized child agents:

```python
# lambdas/src/agents/supervisor_agent.py
supervisor_agent → compliance_agent | annotations_agent
```

**Critical pattern**: Child agents return **JSON strings**, supervisor must:

1. Parse child agent response with `parse_child_agent_response()`
2. Return exact JSON structure (never add explanatory text)
3. Handle JSON sanitization (smart quotes, Python syntax, escapes)

**Common pitfall**: Agents must return pure JSON - no markdown wrappers, no commentary. Use `parse_agent_json()` for robust error recovery.

### Tool Implementation with Strands Framework

All agent tools use the `@tool` decorator from `strands` library:

```python
from strands import tool

@tool(inputSchema={"json": {...}})
def my_tool(param: str) -> dict[str, Any]:
    """Tool docstring shown to LLM"""
    return result
```

**Response Format** (standardized across all agents):

```python
{
    "session_id": str | None,
    "error_message": str,           # Empty on success
    "tool_payload": dict,            # Raw tool data
    "summarised_markdown": str,      # Human-readable formatted response
    "suggested_next_actions": [...]  # Next action suggestions
}
```

### Environment-Based Configuration

OpenSearch connection auto-detects environment via `OPEN_SEARCH_ENV`:

- `local` → Docker container (localhost:9200)
- `aws` → AWS OpenSearch Service (production)
- `serverless` → AWS OpenSearch Serverless

**Pattern in code**: `lambdas/src/utils/settings.py` loads from `.env`, no code changes needed for env switching.

## Key Workflows

### Local Development Setup

```bash
# 1. Start local OpenSearch
./scripts/opensearch-local.sh start

# 2. Load test data
cd lambdas
uv run python pre/load_indexing.py
uv run python pre/load_embeddings.py

# 3. Run frontend
cd policy_mate_ui
pnpm dev
```

### Lambda Deployment

**Deploy specific handler**:

```bash
cd lambdas
./deploy.sh --handler compliance_check    # Deploy one function
./deploy.sh --force                       # Force redeploy all
```

**For large handlers** (>50MB unzipped):

```bash
./create_handler_zip.sh --handler annotations_agent --with-env
# Then upload zip to S3 and update Lambda from S3
```

**Deployment behavior**:

- Caches MD5 hashes to skip unchanged handlers
- Auto-forces `OPEN_SEARCH_ENV=aws` in Lambda env vars
- Creates Lambda if not exists, updates code if exists

### Testing Agents Locally

```bash
cd lambdas
uv run python test_agent.py              # Test supervisor agent
uv run python test_local.py              # Test individual tools
```

**Pattern**: Test files use `if __name__ == "__main__"` blocks with hardcoded inputs. No pytest framework used.

## Frontend Conventions

### Next.js App Router Structure

```
policy_mate_ui/src/
├── app/              # Route pages (login, dashboard, etc)
├── components/       # Reusable UI components
├── stores/           # Zustand state (authStore, agentStore)
├── utils/            # AWS Cognito helpers, API clients
└── types/            # TypeScript interfaces
```

**State management**: Zustand with middleware:

- `authStore.ts`: Persisted to sessionStorage (auth tokens, user claims)
- `agentStore.ts`: Ephemeral (agent conversations, UI state)

### Protected Routes Pattern

Routes in `routesWithoutHeader` array (see `LayoutWrapper.tsx`) skip header rendering. Protected routes check `useAuthStore()` token presence.

**Authentication flow**:

1. User logs in → AWS Cognito returns JWT
2. JWT stored in `authStore` (sessionStorage)
3. API calls include `Authorization: Bearer <token>`
4. Backend Lambda uses `@require_cognito_auth` decorator to validate

### Biome for Linting

Uses **Biome** (not ESLint/Prettier):

```bash
pnpm lint      # Check
pnpm format    # Fix
```

**Config**: `biome.json` - fast Rust-based tooling.

## AWS Services Integration

### DynamoDB Tables (Convention)

Tables use partition key patterns:

- **Documents**: `file_id` (PK)
- **Annotations**: `annotation_id` (PK), `document_id` (GSI)
- **Analysis Cache**: Composite key `document_id#framework_id`

**Helper**: `lambdas/src/utils/services/dynamoDB.py` - `get_table()`, `replace_decimals()` for JSON serialization.

### OpenSearch Indices

**Convention**: Two indices:

- `policy-mate-docs` → Standard/reference documents (public + org-specific)
- `policy-mate-embeddings` → Vector embeddings for semantic search

**Query pattern**: Use `KnnVectorQuery` for semantic search, `TermQuery` for exact match.

### S3 Structure

```
s3://policy-mate-bucket/
├── standard-docs/
│   ├── public/gdpr/...
│   └── <org_id>/custom_gdpr/...
└── manual-docs/<org_id>/...
```

**Upload pattern**: Frontend gets presigned URL from Lambda → uploads directly to S3 → triggers processing pipeline.

## Common Tasks

### Adding a New Agent Tool

1. Create tool function in `lambdas/src/tools/`
2. Import and wrap with `@tool` decorator in agent file
3. Add to agent's `tools=[...]` array
4. Document in agent's `SYSTEM_PROMPT`
5. Deploy: `./deploy.sh --handler <agent_name>`

**Example**: See `lambdas/src/tools/annotation_tools.py` for multi-tool module pattern.

### Adding New Compliance Framework

1. Add controls to `backup/compliance_controls_data.json`
2. Update OpenSearch: `uv run python pre/load_embeddings.py`
3. Add framework enum to tool `inputSchema` (GDPR|SOC2|HIPAA|NEW_FRAMEWORK)
4. No agent code changes needed (dynamic framework lookup)

### Frontend Component Patterns

**Server components by default** (Next.js 15):

- Use `"use client"` only for state/effects/event handlers
- Fetch data in server components, pass to client components as props

**Markdown rendering**: `MarkdownRenderer.tsx` uses `react-markdown` with `rehype-highlight` for code, `rehype-katex` for math.

## Debugging Tips

### Lambda Handler Not Updating

Check `.deploy_cache/` for MD5 hash - use `--force` to bypass cache.

### JSON Parse Errors from Agent

1. Check `supervisor_agent_response.txt` (debug output)
2. Agent may be returning smart quotes or Python syntax
3. Use `parse_agent_json()` which handles sanitization
4. Common fix: Ensure agent returns `true/false/null` not `True/False/None`

### OpenSearch Connection Issues

Verify environment:

```bash
# In .env
OPEN_SEARCH_ENV=local|aws|serverless
OPEN_SEARCH_HOST=localhost|<aws-domain>
```

For local: Ensure Docker container running (`docker ps`)
For AWS: Check VPC security groups allow Lambda → OpenSearch

### Frontend Auth Issues

Clear sessionStorage if token expired:

```javascript
sessionStorage.clear();
```

Or check JWT expiry in `authStore` - auto-refresh should trigger before expiry.

## Dependencies & Tooling

- **Python**: `uv` package manager (faster than pip/poetry)
- **Node**: pnpm 10.18+ with Next.js 15
- **Agents**: `strands-agents` library wraps Bedrock API
- **AWS SDK**: `boto3` with `mypy-boto3-*` stubs for type hints

**Install pattern**:

```bash
# Python
uv pip install --python 3.12 .

# Node
pnpm install
```

## Special Considerations

### Bedrock Model Selection

- **Haiku**: Fast, cheap - used for most tools and child agents
- **Sonnet**: Complex reasoning - use for multi-step analysis only
- **Configured in**: `lambdas/src/utils/settings.py` → `AGENT_CLAUDE_HAIKU`

### Cost Optimization

- **Cache analysis results** in DynamoDB (keyed by `document_id#framework_id`)
- **force_reanalysis=false** by default (only rerun on user request)
- **Use local OpenSearch** for development (free)

### Security Notes

- JWT validation in `lambdas/src/utils/decorators/cognito_auth.py`
- Never log full JWT or sensitive claims to CloudWatch
- S3 presigned URLs expire in 15 minutes (configurable)

## File References

**Key entry points**:

- Lambda handler: `lambdas/agent_v2_handler.py`
- Supervisor agent: `lambdas/src/agents/supervisor_agent.py`
- Frontend auth: `policy_mate_ui/src/stores/authStore.ts`
- Deployment: `lambdas/deploy.sh`

**Architecture docs**: `docs/*.mmd` (Mermaid diagrams)
**Whiteboard**: `WhiteBoard.md` (product requirements and todos)
