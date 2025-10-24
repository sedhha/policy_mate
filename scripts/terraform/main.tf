terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.5.0"
}

provider "aws" {
}

module "setup_cognito" {
  source            = "./setup_cognito"
  env               = var.env
  project_name      = var.project_name
}

module "setup_dynamo_db" {
  source            = "./setup_dynamo_db"
  env               = var.env
  project_name      = var.project_name
}

module "setup_s3" {
  source       = "./setup_s3"
  project_name = var.project_name
  env          = var.env
}


module "setup_lambda" {
  source       = "./setup_lambda"
  env          = var.env
  project_name = var.project_name
  # list only the handlers you want packaged and deployed
  lambda_handlers = var.lambda_handlers
  
}

module "setup_api_gateway" {
  depends_on = [module.setup_lambda]
  source                  = "./setup_api_gateway"
  env                     = var.env
  project_name            = var.project_name
  lambda_function_arns    = module.setup_lambda.lambda_function_arns
  allowed_origins         = ["http://localhost:3000", "https://your-vercel-app.vercel.app"]
  
}

output "api_gateway_urls" {
  value = module.setup_api_gateway.api_gateway_invoke_urls
}


