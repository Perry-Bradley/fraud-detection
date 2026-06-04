# ---------------------------------------------------------------------------
# Managed Kubernetes cluster (DOKS)
# ---------------------------------------------------------------------------
resource "digitalocean_kubernetes_cluster" "sms" {
  name    = var.cluster_name
  region  = var.region
  version = var.k8s_version

  node_pool {
    name       = "${var.cluster_name}-default"
    size       = var.node_size
    node_count = var.node_count
    auto_scale = true
    min_nodes  = var.node_count
    max_nodes  = var.node_count + 2
    tags       = ["sms", var.environment]
  }

  tags = ["sms", var.environment]
}

# ---------------------------------------------------------------------------
# Managed Postgres database (replaces the in-cluster postgres for production)
# ---------------------------------------------------------------------------
resource "digitalocean_database_cluster" "postgres" {
  name       = "sms-postgres"
  engine     = "pg"
  version    = "15"
  size       = var.db_node_size
  region     = var.region
  node_count = 1
  tags       = ["sms", var.environment]
}

resource "digitalocean_database_db" "school_fees" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "school_fees"
}

resource "digitalocean_database_user" "app" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "sms_user"
}

# Only allow the k8s cluster nodes to reach the database.
resource "digitalocean_database_firewall" "postgres_fw" {
  cluster_id = digitalocean_database_cluster.postgres.id

  rule {
    type  = "k8s"
    value = digitalocean_kubernetes_cluster.sms.id
  }
}

# ---------------------------------------------------------------------------
# Private container registry for the app images
# ---------------------------------------------------------------------------
resource "digitalocean_container_registry" "sms" {
  name                   = "sms-registry"
  subscription_tier_slug = "basic"
  region                 = var.region
}

# ---------------------------------------------------------------------------
# Application namespace
# ---------------------------------------------------------------------------
resource "kubernetes_namespace" "sms" {
  metadata {
    name = var.namespace
  }
  depends_on = [digitalocean_kubernetes_cluster.sms]
}

# ---------------------------------------------------------------------------
# Platform add-ons installed via Helm (toggle each with a variable)
# ---------------------------------------------------------------------------

# Ingress controller so the app is reachable from the internet.
resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true
  depends_on       = [digitalocean_kubernetes_cluster.sms]
}

# Argo CD — GitOps continuous delivery.
resource "helm_release" "argocd" {
  count            = var.install_argocd ? 1 : 0
  name             = "argocd"
  repository       = "https://argoproj.github.io/argo-helm"
  chart            = "argo-cd"
  namespace        = "argocd"
  create_namespace = true
  depends_on       = [digitalocean_kubernetes_cluster.sms]
}

# HashiCorp Vault — secrets management.
resource "helm_release" "vault" {
  count            = var.install_vault ? 1 : 0
  name             = "vault"
  repository       = "https://helm.releases.hashicorp.com"
  chart            = "vault"
  namespace        = "vault"
  create_namespace = true

  # Dev/standalone mode keeps this affordable for a student cluster.
  set {
    name  = "server.dev.enabled"
    value = "true"
  }
  depends_on = [digitalocean_kubernetes_cluster.sms]
}

# Loki + Promtail — log aggregation, queried from Grafana.
resource "helm_release" "loki" {
  count            = var.install_loki ? 1 : 0
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki-stack"
  namespace        = "logging"
  create_namespace = true

  set {
    name  = "promtail.enabled"
    value = "true"
  }
  set {
    name  = "grafana.enabled"
    value = "false" # we already run Grafana
  }
  depends_on = [digitalocean_kubernetes_cluster.sms]
}
