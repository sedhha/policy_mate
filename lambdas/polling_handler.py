# lambdas/bedrock_handler.py

import json
import logging
from typing import Any
import boto3
from aws_lambda_typing import context as context_
from src.utils.services.dynamoDB import DynamoDBTable, get_table
from src.utils.decorators.cognito_auth import require_cognito_auth
import traceback
logger = logging.getLogger()
logger.setLevel(logging.INFO)

lambda_client = boto3.client('lambda') # type: ignore

@require_cognito_auth
def lambda_handler(event: dict[str, Any], context: context_.Context) -> dict[str, Any]:
    """Invoke an AgentCore runtime endpoint from AWS Lambda."""
    try:
        request_id = event.get("request_id", context.aws_request_id)
        table = get_table(DynamoDBTable.POLLING_STATUS)
        response = table.get_item(Key={"request_id": request_id})
        item = response.get("Item", {})
        if not item:
            # Create a Polling entry
            table.put_item(
                Item={
                    "request_id": request_id,
                    "status": "processing",
                    "created_at": int(context.get_remaining_time_in_millis()),
                }
            )

            # And trigger the bedrock_handler lambda
            lambda_client.invoke( # pyright: ignore[reportUnknownMemberType]
                FunctionName='policy-mate-bedrock-handler',
                InvocationType='Event',  # Asynchronous invocation
                Payload=json.dumps(event).encode()
            )
            return {
            "statusCode": 201,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
            "body": json.dumps({"message": "Request is being processed. Please poll for results.", "request_id": request_id}),
        }
        else:
            response = item.get("response", {})
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
                },
                "body": json.dumps(response),
            }

    except Exception as e:
        trace = traceback.format_exc()
        logger.exception("Error invoking AgentCore")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
            },
            "body": json.dumps({"error": str(e), "details": trace}),
        }
