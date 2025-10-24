output "dynamodb_table_names" {
  value = [for t in aws_dynamodb_table.tables : t.name]
}