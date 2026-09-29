variable "aws_region" {
  type        = string
  description = "Region for beta application resources."
  default     = "us-east-1"
}
variable "zone_name" {
  type        = string
  description = "Public delegated beta zone managed by the DNS module in this root."
  default     = "fortheday.beckyandzac.com"
}
variable "lambda_zip_path" {
  type        = string
  description = "Path to the matched Node Lambda ZIP, relative to terraform/."
  default     = "../dist/lambda.zip"
}
variable "api_bible_key" {
  type      = string
  sensitive = true
}
variable "api_bible_csb_id" {
  type      = string
  sensitive = true
}
variable "api_bible_niv_id" {
  type      = string
  sensitive = true
}
variable "api_bible_nlt_id" {
  type      = string
  sensitive = true
}
variable "crossway_key" {
  type      = string
  sensitive = true
}

module "app" {
  source = "./modules/app"

  aws_region       = var.aws_region
  zone_name        = var.zone_name
  lambda_zip_path  = abspath("${path.root}/${var.lambda_zip_path}")
  api_bible_key    = var.api_bible_key
  api_bible_csb_id = var.api_bible_csb_id
  api_bible_niv_id = var.api_bible_niv_id
  api_bible_nlt_id = var.api_bible_nlt_id
  crossway_key     = var.crossway_key
}

module "dns" {
  source = "./modules/dns"

  zone_name = var.zone_name
}
