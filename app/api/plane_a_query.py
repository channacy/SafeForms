from typing import Dict, Any, List
import numpy as np
from sentence_transformers import SentenceTransformer
from .plane_a_index import build_index, load_index
from .plane_a_reader import decide_answer

def retrieve_passages(question: str, top_k: int = 5) -> List[Dict[str, Any]]:
    """Retrieve top-k most relevant passages using BGE embeddings + sklearn"""
    # Load or build index
    index_data = load_index()
    if index_data is None:
        print("Index not found, building...")
        index_data = build_index(reset=False)
        if index_data is None:
            return []
    
    index = index_data["index"]
    metadata = index_data["metadata"]
    
    # Load BGE model for query encoding
    bge = SentenceTransformer("BAAI/bge-small-en-v1.5")
    
    # Encode query
    query_embedding = bge.encode([question], normalize_embeddings=True)
    
    # Search sklearn index
    distances, indices = index.kneighbors(query_embedding, n_neighbors=min(top_k, len(metadata)))
    
    passages = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < len(metadata):
            meta = metadata[idx]
            passages.append({
                "text": meta["text"], 
                "metadata": meta, 
                "distance": float(dist)  # Cosine distance
            })
    
    return passages

def query_plane_a(question: str, tau: float = 1.5) -> Dict[str, Any]:
    """
    Strict Plane-A: BGE retrieval + RoBERTa SQuAD2 extraction + abstain logic
    
    Args:
        question: User question (no history, no context)
        tau: Abstain threshold (higher = more conservative)
    
    Returns:
        Clean JSON with action (answer|flag), extracted span, confidence, citations
    """
    # Retrieve relevant passages
    passages = retrieve_passages(question, top_k=6)
    
    if not passages:
        return {
            "question": question,
            "engine": "plane-a:roberta-squad2+bge",
            "action": "flag",
            "answer": "",
            "confidence_docqa": 0.0,
            "citations": [],
            "retrieval": [],
            "debug_info": {"reason": "no_passages_found"}
        }
    
    # Run extractive QA with abstain logic
    verdict = decide_answer(question, passages, tau=tau)
    
    # Add retrieval debug info
    retrieval = [{
        "doc_id": p["metadata"]["doc_id"],
        "chunk_idx": p["metadata"]["chunk_idx"],
        "distance": p["distance"],
        "length": p["metadata"].get("length", 0)
    } for p in passages]
    
    return {
        "question": question,
        "engine": "plane-a:roberta-squad2+bge",
        "retrieval": retrieval,
        "action": verdict["action"],
        "answer": verdict.get("answer", ""),
        "confidence_docqa": verdict.get("confidence_docqa", 0.0),
        "citations": verdict.get("citations", []),
        "debug_info": verdict.get("debug_info", {})
    }

def health_check() -> Dict[str, Any]:
    """Check if Plane-A is ready (models loaded, index exists)"""
    try:
        index_data = load_index()
        if index_data is None:
            return {
                "status": "not_ready",
                "error": "Index not found",
                "suggestion": "Run POST /api/runs/plane-a/build-index or make plane-a-index"
            }
        
        count = len(index_data["metadata"])
        
        # Test model loading
        from .plane_a_reader import _load_model
        _load_model()
        
        return {
            "status": "ready",
            "indexed_chunks": count,
            "model": "deepset/roberta-base-squad2",
            "embeddings": "BAAI/bge-small-en-v1.5"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "suggestion": "Check dependencies or rebuild index"
        }
