variable "aws_region" {
  type        = string
  description = "Region used for the beta runtime resources."
  default     = "us-east-1"
}

variable "aws_account_id" {
  type        = string
  description = "AWS account that owns the externally managed deployment role."
  default     = "716853106749"
}

variable "gitlab_project_id" {
  type        = string
  description = "Stable GitLab numeric project ID."
  default     = "87006951"
}

variable "gitlab_namespace_id" {
  type        = string
  description = "Stable GitLab numeric namespace ID."
  default     = "445508"
}

variable "gitlab_project_path" {
  type        = string
  description = "GitLab path allowed to assume the role."
  default     = "zwing99/for-the-day"
}
