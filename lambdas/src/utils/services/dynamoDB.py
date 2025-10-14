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
    DOCUMENTS = "PolicyMateUserFiles"
    FILES = "PolicyMateFiles"
    ORGANIZATIONS = "PolicyMateOrganizations"
    USERS = "PolicyMateUserFiles"
    
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

def get_table(table_name: DynamoDBTable) -> Table:
    return dynamodb.Table(table_name.value)
