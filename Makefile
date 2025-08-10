.PHONY: help api worker frontend install-backend install-frontend db-setup run-batch stream export metrics check-redis plane-a-index plane-a-health plane-a-ask

SHELL := /bin/bash
PROJECT_ROOT := $(PWD)
PY := $(PROJECT_ROOT)/.venv/bin/python

help:
	@echo "Targets:"
	@echo "  install-backend   - Create venv (if missing) and install Python deps"
	@echo "  install-frontend  - Install Node deps in app/frontend"
	@echo "  api               - Start FastAPI on :8000"
	@echo "  worker            - Start Dramatiq worker (reads .env if present)"
	@echo "  frontend          - Start Next.js dev server on :3000"
	@echo "  db-setup          - Create local Postgres DB 'safeforms'"
	@echo "  run-batch         - Create a demo batch run (prints JSON with run_id)"
	@echo "  stream            - Stream SSE for RUN_ID (usage: make stream RUN_ID=<uuid>)"
	@echo "  export            - Export PDF for RUN_ID (usage: make export RUN_ID=<uuid>)"
	@echo "  metrics           - Curl /metrics"
	@echo "  check-redis       - Ping Redis"
	@echo "  plane-a-index     - Build Plane-A index (BGE + chunking)"
	@echo "  plane-a-health    - Check Plane-A readiness"
	@echo "  plane-a-ask       - Test Plane-A QA (usage: make plane-a-ask Q='your question')"

install-backend:
	@if [ ! -d .venv ]; then python3 -m venv .venv; fi
	. .venv/bin/activate && pip install --upgrade pip && pip install -r app/requirements.txt

install-frontend:
	@cd app/frontend && npm install

api:
	@echo "[API] Starting FastAPI on http://localhost:8000 ..."
	@. .venv/bin/activate && uvicorn app.api.main:app --reload --port 8000

worker:
	@echo "[Worker] Starting Dramatiq (loading .env if present) ..."
	@. .venv/bin/activate && \
		export $$(grep -v '^#' .env | grep -v '^$$' | xargs) 2>/dev/null || true; \
		python -m dramatiq --processes 1 --threads 4 --path $(PROJECT_ROOT) -- \
		app.api.broker:broker app.api.workers
	@# Alternative (if you prefer the CLI):
	@# . .venv/bin/activate && bash -lc 'set -a; [ -f .env ] && . .env; set +a; \
	@#   dramatiq --processes 1 --threads 4 --path $(PROJECT_ROOT) -- \
	@#   app.api.broker:broker app.api.workers'

frontend:
	@echo "[Frontend] Starting Next.js on http://localhost:3000 ..."
	@cd app/frontend && npm run dev

db-setup:
	@createdb safeforms || true
	@echo "DB ready: safeforms"

run-batch:
	@echo "[Batch] Creating demo batch run ..."
	@curl -s -X POST http://localhost:8000/api/batch/run \
		-H "Content-Type: application/json" \
		-d '{"questions":["What PII do we store?","Do we encrypt data at rest?"],"session_id":"test-run-1"}'

stream:
	@if [ -z "$(RUN_ID)" ]; then echo "Usage: make stream RUN_ID=<uuid>"; exit 1; fi
	@curl -N "http://localhost:8000/api/runs/$(RUN_ID)/stream"

export:
	@if [ -z "$(RUN_ID)" ]; then echo "Usage: make export RUN_ID=<uuid>"; exit 1; fi
	@curl -s -X POST "http://localhost:8000/api/runs/$(RUN_ID)/export"

metrics:
	@curl -s http://localhost:8000/metrics | head -n 50

check-redis:
	@redis-cli ping || (echo "Redis not running. Start with: brew services start redis" && exit 1)

kill-api:
	@echo "[Kill] Stopping FastAPI on :8000 if running ..."
	@PIDS=$$(lsof -ti tcp:8000 || true); \
	if [ -n "$$PIDS" ]; then echo "Killing $$PIDS"; kill -9 $$PIDS; else echo "No API listening on :8000"; fi

kill-worker:
	@echo "[Kill] Stopping Dramatiq workers ..."
	@PK=$$(pgrep -fl "python -m dramatiq|dramatiq" || true); \
	if [ -n "$$PK" ]; then echo "Found:"; echo "$$PK"; pkill -f "python -m dramatiq" || true; pkill -f " dramatiq" || true; else echo "No dramatiq workers found"; fi

kill-frontend:
	@echo "[Kill] Stopping Next.js on :3000/:3001 if running ..."
	@for PORT in 3000 3001; do \
	  P=$$(lsof -ti tcp:$$PORT || true); \
	  if [ -n "$$P" ]; then echo "Killing Next.js on :$$PORT (PID $$P)"; kill -9 $$P; else echo "No server on :$$PORT"; fi; \
	done

plane-a-index:
	@echo "[Plane-A] Building index with BGE embeddings..."
	@. .venv/bin/activate && python -c "from app.api.plane_a_index import build_index; build_index(reset=True)"

plane-a-health:
	@curl -s http://localhost:8000/api/runs/plane-a/health | python -m json.tool

plane-a-ask:
	@if [ -z "$(Q)" ]; then echo "Usage: make plane-a-ask Q='What PII do we store?'"; exit 1; fi
	@curl -s --get "http://localhost:8000/api/runs/plane-a/ask" --data-urlencode "q=$(Q)" | python -m json.tool
