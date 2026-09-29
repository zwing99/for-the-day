variable "aws_region" {
  type        = string
  description = "Region for beta application resources."
  default     = "us-east-1"
}
variable "zone_name" {
  type        = string
  description = "Delegated beta zone created by terraform/dns."
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

// First deployment: create the dedicated hosted zone, then add its name
// servers to the parent zone. Uncomment module "app" after delegation resolves.
// module "app" {
//   source = "./modules/app"
//
//   aws_region       = var.aws_region
//   zone_name        = var.zone_name
//   lambda_zip_path  = abspath("${path.root}/${var.lambda_zip_path}")
//   api_bible_key    = var.api_bible_key
//   api_bible_csb_id = var.api_bible_csb_id
//   api_bible_niv_id = var.api_bible_niv_id
//   api_bible_nlt_id = var.api_bible_nlt_id
//   crossway_key     = var.crossway_key
// }

module "dns" {
  source = "./modules/dns"

  zone_name = var.zone_name
}
