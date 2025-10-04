output "ingestion_lambda_name" {
  value = aws_lambda_function.ingestion.function_name
}

output "api_gateway_url" {
  value = "${aws_api_gateway_stage.prod.invoke_url}/upload"
}

output "s3_bucket_name" {
  value = data.aws_s3_bucket.documents.id
}

output "dynamodb_table_name" {
  value = data.aws_dynamodb_table.documents.name
}
