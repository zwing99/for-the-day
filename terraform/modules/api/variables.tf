variable "table_name" {
  type = string
}
variable "table_arn" {
  type = string
}
variable "lambda_zip_path" {
  type = string
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

variable "lambda_role_arn" {
  type = string
}
