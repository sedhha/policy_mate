output "bucket_name" {
  description = "The name of the S3 bucket created for the project"
  value       = aws_s3_bucket.project_bucket.bucket
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket"
  value       = aws_s3_bucket.project_bucket.arn
}

output "bucket_domain_name" {
  description = "The domain name of the S3 bucket"
  value       = aws_s3_bucket.project_bucket.bucket_domain_name
}
