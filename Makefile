.PHONY: help install dev build test seed clean

help:
	@echo "ConstructIQ - AI-Powered Construction Site Management Platform"
	@echo ""
	@echo "Usage:"
	@echo "  make install     Install all dependencies"
	@echo "  make dev         Start development environment"
	@echo "  make build       Build for production"
	@echo "  make test        Run tests"
	@echo "  make seed        Seed database with sample data"
	@echo "  make clean       Clean temporary files"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm ci

dev:
	docker-compose up

dev-backend:
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

test-backend:
	cd backend && pytest -v

seed:
	cd backend && python scripts/seed.py

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	rm -rf frontend/dist
	rm -rf backend/uploads/*
	rm -rf .pytest_cache
	rm -rf htmlcov

migrate:
	cd backend && alembic upgrade head

migration:
	cd backend && alembic revision --autogenerate -m "$(message)"

logs:
	docker-compose logs -f
