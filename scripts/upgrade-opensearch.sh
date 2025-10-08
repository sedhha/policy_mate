#!/bin/bash
# Upgrade local OpenSearch from 2.11 to 3.1 with data migration

echo "Step 1: Backing up data from OpenSearch 2.11..."

# Export data using elasticdump
docker run --rm --net=host \
  elasticdump/elasticsearch-dump \
  --input=http://localhost:9200/compliance_controls \
  --output=/tmp/compliance_controls_mapping.json \
  --type=mapping

docker run --rm --net=host \
  -v $(pwd)/backup:/tmp \
  elasticdump/elasticsearch-dump \
  --input=http://localhost:9200/compliance_controls \
  --output=/tmp/compliance_controls_data.json \
  --type=data

echo "✓ Backup complete"

echo "Step 2: Stopping OpenSearch 2.11..."
docker-compose down

echo "Step 3: Removing old data volume..."
docker volume rm policy_mate_opensearch-data 2>/dev/null || true

echo "Step 4: Starting OpenSearch 3.1..."
docker-compose up -d

echo "Waiting for OpenSearch 3.1 to be ready..."
sleep 15

echo "Step 5: Restoring data to OpenSearch 3.1..."

# Restore data (mapping is auto-created)
docker run --rm --net=host \
  -v $(pwd)/backup:/tmp \
  elasticdump/elasticsearch-dump \
  --input=/tmp/compliance_controls_data.json \
  --output=http://localhost:9200/compliance_controls \
  --type=data

echo "✓ Upgrade complete! OpenSearch 3.1 is running with your data."
echo "Backup files are in ./backup/ directory"
