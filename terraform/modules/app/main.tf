module "chapter_cache" {
  source = "../cache"
}

module "lambda_iam" {
  source = "../iam/runtime"

  aws_region = var.aws_region
  table_arn  = module.chapter_cache.table_arn
}

module "chapter_api" {
  source = "../api"

  aws_region       = var.aws_region
  table_name       = module.chapter_cache.table_name
  table_arn        = module.chapter_cache.table_arn
  lambda_role_arn  = module.lambda_iam.role_arn
  lambda_zip_path  = var.lambda_zip_path
  api_bible_key    = var.api_bible_key
  api_bible_csb_id = var.api_bible_csb_id
  api_bible_niv_id = var.api_bible_niv_id
  api_bible_nlt_id = var.api_bible_nlt_id
  crossway_key     = var.crossway_key
}

module "frontend" {
  source = "../frontend"

  zone_name         = var.zone_name
  api_origin_domain = module.chapter_api.api_origin_domain
}
