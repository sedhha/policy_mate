# Policy Mate

## Setup

### 1. Install uv

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. AWS Authentication

```bash
aws configure
```

### 3. Local OpenSearch Setup

Start local OpenSearch for development:

```bash
./scripts/opensearch-local.sh start
```

Stop when done:

```bash
./scripts/opensearch-local.sh stop
```

### 4. Load Data to Local OpenSearch

```bash
cd lambdas
uv run python pre/load_indexing.py
uv run python pre/load_embeddings.py
```

### 5. Migrate to AWS OpenSearch Service

When ready to deploy to AWS:

```bash
# Create AWS OpenSearch domain (t2.small.search - free tier eligible)
export AWS_PROFILE=policy-mate
./scripts/create-opensearch-domain.sh

# Wait 10-15 minutes, then get the endpoint
export AWS_PROFILE=policy-mate
aws opensearch describe-domain --domain-name policy-mate --query 'DomainStatus.Endpoint' --output text

# Update .env:
# OPEN_SEARCH_ENV=aws
# OPEN_SEARCH_HOST=<endpoint-from-above>

# Migrate data from local to AWS
cd lambdas
uv run python pre/migrate_to_aws.py
```

### 6. Test Lambda

```bash
aws lambda invoke --function-name policy-mate-function output.json
cat output.json
```

## Project Structure

- `lambdas/` - Python Lambda function code
- `policy_mate_ui/` - Frontend application
- `scripts/` - Utility scripts

## Environment Configuration

Edit `lambdas/.env`:
- `OPEN_SEARCH_ENV=local` - Use local OpenSearch
- `OPEN_SEARCH_ENV=aws` - Use AWS OpenSearch Service
- `OPEN_SEARCH_ENV=serverless` - Use AWS OpenSearch Serverless
