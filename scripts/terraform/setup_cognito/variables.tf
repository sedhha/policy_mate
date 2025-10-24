variable "project_name" {
  description = "Project name"
  type        = string
}

variable "env" {
  description = "Environment name"
  type        = string
}


locals {
  cognito_pool_name = "${var.project_name}-${var.env}-user-pool"
}