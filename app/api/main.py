from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import importlib

try:
    # Local import when running as a package
    from . import settings as app_settings
except Exception:
    # Fallback for various execution contexts
    import app.api.settings as app_settings


app = FastAPI(title="SafeForms API", version="0.1.0")

# CORS
origins = getattr(app_settings, "ALLOWED_ORIGINS", ["http://localhost:3000"])  # type: ignore
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
]

for mod_path, prefix, tag in route_specs:
    try:
        mod = importlib.import_module(mod_path)
        router = getattr(mod, "router")
        app.include_router(router, prefix=prefix, tags=[tag])  # type: ignore
    except Exception:
        # Router not present or module import failed; keep server bootable
        continue

