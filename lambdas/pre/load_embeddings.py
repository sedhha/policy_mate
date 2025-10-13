# filePath: lambdas/pre/load_embeddings.py
import json
import boto3
from src.utils.services.dynamoDB import DynamoDBTable, get_table
from src.utils.settings import OPEN_SEARCH_REGION

# Use the centralized OpenSearch client
from src.utils.services.opensearch import get_opensearch_client
opensearch = get_opensearch_client()

bedrock = boto3.client('bedrock-runtime', region_name=OPEN_SEARCH_REGION)

def generate_embedding(text: str) -> list[float]:
    """Generate embedding using Bedrock Titan"""
    response = bedrock.invoke_model(
        modelId='amazon.titan-embed-text-v1',
        body=json.dumps({"inputText": text})
    )
    result = json.loads(response['body'].read())
    return result['embedding']

def clear_index():
    """Delete and recreate the index"""
    try:
        opensearch.indices.delete(index='compliance_controls')
        print("Deleted existing index")
    except Exception as e:
        print(f"No existing index to delete: {e}")
    
    # Recreate index
    try:
        index_body = {
            "mappings": {
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
        }
        opensearch.indices.create(index='compliance_controls', body=index_body)
        print("Created fresh index")
    except Exception as e:
        print(f"Index already exists: {e}")

def load_embeddings():
    """Load only non-indexed compliance controls from DynamoDB"""
    table = get_table(DynamoDBTable.COMPLIANCE_CONTROLS)
    
    # Scan only non-indexed items
    response = table.scan(
        FilterExpression='attribute_not_exists(is_indexed) OR is_indexed = :false',
        ExpressionAttributeValues={':false': False}
    )
    items = response['Items']
    
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            FilterExpression='attribute_not_exists(is_indexed) OR is_indexed = :false',
            ExpressionAttributeValues={':false': False},
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response['Items'])
    
    print(f"Found {len(items)} non-indexed compliance controls")
    
    for i, item in enumerate(items):
        try:
            embedding = generate_embedding(item['requirement'])
            
            doc = {
                'framework_id': item['framework_id'],
                'control_id': item['control_id'],
                'requirement': item['requirement'],
                'keywords': item.get('keywords', []),
                'category': item['category'],
                'severity': item['severity'],
                'embedding': embedding
            }
            
            opensearch.index(index='compliance_controls', body=doc)
            
            # Mark as indexed in DynamoDB
            table.update_item(
                Key={'framework_id': item['framework_id'], 'control_id': item['control_id']},
                UpdateExpression='SET is_indexed = :true',
                ExpressionAttributeValues={':true': True}
            )
            
            if (i + 1) % 10 == 0:
                print(f"Indexed {i + 1}/{len(items)} controls")
        except Exception as e:
            print(f"Failed to index {item['framework_id']}_{item['control_id']}: {e}")
    
    print(f"Successfully indexed {len(items)} compliance controls")

if __name__ == '__main__':
    load_embeddings()
