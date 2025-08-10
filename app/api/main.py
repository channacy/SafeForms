from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import importlib
from typing import Optional
import os

# Load .env early so services can access API keys
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    # dotenv is optional; continue if unavailable
    pass

# Ensure Dramatiq broker is initialized in this process so .send() enqueues tasks
try:
    import app.api.broker  # noqa: F401
except Exception:
    # If broker import fails, API still starts; enqueueing will raise at call site
    pass

class _Settings:
    def __init__(self) -> None:
        # Parse ALLOWED_ORIGINS from env (comma-separated), default to localhost:3000
        env_val = os.getenv("ALLOWED_ORIGINS")
        if env_val:
            self.ALLOWED_ORIGINS = [o.strip() for o in env_val.split(",") if o.strip()]
        else:
            # Allow common local dev ports to avoid CORS issues when Next.js falls back to 3001
            self.ALLOWED_ORIGINS = [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001",
            ]

# Try to import settings module if present; otherwise use env-based fallback
try:
    from . import settings as app_settings  # type: ignore
except Exception:
    try:
        import app.api.settings as app_settings  # type: ignore
    except Exception:
        app_settings = _Settings()  # type: ignore


app = FastAPI(title="SafeForms API", version="0.1.0")

# CORS - Be permissive for local development
origins = getattr(app_settings, "ALLOWED_ORIGINS", [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002"
])  # type: ignore
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Routers (attempt lazy import; include only if present)
route_specs = [
    ("app.api.routes.questionnaire", "/api/questionnaire", "questionnaire"),
    ("app.api.routes.kb", "/api/kb", "kb"),
    ("app.api.routes.proofs", "/api/proofs", "proofs"),
    ("app.api.routes.email", "/api/email", "email"),
    ("app.api.routes.runs", "/api/runs", "runs"),
    ("app.api.routes.approvals", "/api/approvals", "approvals"),
    ("app.api.routes_stream", "", "stream"),
    ("app.api.routes_runs", "", "runs_batch"),
]

for mod_path, prefix, tag in route_specs:
    try:
        mod = importlib.import_module(mod_path)
        router = getattr(mod, "router")
        app.include_router(router, prefix=prefix, tags=[tag])  # type: ignore
    except Exception:
        # Router not present or module import failed; keep server bootable
        continue


# Initialize database (bootstrap; prefer Alembic in production)
try:
    from .db import init_db  # type: ignore
    init_db()
except Exception:
    pass

# Serve exported PDFs
try:
    app.mount("/exports", StaticFiles(directory="exports"), name="exports")
except Exception:
    # Directory may not exist until first export; mounting failure is non-fatal
    pass
