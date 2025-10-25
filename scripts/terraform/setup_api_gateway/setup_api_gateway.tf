# --- Get Current AWS Region ---
data "aws_region" "current" {}

# --- Load Lambda Route Metadata ---
locals {
  meta_file_path = "${path.module}/../../../lambdas/meta/lambda_routes.json"
  lambda_meta    = jsondecode(file(local.meta_file_path))
}

# --- Create REST API ---
resource "aws_api_gateway_rest_api" "main" {
  name        = "${var.project_name}-${var.env}-api"
  description = "API Gateway for ${var.project_name} (${var.env})"
}

# --- Optional /api Prefix Resource ---
resource "aws_api_gateway_resource" "api_prefix" {
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_rest_api.main.root_resource_id
  path_part   = var.api_prefix
}

# --- Create Resources (paths for each Lambda) ---
resource "aws_api_gateway_resource" "lambda_paths" {
  for_each = toset([
    for handler, cfg in local.lambda_meta :
    cfg.path
  ])

  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api_prefix.id
  path_part   = each.value
}

# --- Create Methods for each HTTP method (no validation, no authorization) ---
resource "aws_api_gateway_method" "lambda_methods" {
  for_each = {
    for handler, cfg in local.lambda_meta :
    handler => [for method in cfg.methods : method if method != "OPTIONS"][0]
    if length([for method in cfg.methods : method if method != "OPTIONS"]) > 0
  }

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lambda_paths[local.lambda_meta[each.key].path].id
  http_method   = each.value
  authorization = "NONE"
}

# --- Lambda Integrations (AWS_PROXY - pass everything as-is to Lambda) ---
resource "aws_api_gateway_integration" "lambda_integrations" {
  for_each = {
    for handler, cfg in local.lambda_meta :
    handler => cfg
  }

  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.lambda_paths[each.value.path].id
  http_method             = [for method in each.value.methods : method if method != "OPTIONS"][0]
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.lambda_function_arns[each.key]}/invocations"

  depends_on = [aws_api_gateway_method.lambda_methods]
}

# --- OPTIONS Method (for CORS preflight) ---
resource "aws_api_gateway_method" "options" {
  for_each = toset([
    for handler, cfg in local.lambda_meta :
    cfg.path
  ])

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lambda_paths[each.value].id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# --- OPTIONS Integration (AWS_PROXY to Lambda) ---
resource "aws_api_gateway_integration" "options_integration" {
  for_each = toset([
    for handler, cfg in local.lambda_meta :
    cfg.path
  ])

  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.lambda_paths[each.value].id
  http_method             = aws_api_gateway_method.options[each.value].http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.lambda_function_arns[[for handler, cfg in local.lambda_meta : handler if cfg.path == each.value][0]]}/invocations"

  depends_on = [aws_api_gateway_method.options]
}

# --- Lambda Permissions for API Gateway ---
resource "aws_lambda_permission" "apigw_permissions" {
  for_each = var.lambda_function_arns

  statement_id  = "AllowAPIGatewayInvoke-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.main.execution_arn}/*/*"
}

# --- Deployment ---
resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_integration.lambda_integrations,
    aws_api_gateway_integration.options_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  description = "Deployment for ${var.project_name}-${var.env}"

  triggers = {
    redeployment = sha1(jsonencode({
      lambda_integrations = aws_api_gateway_integration.lambda_integrations
      options_integration = aws_api_gateway_integration.options_integration
    }))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# --- Stage ---
resource "aws_api_gateway_stage" "stage" {
  rest_api_id   = aws_api_gateway_rest_api.main.id
  deployment_id = aws_api_gateway_deployment.deployment.id
  stage_name    = var.env

  variables = {
    environment = var.env
  }

  cache_cluster_enabled = false

  depends_on = [aws_api_gateway_deployment.deployment]
}

# --- Outputs ---
output "api_gateway_invoke_urls" {
  description = "Invoke URLs for each Lambda route"
  value = {
    for k, v in local.lambda_meta :
    k => "https://${aws_api_gateway_rest_api.main.id}.execute-api.${data.aws_region.current.name}.amazonaws.com/${var.env}/${var.api_prefix}/${v.path}"
  }
}

output "api_gateway_id" {
  description = "REST API ID"
  value       = aws_api_gateway_rest_api.main.id
}

output "api_gateway_endpoint" {
  description = "API Gateway endpoint"
  value       = aws_api_gateway_rest_api.main.execution_arn
}