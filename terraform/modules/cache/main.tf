resource "aws_dynamodb_table" "chapters" {
  name         = "for-the-day-beta-chapters"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"

  attribute {
    name = "pk"
    type = "S"
  }

  ttl {
    attribute_name = "expiresEpochSeconds"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }
  point_in_time_recovery {
    enabled = true
  }

  lifecycle {
    prevent_destroy = true
  }
}
