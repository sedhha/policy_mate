# filePath: lambdas/src/utils/services/dynamoDB.py
import boto3
from enum import Enum
from typing import Any
from decimal import Decimal
from boto3.dynamodb.types import TypeDeserializer
from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource, Table
from src.utils.settings import DYNAMO_DB_REGION

dynamodb: DynamoDBServiceResource = boto3.resource('dynamodb', region_name=DYNAMO_DB_REGION)  # type: ignore[assignment]
deserializer = TypeDeserializer()


class DynamoDBTable(Enum):
    COMPLIANCE_CONTROLS = "PolicyMateComplianceControls"
    CONVERSATION_HISTORY = "PolicyMateConversationHistory"
    COMPLIANCE_REPORTS = "PolicyMateComplianceReports"
    DOCUMENTS = "PolicyMateUserFiles"
    FILES = "PolicyMateFiles"
    ORGANIZATIONS = "PolicyMateOrganizations"
    USERS = "PolicyMateUserFiles"
    INFERRED_FILES = "PolicyMateInferredFiles"
    ANNOTATIONS = "PolicyMateAnnotations"
    
# We're trying to create a processing workflow simple enough for Hack
# Once our idea looks great -> we can move to step functions or 
# more complex architecture
class DocumentStatus(Enum):
    PROCESSING = 1 # 1 - 10 => same stage
    UNKNOWN = 2
    UPLOAD_FAILED = 11
    UPLOAD_SUCCESS = 12
    ANALYSIS_INITIATED = 21
    ANALYSIS_SUCCEEDED = 31
    ANALYSIS_FAILED = 32
    REPORT_GENERATED = 41
    COMPLIANT = 51
    NON_COMPLIANT = 52
    PARTIALLY_COMPLIANT = 53

def get_table(table_name: DynamoDBTable | str) -> Table:
    """Get DynamoDB table by enum or string name"""
    if isinstance(table_name, str):
        return dynamodb.Table(table_name)
    return dynamodb.Table(table_name.value)

def replace_decimals(obj: Any) -> Any:
    """
    Recursively replace Decimal objects with int/float for JSON serialization.
    This is a common utility for handling DynamoDB query results.
    
    Args:
        obj: The object to process (can be dict, list, Decimal, or any other type)
    
    Returns:
        The same object structure with Decimals converted to int/float
    """
    if isinstance(obj, list):
        return [replace_decimals(item) for item in obj]  # type: ignore[misc]
    elif isinstance(obj, dict):
        return {str(key): replace_decimals(value) for key, value in obj.items()}  # type: ignore[misc]
    elif isinstance(obj, Decimal):
        # Convert to int if whole number, otherwise float
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj
