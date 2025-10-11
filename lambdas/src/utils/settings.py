import os
from dotenv import load_dotenv

load_dotenv(override=True)

COGNITO_REGION = os.environ.get('COGNITO_REGION', 'us-east-1')
COGNITO_USER_POOL_ID = os.environ['COGNITO_USER_POOL_ID']
DYNAMO_DB_REGION = os.environ.get('DYNAMO_DB_REGION', 'us-east-1')

# OpenSearch
OPEN_SEARCH_ENV = os.environ.get('OPEN_SEARCH_ENV', 'local')
OPEN_SEARCH_HOST = os.environ['OPEN_SEARCH_HOST']
OPEN_SEARCH_REGION = os.environ.get('OPEN_SEARCH_REGION', 'us-east-1')
OPEN_SEARCH_LOCAL_HOST = os.environ.get('OPEN_SEARCH_LOCAL_HOST', 'localhost')
OPEN_SEARCH_LOCAL_PORT = int(os.environ.get('OPEN_SEARCH_LOCAL_PORT', '9200'))

# AGENT DETAILS
AGENT_NAME = os.environ['AGENT_NAME']
AGENT_ID = os.environ['AGENT_ID']
AGENT_ALIAS_ID = os.environ['AGENT_ALIAS_ID']

# S3
S3_REGION = os.environ.get('S3_REGION', 'us-east-1')
S3_BUCKET_NAME = os.environ['BUCKET_NAME']