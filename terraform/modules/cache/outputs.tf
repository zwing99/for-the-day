output "table_name" {
  value = aws_dynamodb_table.chapters.name
}

output "table_arn" {
  value = aws_dynamodb_table.chapters.arn
}
