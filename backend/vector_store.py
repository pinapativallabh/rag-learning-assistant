import chromadb

client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_or_create_collection(
    name="faculty_notes_v2",
    metadata={"hnsw:space": "cosine"}
)

def get_collection():
    return collection