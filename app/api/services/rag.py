from __future__ import annotations
import os
import json
import math
from collections import Counter
from typing import List, Tuple, Dict

POLICY_DIR = "app/api/pseudo_dataset/policies"
QUESTIONNAIRE_DIR = "app/api/pseudo_dataset/incoming_questionnaires"

# Try to use ChromaDB if available; otherwise fall back to stdlib cosine.
_HAS_CHROMA = False
try:
    import chromadb  # type: ignore
    _HAS_CHROMA = True
except Exception:
    _HAS_CHROMA = False


def _read_policies() -> Dict[str, str]:
    policies: Dict[str, str] = {}
    for fname in os.listdir(POLICY_DIR):
        if fname.endswith(".md"):
            with open(os.path.join(POLICY_DIR, fname), "r", encoding="utf-8") as f:
                policies[fname] = f.read()
    return policies


def _read_questions() -> List[Tuple[str, str]]:
    # Returns list of (question_text, source_file)
    items: List[Tuple[str, str]] = []
    for fname in os.listdir(QUESTIONNAIRE_DIR):
        if fname.endswith(".json"):
            with open(os.path.join(QUESTIONNAIRE_DIR, fname), "r", encoding="utf-8") as f:
                data = json.load(f)
            for q in data.get("questions", []):
                qt = q.get("q")
                if isinstance(qt, str) and qt.strip():
                    items.append((qt.strip(), fname))
    return items


# ---- Stdlib cosine fallback ----
def _tokenize(text: str) -> List[str]:
    return [t for t in ''.join(ch.lower() if ch.isalnum() else ' ' for ch in text).split() if t]


def _to_vec(tokens: List[str]) -> Counter:
    return Counter(tokens)


def _cosine(a: Counter, b: Counter) -> float:
    if not a or not b:
        return 0.0
    dot = sum(a[k] * b.get(k, 0) for k in a)
    if dot == 0:
        return 0.0
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


def _best_policy_cosine(question: str, policies: Dict[str, str]) -> Tuple[str, float]:
    qv = _to_vec(_tokenize(question))
    best_name = ""
    best_score = 0.0
    for name, text in policies.items():
        pv = _to_vec(_tokenize(text))
        s = _cosine(qv, pv)
        if s > best_score:
            best_name, best_score = name, s
    return best_name, best_score


def _best_policy_chroma(question: str, collection) -> Tuple[str, float]:
    res = collection.query(query_texts=[question], n_results=1)
    docs = res.get("documents") or [[]]
    ids = res.get("ids") or [[]]
    if docs and docs[0] and ids and ids[0]:
        # Chroma doesn't return scores by default; you might enable include=['distances'] if needed
        # For now, return a dummy confidence of 1.0 when a doc is found
        return ids[0][0], 1.0
    return "", 0.0


def run() -> List[Dict[str, object]]:
    questions = _read_questions()
    results: List[Dict[str, object]] = []

    if _HAS_CHROMA:
        # Build a Chroma in-memory collection from policies
        client = chromadb.Client()  # type: ignore
        collection = client.get_or_create_collection(name="policy_collection")
        # Upsert policies
        for fname, text in _read_policies().items():
            collection.upsert(documents=[text], ids=[fname])

        for q, src in questions:
            name, score = _best_policy_chroma(q, collection)
            results.append({
                "question": q,
                "source_questionnaire": src,
                "best_policy": name,
                "confidence": score,
                "engine": "chroma",
            })
        return results

    # Fallback: stdlib cosine
    policies = _read_policies()
    for q, src in questions:
        name, score = _best_policy_cosine(q, policies)
        results.append({
            "question": q,
            "source_questionnaire": src,
            "best_policy": name,
            "confidence": score,
            "engine": "cosine",
        })
    return results


if __name__ == "__main__":
    out = run()
    for row in out[:10]:
        print(json.dumps(row, ensure_ascii=False))


def query(q: str) -> Dict[str, object]:
    """Single-query RAG entrypoint used by `/api/runs/ask`.
    Returns a dict with best policy and confidence.
    """
    if _HAS_CHROMA:
        client = chromadb.Client()  # type: ignore
        collection = client.get_or_create_collection(name="policy_collection")
        # Ensure policies are present (idempotent upserts)
        for fname, text in _read_policies().items():
            collection.upsert(documents=[text], ids=[fname])
        name, score = _best_policy_chroma(q, collection)
        return {
            "question": q,
            "best_policy": name,
            "confidence": score,
            "engine": "chroma",
        }

    # Fallback cosine path
    policies = _read_policies()
    name, score = _best_policy_cosine(q, policies)
    return {
        "question": q,
        "best_policy": name,
        "confidence": score,
        "engine": "cosine",
    }
