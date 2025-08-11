import os
import pickle
import re
from typing import Dict, List, Tuple
from sklearn.neighbors import NearestNeighbors
from sentence_transformers import SentenceTransformer

POLICY_DIR = "app/api/pseudo_dataset/policies"
INDEX_PATH = "./sklearn_index.pkl"
METADATA_PATH = "./sklearn_metadata.pkl"

def _read_policies() -> Dict[str, str]:
    """Load all .md files from policy directory"""
    out = {}
    if not os.path.exists(POLICY_DIR):
        return out
    for fname in os.listdir(POLICY_DIR):
        if fname.endswith(".md"):
            with open(os.path.join(POLICY_DIR, fname), "r", encoding="utf-8") as f:
                out[fname] = f.read()
    return out

def _chunks(text: str, max_chars: int = 1400, overlap: int = 200) -> List[Tuple[int, int, str]]:
    """Chunk text with overlap for better retrieval"""
    text = re.sub(r"\s+", " ", text).strip()
    n = len(text)
    i = 0
    out = []
    while i < n:
        j = min(n, i + max_chars)
        chunk_text = text[i:j].strip()
        if chunk_text:  # Skip empty chunks
            out.append((i, j, chunk_text))
        i = j - overlap if j < n else j
    return out

def build_index(reset: bool = False):
    """Build sklearn NearestNeighbors index with BGE embeddings and proper chunking"""
    if reset:
        # Remove existing index files
        for path in [INDEX_PATH, METADATA_PATH]:
            if os.path.exists(path):
                os.remove(path)
    
    # Check if index already exists
    if not reset and os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
        print("Index already exists. Use reset=True to rebuild.")
        return load_index()

    # Load BGE model
    bge = SentenceTransformer("BAAI/bge-small-en-v1.5")
    
    policies = _read_policies()
    texts, metadatas = [], []
    
    for doc_id, text in policies.items():
        for idx, (s, e, chunk) in enumerate(_chunks(text)):
            texts.append(chunk)
            metadatas.append({
                "doc_id": doc_id, 
                "chunk_idx": idx,
                "start": s, 
                "end": e,
                "length": len(chunk),
                "text": chunk  # Store text in metadata for retrieval
            })

    if not texts:
        print("No texts found to index")
        return None

    # Generate embeddings
    print(f"Generating embeddings for {len(texts)} chunks...")
    embeddings = bge.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    
    # Build sklearn NearestNeighbors index
    index = NearestNeighbors(n_neighbors=10, metric='cosine', algorithm='brute')
    index.fit(embeddings)
    
    # Save index and metadata
    index_data = {
        "index": index,
        "embeddings": embeddings,
        "metadata": metadatas
    }
    
    with open(INDEX_PATH, "wb") as f:
        pickle.dump(index_data, f)
    
    with open(METADATA_PATH, "wb") as f:
        pickle.dump(metadatas, f)
    
    print(f"Indexed {len(texts)} chunks from {len(policies)} policies")
    return index_data

def load_index():
    """Load existing sklearn index and metadata"""
    if not os.path.exists(INDEX_PATH):
        return None
    
    with open(INDEX_PATH, "rb") as f:
        index_data = pickle.load(f)
    
    return index_data

if __name__ == "__main__":
    # Build index on import or run directly
    build_index(reset=True)
