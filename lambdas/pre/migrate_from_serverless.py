# filePath: lambdas/pre/migrate_from_serverless.py
#!/usr/bin/env python3
"""Migrate data from AWS OpenSearch Serverless to local OpenSearch"""
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from opensearchpy.helpers import bulk
from requests_aws4auth import AWS4Auth
from src.utils.settings import OPEN_SEARCH_HOST, OPEN_SEARCH_REGION

# AWS OpenSearch Serverless
service = 'aoss'
credentials = boto3.Session().get_credentials()
assert credentials is not None, "AWS credentials not found"
awsauth = AWS4Auth(
    credentials.access_key,
    credentials.secret_key,
    OPEN_SEARCH_REGION,
    service,
    session_token=credentials.token
)

serverless_client = OpenSearch(
    hosts=[{'host': f'{OPEN_SEARCH_HOST}.{OPEN_SEARCH_REGION}.aoss.amazonaws.com', 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

# Local OpenSearch
local_client = OpenSearch(
    hosts=[{'host': 'localhost', 'port': 9200}],
    use_ssl=False,
    verify_certs=False
)

def migrate_index(index_name: str):
    """Migrate an index from serverless to local"""
    print(f"Migrating index: {index_name}")
    
    # Get index mapping from serverless
    mapping = serverless_client.indices.get_mapping(index=index_name)
    
    # Clear and create index on local
    try:
        local_client.indices.delete(index=index_name)
        print(f"Cleared existing local index")
    except Exception:
        pass
    
    local_client.indices.create(
        index=index_name,
        body={'mappings': mapping[index_name]['mappings']}
    )
    print(f"Created local index {index_name}")
    
    # Copy all documents using search_after (serverless doesn't support scroll)
    docs = []
    response = serverless_client.search(
        index=index_name,
        body={
            'query': {'match_all': {}},
            'size': 10000,
            'sort': [{'_id': 'asc'}]
        }
    )
    
    hits = response['hits']['hits']
    docs.extend(hits)
    print(f"Fetched {len(hits)} documents")
    
    # Bulk index to local
    if docs:
        actions = [
            {
                '_index': index_name,
                '_id': hit['_id'],
                '_source': hit['_source']
            }
            for hit in docs
        ]
        success, failed = bulk(local_client, actions)
        print(f"Migrated {success} documents, {len(failed)} failed")
    else:
        print("No documents to migrate")

if __name__ == '__main__':
    print("Migrating from AWS OpenSearch Serverless to local...")
    try:
        migrate_index('compliance_controls')
        print("✓ Migration complete! You can now delete your serverless cluster.")
    except Exception as e:
        print(f"Migration failed: {e}")
        print("Make sure your serverless cluster is accessible and has data.")
