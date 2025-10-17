from typing import Any
from src.utils.services.dynamoDB import get_table

def cached_response(response: dict[str, Any]) -> dict[str, Any]:
    if "dynamo_db_document_id" in response and \
    "dynamo_db_table_name" in response and \
        "dynamo_db_query_key" in response and \
        "dynamo_db_value_key" in response:
        table = get_table(response["dynamo_db_table_name"])
        query_key = response["dynamo_db_query_key"]
        document_id = response["dynamo_db_document_id"]
        value_key = response["dynamo_db_value_key"]
        
        query_response = table.query(
            KeyConditionExpression="#key = :doc_id",
            ExpressionAttributeNames={"#key": query_key},
            ExpressionAttributeValues={":doc_id": document_id},
            Limit=1
        )
        if query_response.get("Items"):
            cached_response: dict[str,Any] | None = query_response["Items"][0].get(value_key, None) # pyright: ignore[reportAssignmentType]
            if cached_response is not None:
                return cached_response
    return response