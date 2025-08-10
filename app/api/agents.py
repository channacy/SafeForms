from __future__ import annotations
from typing import Dict, List
import time

# Reuse existing RAG service
try:
    from .services import rag
except Exception:
    from app.api.services import rag

ANSWER_SCHEMA_KEYS = {"answer", "citations", "answer_confidence", "notes"}
REVIEW_SCHEMA_KEYS = {"verification_conf", "defects", "fixed_answer"}
RISK_SCHEMA_KEYS = {"category", "severity", "needs_human", "reason"}


def _now_ms() -> int:
    return int(time.time() * 1000)


def _citations_from_sources(sources: List[str]) -> List[Dict[str, str]]:
    cits: List[Dict[str, str]] = []
    for s in sources[:3]:
        # best-effort parse: "docid - snippet"
        if " - " in s:
            doc_id, rest = s.split(" - ", 1)
            quote = rest.strip()
        else:
            doc_id, quote = s, ""
        cits.append({"doc_id": doc_id, "section": "", "quote": quote[:240]})
    return cits or [{"doc_id": "unknown", "section": "", "quote": ""}]


def answer_pass_1(question: str) -> Dict:
    res = rag.query(question)
    answer = (res.get("answer") or "").strip()
    conf = float(res.get("model_confidence") or 0.0)
    sources = res.get("sources") or []
    payload = {
        "answer": answer,
        "citations": _citations_from_sources([str(s) for s in sources]),
        "answer_confidence": conf,
        "notes": "first-pass",
    }
    return payload


def answer_pass_2(question: str) -> Dict:
    # Stronger pass: leverage history with a synthesized prior, or multi-query (placeholder)
    # For now call rag.query again; TODO: implement multi-query + rerank
    res = rag.query(question)
    answer = (res.get("answer") or "").strip()
    conf = float(res.get("model_confidence") or 0.0)
    sources = res.get("sources") or []
    payload = {
        "answer": answer,
        "citations": _citations_from_sources([str(s) for s in sources]),
        "answer_confidence": conf,
        "notes": "second-pass",
    }
    return payload


def review_answer(answer_payload: Dict) -> Dict:
    # Compute a crude verification_conf: proportional to answer_confidence and citations presence
    ans = (answer_payload.get("answer") or "").strip()
    base = float(answer_payload.get("answer_confidence") or 0.0)
    cits = answer_payload.get("citations") or []
    cite_bonus = 0.15 if cits else 0.0
    verification_conf = max(0.0, min(1.0, base + cite_bonus))
    defects: List[Dict[str, str]] = []
    if not ans:
        defects.append({"type": "missing_citation", "evidence": "empty answer"})
        verification_conf = min(verification_conf, 0.3)
    return {
        "verification_conf": verification_conf,
        "defects": defects,
        "fixed_answer": None,
    }


def assess_risk(answer_payload: Dict) -> Dict:
    ans = (answer_payload.get("answer") or "").lower()
    severity = "low"
    needs_human = False
    reason = "baseline"
    risky_terms = ["pii", "ssn", "credit card", "hipaa", "gdpr"]
    if any(t in ans for t in risky_terms):
        severity = "medium"
        reason = "mentions sensitive data handling"
    if "not compliant" in ans or "cannot" in ans:
        severity = "high"
        needs_human = True
        reason = "potential contradiction or non-compliance"
    return {
        "category": "compliance",
        "severity": severity,
        "needs_human": needs_human,
        "reason": reason,
    }
