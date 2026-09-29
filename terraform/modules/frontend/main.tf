data "aws_caller_identity" "current" {}
data "aws_route53_zone" "beta" {
  name         = "${var.zone_name}."
  private_zone = false
}

resource "aws_s3_bucket" "static" {
  bucket = "for-the-day-beta-static-${data.aws_caller_identity.current.account_id}"
  lifecycle {
    prevent_destroy = true
  }
}
resource "aws_s3_bucket_ownership_controls" "static" {
  bucket = aws_s3_bucket.static.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}
resource "aws_s3_bucket_versioning" "static" {
  bucket = aws_s3_bucket.static.id
  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "static" {
  bucket = aws_s3_bucket.static.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
resource "aws_s3_bucket_public_access_block" "static" {
  bucket                  = aws_s3_bucket.static.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_cloudfront_origin_access_control" "static" {
  name                              = "for-the-day-beta-static"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "static_read" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.static.arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.beta.arn]
    }
  }
}
resource "aws_s3_bucket_policy" "static_read" {
  bucket = aws_s3_bucket.static.id
  policy = data.aws_iam_policy_document.static_read.json
}

resource "aws_cloudfront_function" "spa" {
  name    = "for-the-day-beta-spa-routes"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/spa-rewrite.js")
}

resource "aws_acm_certificate" "beta" {
  domain_name       = var.zone_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}
resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for dvo in aws_acm_certificate.beta.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
  zone_id = data.aws_route53_zone.beta.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}
resource "aws_acm_certificate_validation" "beta" {
  certificate_arn         = aws_acm_certificate.beta.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}

resource "aws_cloudfront_cache_policy" "static" {
  name        = "for-the-day-beta-static"
  min_ttl     = 0
  default_ttl = 300
  max_ttl     = 31536000
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}
resource "aws_cloudfront_cache_policy" "api_disabled" {
  name        = "for-the-day-beta-api-disabled"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}
resource "aws_cloudfront_origin_request_policy" "api" {
  name = "for-the-day-beta-api-query-forwarding"
  cookies_config {
    cookie_behavior = "none"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Accept", "Content-Type", "Origin"]
    }
  }
  query_strings_config {
    query_string_behavior = "all"
  }
}

resource "aws_cloudfront_distribution" "beta" {
  enabled         = true
  is_ipv6_enabled = true
  aliases         = [var.zone_name]
  price_class     = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.static.bucket_regional_domain_name
    origin_id                = "static-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.static.id
  }
  origin {
    domain_name = var.api_origin_domain
    origin_id   = "chapter-api"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  default_cache_behavior {
    target_origin_id       = "static-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.static.id
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa.arn
    }
  }
  ordered_cache_behavior {
    path_pattern             = "/api"
    target_origin_id         = "chapter-api"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = aws_cloudfront_cache_policy.api_disabled.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
  }
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = "chapter-api"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = aws_cloudfront_cache_policy.api_disabled.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api.id
  }
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.beta.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
resource "aws_route53_record" "alias_a" {
  zone_id = data.aws_route53_zone.beta.zone_id
  name    = var.zone_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.beta.domain_name
    zone_id                = aws_cloudfront_distribution.beta.hosted_zone_id
    evaluate_target_health = false
  }
}
resource "aws_route53_record" "alias_aaaa" {
  zone_id = data.aws_route53_zone.beta.zone_id
  name    = var.zone_name
  type    = "AAAA"
  alias {
    name                   = aws_cloudfront_distribution.beta.domain_name
    zone_id                = aws_cloudfront_distribution.beta.hosted_zone_id
    evaluate_target_health = false
  }
}
