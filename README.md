# School Fees Payment & Financial Management System (SMS418)

Centralized digital platform that replaces manual fee tracking in Cameroonian schools.
Records payments, generates digital receipts, exposes real-time balances, and uses an
**Isolation Forest** ML model to flag anomalous transactions.

By **Sepo Perry-Bradley Dinga - CT23A145** (CEC418).

---

## Architecture

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
        Nginx ◄──── │  Frontend    │  React (Vite) on Nginx
                    │  port 3000   │
                    └──────┬───────┘
                           │ /api/*
                    ┌──────▼───────┐         ┌──────────────┐
                    │   Backend    │ ◄────►  │  Postgres    │
                    │ Django + DRF │         │   port 5432  │
                    │  port 5000   │         └──────────────┘
                    │              │ ◄────►  ┌──────────────┐
                    │              │         │   Redis      │
                    └──────┬───────┘         └──────────────┘
                           │ /detect-anomaly
                    ┌──────▼───────┐
                    │  ML Service  │  FastAPI + scikit-learn
                    │  port 8000   │
                    └──────────────┘

Observability: Prometheus (9090) → Grafana (3001)
DB GUI: pgAdmin (5050)
```

## Tech stack

| Layer        | Technology |
|--------------|------------|
| Frontend     | React 18 + Vite + Recharts |
| Backend      | Django 5 + Django REST Framework + SimpleJWT |
| ML Service   | FastAPI + scikit-learn (Isolation Forest) + Pandas |
| Database     | PostgreSQL 15 |
| Cache        | Redis 7 |
| Receipts     | ReportLab (PDF) |
| API Docs     | drf-spectacular (Swagger / Redoc) |
| Monitoring   | Prometheus + Grafana + django-prometheus + prometheus-fastapi-instrumentator |
| Reverse proxy| Nginx (frontend container) |
| Container    | Docker (multi-stage) + Docker Compose |
| Orchestration| Kubernetes manifests + Helm chart |
| CI/CD        | GitHub Actions, GHCR, Trivy, CodeQL, Dependabot |

## DevOps tooling included

- **Docker Compose** for one-command local stack
- **Multi-stage Dockerfiles** with non-root users
- **Healthchecks** on every service
- **Django + FastAPI Prometheus exporters**
- **Grafana provisioning** (datasource + dashboard auto-loaded)
- **GitHub Actions CI**: tests for backend / ml / frontend, Docker build, Trivy SARIF
- **GitHub Actions CD**: pushes images to GHCR tagged with commit SHA
- **CodeQL** static analysis (Python + JS)
- **Dependabot** for pip / npm / Docker / Actions
- **CODEOWNERS** for review routing
- **Trivy** image vuln scanning, results uploaded to GitHub Security tab
- **Kubernetes manifests** with HPA, NetworkPolicy, StatefulSet for Postgres
- **Helm chart** with per-environment values (`values.dev.yaml`, `values.yaml`)
- **Ingress** + cert-manager hooks for Let's Encrypt TLS
- **Makefile** for common operations
- **`.dockerignore`** files for fast builds

## Quick start

1. Copy env file:
   ```bash
   cp .env.example .env
   ```

2. Bring up the full stack:
   ```bash
   make up
   # or:  docker compose --env-file .env up -d --build
   ```

3. Open the apps:

   | URL | What |
   |-----|------|
   | http://localhost:3000          | Frontend (auto-routes by role) |
   | http://localhost:5000/admin/   | Django admin |
   | http://localhost:5000/api/docs/| Swagger API docs |
   | http://localhost:8000/docs     | ML service docs |
   | http://localhost:5050          | pgAdmin |
   | http://localhost:9090          | Prometheus |
   | http://localhost:3001          | Grafana (admin / admin) |

   The frontend has **two portals** behind one login screen:

   | Role            | Username           | Password           | Lands on        |
   |-----------------|--------------------|--------------------|-----------------|
   | Admin / Bursary | `admin`            | `admin`            | `/staff` dashboard |
   | Student         | matricule (e.g. `CT24A101`) | matricule (same) | `/portal` |

   Demo data + student User accounts are seeded automatically on first start.
   Students should change their password on first login under *Settings*.

## Common tasks

```bash
make logs          # tail logs
make test          # run backend + ML tests in containers
make migrate       # run Django migrations
make seed          # reseed demo data (idempotent)
make psql          # open psql shell
make backend-shell # bash inside the backend container
make clean         # tear down everything (including volumes)
```

## API surface

```
POST   /api/auth/login/                  -> { access, refresh }
POST   /api/auth/refresh/                -> { access }

GET    /api/users/me/                    -> current user profile
GET    /api/users/                       -> admin only

GET    /api/students/                    list / search students
POST   /api/students/                    admin only
GET    /api/students/{id}/balance/       real-time balance
GET    /api/students/{id}/payments/      payment history

GET    /api/fee-structures/              list classes / terms / amounts
POST   /api/fee-structures/              admin only

GET    /api/payments/                    list / filter / search
POST   /api/payments/                    record payment (auto receipt + ML scoring)
GET    /api/payments/{id}/receipt/       PDF receipt download
GET    /api/payments/anomalies/          flagged payments

GET    /api/audit-logs/                  admin only
GET    /api/reports/summary/             totals / outstanding / anomaly count
GET    /api/reports/payment-trends/      monthly aggregates
GET    /api/reports/class-breakdown/     totals by class

# Student portal (role=student only)
GET    /api/portal/me/                   own profile
GET    /api/portal/balance/              own balance + outstanding
GET    /api/portal/payments/             own payment history
GET    /api/portal/payments/{id}/receipt/  own PDF receipt
POST   /api/portal/change-password/      change own password

# Online payment (Campay)
POST   /api/portal/pay/                  initiate mobile-money charge
GET    /api/portal/intents/              list own intents
GET    /api/portal/intents/{id}/         poll status of one intent
POST   /api/webhooks/campay/             public webhook (HMAC-verified)
GET    /api/payment-intents/             admin/bursary list
POST   /api/payment-intents/{id}/simulate/  admin: drive callback for demos
```

## Online payments (Campay)

Students can pay from `/portal/pay` using MTN MoMo or Orange Money. Flow:

1. Student enters amount + phone → `POST /api/portal/pay/`
2. Backend creates a `PaymentIntent` (status=pending), calls Campay's `/collect`
3. Campay sends a USSD prompt to the student's phone
4. On approve/reject → Campay calls our public webhook
5. Webhook verifies HMAC, looks up the intent, promotes successful ones to a real `Payment` row (which then runs the **same anomaly detection** as in-person payments)

**Get sandbox credentials**: register at https://www.campay.net (free). Set:
```
CAMPAY_BASE_URL=https://demo.campay.net/api
CAMPAY_API_KEY=your-token
CAMPAY_WEBHOOK_SECRET=your-shared-secret
```

**Demo mode (no Campay account)**: leave `CAMPAY_API_KEY` empty. The system runs in **stub mode**: payments still create intents but no real charge happens. Drive the flow manually as admin:

```bash
# Get a JWT
curl -X POST http://localhost:5000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# List pending intents
curl http://localhost:5000/api/payment-intents/?status=pending \
  -H "Authorization: Bearer <ACCESS>"

# Simulate webhook success
curl -X POST http://localhost:5000/api/payment-intents/<INTENT_ID>/simulate/ \
  -H "Authorization: Bearer <ACCESS>" \
  -H "Content-Type: application/json" \
  -d '{"outcome":"success"}'
```

The simulated payment runs through the anomaly detector exactly like a real one.

**Webhook URL for Campay dashboard**: `https://your-domain.com/api/webhooks/campay/`
For local dev, expose via `ngrok http 5000` or use stub mode.

ML Service:
```
POST /detect-anomaly                     { is_anomalous, score, reason }
POST /analytics/forecast                 naive next-period forecast
GET  /metrics                            Prometheus metrics
GET  /health                             liveness probe
```

## Kubernetes

Deploy raw manifests:
```bash
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/secrets.example.yml   # update first!
kubectl apply -f k8s/
```

Or with Helm:
```bash
helm upgrade --install sms ./helm/sms-chart \
  -f ./helm/sms-chart/values.dev.yaml \
  -n sms --create-namespace
```

## Mapping to CEC418 concepts

| CEC418 Topic                | Where it appears |
|-----------------------------|------------------|
| Minimising complexity       | Microservices: backend, ML, frontend separated |
| Constructing for verification | Unit tests, audit log table, ML anomaly scoring |
| Anticipating change         | Helm `values.*.yaml` per env; image tags |
| Software maintenance        | CI re-runs full test suite on every PR |
| Reuse                       | Helm chart, shared permission classes |
| Standards in construction   | OpenAPI schema, drf-spectacular, conventional config |
| Verification vs validation  | Tests verify; PDF receipts + admin demos validate |
| Debugging                   | Structured JSON logging + Prometheus metrics |

## Security notes

- Default credentials are for demo only. Rotate `DJANGO_SECRET_KEY`, `JWT_SECRET`, `DB_PASSWORD` in production.
- The ML service has no authentication (internal-only). In K8s it is reachable only inside the cluster.
- The Django container runs as a non-root user.
- A `NetworkPolicy` (k8s/network-policy.yml) restricts Postgres access to the backend pods.
- CI uploads Trivy SARIF and CodeQL results to the GitHub Security tab.

## Layout

```
SMS418/
├── docker-compose.yml
├── Makefile
├── .env.example
├── backend/                 Django 5 + DRF
│   ├── apps/
│   │   ├── accounts/        custom user, JWT, RBAC
│   │   ├── students/        students + management/seed_demo
│   │   ├── fees/            fee structures
│   │   ├── payments/        payments, receipts, ML bridge
│   │   ├── audit/           audit log + middleware
│   │   └── analytics/       reports / summaries
│   ├── sms_project/         settings, urls, wsgi/asgi
│   ├── Dockerfile, entrypoint.sh, requirements.txt
├── frontend/                React (Vite) on Nginx
├── ml-service/              FastAPI + scikit-learn
├── infra/
│   ├── prometheus/
│   └── grafana/provisioning/
├── k8s/                     raw manifests
├── helm/sms-chart/          Helm chart + per-env values
└── .github/
    ├── workflows/ci.yml
    ├── workflows/codeql.yml
    ├── workflows/deploy.yml
    ├── dependabot.yml
    └── CODEOWNERS
```
