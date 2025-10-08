#!/usr/bin/env python3
"""Migrate data from local OpenSearch to AWS OpenSearch Service"""
import os
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.helpers import bulk
from requests_aws4auth import AWS4Auth
from src.utils.settings import OPEN_SEARCH_HOST, OPEN_SEARCH_REGION

# Local OpenSearch (always connect to localhost)
local_client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 9200}],
    use_ssl=False,
    verify_certs=False
)

# AWS OpenSearch Service
service = 'es'
credentials = boto3.Session().get_credentials()
assert credentials is not None, "AWS credentials not found"

awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    OPEN_SEARCH_REGION,
    service,
    session_token=credentials.token
)

aws_client = OpenSearch(
    hosts=[{'host': OPEN_SEARCH_HOST, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

def migrate_index(index_name: str, clear_existing: bool = True):
    """Migrate an index from local to AWS"""
    print(f"Migrating index: {index_name}")
    
    # Clear existing index if requested
    if clear_existing:
        try:
            aws_client.indices.delete(index=index_name)
            print(f"Cleared existing index {index_name} on AWS")
        except Exception as e:
            print(f"No existing index to clear: {e}")
    
    # Get index mapping from local (or use default if not exists)
    try:
        mapping = local_client.indices.get_mapping(index=index_name)
        mappings = mapping[index_name]['mappings']
    except Exception:
        print(f"Local index not found, using default mapping")
        mappings = {
            "properties": {
                "framework_id": {"type": "keyword"},
                "control_id": {"type": "keyword"},
                "requirement": {"type": "text"},
                "keywords": {"type": "keyword"},
                "category": {"type": "keyword"},
                "severity": {"type": "keyword"},
                "embedding": {"type": "knn_vector", "dimension": 1536}
            }
        }
    
    # Create index on AWS
    try:
        aws_client.indices.create(
            index=index_name,
            body={
                'mappings': mappings,
                'settings': {
                    'number_of_shards': 1,
                    'number_of_replicas': 0
                }
            }
        )
        print(f"Created index {index_name} on AWS")
    except Exception as e:
        print(f"Failed to create index: {e}")
        return
    
    # Bulk copy documents
    try:
        response = local_client.search(
            index=index_name,
            body={'query': {'match_all': {}}, 'size': 10000}
        )
        
        hits = response['hits']['hits']
        
        if hits:
            actions = [
                {
                    '_index': index_name,
                    '_id': hit['_id'],
                    '_source': hit['_source']
                }
                for hit in hits
            ]
            success, failed = bulk(aws_client, actions)
            print(f"Migrated {success} documents, {len(failed)} failed")
        else:
            print("No documents found in local index")
    except Exception as e:
        print(f"Error migrating documents: {e}")
        print("Local index may not exist or be empty")

if __name__ == '__main__':
    print("⚠️  Ensure you have created AWS OpenSearch domain first!")
    print("⚠️  This will CLEAR existing data on AWS OpenSearch")
    input("Press Enter to continue...")
    
    migrate_index('compliance_controls', clear_existing=True)
    print("Migration complete!")
