locals {
  # Read all JSON table definition files
  table_files = fileset("${path.root}/../../lambdas/meta/dynamo_db_tables", "*.json")

  tables = {
    for f in local.table_files :
    trimsuffix(basename(f), ".json") => jsondecode(
      file("${path.root}/../../lambdas/meta/dynamo_db_tables/${f}")
    )
  }
}


resource "aws_dynamodb_table" "tables" {
  for_each = local.tables

  name         = each.value.name
  billing_mode = each.value.billing_mode
  hash_key     = each.value.hash_key
  range_key = try(each.value.range_key, null)


  dynamic "attribute" {
    for_each = each.value.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  dynamic "global_secondary_index" {
    for_each = lookup(each.value, "global_secondary_indexes", [])
    content {
      name            = global_secondary_index.value.name
      hash_key        = global_secondary_index.value.hash_key
      range_key       = try(global_secondary_index.value.range_key, null)
      projection_type = global_secondary_index.value.projection_type
    }
  }

  tags = {
    Environment = var.env
    Project     = var.project_name
  }
}
