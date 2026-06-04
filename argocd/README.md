# Argo CD — GitOps Continuous Delivery

Argo CD watches this Git repo and keeps the cluster in sync with the Helm chart
at [`helm/sms-chart`](../helm/sms-chart). Push to `main` → Argo CD deploys it.
No `kubectl apply` or `helm upgrade` by hand.

## Install (done automatically by Terraform `helm_release.argocd`)

If installing manually instead:

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd -n argocd --create-namespace
```

## Register this application

```bash
kubectl apply -f argocd/project.yml
kubectl apply -f argocd/application.yml
```

## Open the UI

```bash
# initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d; echo

kubectl -n argocd port-forward svc/argocd-server 8080:443
# browse https://localhost:8080  (user: admin)
```

## How sync works

`syncPolicy.automated` is on with `prune` + `selfHeal`:

- **prune** — anything deleted from git is deleted from the cluster.
- **selfHeal** — manual `kubectl edit` drift is reverted to match git.

So the repository is the single source of truth for what runs in production.
