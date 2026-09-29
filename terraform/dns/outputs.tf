output "zone_id" {
  description = "Hosted zone ID consumed by the app Terraform root."
  value       = module.dns.zone_id
}

output "name_servers" {
  description = "Add these four NS records to the beckyandzac.com parent zone."
  value       = module.dns.name_servers
}
