import os
from dotenv import load_dotenv

load_dotenv(override=True)

COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-east-1')
COGNITO_USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
DYNAMO_DB_REGION = os.environ.get('DYNAMO_DB_REGION', 'us-east-1')