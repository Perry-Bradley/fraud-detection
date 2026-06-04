# Policy granting the backend read access to its own secrets.
# Apply: vault policy write sms-backend infra/vault/vault-policy.hcl

path "secret/data/sms/backend" {
  capabilities = ["read"]
}

path "secret/data/sms/database" {
  capabilities = ["read"]
}
