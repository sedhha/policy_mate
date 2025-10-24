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

