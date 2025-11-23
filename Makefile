# ClipIQ Platform - Makefile for common commands

.PHONY: help up down restart logs clean migrate seed test reset-db status

help: ## Show this help message
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🎬 ClipIQ Platform - Available Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo ""
	@echo "� Quick Start:"
	@echo "  make up               - Start all services (auto-migrate & seed)"
	@echo "  make down             - Stop all services"
	@echo ""
	@echo "🔧 Management:"
	@echo "  make restart          - Restart all services"
	@echo "  make status           - Show service status"
	@echo "  make rebuild          - Rebuild and restart"
	@echo ""
	@echo "📊 Logs:"
	@echo "  make logs             - Show all logs"
	@echo "  make logs-backend     - Show backend logs only"
	@echo "  make logs-db          - Show database logs only"
	@echo ""
	@echo "🌱 Database:"
	@echo "  make migrate          - Run database migrations manually"
	@echo "  make seed             - Run seeders manually"
	@echo "  make shell-db         - Open PostgreSQL shell"
	@echo "  make reset-db         - Delete ALL data and restart (WARNING!)"
	@echo ""
	@echo "🗑️  Cleanup:"
	@echo "  make clean            - Stop and remove containers (keeps data)"
	@echo ""
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


up: ## Start all services (auto-migrate & seed on first run)
	@echo "� Starting ClipIQ Platform..."
	@echo ""
	@echo "⚡ Services will automatically:"
	@echo "   1. Run database migrations"
	@echo "   2. Seed 62 accounts (2 admin + 10 staff + 50 users)"
	@echo "   3. Upload 100 videos to MinIO"
	@echo ""
	docker-compose up -d
	@echo ""
	@echo "✅ Services started!"
	@echo ""
	@echo "📊 Access Points:"
	@echo "   - Frontend:      http://localhost:5173"
	@echo "   - Backend API:   http://localhost:5000"
	@echo "   - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
	@echo ""
	@echo "� Check backend logs: make logs-backend"

down: ## Stop all services
	@echo "🛑 Stopping services..."
	docker-compose down

restart: ## Restart all services
	@echo "🔄 Restarting services..."
	docker-compose restart

status: ## Show service status
	@echo "📊 ClipIQ Platform Status:"
	@docker-compose ps

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

clean: ## Stop services and remove containers (keeps volumes)
	@echo "🧹 Cleaning up containers..."
	docker-compose down
	@echo "✅ Containers removed (volumes preserved)"

rebuild: ## Rebuild and restart all services
	@echo "🔨 Rebuilding services..."
	docker-compose down
	docker-compose up -d --build
	@echo "✅ Services rebuilt"

migrate: ## Run database migrations
	@echo "🔧 Running migrations..."
	docker exec clipiq_backend npm run migrate

seed: ## Seed initial data manually
	@echo "🌱 Running seeders..."
	docker exec clipiq_backend npm run seed

reset-db: ## Delete all data and re-seed (WARNING: Destructive!)
	@echo "⚠️  WARNING: This will DELETE all data!"
	@echo "Press Ctrl+C to cancel..."
	@timeout /t 5 /nobreak > nul
	@echo ""
	@echo "🗑️  Stopping services..."
	docker-compose down
	@echo "🗑️  Removing volumes..."
	docker volume rm clipiq-platform_postgres_data 2>nul || echo Volume not found, skipping
	docker volume rm clipiq-platform_minio_data 2>nul || echo Volume not found, skipping
	@echo ""
	@echo "🚀 Starting fresh (will auto-migrate & seed)..."
	docker-compose up -d
	@echo "✅ Database reset complete! Check logs: make logs-backend"

test-backend: ## Run backend tests
	docker exec clipiq_backend npm test

shell-backend: ## Open shell in backend container
	docker exec -it clipiq_backend sh

shell-db: ## Open PostgreSQL shell
	docker exec -it clipiq_postgres psql -U clipiq_user -d clipiq_db

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
