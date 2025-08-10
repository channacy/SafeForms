from fastapi import APIRouter, Query
from typing import List, Dict, Optional
from pydantic import BaseModel

try:
    # Use strict Plane-A for document QA
    from ..plane_a_query import query_plane_a, health_check
    from ..plane_a_index import build_index
except Exception:
    from app.api.plane_a_query import query_plane_a, health_check
    from app.api.plane_a_index import build_index


router = APIRouter()


@router.get("/plane-a/health", summary="Check Plane-A readiness")
def plane_a_health() -> Dict[str, object]:
    """
    Check if Plane-A index and models are ready
    """
    return health_check()


@router.post("/plane-a/build-index", summary="Build Plane-A index")
def build_plane_a_index(reset: bool = False) -> Dict[str, object]:
    """
    Build or rebuild the Plane-A index from policies
    """
    try:
        coll = build_index(reset=reset)
        count = coll.count() if coll else 0
        return {"status": "ready", "indexed_chunks": count}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.get("/plane-a/ask", summary="Query Plane-A with strict extractive QA")
def ask_plane_a(q: str = Query(..., min_length=1, max_length=4000), tau: float = Query(1.5, ge=0.5, le=3.0)) -> Dict[str, object]:
    """
    Runs strict Plane-A: BGE retrieval + RoBERTa SQuAD2 extraction + abstain logic
    No history, no generation - pure extractive QA with citations
    """
    return query_plane_a(q, tau=tau)

