#!/bin/bash
# Restore OpenSearch data from backup

BACKUP_DIR="./backup"

if [ ! -f "$BACKUP_DIR/data.json" ]; then
    echo "Error: No backup found in $BACKUP_DIR/"
    exit 1
fi

echo "Restoring OpenSearch data..."

cd lambdas
uv run python -c "
from opensearchpy import OpenSearch
from opensearchpy.helpers import bulk
import json

client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 9200}],
    use_ssl=False,
    verify_certs=False
)

# Restore mapping
with open('../backup/mapping.json', 'r') as f:
    mapping = json.load(f)
    
try:
    client.indices.create(
        index='compliance_controls',
        body={'mappings': list(mapping.values())[0]['mappings']}
    )
    print('✓ Created index')
except Exception as e:
    print(f'Index exists: {e}')

# Restore data
with open('../backup/data.json', 'r') as f:
    docs = json.load(f)

actions = [
    {
        '_index': 'compliance_controls',
        '_source': doc
    }
    for doc in docs
]

success, failed = bulk(client, actions)
print(f'✓ Restored {success} documents, {len(failed)} failed')
"

echo "✓ Restore complete"
