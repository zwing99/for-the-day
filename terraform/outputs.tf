output "hosted_zone_id" {
  description = "Delegated hosted zone used by the beta application."
  value       = module.app.hosted_zone_id
}
output "cloudfront_domain_name" {
  description = "CloudFront distribution hostname."
  value       = module.app.cloudfront_domain_name
}
output "cloudfront_distribution_id" {
  description = "Distribution ID used for entry document invalidations."
  value       = module.app.cloudfront_distribution_id
}
output "api_gateway_endpoint" {
  description = "Direct API Gateway endpoint behind the same public API."
  value       = module.app.api_gateway_endpoint
}
output "static_bucket" {
  description = "Private bucket that stores versioned frontend files."
  value       = module.app.static_bucket
}
output "lambda_function_name" {
  description = "Beta API Lambda function name."
  value       = module.app.lambda_function_name
}
output "name_servers" {
  description = "Nameservers for the delegated beta hosted zone."
  value       = module.app.name_servers
}
