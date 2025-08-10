from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel, Field

import os
from app.api.services.emailer import Emailer, render_basic_html
from app.api.services.approvals import store as approvals_store
from app.api.services.tokens import create_token


# Note: The router is mounted in app/api/main.py with prefix "/api/email".
# Do not set a prefix here to avoid duplicated path segments.
router = APIRouter()


# ---------- Schemas ----------

class ProgressEmailRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=20000)
    to: Optional[List[str]] = None  # overrides defaults when provided


class SuggestionItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1, max_length=10000)


class UpsertSuggestionsRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=200)
    suggestions: List[SuggestionItem]


class ApprovalRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=200)
    suggestion_id: str = Field(..., min_length=1, max_length=200)
    approver_email: str = Field(..., min_length=3, max_length=320)
    accept: bool


class CompletionEmailRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=200)
    subject: str = Field("Job Completed", min_length=1, max_length=200)
    preface: Optional[str] = Field(None, max_length=4000)
    to: Optional[List[str]] = None  # overrides defaults when provided
    stats: Optional[dict] = None  # {"answered": int, "suggested": int, "flagged": int}


# ---------- Routes ----------

@router.post("/progress", summary="Send a progress email to stakeholders")
def send_progress_email(payload: ProgressEmailRequest):
    emailer = Emailer()
    recipients = payload.to or emailer.get_default_progress_recipients()
    if not recipients:
        raise HTTPException(status_code=400, detail="No progress recipients configured or provided")
    # Optional unsubscribe headers from env
    list_unsub = os.getenv("LIST_UNSUBSCRIBE")  # e.g., <mailto:unsub@yourdomain.com>, <https://yourapp.com/unsubscribe>
    list_unsub_post = os.getenv("LIST_UNSUBSCRIBE_POST")  # e.g., List-Unsubscribe=One-Click
    headers = {}
    if list_unsub:
        headers["List-Unsubscribe"] = list_unsub
    if list_unsub_post:
        headers["List-Unsubscribe-Post"] = list_unsub_post

    html = render_basic_html(title=payload.subject, body_html=f"<p>{payload.message}</p>")
    emailer.send(subject=payload.subject, body_text=payload.message, to=recipients, body_html=html, headers=headers)
    return {"status": "sent", "to": recipients}


@router.post("/suggestions/upsert", summary="Upsert suggestions for a session")
def upsert_suggestions(payload: UpsertSuggestionsRequest):
    approvals_store.upsert_suggestions(
        session_id=payload.session_id,
        items=[{"id": s.id, "text": s.text} for s in payload.suggestions],
    )
    return {"status": "ok", "count": len(payload.suggestions)}


@router.post("/suggestions/approve", summary="Record approval/denial for a suggestion")
def approve_suggestion(payload: ApprovalRequest):
    approvals_store.record_approval(
        session_id=payload.session_id,
        suggestion_id=payload.suggestion_id,
        approver_email=payload.approver_email,
        accept=payload.accept,
    )
    return {"status": "ok"}


@router.get("/suggestions", summary="List suggestions with statuses for a session")
def list_suggestions(session_id: str, approvers: Optional[str] = None):
    required = [a.strip() for a in (approvers or "").split(",") if a.strip()]
    sugs = approvals_store.list_suggestions(session_id)
    out = []
    for s in sugs:
        out.append({
            "id": s.id,
            "text": s.text,
            "accepted_by": sorted(list(s.accepted_by)),
            "rejected_by": sorted(list(s.rejected_by)),
            "status": s.status(required) if required else "pending",
        })
    return {"session_id": session_id, "suggestions": out}


@router.post("/completion", summary="Send completion email with accepted suggestions only")
def send_completion_email(payload: CompletionEmailRequest):
    emailer = Emailer()
    recipients = payload.to or emailer.get_default_completion_recipients()
    sending = len(recipients) > 0

    # Determine required approvers; default to completion recipients
    required_approvers = recipients if sending else []
    # Gather accepted suggestions (only meaningful if we have approvers)
    sugs = approvals_store.list_suggestions(payload.session_id)
    accepted = [s for s in sugs if s.status(required_approvers) == "accepted"] if sending else []

    # Plaintext body (fallback)
    lines: List[str] = []
    if payload.preface:
        lines.append(payload.preface)
        lines.append("")
    lines.append(f"Session: {payload.session_id}")
    if payload.stats:
        a = int(payload.stats.get("answered", 0))
        s = int(payload.stats.get("suggested", 0))
        f = int(payload.stats.get("flagged", 0))
        lines.append(f"Summary — Answered: {a} · Suggested: {s} · Flagged: {f}")
    lines.append("")
    if accepted:
        lines.append("Accepted AI Suggestions:")
        for i, s in enumerate(accepted, start=1):
            lines.append(f"{i}. {s.text}")
    else:
        lines.append("No suggestions fully accepted by all required approvers.")

    body = "\n".join(lines)

    # Build summary badges (using email template classes)
    stats_html = ""
    if payload.stats:
        a = int(payload.stats.get("answered", 0))
        s = int(payload.stats.get("suggested", 0))
        f = int(payload.stats.get("flagged", 0))
        stats_html = (
            "<div class=\"badge-row\">"
            f"<span class=\"badge badge-success\">ANSWERED · {a}</span>"
            f"<span class=\"badge badge-warn\">SUGGESTED · {s}</span>"
            f"<span class=\"badge badge-danger\">FLAGGED · {f}</span>"
            "</div>"
        )

    # Review portal link for each recipient
    frontend = os.getenv("FRONTEND_BASE_URL", "http://localhost:3000")
    review_links = []
    if sending:
        for r in recipients:
            token = create_token(payload.session_id, r)
            url = f"{frontend}/pages/approvals?token={token}"
            review_links.append((r, url))

    # Accepted list (if any)
    if accepted:
        items_html = "".join([f"<li>{s.text}</li>" for s in accepted])
        accepted_html = f"<p><strong>Accepted AI Suggestions:</strong></p><ul>{items_html}</ul>"
    else:
        accepted_html = "<p>No suggestions fully accepted by all required approvers.</p>"

    # Compose body html
    body_html = (
        (f"<p>{payload.preface}</p>" if payload.preface else "")
        + f"<p><strong>Session:</strong> {payload.session_id}</p>"
        + stats_html
        + "<p><strong>Review Suggestions:</strong></p>"
        + ("".join([
            f"<p style=\"margin:8px 0;\"><a href=\"{link}\" class=\"btn\">Review as {r}</a></p>"
            for (r, link) in review_links
        ]) if sending else "<p class=\"text-sm\" style=\"color:#065f46\">No reviewers configured. You can still proceed without email.</p>")
        + accepted_html
    )
    html = render_basic_html(title=payload.subject, body_html=body_html)

    # Optional unsubscribe headers
    list_unsub = os.getenv("LIST_UNSUBSCRIBE")
    list_unsub_post = os.getenv("LIST_UNSUBSCRIBE_POST")
    headers = {}
    if list_unsub:
        headers["List-Unsubscribe"] = list_unsub
    if list_unsub_post:
        headers["List-Unsubscribe-Post"] = list_unsub_post

    if sending:
        emailer.send(subject=payload.subject, body_text=body, to=recipients, body_html=html, headers=headers)
        return {"status": "sent", "to": recipients, "accepted_count": len(accepted)}
    else:
        # Skip SMTP send; return a preview so the caller can surface it in UI or logs
        return {
            "status": "skipped",
            "reason": "no recipients provided",
            "to": [],
            "accepted_count": 0,
            "preview": {
                "subject": payload.subject,
                "body_text": body,
                "body_html": html,
            },
        }

