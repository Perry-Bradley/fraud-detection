variable "do_token" {
  description = "DigitalOcean API token. Set via TF_VAR_do_token env var, never commit it."
  type        = string
  sensitive   = true
}

variable "environment" {
  description = "Logical environment name."
  type        = string
  default     = "dev"
}

variable "region" {
  description = "DigitalOcean region slug (e.g. fra1, ams3, nyc1, lon1)."
  type        = string
  default     = "fra1"
}

variable "cluster_name" {
  description = "Name of the DOKS (managed Kubernetes) cluster."
  type        = string
  default     = "sms-cluster"
}

variable "k8s_version" {
  description = "DOKS Kubernetes version slug. Run `doctl kubernetes options versions` to list."
  type        = string
  default     = "1.30.1-do.0"
}

variable "node_size" {
  description = "Droplet size slug for worker nodes."
  type        = string
  default     = "s-2vcpu-4gb"
}

variable "node_count" {
  description = "Number of worker nodes in the default pool."
  type        = number
  default     = 2
}

variable "namespace" {
  description = "Kubernetes namespace the SMS app is deployed into."
  type        = string
  default     = "sms"
}

variable "db_node_size" {
  description = "Managed Postgres node size slug."
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "install_argocd" {
  description = "Install Argo CD (GitOps continuous delivery) via Helm."
  type        = bool
  default     = true
}

variable "install_vault" {
  description = "Install HashiCorp Vault via Helm."
  type        = bool
  default     = true
}

variable "install_loki" {
  description = "Install the Loki + Promtail logging stack via Helm."
  type        = bool
  default     = true
}
