# ClipIQ Platform - Makefile for common commands

.PHONY: help up down restart logs clean migrate seed test

help: ## Show this help message
	@echo "ClipIQ Platform - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

restart: ## Restart all services
	docker-compose restart

logs: ## View logs from all services
	docker-compose logs -f

logs-backend: ## View backend logs
	docker-compose logs -f backend

logs-frontend: ## View frontend logs
	docker-compose logs -f frontend

logs-db: ## View database logs
	docker-compose logs -f postgres

logs-minio: ## View MinIO logs
	docker-compose logs -f minio

clean: ## Stop services and remove volumes
	docker-compose down -v

rebuild: ## Rebuild and restart all services
	docker-compose up -d --build

migrate: ## Run database migrations
	docker exec clipiq_backend npm run migrate

seed: ## Seed initial data
	docker exec clipiq_backend npm run seed

test-backend: ## Run backend tests
	docker exec clipiq_backend npm test

shell-backend: ## Open shell in backend container
	docker exec -it clipiq_backend sh

shell-frontend: ## Open shell in frontend container
	docker exec -it clipiq_frontend sh

shell-db: ## Open PostgreSQL shell
	docker exec -it clipiq_postgres psql -U clipiq_user -d clipiq_db

install: ## Install dependencies
	docker exec clipiq_backend npm install
	docker exec clipiq_frontend npm install

status: ## Show status of all containers
	docker-compose ps

setup: up migrate seed ## Initial setup (start + migrate + seed)
