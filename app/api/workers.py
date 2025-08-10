import json
import hashlib
import time
import dramatiq

from app.api.events import publish_event
from app.api.db import SessionLocal
from app.api.models import Question, Artifact
from app.api.agents import answer_pass_1, answer_pass_2, review_answer, assess_risk


def _run_hash(artifacts):
    blob = json.dumps(artifacts, sort_keys=True, ensure_ascii=False).encode()
    return hashlib.sha256(blob).hexdigest()[:16]


@dramatiq.actor(max_retries=0)
def process_question(run_id: str, question_id: str):
    db = SessionLocal()
    q = db.query(Question).get(question_id)
    if not q:
        return

    # Answer pass 1
    t0 = time.time()
    publish_event(run_id, question_id, "answering", "answering")
    ans = answer_pass_1(q.text)
    db.add(Artifact(question_id=question_id, stage="answering", payload=ans, latency_ms=int((time.time()-t0)*1000)))
    db.commit()

    # Review
    t1 = time.time()
    rev = review_answer(ans)
    db.add(Artifact(question_id=question_id, stage="review", payload=rev, latency_ms=int((time.time()-t1)*1000)))
    db.commit()
    publish_event(run_id, question_id, "review", "reviewed", {"verification_conf": rev.get("verification_conf", 0.0)})

    # Retry if weak
    if float(rev.get("verification_conf", 0.0)) < 0.70:
        publish_event(run_id, question_id, "answering", "retrying")
        ans2 = answer_pass_2(q.text)
        db.add(Artifact(question_id=question_id, stage="answering_retry", payload=ans2))
        db.commit()
        rev2 = review_answer(ans2)
        db.add(Artifact(question_id=question_id, stage="review", payload=rev2))
        db.commit()
        publish_event(run_id, question_id, "review", "reviewed", {"verification_conf": rev2.get("verification_conf", 0.0), "retry": True})
        if float(rev2.get("verification_conf", 0.0)) > float(rev.get("verification_conf", 0.0)):
            ans, rev = ans2, rev2

    # Risk
    t2 = time.time()
    risk = assess_risk(ans)
    db.add(Artifact(question_id=question_id, stage="risk", payload=risk, latency_ms=int((time.time()-t2)*1000)))
    db.commit()
    publish_event(run_id, question_id, "risk", "risked", {"severity": risk.get("severity", "low")})

    # Final decision
    decision = "answer" if (float(ans.get("answer_confidence", 0.0))>=0.65 and float(rev.get("verification_conf", 0.0))>=0.70 and risk.get("severity")!="high" and not risk.get("needs_human")) else "needs_info"
    q.status, q.final = "final", decision
    q.verify_conf = int(float(rev.get("verification_conf", 0.0))*100)
    q.risk_severity = str(risk.get("severity", "low"))
    db.commit()

    # Proof bundle + run hash
    artifacts = [ans, rev, risk]
    bundle = {"decision": decision, "proof": {"citations": ans.get("citations", []), "quotes": [c.get("quote", "") for c in ans.get("citations", [])], "run_hash": _run_hash(artifacts)}}
    publish_event(run_id, question_id, "final", "final", bundle)
