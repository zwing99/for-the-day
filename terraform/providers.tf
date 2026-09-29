terraform {
  required_version = "= 1.16.4"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.91.0"
    }
  }

  backend "http" {}
}

provider "aws" {
  region = var.aws_region
}
