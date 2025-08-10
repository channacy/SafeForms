# SafeForms Local Setup (macOS)

This guide gets you running the backend API, worker, and frontend locally. Run API and worker from the repo root, and the frontend from `app/frontend/`. Use separate terminals for each service.

## Prerequisites

- Homebrew (https://brew.sh)
- Python 3.11+ (3.13 works) and venv
- Node.js 20 via nvm (recommended)
- Redis and Postgres
- System libs for PDF (WeasyPrint): cairo, pango, gdk-pixbuf, libffi

Recommended installs (macOS):

```bash
brew install redis postgresql@15 cairo pango gdk-pixbuf libffi
brew services start redis
brew services start postgresql@15

# Optional: nvm + Node 20 (avoids ICU issues)
brew install nvm
mkdir -p ~/.nvm
echo 'export NVM_DIR="$HOME/.nvm"\n[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install 20
```

## Project setup

```bash
# 1) Clone and enter repo
cd /Users/arjun/Documents/GitHub/SafeForms

# 2) Python env + deps
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r app/requirements.txt

# 3) Node deps (frontend)
cd app/frontend
nvm use 20 || true
npm install
cd ../../

# 4) Database
createdb safeforms || true

# 5) Environment
cp .env.example .env
# Edit .env if needed (DATABASE_URL, REDIS_URL, ALLOWED_ORIGINS, OPENAI_API_KEY)
```

## Run services (separate terminals)

Terminal A — FastAPI backend (repo root):
```bash
source .venv/bin/activate
uvicorn app.api.main:app --reload --port 8000
```

Terminal B — Dramatiq worker (repo root):
```bash
source .venv/bin/activate
# Loads Redis broker from app/api/broker.py
# Option 1 (python -m):
python -m dramatiq --processes 1 --threads 4 --path . \
  app.api.broker:broker app.api.workers
# Option 2 (CLI):
# dramatiq --processes 1 --threads 4 --path . -- \
#   app.api.broker:broker app.api.workers
```

Terminal C — Frontend (in app/frontend):
```bash
cd app/frontend
nvm use 20 || true
npm run dev
```

## Quick tests

Health:
```bash
curl http://localhost:8000/api/health
```

Run a batch job (from repo root):
```bash
RUN_JSON=$(curl -s -X POST http://localhost:8000/api/runs/batch \
  -H "Content-Type: application/json" \
  -d '{"questions":["What PII do we store?","Do we encrypt data at rest?"],"session_id":"test-run-1"}')
echo "$RUN_JSON"  # {"run_id":"<UUID>"}
```

Stream events (replace <RUN_ID>):
```bash
curl -N "http://localhost:8000/api/runs/<RUN_ID>/stream"
# Example initial output:
# event: ping
# data: {"ok":true}
```

Export PDF (replace <RUN_ID>):
```bash
curl -s -X POST "http://localhost:8000/api/runs/<RUN_ID>/export"
# {"status":"ready","pdf":"exports/run-<RUN_ID>.pdf"}
```

## Makefile shortcuts

Common tasks are available via `Makefile`:
```bash
make install-backend     # venv + Python deps
make install-frontend    # npm install (frontend)
make api                 # start API
make worker              # start worker
make frontend            # start Next.js
make run-batch           # create demo batch
make stream RUN_ID=<uuid>
make export RUN_ID=<uuid>
make metrics             # curl /metrics (once added)
```

## Notes

- Ensure Redis is running: `redis-cli ping` should print `PONG`.
- If Node errors due to ICU on macOS, use nvm-managed Node 20.
- The worker relies on `app/api/broker.py` to configure `RedisBroker`.
- Run API and worker from repo root so `--path .` (or project root) resolves imports.
