variable "aws_region" {
  type        = string
  description = "Region for the dedicated beta DNS zone."
  default     = "us-east-1"
}

variable "zone_name" {
  type        = string
  description = "Public beta hostname delegated from the parent DNS zone."
  default     = "fortheday.beckyandzac.com"
}
