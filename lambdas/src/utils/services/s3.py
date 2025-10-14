# filePath: lambdas/src/utils/services/s3.py
import boto3
from mypy_boto3_s3 import S3Client

s3_client: S3Client = boto3.client('s3') # pyright: ignore[reportUnknownMemberType]
