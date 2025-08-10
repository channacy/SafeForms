from __future__ import annotations

from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.services.tokens import verify_token
from app.api.services.approvals import store as approvals_store

router = APIRouter()


class Decision(BaseModel):
    suggestion_id: str = Field(..., min_length=1, max_length=200)
    accept: bool


class SubmitApprovalsRequest(BaseModel):
    token: str
    decisions: List[Decision]


@router.get("/review", summary="Fetch suggestions for approval via token")
def review(token: str = Query(..., min_length=10)) -> Dict[str, object]:
    try:
        session_id, approver = verify_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")

    suggestions = approvals_store.list_suggestions(session_id)
    out = []
    for s in suggestions:
        out.append({
            "id": s.id,
            "text": s.text,
            "accepted_by": sorted(list(s.accepted_by)),
            "rejected_by": sorted(list(s.rejected_by)),
            # status is not strictly per-approver; front-end can show if this approver already decided
        })
    return {
        "session_id": session_id,
        "approver": approver,
        "suggestions": out,
    }


@router.post("/submit", summary="Submit approvals for a set of suggestions via token")
def submit(payload: SubmitApprovalsRequest) -> Dict[str, object]:
    try:
        session_id, approver = verify_token(payload.token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"invalid token: {e}")

    count = 0
    for d in payload.decisions:
        approvals_store.record_approval(
            session_id=session_id,
            suggestion_id=d.suggestion_id,
            approver_email=approver,
            accept=d.accept,
        )
        count += 1

    return {"status": "ok", "updated": count}
