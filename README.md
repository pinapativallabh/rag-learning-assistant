# RAG Learning Assistant (Full-Stack AI System)

A full-stack AI-powered learning assistant built using FastAPI and React.  
The system uses Retrieval-Augmented Generation (RAG) to answer questions strictly from uploaded documents, reducing hallucinations and improving contextual accuracy.

---

## Overview

This project implements a complete RAG pipeline:

1. Users upload documents (PDF/text).
2. Documents are chunked and embedded.
3. Embeddings are stored in a vector database.
4. Relevant chunks are retrieved based on semantic similarity.
5. Retrieved context is passed to an LLM.
6. The LLM generates grounded answers.
7. Users can take adaptive quizzes and track progress.

The system is designed to demonstrate backend architecture, vector search, LLM integration, and full-stack communication.

---

## Features

- Document upload and ingestion
- Text chunking for retrieval
- Vector similarity search
- LLM-based contextual answering
- Adaptive quiz generation
- Progress tracking with persistent storage
- Full-stack integration (FastAPI + React)

---

## Architecture

```
User (Frontend - React)
        ↓
FastAPI Backend
        ↓
Document Processing (Chunking)
        ↓
Vector Store (ChromaDB)
        ↓
LLM (Ollama / LLaMA3)
        ↓
Response returned to frontend
```

---

## Tech Stack

### Backend
- Python
- FastAPI
- ChromaDB
- SQLite
- Ollama (LLaMA3)

### Frontend
- React (Vite)
- JavaScript
- CSS

---

## Project Structure

```
rag-learning-assistant/
├── backend/
│   ├── main.py
│   ├── db.py
│   ├── vector_store.py
│   ├── data/
│   ├── uploads/
│   └── ...
├── frontend/
│   ├── src/
│   ├── public/
│   └── ...
├── .gitignore
└── README.md
```

---

## Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/pinapativallabh/rag-learning-assistant.git
cd rag-learning-assistant
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate environment:

**Windows**
```bash
venv\Scripts\activate
```

**Mac/Linux**
```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run backend:

```bash
uvicorn main:app --reload
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

## Example Workflow

1. Upload a document.
2. Ask a question related to the document.
3. System retrieves relevant chunks.
4. LLM generates grounded response.
5. User can attempt adaptive quiz.
6. Progress is stored and tracked.

---

## Example API Request

```
POST /ask
Content-Type: application/json

{
  "question": "Explain the main concept from chapter 2."
}
```

Example response:

```json
{
  "answer": "The main concept discussed in chapter 2 is..."
}
```

---

## Engineering Highlights

- Modular backend design
- Separation of retrieval logic from API layer
- Persistent storage for tracking user progress
- Vector search for semantic relevance
- Full-stack integration between frontend and backend

---

## Future Improvements

- Authentication and user accounts
- Cloud deployment (Render / Railway / AWS)
- Caching for faster retrieval
- Unit tests and integration tests
- Docker containerization

---

## Author

Vallabh  
B.Tech CSE | Backend & AI Systems Developer

---

## Summary

This project demonstrates:

- End-to-end RAG pipeline implementation
- Backend API development with FastAPI
- Vector database integration
- LLM grounding techniques
- Full-stack system integration

Designed as a production-style backend system rather than a simple academic prototype.
