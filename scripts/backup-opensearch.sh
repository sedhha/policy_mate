#!/bin/bash
# Simple backup script using Python

BACKUP_DIR="./backup"
mkdir -p "$BACKUP_DIR"

echo "Backing up OpenSearch data..."

cd lambdas
uv run python -c "
from opensearchpy import OpenSearch
import json

client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 9200}],
    use_ssl=False,
    verify_certs=False
)

# Get mapping
mapping = client.indices.get_mapping(index='compliance_controls')
with open('../backup/mapping.json', 'w') as f:
    json.dump(mapping, f)

# Get all documents
response = client.search(
    index='compliance_controls',
    body={'query': {'match_all': {}}, 'size': 10000}
)

docs = [hit['_source'] for hit in response['hits']['hits']]
with open('../backup/data.json', 'w') as f:
    json.dump(docs, f)

print(f'✓ Backed up {len(docs)} documents')
"

echo "✓ Backup complete in $BACKUP_DIR/"
