# filePath: lambdas/src/utils/services/dynamoDB.py
import boto3
from enum import Enum
from mypy_boto3_dynamodb.service_resource import DynamoDBServiceResource, Table
from src.utils.settings import DYNAMO_DB_REGION

dynamodb: DynamoDBServiceResource = boto3.resource('dynamodb', region_name=DYNAMO_DB_REGION)  # type: ignore[assignment]


class DynamoDBTable(Enum):
    COMPLIANCE_CONTROLS = "PolicyMateComplianceControls"
    CONVERSATION_HISTORY = "PolicyMateConversationHistory"
    COMPLIANCE_REPORTS = "PolicyMateComplianceReports"
    DOCUMENTS = "PolicyMateDocuments"
    FILES = "PolicyMateFiles"
    ORGANIZATIONS = "PolicyMateOrganizations"
    USERS = "PolicyMateUserFiles"

def get_table(table_name: DynamoDBTable) -> Table:
    return dynamodb.Table(table_name.value)
