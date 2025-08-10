import os
import json
import redis

_pool = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

def publish_event(run_id, question_id, stage, status, payload=None, metrics=None):
    evt = {
        "type": "question_update",
        "run_id": str(run_id),
        "question_id": str(question_id),
        "stage": stage,    # answering|review|risk|final
        "status": status,  # answering|reviewed|risked|final|retrying
        "payload": payload or {},
        "metrics": metrics or {},
    }
    _pool.publish(f"run:{run_id}", json.dumps(evt))
