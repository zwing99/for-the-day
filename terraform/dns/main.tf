module "dns" {
  source = "../modules/dns"

  zone_name = var.zone_name
}
