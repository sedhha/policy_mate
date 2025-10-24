variable "aws_profile" {
  description = "AWS CLI profile name"
  type        = string
  default     = "default"
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "env" {
  description = "Environment name (e.g. dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Name of the project using the Cognito User Pool"
  type        = string
  default     = "PolicyMate"
}

variable "lambda_handlers" {
  description = "List of Python Lambda handler files (without .py extension) to build and deploy"
  type        = list(string)
  default     = [
    "agent_handler",
    "annotations_agent_handler",
    "file_upload_handler"
  ]
}

variable "api_prefix" {
  description = "Prefix for API Gateway endpoints (e.g. api, v1, etc.)"
  type        = string
  default     = "api"
}

variable "lambda_timeout" {
  description = "Timeout for Lambda functions in seconds"
  type        = number
  default     = 60
}
