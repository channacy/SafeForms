"""
Internal note (refactor bootstrap):
- Observed FastAPI app in `app/api/main.py` with optional routers and env-based CORS; kept.
- Email route `app/api/routes/email.py` mixes orchestration/template/transport; preserved behavior for now (emails optional/skipped) but will shift logic to services incrementally.
- RAG lives in `app/api/services/rag.py`; we reuse it for AnsweringAgent passes (no crawler added).
- Frontend Next.js under `app/frontend/`; `pages/ai-fill/page.tsx` remains functional and now treats emails as optional.
- No DB/queue previously; this change introduces SQLAlchemy models, Redis Pub/Sub, Dramatiq workers, SSE streaming, batch runs, and PDF export scaffold without breaking existing endpoints.
"""

import uuid
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, func, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Run(Base):
    __tablename__ = "runs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(String, index=True)
    created_at = Column(DateTime, server_default=func.now())

class Question(Base):
    __tablename__ = "questions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("runs.id"), index=True)
    text = Column(Text)
    status = Column(String, default="answering")   # answering|review|risk|final|retrying
    final = Column(String, nullable=True)           # answer|needs_info
    verify_conf = Column(Integer, default=0)        # 0..100
    risk_severity = Column(String, default="low")  # low|medium|high
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Artifact(Base):
    __tablename__ = "artifacts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), index=True)
    stage = Column(String)   # answering|answering_retry|review|risk
    payload = Column(JSON)   # agent outputs
    latency_ms = Column(Integer)

class Approval(Base):
    __tablename__ = "approvals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"))
    decision = Column(String)          # approve|needs_info
    reason = Column(Text, nullable=True)
    actor = Column(String)             # email/user id
    created_at = Column(DateTime, server_default=func.now())
