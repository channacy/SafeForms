#!/usr/bin/env python3
"""
Quick test script for OpenAI embeddings setup
"""

import os
import sys
from embedding_setup import EmbeddingManager

def test_embeddings():
    """Test the embedding setup"""
    print("Testing OpenAI text-embedding-3-small setup...")
    
    # Check if API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY environment variable not set")
        print("Please run: export OPENAI_API_KEY='your-api-key-here'")
        return False
    
    try:
        # Initialize embedding manager
        print("🔄 Initializing embedding manager...")
        embedding_manager = EmbeddingManager()
        
        # Test single text embedding
        print("🔄 Testing single text embedding...")
        test_text = "SafeForms provides secure form management capabilities."
        embedding = embedding_manager.embed_text(test_text)
        
        print(f"✅ Successfully created embedding!")
        print(f"   Text: '{test_text}'")
        print(f"   Embedding dimension: {len(embedding)}")
        print(f"   First 3 values: [{embedding[0]:.6f}, {embedding[1]:.6f}, {embedding[2]:.6f}]")
        
        # Test multiple documents
        print("\n🔄 Testing multiple document embeddings...")
        test_docs = [
            "Form security is important for data protection.",
            "Users need easy-to-use form builders.",
            "Analytics help understand form performance."
        ]
        
        embeddings = embedding_manager.embed_documents(test_docs)
        print(f"✅ Successfully embedded {len(embeddings)} documents!")
        
        # Test vector store creation
        print("\n🔄 Testing vector store creation...")
        vectorstore = embedding_manager.create_vector_store(test_docs, persist_directory="./test_chroma_db")
        
        # Test similarity search
        query = "data security features"
        results = vectorstore.similarity_search(query, k=2)
        
        print(f"✅ Vector store created and search completed!")
        print(f"   Query: '{query}'")
        print(f"   Top results:")
        for i, result in enumerate(results):
            print(f"   {i+1}. {result.page_content}")
        
        print("\n🎉 All tests passed! Embedding setup is working correctly.")
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_embeddings()
    sys.exit(0 if success else 1)
