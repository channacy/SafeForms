from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import asyncio
import os
import redis

router = APIRouter()
_pool = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

@router.get("/api/runs/{run_id}/stream")
async def stream(run_id: str, request: Request):
    pubsub = _pool.pubsub()
    pubsub.subscribe(f"run:{run_id}")

    async def gen():
        try:
            yield "event: ping\ndata: {\"ok\":true}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                msg = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if msg and msg["type"] == "message":
                    yield f"data: {msg['data'].decode()}\n\n"
                await asyncio.sleep(0.05)
        finally:
            try:
                pubsub.close()
            except Exception:
                pass
    return StreamingResponse(gen(), media_type="text/event-stream")
