# filePath: lambdas/pre/load_indexing.py
from typing import Any
from src.utils.services.opensearch import get_opensearch_client

opensearch = get_opensearch_client()

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
