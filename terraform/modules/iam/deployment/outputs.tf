output "gitlab_oidc_trust_policy" {
  description = "Trust document for the externally managed GitLab deployment role."
  value       = data.aws_iam_policy_document.gitlab_oidc_trust.json
}

output "deployment_permissions_policy" {
  description = "Scoped beta deployment permissions for the external OIDC role."
  value       = data.aws_iam_policy_document.deployment_permissions.json
}
