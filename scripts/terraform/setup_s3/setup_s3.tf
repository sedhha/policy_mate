resource "random_id" "suffix" {
  byte_length = 2
}

resource "aws_s3_bucket" "project_bucket" {
  bucket = lower("${var.project_name}-${var.env}-${random_id.suffix.hex}")
  force_destroy = false

  tags = {
    Name        = var.project_name
    Environment = var.env
  }
}

resource "aws_s3_bucket_versioning" "project_bucket_versioning" {
  bucket = aws_s3_bucket.project_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "project_bucket_encryption" {
  bucket = aws_s3_bucket.project_bucket.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
