#!/usr/bin/env bash
# Bootstrap Vault for the SMS backend: enable KV, write secrets, wire k8s auth,
# and create a role the backend service account can use to pull secrets.
#
# Run this once after `helm install vault`. Requires a shell into the vault pod:
#   kubectl exec -it vault-0 -n vault -- sh
# then paste/run the commands below (VAULT_TOKEN already set in dev mode).
set -euo pipefail

NS="${NS:-sms}"
SA="${SA:-sms-backend}"

# 1. Enable the KV v2 secrets engine
vault secrets enable -path=secret kv-v2 || true

# 2. Store the app secrets (replace the placeholder values)
vault kv put secret/sms/database \
  DB_USER="sms_user" \
  DB_PASSWORD="REPLACE_ME" \
  DB_NAME="school_fees"

vault kv put secret/sms/backend \
  DJANGO_SECRET_KEY="REPLACE_ME" \
  JWT_SECRET="REPLACE_ME"

# 3. Apply the read policy
vault policy write sms-backend /vault/userconfig/sms/vault-policy.hcl || \
  echo "policy file not mounted; apply manually with: vault policy write sms-backend -"

# 4. Enable Kubernetes auth and bind the backend service account to the policy
vault auth enable kubernetes || true
vault write auth/kubernetes/config \
  kubernetes_host="https://${KUBERNETES_PORT_443_TCP_ADDR}:443"

vault write auth/kubernetes/role/sms-backend \
  bound_service_account_names="${SA}" \
  bound_service_account_namespaces="${NS}" \
  policies="sms-backend" \
  ttl="1h"

echo "Vault bootstrap complete. Annotate the backend Deployment with:"
echo '  vault.hashicorp.com/agent-inject: "true"'
echo '  vault.hashicorp.com/role: "sms-backend"'
echo '  vault.hashicorp.com/agent-inject-secret-database: "secret/data/sms/database"'
