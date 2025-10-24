variable "env" {
  type        = string
  description = "Deployment environment (e.g., dev, prod)"
}

variable "project_name" {
  type        = string
  description = "Base project name"
}

variable "api_prefix" {
  type        = string
  description = "Path prefix for all endpoints (e.g., api)"
  default     = "api"
}

variable "allowed_origins" {
  type        = list(string)
  default     = ["http://localhost:3000", "https://your-vercel-app.vercel.app"]
}

variable "lambda_function_arns" {
  type        = map(string)
  description = "Map of Lambda function names → ARNs"
}