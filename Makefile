.PHONY: help up down logs build test backend-shell migrate makemigrations seed psql clean k8s-apply helm-install

help:
	@echo "Targets:"
	@echo "  up               docker-compose up -d --build"
	@echo "  down             docker-compose down"
	@echo "  logs             tail logs of all services"
	@echo "  build            build all images"
	@echo "  test             run all test suites in containers"
	@echo "  backend-shell    open a shell inside the backend container"
	@echo "  migrate          run Django migrations"
	@echo "  makemigrations   create new Django migrations"
	@echo "  seed             reseed demo data"
	@echo "  psql             open psql against the postgres container"
	@echo "  clean            remove volumes & all containers"
	@echo "  k8s-apply        kubectl apply -f k8s/"
	@echo "  helm-install     helm upgrade --install on the dev values"

up:
	docker compose --env-file .env up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail 200

build:
	docker compose build

test:
	docker compose run --rm backend python manage.py test
	docker compose run --rm ml-service pytest -q

backend-shell:
	docker compose exec backend bash

migrate:
	docker compose exec backend python manage.py migrate

makemigrations:
	docker compose exec backend python manage.py makemigrations

seed:
	docker compose exec backend python manage.py seed_demo

psql:
	docker compose exec postgres psql -U $${DB_USER:-sms_user} -d $${DB_NAME:-school_fees}

clean:
	docker compose down -v --remove-orphans

k8s-apply:
	kubectl apply -f k8s/namespace.yml
	kubectl apply -f k8s/

helm-install:
	helm upgrade --install sms ./helm/sms-chart -f ./helm/sms-chart/values.dev.yaml -n sms --create-namespace
