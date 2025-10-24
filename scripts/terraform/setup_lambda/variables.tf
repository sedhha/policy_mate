variable "env" {
  description = "Deployment environment (e.g., dev, prod)"
  type        = string
}

variable "project_name" {
  description = "Project base name"
  type        = string
}

variable "lambda_handlers" {
  description = "List of Python Lambda handler filenames (without .py extension)"
  type        = list(string)
}
