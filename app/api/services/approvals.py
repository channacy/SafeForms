from __future__ import annotations
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, field
import threading


@dataclass
class Suggestion:
    id: str
    text: str
    accepted_by: Set[str] = field(default_factory=set)
    rejected_by: Set[str] = field(default_factory=set)

    def status(self, required_approvers: List[str]) -> str:
        # accepted iff all required approvers accepted and none rejected
        if any(a in self.rejected_by for a in required_approvers):
            return "rejected"
        if all(a in self.accepted_by for a in required_approvers):
            return "accepted"
        return "pending"


@dataclass
class SessionApprovals:
    session_id: str
    suggestions: Dict[str, Suggestion] = field(default_factory=dict)


class ApprovalsStore:
    """In-memory approvals store. For production, back with a DB."""

    def __init__(self) -> None:
        self._by_session: Dict[str, SessionApprovals] = {}
        self._lock = threading.Lock()

    def upsert_suggestions(self, session_id: str, items: List[Dict[str, str]]):
        with self._lock:
            sess = self._by_session.setdefault(session_id, SessionApprovals(session_id=session_id))
            for it in items:
                sid = it["id"]
                txt = it["text"]
                if sid in sess.suggestions:
                    # update text if changed
                    sess.suggestions[sid].text = txt
                else:
                    sess.suggestions[sid] = Suggestion(id=sid, text=txt)

    def record_approval(self, session_id: str, suggestion_id: str, approver_email: str, accept: bool):
        with self._lock:
            sess = self._by_session.setdefault(session_id, SessionApprovals(session_id=session_id))
            sug = sess.suggestions.setdefault(suggestion_id, Suggestion(id=suggestion_id, text=""))
            if accept:
                sug.accepted_by.add(approver_email)
                if approver_email in sug.rejected_by:
                    sug.rejected_by.remove(approver_email)
            else:
                sug.rejected_by.add(approver_email)
                if approver_email in sug.accepted_by:
                    sug.accepted_by.remove(approver_email)

    def get_session(self, session_id: str) -> SessionApprovals:
        with self._lock:
            return self._by_session.setdefault(session_id, SessionApprovals(session_id=session_id))

    def list_suggestions(self, session_id: str) -> List[Suggestion]:
        return list(self.get_session(session_id).suggestions.values())


# Singleton for app
store = ApprovalsStore()
