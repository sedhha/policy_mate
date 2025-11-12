output "lambda_function_arns" {
  description = "ARNs of all deployed Lambda functions"
  value = { for k, v in aws_lambda_function.lambda : k => v.arn }
}

output "lambda_function_names" {
  description = "Names of all deployed Lambda functions"
  value = { for k, v in aws_lambda_function.lambda : k => v.function_name }
}

output "lambda_function_urls" {
  description = "Direct Lambda function URLs (non-API Gateway)"
  value = { 
    for k, v in aws_lambda_function.lambda : 
    k => "https://lambda.${data.aws_region.current.name}.amazonaws.com/2015-03-31/functions/${v.function_name}/invocations"
  }
}

output "lambda_role_arn" {
  description = "IAM role used by Lambda functions"
  value       = aws_iam_role.lambda_exec.arn
}
