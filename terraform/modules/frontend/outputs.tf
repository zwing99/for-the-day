output "hosted_zone_id" {
  value = data.aws_route53_zone.beta.zone_id
}
output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.beta.domain_name
}
output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.beta.id
}
output "static_bucket" {
  value = aws_s3_bucket.static.bucket
}
output "name_servers" {
  value = data.aws_route53_zone.beta.name_servers
}
