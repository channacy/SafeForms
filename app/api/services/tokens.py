import base64
import hmac
import os
import time
from hashlib import sha256
from typing import Tuple


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    pad = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + pad)


def create_token(session_id: str, approver_email: str, ttl_seconds: int = 7 * 24 * 3600) -> str:
    secret = os.getenv("SECRET_KEY", "change-me")
    exp = int(time.time()) + ttl_seconds
    payload = f"{session_id}|{approver_email}|{exp}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), payload, sha256).digest()
    return _b64url(payload) + "." + _b64url(sig)


def verify_token(token: str) -> Tuple[str, str]:
    """
    Returns (session_id, approver_email) if valid, else raises ValueError.
    """
    secret = os.getenv("SECRET_KEY", "change-me")
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        payload = _b64url_decode(payload_b64)
        expected = hmac.new(secret.encode("utf-8"), payload, sha256).digest()
        if not hmac.compare_digest(expected, _b64url_decode(sig_b64)):
            raise ValueError("invalid signature")
        parts = payload.decode("utf-8").split("|", 2)
        if len(parts) != 3:
            raise ValueError("invalid payload")
        session_id, approver_email, exp_s = parts
        if int(exp_s) < int(time.time()):
            raise ValueError("token expired")
        return session_id, approver_email
    except Exception as e:
        raise ValueError(str(e))
