output "gitlab_oidc_trust_policy" {
  description = "Trust document for the externally managed GitLab deployment role."
  value       = module.deployment_policy.gitlab_oidc_trust_policy
}

output "deployment_permissions_policy" {
  description = "Scoped beta deployment permissions for the external OIDC role."
  value       = module.deployment_policy.deployment_permissions_policy
}
