import chromadb

client = chromadb.PersistentClient(path="./chroma_db")

collection = client.get_or_create_collection(
    name="faculty_notes"
)

def get_collection():
    return collection