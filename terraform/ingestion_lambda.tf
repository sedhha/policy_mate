data "aws_caller_identity" "current" {}

# Lambda packaging
resource "null_resource" "install_dependencies" {
  triggers = {
    requirements = filemd5("${path.module}/../lambdas/pyproject.toml")
    ingestion    = filemd5("${path.module}/../lambdas/ingestion_handler.py")
  }

  provisioner "local-exec" {
    command     = "mkdir -p ${path.module}/lambda_package && uv pip install --python python3.12 --target ${path.module}/lambda_package -r pyproject.toml && cp *.py ${path.module}/lambda_package/"
    working_dir = "${path.module}/../lambdas"
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda_package"
  output_path = "${path.module}/lambda.zip"
  depends_on  = [null_resource.install_dependencies]
}

# IAM Role for Ingestion Lambda
resource "aws_iam_role" "ingestion_lambda_role" {
  name = "${var.project_name}-ingestion-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ingestion_lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.ingestion_lambda_role.name
}

# IAM Policy for S3 and DynamoDB access
resource "aws_iam_role_policy" "ingestion_lambda_policy" {
  name = "${var.project_name}-ingestion-lambda-policy"
  role = aws_iam_role.ingestion_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject"
        ]
        Resource = "${data.aws_s3_bucket.documents.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem"
        ]
        Resource = data.aws_dynamodb_table.documents.arn
      }
    ]
  })
}

# Ingestion Lambda Function
resource "aws_lambda_function" "ingestion" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-ingestion-function"
  role            = aws_iam_role.ingestion_lambda_role.arn
  handler         = "ingestion_handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30

  environment {
    variables = {
      BUCKET_NAME          = data.aws_s3_bucket.documents.id
      TABLE_NAME           = data.aws_dynamodb_table.documents.name
      COGNITO_USER_POOL_ID = var.existing_cognito_user_pool_id
      COGNITO_REGION       = var.aws_region
    }
  }
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "ingestion_api" {
  name = "${var.project_name}-ingestion-api"
}

resource "aws_api_gateway_resource" "upload" {
  rest_api_id = aws_api_gateway_rest_api.ingestion_api.id
  parent_id   = aws_api_gateway_rest_api.ingestion_api.root_resource_id
  path_part   = "upload"
}

resource "aws_api_gateway_authorizer" "cognito" {
  name          = "${var.project_name}-cognito-authorizer"
  rest_api_id   = aws_api_gateway_rest_api.ingestion_api.id
  type          = "COGNITO_USER_POOLS"
  provider_arns = ["arn:aws:cognito-idp:${var.aws_region}:${data.aws_caller_identity.current.account_id}:userpool/${var.existing_cognito_user_pool_id}"]
}

resource "aws_api_gateway_method" "upload_post" {
  rest_api_id   = aws_api_gateway_rest_api.ingestion_api.id
  resource_id   = aws_api_gateway_resource.upload.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "upload_lambda" {
  rest_api_id             = aws_api_gateway_rest_api.ingestion_api.id
  resource_id             = aws_api_gateway_resource.upload.id
  http_method             = aws_api_gateway_method.upload_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.ingestion.invoke_arn
}

resource "aws_api_gateway_deployment" "ingestion_api" {
  rest_api_id = aws_api_gateway_rest_api.ingestion_api.id

  depends_on = [
    aws_api_gateway_integration.upload_lambda
  ]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "prod" {
  deployment_id = aws_api_gateway_deployment.ingestion_api.id
  rest_api_id   = aws_api_gateway_rest_api.ingestion_api.id
  stage_name    = "prod"
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingestion.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.ingestion_api.execution_arn}/*/*"
}
