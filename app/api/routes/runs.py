from fastapi import APIRouter, Query
from typing import List, Dict

try:
    # package import
    from ..services import rag
except Exception:
    from app.api.services import rag


router = APIRouter()


@router.get("/rag", summary="Run RAG over pseudo dataset")
def run_rag(limit: int = Query(20, ge=1, le=500)) -> List[Dict[str, object]]:
    """
    Runs the lightweight RAG over policies and questionnaires,
    returning up to `limit` top rows for quick inspection.
    """
    results = rag.run()
    return results[:limit]

