from typing import Any
from src.utils.logger import log_with_context
from src.utils.services.dynamoDB import get_table, replace_decimals

def cached_response(response: dict[str, Any], request_id: str) -> dict[str, Any]:
    tool_payload_response = response.get("tool_payload", {})
    log_with_context("INFO",message=f"Checking for cached response with tool_payload_response: {tool_payload_response}", request_id=request_id)
    if "dynamo_db_document_id" in tool_payload_response and \
    "dynamo_db_table_name" in tool_payload_response and \
        "dynamo_db_query_key" in tool_payload_response and \
        "dynamo_db_value_key" in tool_payload_response:
        table = get_table(tool_payload_response["dynamo_db_table_name"])
        query_key = tool_payload_response["dynamo_db_query_key"]
        document_id = tool_payload_response["dynamo_db_document_id"]
        value_key = tool_payload_response["dynamo_db_value_key"]
        
        query_response = table.query(
            KeyConditionExpression="#key = :doc_id",
            ExpressionAttributeNames={"#key": query_key},
            ExpressionAttributeValues={":doc_id": document_id},
            Limit=1
        )
        if query_response.get("Items"):
            log_with_context("INFO",message=f"Found cached response for document_id: {document_id} in table: {query_response["Items"][0]}", request_id=request_id)
            cached_response: dict[str,Any] | None = query_response["Items"][0].get(value_key, None) # pyright: ignore[reportAssignmentType]
            if cached_response is not None:
                # Convert Decimal objects to JSON-serializable types using DynamoDB utility
                return replace_decimals(cached_response)
    return response