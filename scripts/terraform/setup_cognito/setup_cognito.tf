resource "aws_cognito_user_pool" "user_pool" {
  name = local.cognito_pool_name
  
  auto_verified_attributes = []

  verification_message_template {
    default_email_option = "CONFIRM_WITH_LINK"
    email_subject        = "Verify your email for access"
    email_message_by_link = "Hello! Please verify your email by clicking the link below:\n{##Verify Email##} to join ${var.project_name}."
  }

  schema {
    name                     = "email"
    attribute_data_type      = "String"
    required                 = true
    mutable                  = false
    string_attribute_constraints {
      min_length = 5
      max_length = 100
    }
  }

  schema {
    name                     = "org"
    attribute_data_type      = "String"
    mutable                  = true
    required                 = false
    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
  }

  tags = {
    Environment = var.env
    Project     = var.project_name
  }
}

resource "aws_cognito_user_pool_client" "app_client" {
  name            = "web-client"
  user_pool_id    = aws_cognito_user_pool.user_pool.id
  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}
