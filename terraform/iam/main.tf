module "deployment_policy" {
  source = "../modules/iam/deployment"

  aws_region          = var.aws_region
  aws_account_id      = var.aws_account_id
  gitlab_project_id   = var.gitlab_project_id
  gitlab_namespace_id = var.gitlab_namespace_id
  gitlab_project_path = var.gitlab_project_path
}
