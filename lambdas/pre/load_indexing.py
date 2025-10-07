import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth  # type: ignore
from typing import Any
from src.utils.settings import OPEN_SEARCH_HOST, OPEN_SEARCH_REGION

service = 'aoss'  # Changed for serverless
credentials = boto3.Session().get_credentials()
assert credentials is not None, "AWS credentials not found"
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key,
                   OPEN_SEARCH_REGION, service, session_token=credentials.token)

opensearch = OpenSearch(
    hosts=[{'host': f'{OPEN_SEARCH_HOST}.{OPEN_SEARCH_REGION}.aoss.amazonaws.com', 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

index_body: dict[str, Any] = {
    "mappings": {
        "properties": {
            "framework_id": {"type": "keyword"},
            "control_id": {"type": "keyword"},
            "requirement": {"type": "text"},
            "keywords": {"type": "keyword"},
            "category": {"type": "keyword"},
            "severity": {"type": "keyword"},
            "embedding": {
                "type": "knn_vector",
                "dimension": 1536
            }
        }
    }
}

opensearch.indices.create(index='compliance_controls', body=index_body)
