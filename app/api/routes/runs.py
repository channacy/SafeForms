from fastapi import APIRouter, Query
from typing import List, Dict, Optional
from pydantic import BaseModel

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


@router.get("/ask", summary="Query RAG with free-text question")
def ask(q: str = Query(..., min_length=1, max_length=4000)) -> Dict[str, object]:
    """
    Runs the RAG pipeline for a single user-provided query and returns
    the best matching policy and a confidence.
    """
    return rag.query(q)


class QAHistoryItem(BaseModel):
    question: str
    answer: Optional[str] = None
    action: Optional[str] = None


class AskRequest(BaseModel):
    question: str
    history: Optional[List[QAHistoryItem]] = None


@router.post("/ask", summary="Query RAG with free-text question and optional history")
def ask_with_history(payload: AskRequest) -> Dict[str, object]:
    return rag.query(payload.question, history=[h.model_dump() for h in (payload.history or [])])

