from typing import Any
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth  # type: ignore
from src.utils.settings import OPEN_SEARCH_HOST, OPEN_SEARCH_REGION

def get_opensearch_client() -> OpenSearch:
    """Get OpenSearch client with AWS authentication"""
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
    
    return OpenSearch(
        hosts=[{'host': f'{OPEN_SEARCH_HOST}.{OPEN_SEARCH_REGION}.aoss.amazonaws.com', 'port': 443}],
        http_auth=awsauth,
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection
    )

def search_controls(query_embedding: list[float], framework_id: str, k: int = 5) -> list[dict[str, Any]]:
    """Search for relevant compliance controls using vector similarity"""
    opensearch = get_opensearch_client()
    
    search_body: dict[str, Any] = {
        "size": k,
        "query": {
            "bool": {
                "must": [
                    {
                        "knn": {
                            "embedding": {
                                "vector": query_embedding,
                                "k": k
                            }
                        }
                    },
                    {
                        "term": {
                            "framework_id": framework_id
                        }
                    }
                ]
            }
        }
    }
    
    results = opensearch.search(index='compliance_controls', body=search_body)
    return [hit['_source'] for hit in results['hits']['hits']]

def index_document(index: str, document: dict[str, Any]) -> dict[str, Any]:
    """Index a document in OpenSearch"""
    opensearch = get_opensearch_client()
    return opensearch.index(index=index, body=document)
