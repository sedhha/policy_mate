locals {
  # --- Paths and routing metadata ---
  lambda_dir      = "${path.module}/../../../lambdas"
  lambda_meta_raw = jsondecode(file("${local.lambda_dir}/meta/lambda_routes.json"))

  # Keep only handlers actually defined in lambda_routes.json
  lambda_meta     = { for k, v in local.lambda_meta_raw : k => v }
  routed_handlers = keys(local.lambda_meta)
}

# --- Build & Package Each Lambda ---
resource "null_resource" "build_lambdas" {
  for_each = toset(local.routed_handlers)

  provisioner "local-exec" {
    working_dir = local.lambda_dir
    command = <<EOT
      echo "📦 Packaging ${each.key}.py ..."
      rm -rf dist/${each.key} ${each.key}.zip
      mkdir -p dist/${each.key}
      # install dependencies into dist
      uv pip install --python 3.12 --target dist/${each.key} .
      cp ${each.key}.py dist/${each.key}/
      cd dist/${each.key}
      zip -rq ../../${each.key}.zip .
      cd ../..
    EOT
  }

  triggers = {
    handler      = each.key
    handler_hash = filesha1("${local.lambda_dir}/${each.key}.py")
    deps_hash    = filesha1("${local.lambda_dir}/pyproject.toml")
  }
}

# --- Compute Zip Hash after Build ---
data "external" "lambda_zip_hash" {
  for_each = toset(local.routed_handlers)

  program = ["bash", "-c", <<EOT
    zip_path="${local.lambda_dir}/${each.key}.zip"
    if [ -f "$zip_path" ]; then
      hash=$(sha256sum "$zip_path" | cut -d ' ' -f1)
      echo "{\"hash\": \"$hash\"}"
    else
      echo "{\"hash\": \"none\"}"
    fi
  EOT
  ]
}

# --- IAM Role for all Lambdas ---
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-exec-${var.env}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action = "sts:AssumeRole"
    }]
  })
}

# --- Policy Attachments ---
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_s3" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

# --- Deploy Lambda Functions ---
resource "aws_lambda_function" "lambda" {
  for_each = toset(local.routed_handlers)

  function_name = "${var.project_name}-${each.key}-${var.env}"
  handler       = "${each.key}.lambda_handler"
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 60
  memory_size   = 512

  filename         = "${local.lambda_dir}/${each.key}.zip"
  source_code_hash = base64encode(data.external.lambda_zip_hash[each.key].result.hash)

  environment {
    variables = {
      ENV          = var.env
      PROJECT_NAME = var.project_name
    }
  }

  depends_on = [
    null_resource.build_lambdas,
    aws_iam_role.lambda_exec
  ]
}
