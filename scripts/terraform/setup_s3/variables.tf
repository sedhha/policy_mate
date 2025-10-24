variable "project_name" {
  description = "The name of the project and S3 bucket"
  type        = string
}

variable "env" {
  description = "Deployment environment (e.g., dev, prod)"
  type        = string
}
