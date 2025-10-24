output "cognito_pool_id" {
  value       = module.setup_cognito.user_pool_id
  description = "ID of the Cognito User Pool"
}

output "cognito_client_id" {
  value       = module.setup_cognito.user_pool_client_id
  description = "Client ID for the web app"
}

output "s3_bucket_name" {
  description = "The name of the S3 bucket created for the project"
  value       = module.setup_s3.bucket_name
}

output "s3_bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = module.setup_s3.bucket_arn
}

output "s3_bucket_domain_name" {
  description = "The domain name of the S3 bucket"
  value       = module.setup_s3.bucket_domain_name
}

