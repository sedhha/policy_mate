Local Development:

docker-compose.yml - Runs OpenSearch locally on port 9200

scripts/opensearch-local.sh - Start/stop local OpenSearch

Updated opensearch.py - Detects environment via OPEN_SEARCH_ENV

Usage:

```bash
# Start local OpenSearch
./scripts/opensearch-local.sh start

# Load your data locally
cd lambdas
uv run python pre/load_indexing.py
uv run python pre/load_embeddings.py

# Test locally (OPEN_SEARCH_ENV=local in .env)
```

Migration to AWS:

```bash
# Update .env: OPEN_SEARCH_ENV=aws
# Set OPEN_SEARCH_HOST to AWS domain (without https://)
cd lambdas
uv run python pre/migrate_to_aws.py
```

The code automatically switches between local/AWS based on OPEN_SEARCH_ENV in your .env file. No code changes needed!
