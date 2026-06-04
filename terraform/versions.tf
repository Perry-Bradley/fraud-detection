terraform {
  required_version = ">= 1.5.0"

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  # Remote state in a DigitalOcean Spaces bucket (S3-compatible).
  # Create the Space once, then uncomment and fill in. Until then,
  # state is kept locally in terraform.tfstate.
  # backend "s3" {
  #   endpoints                   = { s3 = "https://fra1.digitaloceanspaces.com" }
  #   bucket                      = "sms-terraform-state"
  #   key                         = "sms/terraform.tfstate"
  #   region                      = "us-east-1" # ignored by Spaces but required
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  #   skip_s3_checksum            = true
  # }
}

provider "digitalocean" {
  token = var.do_token
}

# Authenticate the k8s + helm providers against the cluster Terraform creates.
provider "kubernetes" {
  host  = digitalocean_kubernetes_cluster.sms.endpoint
  token = digitalocean_kubernetes_cluster.sms.kube_config[0].token
  cluster_ca_certificate = base64decode(
    digitalocean_kubernetes_cluster.sms.kube_config[0].cluster_ca_certificate
  )
}

provider "helm" {
  kubernetes {
    host  = digitalocean_kubernetes_cluster.sms.endpoint
    token = digitalocean_kubernetes_cluster.sms.kube_config[0].token
    cluster_ca_certificate = base64decode(
      digitalocean_kubernetes_cluster.sms.kube_config[0].cluster_ca_certificate
    )
  }
}
