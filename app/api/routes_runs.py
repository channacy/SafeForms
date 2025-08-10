from fastapi import APIRouter, HTTPException
from typing import List, Dict
from app.api.db import SessionLocal
from app.api.models import Run, Question, Approval
from app.api.workers import process_question

router = APIRouter()

@router.post("/api/batch/run")
def create_batch(payload: Dict):
    questions: List[str] = payload.get("questions") or []
    session_id: str = payload.get("session_id") or None
    if not questions:
        raise HTTPException(status_code=400, detail="questions required")
    db = SessionLocal()
    run = Run(session_id=session_id)
    db.add(run); db.commit(); db.refresh(run)
    created: List[Dict[str, str]] = []
    for qtext in questions:
        q = Question(run_id=run.id, text=qtext)
        db.add(q); db.commit(); db.refresh(q)
        created.append({"id": str(q.id), "text": q.text})
        process_question.send(str(run.id), str(q.id))
    return {"run_id": str(run.id), "questions": created}

@router.post("/api/review/{question_id}/approve")
def approve(question_id: str, actor: str = "reviewer@example.com"):
    db = SessionLocal()
    db.add(Approval(question_id=question_id, decision="approve", actor=actor))
    db.commit()
    return {"ok": True}

@router.post("/api/review/{question_id}/needs-info")
def needs_info(question_id: str, reason: str = "", actor: str = "reviewer@example.com"):
    db = SessionLocal()
    db.add(Approval(question_id=question_id, decision="needs_info", actor=actor, reason=reason))
    db.commit()
    return {"ok": True}

@router.post("/api/runs/{run_id}/export")
def export(run_id: str):
    from app.api.pdf import generate_pdf
    path = generate_pdf(run_id)
    return {"status": "ready", "pdf": path}
