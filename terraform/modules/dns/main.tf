resource "aws_route53_zone" "beta" {
  name    = var.zone_name
  comment = "Dedicated public beta zone for for-the-day."

  lifecycle {
    prevent_destroy = true
  }
}
