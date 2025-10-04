resource "null_resource" "install_dependencies" {
  triggers = {
    requirements = filemd5("${path.module}/../lambdas/pyproject.toml")
    handler      = filemd5("${path.module}/../lambdas/handler.py")
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

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

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

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

resource "aws_lambda_function" "main" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-function"
  role            = aws_iam_role.lambda_role.arn
  handler         = "handler.lambda_handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.12"
  timeout         = 30
}
