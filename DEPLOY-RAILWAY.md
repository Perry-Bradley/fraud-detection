# Deploying to Railway

This app is multi-service. On Railway you create **two managed databases** and
**four app services**, all from this one GitHub repo (monorepo — each service
points at a different root directory).

| Railway service | Source | Root dir | Notes |
|---|---|---|---|
| **Postgres** | Railway plugin | — | gives `DATABASE_URL` |
| **Redis** | Railway plugin | — | gives `REDIS_URL` |
| **sms-backend** | this repo (Docker) | `backend` | Django API + admin |
| **sms-ml** | this repo (Docker) | `ml-service` | fraud-detection API |
| **sms-frontend** | this repo (Docker) | `frontend` | React app (nginx) |
| **sms-worker** | this repo (Docker) | `backend` | Celery worker+beat (payment reconciler) |

> The code is already production-ready: services bind to Railway's `$PORT`,
> read `DATABASE_URL`/`REDIS_URL`, and trust the TLS proxy. You only set env vars.

---

## 1. Create the project + databases

1. https://railway.app → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. In the project: **New** → **Database** → **Add PostgreSQL**.
3. **New** → **Database** → **Add Redis**.

## 2. sms-backend (Django API)

The repo import may auto-create one service — rename it **sms-backend** and set
**Settings → Root Directory = `backend`** (Railway finds `backend/Dockerfile`).

**Variables** (use Railway's reference syntax for the DB/Redis ones):

```
DATABASE_URL          = ${{Postgres.DATABASE_URL}}
REDIS_URL             = ${{Redis.REDIS_URL}}
DJANGO_SECRET_KEY     = <click "Generate" / paste a long random string>
JWT_SECRET            = <another long random string>
DJANGO_DEBUG          = False
DJANGO_ALLOWED_HOSTS  = *
CSRF_TRUSTED_ORIGINS  = https://<your-backend-domain>.up.railway.app
ML_SERVICE_URL        = http://${{sms-ml.RAILWAY_PRIVATE_DOMAIN}}:${{sms-ml.PORT}}
CAMPAY_BASE_URL       = https://demo.campay.net
CAMPAY_USERNAME       = <your campay username>
CAMPAY_PASSWORD       = <your campay password>
CAMPAY_WEBHOOK_SECRET = <optional>
DJANGO_SUPERUSER_USERNAME = admin
DJANGO_SUPERUSER_EMAIL    = admin@school.com
DJANGO_SUPERUSER_PASSWORD = <pick a strong one>
```

Then **Settings → Networking → Generate Domain**. Copy that URL — it's your API
base. Update `CSRF_TRUSTED_ORIGINS` above to match it.

> On first deploy the entrypoint auto-runs migrations, creates the superuser and
> seeds demo data. Watch the deploy logs to confirm.

## 3. sms-ml (fraud-detection API)

**New → GitHub Repo → same repo.** Settings → Root Directory = `ml-service`.
No special variables needed. Do **not** generate a public domain (it's reached
privately by the backend via `ML_SERVICE_URL`).

## 4. sms-frontend (React app)

**New → GitHub Repo → same repo.** Settings → Root Directory = `frontend`.

`VITE_API_URL` is baked in at **build** time, so set it as a variable (Railway
passes it as a Docker build arg):

```
VITE_API_URL = https://<your-backend-domain>.up.railway.app/api
```

Then **Generate Domain** — this is the URL you give users.

## 5. sms-worker (Celery — payment reconciler)

**New → GitHub Repo → same repo.** Settings → Root Directory = `backend`.

- **Settings → Deploy → Start Command:**
  `celery -A sms_project worker -B -l info`
  (`-B` runs the beat scheduler inside the worker, so one service does both.)
- **Variables:** the **same** DB/Redis/Campay/secret vars as sms-backend, **plus**:

```
SKIP_BOOTSTRAP = 1
```

`SKIP_BOOTSTRAP=1` stops the worker from re-running migrations/seed — the backend
owns that.

> Railway's free tier bills background services by usage. If you want the
> cheapest possible demo, you can skip sms-worker entirely: once the Campay
> webhook (step 6) is registered, payments confirm in real time without it. The
> worker is the safety net for missed webhooks.

## 6. Point Campay at your webhook

In the **Campay dashboard → webhook settings**, set the webhook URL to:

```
https://<your-backend-domain>.up.railway.app/api/payments/webhooks/campay/
```

Now a real sandbox payment from the student portal confirms automatically.

## 7. Done — verify

- Frontend: `https://<your-frontend-domain>.up.railway.app` → log in `admin` / your password
- API docs: `https://<your-backend-domain>.up.railway.app/api/docs/`
- Make a test payment in the student portal → watch it land.

---

## CI/CD

CI runs on **CircleCI** ([.circleci/config.yml](.circleci/config.yml)) — backend +
ml tests and the frontend build. Two ways to handle deploys:

- **Simplest (recommended):** leave Railway's GitHub integration on — every push
  to `main` auto-deploys all services. CircleCI just gates quality.
- **CircleCI-driven:** the `deploy` job runs `railway up` per service. Add a
  `RAILWAY_TOKEN` project token as a CircleCI env var, and turn Railway's
  auto-deploy off to avoid double-deploys.

## Notes / gotchas

- **Secrets:** never commit real values. `.env` is gitignored; on Railway they
  live in each service's Variables.
- **`DATABASE_URL` wins:** when set, it overrides the individual `DB_*` vars
  (see [settings.py](backend/sms_project/settings.py)).
- **Monitoring (Prometheus/Grafana/Loki)** from docker-compose is **not** part of
  the Railway deploy — it's for local/VPS. Railway has its own metrics tab.
- **Free Postgres** on some plans expires; export data or upgrade for anything
  long-lived.
