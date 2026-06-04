output "cluster_name" {
  description = "DOKS cluster name."
  value       = digitalocean_kubernetes_cluster.sms.name
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint."
  value       = digitalocean_kubernetes_cluster.sms.endpoint
}

output "kubeconfig_command" {
  description = "Run this to point kubectl at the new cluster."
  value       = "doctl kubernetes cluster kubeconfig save ${digitalocean_kubernetes_cluster.sms.name}"
}

output "registry_endpoint" {
  description = "Container registry endpoint for pushing images."
  value       = digitalocean_container_registry.sms.endpoint
}

output "database_host" {
  description = "Managed Postgres private host."
  value       = digitalocean_database_cluster.postgres.private_host
}

output "database_port" {
  value = digitalocean_database_cluster.postgres.port
}

output "database_user" {
  value = digitalocean_database_user.app.name
}

output "database_password" {
  description = "Managed Postgres password for the app user."
  value       = digitalocean_database_user.app.password
  sensitive   = true
}

output "database_uri" {
  description = "Full Postgres connection URI (sensitive)."
  value       = digitalocean_database_cluster.postgres.private_uri
  sensitive   = true
}
