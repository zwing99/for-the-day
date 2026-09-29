provider "aws" {
  region                      = var.aws_region
  access_key                  = "policy-validation-only"
  secret_key                  = "policy-validation-only"
  skip_credentials_validation = true
  skip_requesting_account_id  = true
  skip_metadata_api_check     = true
}
