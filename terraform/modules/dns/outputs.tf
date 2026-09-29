output "zone_id" {
  description = "Hosted zone ID consumed by the app Terraform root."
  value       = aws_route53_zone.beta.zone_id
}

output "name_servers" {
  description = "Add these four NS records to the beckyandzac.com parent zone."
  value       = aws_route53_zone.beta.name_servers
}
