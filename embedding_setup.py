
import os
from typing import List
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter

class EmbeddingManager:
    """Manages OpenAI embeddings and vector storage"""
    
    def __init__(self, api_key: str = None):
        """
        Initialize the embedding manager
        
        Args:
            api_key: OpenAI API key. If None, will look for OPENAI_API_KEY environment variable
        """
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
        elif not os.getenv("OPENAI_API_KEY"):
            raise ValueError("OpenAI API key must be provided either as parameter or OPENAI_API_KEY environment variable")
        
        # Initialize OpenAI embeddings with text-embedding-3-small
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            # Optional parameters:
            # dimensions=1536,  # Default dimension for text-embedding-3-small
            # chunk_size=1000,  # Number of texts to embed at once
        )
        
        # Initialize text splitter for document processing
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=100,
            separators=["\n\n", "\n", " ", ""]
            length_function=len,
        )
    
    def embed_text(self, text: str) -> List[float]:
        """
        Embed a single text string
        
        Args:
            text: Text to embed
            
        Returns:
            List of float values representing the embedding
        """
        return self.embeddings.embed_query(text)
    
    def embed_documents(self, documents: List[str]) -> List[List[float]]:
        """
        Embed multiple documents
        
        Args:
            documents: List of documents to embed
            
        Returns:
            List of embeddings
        """
        return self.embeddings.embed_documents(documents)
    
    def create_vector_store(self, documents: List[str], persist_directory: str = "./chroma_db"):
        """
        Create a Chroma vector store from documents
        
        Args:
            documents: List of documents to store
            persist_directory: Directory to persist the vector store
            
        Returns:
            Chroma vector store instance
        """
        # Split documents into chunks
        texts = []
        for doc in documents:
            chunks = self.text_splitter.split_text(doc)
            texts.extend(chunks)
        
        # Create vector store
        vectorstore = Chroma.from_texts(
            texts=texts,
            embedding=self.embeddings,
            persist_directory=persist_directory
        )
        
        return vectorstore
    
    def load_vector_store(self, persist_directory: str = "./chroma_db"):
        """
        Load an existing Chroma vector store
        
        Args:
            persist_directory: Directory where vector store is persisted
            
        Returns:
            Chroma vector store instance
        """
        return Chroma(
            persist_directory=persist_directory,
            embedding_function=self.embeddings
        )


def example_usage():
    """Example of how to use the EmbeddingManager"""
    
    # Initialize
    # Option 1: Set environment variable
    # os.environ["OPENAI_API_KEY"] = "your-api-key-here"
    
    # Option 2: Pass directly (not recommended for production)
    # embedding_manager = EmbeddingManager(api_key="your-api-key-here")
    
    try:
        embedding_manager = EmbeddingManager()
        
        # Example 1: Embed a single text
        text = "This is a sample text for embedding."
        embedding = embedding_manager.embed_text(text)
        print(f"Embedding dimension: {len(embedding)}")
        print(f"First 5 values: {embedding[:5]}")
        
        # Example 2: Embed multiple documents
        documents = [
            "SafeForms is a secure form management system.",
            "It provides encryption and data protection features.",
            "Users can create, manage, and analyze form submissions safely."
        ]
        
        embeddings = embedding_manager.embed_documents(documents)
        print(f"Number of document embeddings: {len(embeddings)}")
        
        # Example 3: Create a vector store
        vectorstore = embedding_manager.create_vector_store(documents)
        
        # Example 4: Search in vector store
        query = "form security features"
        results = vectorstore.similarity_search(query, k=2)
        
        print(f"\nSearch results for '{query}':")
        for i, result in enumerate(results):
            print(f"{i+1}. {result.page_content}")
        
        # Example 5: Search with scores
        results_with_scores = vectorstore.similarity_search_with_score(query, k=2)
        print(f"\nSearch results with similarity scores:")
        for result, score in results_with_scores:
            print(f"Score: {score:.4f} - {result.page_content}")
            
    except ValueError as e:
        print(f"Error: {e}")
        print("Please set your OpenAI API key:")
        print("export OPENAI_API_KEY='your-api-key-here'")


if __name__ == "__main__":
    example_usage()
