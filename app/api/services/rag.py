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


from typing import Any, Optional


def query(q: str, history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, object]:
    """Single-query RAG entrypoint used by `/api/runs/ask`.
    Returns retrieval metadata and, if available, an LLM-generated structured answer with action.
    """
    # Retrieve best policy by similarity
    retrieval_engine = "cosine"
    name: str
    score: float
    policy_text: str = ""

    if _HAS_CHROMA:
        client = chromadb.Client()  # type: ignore
        collection = client.get_or_create_collection(name="policy_collection")
        # Ensure policies are present (idempotent upserts)
        policies_map = _read_policies()
        for fname, text in policies_map.items():
            collection.upsert(documents=[text], ids=[fname])
        name, score = _best_policy_chroma(q, collection)
        retrieval_engine = "chroma"
        policy_text = policies_map.get(name, "")
    else:
        policies_map = _read_policies()
        name, score = _best_policy_cosine(q, policies_map)
        policy_text = policies_map.get(name, "")

    # Generate answer using OpenAI if API key is present
    answer: str = ""
    llm_engine: str = ""
    action: str = "flag"
    model_confidence: float = 0.0
    confidence_reasoning: str = ""
    sources: List[str] = []
    try:
        from openai import OpenAI  # type: ignore
        import os
        import json

        if os.getenv("OPENAI_API_KEY"):
            llm_engine = "openai:gpt-4o-mini"
            _client = OpenAI()
            system_msg = (
                "You are an AI compliance assistant. You are an expert in vendor security and at filling out vendor security questionnaires.\n"
                "Your task is to fill out a vendor security questionnaire using ONLY the provided policy document excerpts and previous questions answered.\n\n"
                "Allowed Actions:\n"
                "1. Answer – If you are highly confident (>= 0.80).\n"
                "2. Suggest – If you are moderately confident (0.50–0.79).\n"
                "3. Flag for Review – If you are low confidence (< 0.50) or cannot find sufficient evidence.\n\n"
                "Rules:\n"
                "* Use only the provided context; do not invent information.\n"
                "* Always include exact evidence with document ID and section/snippet.\n"
                "* Never leave sources empty unless you are flagging for review.\n\n"
                "Output MUST be valid JSON with keys: action, answer, confidence, confidence_reasoning, sources."
            )

            hist_lines: List[str] = []
            for h in history or []:
                qh = h.get("question")
                ah = h.get("answer")
                act = h.get("action")
                hist_lines.append(f"Q: {qh}\nA({act}): {ah}")
            session_history = "\n\n".join(hist_lines) if hist_lines else "(none)"

            snippet = policy_text[:800].replace("\n\n", "\n").strip()
            sources = [f"{name} - snippet: {snippet[:160]}..."] if snippet else [name]

            user_content = (
                "Session History (newest first):\n" + session_history + "\n\n" +
                "Context Document ID: " + name + "\n" +
                "Context Excerpt:\n" + policy_text[:6000] + "\n\n" +
                "Now, based ONLY on the context above, process the following question:\n" +
                q + "\n\n" +
                "Respond ONLY with JSON of the form:\n" +
                '{"action": "answer|suggest|flag", "answer": "<string or null>", "confidence": <0.0-1.0>, "confidence_reasoning": "<brief>", "sources": ["<docID> - <section/snippet>", ...]}'
            )
            resp = _client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_content},
                ],
            )
            raw = (resp.choices[0].message.content or "").strip()
            try:
                parsed = json.loads(raw)
            except Exception:
                # try to extract JSON substring
                start = raw.find("{")
                end = raw.rfind("}")
                parsed = json.loads(raw[start:end+1]) if start != -1 and end != -1 else {}

            action = str(parsed.get("action", "flag")).lower()
            if action not in {"answer", "suggest", "flag"}:
                action = "flag"
            answer = (parsed.get("answer") or "").strip()
            model_confidence = float(parsed.get("confidence", 0.0))
            confidence_reasoning = (parsed.get("confidence_reasoning") or "").strip()
            srcs = parsed.get("sources") or []
            if isinstance(srcs, list):
                sources = [str(s) for s in srcs]
            if not sources:
                sources = [name]
        else:
            llm_engine = ""
            answer = ""
    except Exception:
        # Leave answer empty on any LLM error; retrieval info still returned
        answer = ""

    return {
        "question": q,
        "best_policy": name,
        "confidence": score,
        "engine": retrieval_engine,
        "answer": answer,
        "llm_engine": llm_engine,
        "action": action,
        "model_confidence": model_confidence,
        "confidence_reasoning": confidence_reasoning,
        "sources": sources,
    }
