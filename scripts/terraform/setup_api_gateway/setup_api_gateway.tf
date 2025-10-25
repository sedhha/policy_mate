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
  for_each    = local.lambda_meta
  rest_api_id = aws_api_gateway_rest_api.main.id
  parent_id   = aws_api_gateway_resource.api_prefix.id
  path_part   = each.value.path
}

# --- Create Request Validators ---
resource "aws_api_gateway_request_validator" "request_validator" {
  name                        = "${var.project_name}-request-validator"
  rest_api_id                 = aws_api_gateway_rest_api.main.id
  validate_request_body       = true
  validate_request_parameters = true
}

# --- Create Request Models/Schemas ---
resource "aws_api_gateway_model" "request_models" {
  for_each = {
    for handler, cfg in local.lambda_meta :
    handler => cfg
    if contains(keys(cfg), "request_schema")
  }

  rest_api_id  = aws_api_gateway_rest_api.main.id
  name         = "${replace(each.key, "_", "")}RequestModel"
  content_type = "application/json"
  schema       = jsonencode(each.value.request_schema)
}

# --- Create Methods for each HTTP method ---
resource "aws_api_gateway_method" "lambda_methods" {
  for_each = {
    for handler, cfg in local.lambda_meta :
    handler => [for method in cfg.methods : method if method != "OPTIONS"][0]
    if length([for method in cfg.methods : method if method != "OPTIONS"]) > 0
  }

  rest_api_id      = aws_api_gateway_rest_api.main.id
  resource_id      = aws_api_gateway_resource.lambda_paths[each.key].id
  http_method      = each.value
  authorization    = "NONE"
  request_validator_id = aws_api_gateway_request_validator.request_validator.id

  # Add request models if schema is defined
  request_models = try(
    {
      "application/json" = aws_api_gateway_model.request_models[each.key].name
    },
    {}
  )
}

# --- Lambda Integrations ---
resource "aws_api_gateway_integration" "lambda_integrations" {
  for_each = {
    for handler, cfg in local.lambda_meta :
    handler => cfg
  }

  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.lambda_paths[each.key].id
  http_method             = element(each.value.methods, 0)
  integration_http_method = "POST"

  # Determine integration type: AWS (non-proxy) if payload_mapping exists, else AWS_PROXY
  type = contains(keys(each.value), "payload_mapping") ? "AWS" : "AWS_PROXY"

  uri              = "arn:aws:apigateway:${data.aws_region.current.name}:lambda:path/2015-03-31/functions/${var.lambda_function_arns[each.key]}/invocations"
  request_templates = lookup(each.value, "payload_mapping", {})

  depends_on = [aws_api_gateway_method.lambda_methods]
}

# --- Integration Responses for non-proxy ---
resource "aws_api_gateway_integration_response" "lambda_integration_responses" {
  for_each = {
    for handler, cfg in local.lambda_meta :
    handler => cfg
    if contains(keys(cfg), "payload_mapping")
  }

  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.lambda_paths[each.key].id
  http_method       = aws_api_gateway_integration.lambda_integrations[each.key].http_method
  status_code       = "200"
  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.lambda_integrations]
}

# --- CORS OPTIONS Method ---
resource "aws_api_gateway_method" "cors" {
  for_each = local.lambda_meta

  rest_api_id   = aws_api_gateway_rest_api.main.id
  resource_id   = aws_api_gateway_resource.lambda_paths[each.key].id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# --- CORS Integration (Mock) ---
resource "aws_api_gateway_integration" "cors_integration" {
  for_each = local.lambda_meta

  rest_api_id       = aws_api_gateway_rest_api.main.id
  resource_id       = aws_api_gateway_resource.lambda_paths[each.key].id
  http_method       = aws_api_gateway_method.cors[each.key].http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}

# --- CORS Method Response ---
resource "aws_api_gateway_method_response" "cors_response" {
  for_each = local.lambda_meta

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lambda_paths[each.key].id
  http_method = aws_api_gateway_method.cors[each.key].http_method
  status_code = "200"

  response_models = { "application/json" = "Empty" }
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# --- CORS Integration Response ---
resource "aws_api_gateway_integration_response" "cors_integration_response" {
  for_each = local.lambda_meta

  rest_api_id = aws_api_gateway_rest_api.main.id
  resource_id = aws_api_gateway_resource.lambda_paths[each.key].id
  http_method = aws_api_gateway_method.cors[each.key].http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${join(",", var.allowed_origins)}'"
  }

  response_templates = {
    "application/json" = ""
  }

  depends_on = [aws_api_gateway_integration.cors_integration]
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
    aws_api_gateway_integration.cors_integration,
    aws_api_gateway_integration_response.cors_integration_response
  ]

  rest_api_id = aws_api_gateway_rest_api.main.id
  description = "Deployment for ${var.project_name}-${var.env}"

  # Force redeploy on schema changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_integration.lambda_integrations,
      aws_api_gateway_method.lambda_methods,
    ]))
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