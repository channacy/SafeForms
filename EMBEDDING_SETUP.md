# OpenAI Text Embedding 3 Small Setup

This setup provides a complete solution for using OpenAI's `text-embedding-3-small` model with ChromaDB for vector storage and similarity search.

## Quick Start

### 1. Set up your environment

```bash
# Activate the virtual environment
source .venv/bin/activate

# Set your OpenAI API key
export OPENAI_API_KEY='your-api-key-here'
```

### 2. Test the setup

```bash
python test_embeddings.py
```

### 3. Use in your code

```python
from embedding_setup import EmbeddingManager

# Initialize
embedding_manager = EmbeddingManager()

# Embed single text
embedding = embedding_manager.embed_text("Your text here")

# Create vector store from documents
documents = ["Doc 1", "Doc 2", "Doc 3"]
vectorstore = embedding_manager.create_vector_store(documents)

# Search
results = vectorstore.similarity_search("query", k=3)
```

## Features

### EmbeddingManager Class

- **Text Embedding**: Convert text to vector embeddings using OpenAI's text-embedding-3-small
- **Document Processing**: Automatically split long documents into chunks
- **Vector Storage**: Store embeddings in ChromaDB for efficient similarity search
- **Persistence**: Save and load vector stores to/from disk

### Key Methods

- `embed_text(text)`: Embed a single text string
- `embed_documents(documents)`: Embed multiple documents
- `create_vector_store(documents)`: Create a new vector store
- `load_vector_store(directory)`: Load existing vector store

## Model Information

- **Model**: `text-embedding-3-small`
- **Dimensions**: 1536 (default)
- **Max Input**: 8191 tokens
- **Use Cases**: Semantic search, clustering, recommendations, anomaly detection

## Configuration

### Environment Variables

```bash
export OPENAI_API_KEY='your-api-key-here'
```

### Optional Parameters

```python
# Custom embedding settings
embeddings = OpenAIEmbeddings(
    model="text-embedding-3-small",
    dimensions=512,  # Reduce dimensions if needed
    chunk_size=1000  # Batch size for API calls
)

# Custom text splitting
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,    # Size of each chunk
    chunk_overlap=200,  # Overlap between chunks
)
```

## Example Use Cases

### 1. Document Search

```python
# Index your documents
documents = ["Doc content 1", "Doc content 2", ...]
vectorstore = embedding_manager.create_vector_store(documents)

# Search
results = vectorstore.similarity_search("find relevant docs", k=5)
```

### 2. Semantic Similarity

```python
# Compare texts
text1_embedding = embedding_manager.embed_text("First text")
text2_embedding = embedding_manager.embed_text("Second text")

# Calculate cosine similarity (you'll need to implement this)
```

### 3. Content Recommendations

```python
# Create embeddings for all content
vectorstore = embedding_manager.create_vector_store(all_content)

# Find similar content
user_query = "user's current interest"
recommendations = vectorstore.similarity_search(user_query, k=10)
```


## Files

- `embedding_setup.py`: Main embedding manager class
- `test_embeddings.py`: Test script to verify setup
- `requirements.txt`: Python dependencies
- `env_example.txt`: Environment variable template
