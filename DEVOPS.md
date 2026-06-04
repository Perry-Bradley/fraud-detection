# DevOps Toolchain

This project ships with a complete, industry-standard DevOps toolchain. Below
is what each tool does, where it lives, and how the pieces fit together.

## The tools

| Stage | Tool | Location | Purpose |
|-------|------|----------|---------|
| Source / VCS | **Git + GitHub** | repo | version control |
| CI | **GitHub Actions** | [.github/workflows/ci.yml](.github/workflows/ci.yml) | test backend, ml-service, frontend; build & scan images |
| CD (publish) | **GitHub Actions + GHCR** | [.github/workflows/deploy.yml](.github/workflows/deploy.yml) | build & push images to the registry |
| Dependency updates | **Dependabot** | [.github/dependabot.yml](.github/dependabot.yml) | automated dependency PRs |
| Build / package | **Docker** | `*/Dockerfile` | containerize each service |
| Image scanning | **Trivy** | CI workflow | CVE scan of built images |
| Static analysis | **CodeQL** | [.github/workflows/codeql.yml](.github/workflows/codeql.yml) | SAST |
| Infra as Code | **Terraform** | [terraform/](terraform/) | provision the cloud cluster, DB, registry |
| Config mgmt | **Ansible** | [ansible/](ansible/) | install tooling, deploy the app |
| Orchestration | **Kubernetes** | [k8s/](k8s/) | run the containers |
| Packaging (k8s) | **Helm** | [helm/sms-chart/](helm/sms-chart/) | templated, env-specific deploys |
| GitOps CD | **Argo CD** | [argocd/](argocd/) | auto-sync the cluster to git |
| Secrets | **HashiCorp Vault** | [infra/vault/](infra/vault/) | secret storage & injection |
| Metrics | **Prometheus** | [infra/prometheus/](infra/prometheus/) | scrape & store metrics |
| Dashboards | **Grafana** | [infra/grafana/](infra/grafana/) | visualize metrics + logs |
| Logs | **Loki + Promtail** | [infra/loki/](infra/loki/) | aggregate container logs |

## How it flows

```
  push to GitHub
        │
        ▼
  ┌──────────────┐   tests pass    ┌───────────────────┐
  │ GitHub       │ ───────────────▶│ Build images +    │
  │ Actions (CI) │  Trivy + CodeQL │ push to GHCR/DOCR │
  └──────────────┘                 └─────────┬─────────┘
                                             │ new image tag committed
                                             ▼
                                   ┌───────────────────┐
                                   │ Argo CD (GitOps)  │  watches the repo
                                   │ syncs Helm chart  │
                                   └─────────┬─────────┘
                                             ▼
        Terraform provisioned ──▶  ┌───────────────────┐
        the cluster + DB + addons  │ Kubernetes (DOKS) │
                                   │  backend / ml /   │
                                   │  frontend pods    │
                                   └───┬───────────┬───┘
                          metrics ◀────┘           └────▶ logs
                     Prometheus → Grafana ◀── Loki ◀── Promtail
                                   secrets ◀── Vault
```

## One-time setup (provision the cloud)

> Requires a DigitalOcean account + API token, `terraform`, `doctl`, `kubectl`,
> `helm`. Everything below costs money on DO — destroy with `terraform destroy`
> when you're done.

```bash
# 1. Provision cluster, managed Postgres, registry, and platform add-ons
cd terraform
$env:TF_VAR_do_token = "dop_v1_xxx"     # PowerShell  (bash: export TF_VAR_do_token=...)
terraform init
terraform apply

# 2. Point kubectl at the new cluster (command is printed by terraform output)
doctl kubernetes cluster kubeconfig save sms-cluster

# 3. Deploy the app (installs tooling + registers the Argo CD application)
cd ../ansible
ansible-galaxy collection install -r requirements.yml
ansible-playbook site.yml
```

After this, **every push to `main` redeploys automatically** via Argo CD — no
manual steps.

## Local development (no cloud)

The full observability stack also runs locally with Docker Compose:

```bash
make up        # starts app + Postgres + Redis + Prometheus + Grafana + Loki + Promtail
```

- App: http://localhost:3000
- Grafana (metrics **and** logs): http://localhost:3001
- Prometheus: http://localhost:9090

## Tear down the cloud

```bash
cd terraform && terraform destroy
```
