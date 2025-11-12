locals {
  # --- Paths and routing metadata ---
  lambda_dir      = "${path.module}/../../../lambdas"
  lambda_meta_raw = jsondecode(file("${local.lambda_dir}/meta/lambda_routes.json"))

  # Keep only handlers actually defined in lambda_routes.json
  lambda_meta     = { for k, v in local.lambda_meta_raw : k => v }
  routed_handlers = keys(local.lambda_meta)

  # --- Load environment variables from .env file in lambdas directory ---
  env_file_path = "${local.lambda_dir}/.env"
  env_vars      = try(
    { for line in split("\n", file(local.env_file_path)) :
      split("=", line)[0] => split("=", join("=", slice(split("=", line), 1, length(split("=", line)))), 1)[0]
      if line != "" && !startswith(line, "#") && contains(line, "=")
    },
    {}
  )
}

# --- Build & Package Each Lambda ---
resource "null_resource" "build_lambdas" {
  for_each = toset(local.routed_handlers)

  provisioner "local-exec" {
    working_dir = local.lambda_dir
    interpreter = ["/bin/bash", "-c"]
    command = <<EOT
      echo "📦 Packaging ${each.key}.py ..."
      rm -rf dist/${each.key} ${each.key}.zip
      mkdir -p dist/${each.key}
      
      # Use handler-specific pyproject.toml if it exists, otherwise use root pyproject.toml
      PYPROJECT_PATH="meta/tomls/${each.key}.pyproject.toml"
      if [ ! -f "$PYPROJECT_PATH" ]; then
        PYPROJECT_PATH="pyproject.toml"
      fi
      
      # Install dependencies into dist using the appropriate pyproject.toml
      python3 << PYSCRIPT
import tomllib
import subprocess
import sys

pyproject_path = "$PYPROJECT_PATH"
try:
    with open(pyproject_path, "rb") as f:
        data = tomllib.load(f)
        deps = data.get("project", {}).get("dependencies", [])
        if deps:
            print(f"Installing {len(deps)} dependencies...")
            subprocess.run(
                ["uv", "pip", "install", "--python", "3.12", "--target", "dist/${each.key}"] + deps,
                check=True
            )
        else:
            print("No dependencies found in pyproject.toml")
except Exception as e:
    print(f"Error installing dependencies: {e}", file=sys.stderr)
    sys.exit(1)
PYSCRIPT
      
      # Copy handler and src directory
      cp ${each.key}.py dist/${each.key}/
      if [ -d "src" ]; then
        cp -r src dist/${each.key}/
      fi
      
      # Copy .env file if it exists
      if [ -f ".env" ]; then
        cp .env dist/${each.key}/
      fi
      
      cd dist/${each.key}
      zip -rq ../../${each.key}.zip .
      cd ../..
    EOT
  }

  triggers = {
    handler          = each.key
    handler_hash     = filesha1("${local.lambda_dir}/${each.key}.py")
    # Monitor both handler-specific and root pyproject.toml for changes
    # At least one will always exist and trigger rebuilds on any change
    handler_toml     = try(filesha1("${local.lambda_dir}/meta/tomls/${each.key}.pyproject.toml"), filesha1("${local.lambda_dir}/pyproject.toml"))
    root_toml        = filesha1("${local.lambda_dir}/pyproject.toml")
    # Include src directory hash if it exists - hash all files in src
    src_hash         = try(base64encode(jsonencode({ for f in fileset("${local.lambda_dir}/src", "**") : f => filesha1("${local.lambda_dir}/src/${f}") })), "no-src")
    # Monitor .env file for changes
    env_hash         = try(filesha1("${local.lambda_dir}/.env"), "no-env")
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

  depends_on = [null_resource.build_lambdas]
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
    variables = merge(
      local.env_vars,
      {
        ENV          = var.env
        PROJECT_NAME = var.project_name
      }
    )
  }

  depends_on = [
    null_resource.build_lambdas,
    aws_iam_role.lambda_exec
  ]
}

# --- Cleanup Build Artifacts After Deployment ---
resource "null_resource" "cleanup_build" {
  for_each = toset(local.routed_handlers)

  provisioner "local-exec" {
    working_dir = local.lambda_dir
    command = <<EOT
      echo "🧹 Cleaning up build artifacts for ${each.key}..."
      rm -rf dist/${each.key}
    EOT
  }

  depends_on = [aws_lambda_function.lambda]
}

# --- Final cleanup of dist directory ---
resource "null_resource" "cleanup_dist_dir" {
  provisioner "local-exec" {
    working_dir = local.lambda_dir
    interpreter = ["/bin/bash", "-c"]
    command = <<EOT
      echo "🧹 Cleaning up dist directory..."
      if [ -d "dist" ]; then
        rm -rf dist
        echo "✅ dist directory removed"
      else
        echo "✅ dist directory already cleaned"
      fi
    EOT
  }

  depends_on = [null_resource.cleanup_build]

  triggers = {
    handler_count = length(local.routed_handlers)
  }
}