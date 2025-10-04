variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "policy-mate"
}

variable "existing_s3_bucket_name" {
  description = "Existing S3 bucket name for documents"
  type        = string
}

variable "existing_dynamodb_table_name" {
  description = "Existing DynamoDB table name for documents"
  type        = string
}

variable "existing_cognito_user_pool_id" {
  description = "Existing Cognito User Pool ID"
  type        = string
}
