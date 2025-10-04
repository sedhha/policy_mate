# Reference existing Cognito User Pool
data "aws_cognito_user_pools" "existing" {
  name = "${var.project_name}-user-pool"
}

# Reference existing S3 Bucket
data "aws_s3_bucket" "documents" {
  bucket = var.existing_s3_bucket_name
}

# Reference existing DynamoDB Table
data "aws_dynamodb_table" "documents" {
  name = var.existing_dynamodb_table_name
}
