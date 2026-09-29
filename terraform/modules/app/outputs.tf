output "hosted_zone_id" { value = module.frontend.hosted_zone_id }
output "name_servers" { value = module.frontend.name_servers }
output "cloudfront_domain_name" { value = module.frontend.cloudfront_domain_name }
output "cloudfront_distribution_id" { value = module.frontend.cloudfront_distribution_id }
output "api_gateway_endpoint" { value = module.chapter_api.api_gateway_endpoint }
output "static_bucket" { value = module.frontend.static_bucket }
output "lambda_function_name" { value = module.chapter_api.lambda_function_name }
