# filePath: lambdas/src/utils/services/s3.py
import boto3

s3_client = boto3.client('s3') # pyright: ignore[reportUnknownMemberType]
