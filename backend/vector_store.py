import chromadb
import re
import os

client = chromadb.PersistentClient(path="./chroma_db")
_collection = None
_configured_dimension = None

def sanitize_name(name: str) -> str:
    # ChromaDB collection names must be 3-63 characters and alphanumeric
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
    sanitized = sanitized.strip('_')
    if len(sanitized) < 3:
        sanitized = sanitized + "_col"
    return sanitized[:63]

def init_vector_store(provider: str, model: str, dimension: int):
    global _collection, _configured_dimension
    _configured_dimension = dimension
    
    # MIGRATION STRATEGY: Option A
    # Automatically create a new collection whose name contains the embedding model/version
    # This completely eliminates dimension collision errors.
    base_name = os.getenv("COLLECTION_BASE_NAME", "documents")
    suffix = sanitize_name(f"{provider}_{model}")
    col_name = f"{base_name}_{suffix}"[:63]
    
    try:
        col = client.get_collection(name=col_name)
        
        # Verify existing collection metadata
        col_meta = col.metadata or {}
        old_provider = col_meta.get("provider", "unknown")
        old_model = col_meta.get("model", "unknown")
        old_dim = col_meta.get("dimension")
        
        if old_dim is not None and int(old_dim) != dimension:
            raise ValueError(
                f"\n[FATAL ERROR] Collection Dimension Mismatch during Startup!\n"
                f"Existing collection '{col_name}':\n"
                f"    provider: {old_provider}\n"
                f"    model: {old_model}\n"
                f"    dimension: {old_dim}\n\n"
                f"Current configuration:\n"
                f"    provider: {provider}\n"
                f"    model: {model}\n"
                f"    dimension: {dimension}\n\n"
                f"Reason: A Chroma collection cannot contain embeddings with different dimensions. "
                f"Changing embedding models requires rebuilding the vector database. "
                f"Migration Strategy A has tried to resolve this by appending the model name, but the dimension for '{model}' seems to have changed internally. "
                f"Please clear the database or use a new COLLECTION_BASE_NAME."
            )
            
        _collection = col
        print(f"[DEBUG] Loaded existing collection '{col_name}' with dimension {dimension}.")
        
    except ValueError as e:
        if "does not exist" in str(e).lower() or "missing" in str(e).lower():
            # Collection does not exist, create it
            _collection = client.create_collection(
                name=col_name,
                metadata={
                    "hnsw:space": "cosine",
                    "provider": provider,
                    "model": model,
                    "dimension": dimension
                }
            )
            print(f"[DEBUG] Created NEW collection '{col_name}' for model '{model}' with dimension {dimension}.")
        else:
            raise e
            
    return _collection

def get_collection():
    if _collection is None:
        raise RuntimeError("Vector store not initialized. Call init_vector_store first.")
    return _collection

def validate_dimensions(embeddings: list[list[float]]):
    if not _collection:
        raise RuntimeError("Collection not loaded.")
    
    expected_dim = _configured_dimension
    if not expected_dim and _collection.metadata:
        expected_dim = int(_collection.metadata.get("dimension", len(embeddings[0])))
        
    for i, emb in enumerate(embeddings):
        if len(emb) != expected_dim:
            raise ValueError(f"Embedding dimension mismatch before insertion at index {i}: expected {expected_dim}, got {len(emb)}")