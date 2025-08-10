import os
from typing import Dict
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML
from .db import SessionLocal
from .models import Run, Question, Artifact, Approval

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)

def _collect(run_id: str) -> Dict:
    db = SessionLocal()
    run = db.query(Run).get(run_id)
    qs = db.query(Question).filter(Question.run_id == run_id).all()
    out = []
    answered = 0
    total = len(qs)
    docs = set()
    for q in qs:
        arts = db.query(Artifact).filter(Artifact.question_id == q.id).all()
        ans = next((a for a in arts if a.stage in ("answering_retry","answering")), None)
        rev = next((a for a in arts if a.stage == "review"), None)
        risk = next((a for a in arts if a.stage == "risk"), None)
        cits = (ans.payload.get("citations") if ans else []) or []
        for c in cits:
            if c.get("doc_id"): docs.add(c.get("doc_id"))
        if q.final == "answer":
            answered += 1
        approvals = db.query(Approval).filter(Approval.question_id == q.id).all()
        out.append({
            "id": str(q.id),
            "text": q.text,
            "final": q.final,
            "verify_conf": q.verify_conf,
            "risk": q.risk_severity,
            "citations": cits,
            "approvals": [
                {"actor": a.actor, "decision": a.decision, "reason": a.reason}
                for a in approvals
            ],
        })
    kpis = {
        "answered_pct": int((answered/total)*100) if total else 0,
        "total": total,
        "doc_coverage": len(docs),
    }
    return {"kpis": kpis, "rows": out}


def generate_pdf(run_id: str) -> str:
    data = _collect(run_id)
    tpl = env.get_template("report.html")
    html = tpl.render(**data)
    out_dir = os.getenv("EXPORT_DIR", "exports")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"run-{run_id}.pdf")
    HTML(string=html).write_pdf(out_path)
    return out_path
