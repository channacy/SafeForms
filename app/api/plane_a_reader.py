from typing import List, Dict, Any
import torch
from transformers import AutoTokenizer, AutoModelForQuestionAnswering

_MODEL = "deepset/roberta-base-squad2"
_tokenizer = None
_model = None

def _load_model():
    """Lazy load model to avoid startup overhead"""
    global _tokenizer, _model
    if _tokenizer is None:
        _tokenizer = AutoTokenizer.from_pretrained(_MODEL)
        _model = AutoModelForQuestionAnswering.from_pretrained(_MODEL)
        _model.eval()

@torch.inference_mode()
def _qa_on_context(question: str, context: str) -> Dict[str, Any]:
    """Run QA on single context, return scores and span indices"""
    _load_model()
    
    inputs = _tokenizer.encode_plus(
        question, context, 
        return_tensors="pt", 
        truncation=True, 
        max_length=512,
        return_offsets_mapping=True
    )
    
    outputs = _model(**{k: v for k, v in inputs.items() if k != 'offset_mapping'})
    start_logits = outputs.start_logits[0]
    end_logits = outputs.end_logits[0]
    
    # Best non-null span
    start_idx = int(torch.argmax(start_logits))
    end_idx = int(torch.argmax(end_logits))
    
    # Ensure end >= start
    if end_idx < start_idx:
        end_idx = start_idx
    
    s_best = float(start_logits[start_idx] + end_logits[end_idx])
    # Null score (CLS token at position 0)
    s_null = float(start_logits[0] + end_logits[0])
    
    return {
        "start_idx": start_idx, 
        "end_idx": end_idx,
        "s_best": s_best, 
        "s_null": s_null,
        "inputs": inputs
    }

def _decode_span(inputs, s_idx: int, e_idx: int) -> str:
    """Decode token span back to text"""
    if e_idx < s_idx:
        return ""
    tokens = inputs["input_ids"][0][s_idx:e_idx+1]
    return _tokenizer.decode(tokens, skip_special_tokens=True).strip()

def decide_answer(question: str, passages: List[Dict[str, Any]], tau: float = 1.5) -> Dict[str, Any]:
    """
    Strict extractive QA with abstain logic
    
    Args:
        question: User question
        passages: List of {text, metadata, distance} from retrieval
        tau: Abstain threshold (higher = more conservative)
    
    Returns:
        {action, answer, confidence_docqa, citations, debug_info}
    """
    if not passages:
        return {
            "action": "flag", 
            "answer": "", 
            "confidence_docqa": 0.0, 
            "citations": [],
            "debug_info": {"reason": "no_passages"}
        }
    
    best = None
    candidates = []
    
    for p in passages:
        try:
            res = _qa_on_context(question, p["text"])
            delta = res["s_null"] - res["s_best"]
            span = _decode_span(res["inputs"], res["start_idx"], res["end_idx"])
            
            cand = {
                "delta": delta, 
                "span": span,
                "s_best": res["s_best"], 
                "s_null": res["s_null"],
                "meta": p["metadata"], 
                "ctx": p["text"],
                "retrieval_distance": p["distance"]
            }
            candidates.append(cand)
            
            # Keep the smallest delta (strongest evidence)
            if best is None or cand["delta"] < best["delta"]:
                best = cand
                
        except Exception as e:
            # Log but continue with other passages
            print(f"QA error on passage: {e}")
            continue

    if best is None or not best["span"]:
        return {
            "action": "flag", 
            "answer": "", 
            "confidence_docqa": 0.0, 
            "citations": [],
            "debug_info": {"reason": "no_valid_spans", "candidates_count": len(candidates)}
        }

    # Abstain if delta >= tau (null score too close to best)
    if best["delta"] >= tau:
        return {
            "action": "flag", 
            "answer": "", 
            "confidence_docqa": 1.0 / (1.0 + best["delta"]), 
            "citations": [],
            "debug_info": {
                "reason": "abstain", 
                "delta": best["delta"], 
                "tau": tau,
                "best_span": best["span"]
            }
        }

    # Answer with extracted span
    conf = 1.0 / (1.0 + max(0.0, best["delta"]))
    citation = {
        "doc_id": best["meta"]["doc_id"],
        "chunk_idx": best["meta"]["chunk_idx"],
        "start": best["meta"]["start"],
        "end": best["meta"]["end"],
        "quote": best["span"],
        "retrieval_distance": best["retrieval_distance"]
    }
    
    return {
        "action": "answer",
        "answer": best["span"],
        "confidence_docqa": conf,
        "citations": [citation],
        "debug_info": {
            "delta": best["delta"],
            "s_best": best["s_best"],
            "s_null": best["s_null"],
            "candidates_evaluated": len(candidates)
        }
    }
