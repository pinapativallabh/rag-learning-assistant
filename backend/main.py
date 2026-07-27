from fastapi import FastAPI, UploadFile, File, Body
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import fitz

import re
import json
import os
import uuid
import asyncio
import hashlib

from langchain_text_splitters import RecursiveCharacterTextSplitter
from vector_store import get_collection, init_vector_store, validate_dimensions
from ai_provider import AIProvider

from db import (
    init_db,
    save_result,
    get_student_stats,
    get_wrong_questions,
    get_all_students,
    get_student_summary,
    get_recent_wrong_questions,
    get_wrong_summary,
    get_topic_progress,
    save_parent_chunks,
    get_parent_chunks,
    get_parent_chunk_by_no,
    get_cached_response,
    save_cached_response
)

from fastapi.middleware.cors import CORSMiddleware

init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.on_event("startup")
async def startup_event():
    print("[DEBUG] Running startup validation...")
    try:
        # Determine current embedding configuration
        client = AIProvider.get_embedding_client()
        provider = os.getenv("EMBEDDING_PROVIDER", "unknown")
        model = os.getenv("EMBEDDING_MODEL", "unknown")
        
        # Embed a dummy string to reliably determine the configured dimension
        dummy_embedding = await client.embed("test dimension")
        dimension = len(dummy_embedding)
        print(f"[DEBUG] Determined embedding dimension: {dimension}")
        
        # Initialize vector store with strict dimension checking
        init_vector_store(provider, model, dimension)
        print("[DEBUG] Startup validation complete.")
    except Exception as e:
        print(f"[FATAL] Startup validation failed: {e}")
        import sys
        sys.exit(1)

# ---------- Embedding and Cache Helpers ----------
async def get_embeddings_async(texts: list[str]) -> list[list[float]]:
    client = AIProvider.get_embedding_client()
    return await client.embed_batch(texts)


def get_md5_hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


# ---------- Models ----------
class SummaryRequest(BaseModel):
    file_id: str


class QuizRequest(BaseModel):
    file_id: str
    num_questions: int = 5


class SubmitQuizRequest(BaseModel):
    student_id: str
    file_id: str
    responses: list


class ProgressRequest(BaseModel):
    student_id: str
    file_id: str


class TeacherDashboardRequest(BaseModel):
    file_id: str


class AdaptiveQuizRequest(BaseModel):
    student_id: str
    file_id: str
    num_questions: int = 5


# ---------- System Info ----------
@app.get("/api/health")
def health_check():
    import os
    from ai_provider import AIProvider
    try:
        client = AIProvider.get_chat_client()
        provider = os.getenv("AI_PROVIDER", "unknown").lower().strip()
        model_name = client.model_name
    except Exception as e:
        provider = "unknown"
        model_name = "unknown"
    return {
        "status": "Backend running",
        "llm_provider": provider,
        "llm_model": model_name
    }


def process_pdf_to_chunks(save_path: str, file_id: str):
    doc = fitz.open(save_path)
    full_text = ""
    for page in doc:
        full_text += page.get_text()

    if not full_text.strip():
        raise ValueError("PDF is empty or has no readable text")

    # Parent chunking (large chunks for context)
    parent_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1200,
        chunk_overlap=200
    )
    parent_chunks = parent_splitter.split_text(full_text)

    if not parent_chunks:
        raise ValueError("No content could be extracted from the PDF")

    # Child chunking (small chunks with overlap)
    child_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=50
    )

    child_texts = []
    child_ids = []
    child_metadatas = []

    for parent_idx, parent_text in enumerate(parent_chunks):
        split_children = child_splitter.split_text(parent_text)
        for child_idx, child_text in enumerate(split_children):
            child_texts.append(child_text)
            child_ids.append(f"{file_id}_child_{parent_idx}_{child_idx}")
            child_metadatas.append({
                "file_id": file_id,
                "parent_chunk_no": parent_idx + 1  # 1-indexed
            })

    return parent_chunks, child_texts, child_ids, child_metadatas


# ---------- Upload PDF ----------
@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files allowed"}

    file_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

    # Run blocking file write in a background thread to unblock main thread
    def write_file_sync():
        with open(save_path, "wb") as f:
            f.write(file.file.read())

    await asyncio.to_thread(write_file_sync)

    try:
        # Offload text extraction and chunking to a thread pool
        parent_chunks, child_texts, child_ids, child_metadatas = await asyncio.to_thread(
            process_pdf_to_chunks, save_path, file_id
        )
    except ValueError as ve:
        return {"error": str(ve)}
    except Exception as e:
        return {"error": f"Failed to process PDF: {str(e)}"}

    # Save parent chunks in SQLite (runs in background thread)
    await asyncio.to_thread(save_parent_chunks, file_id, parent_chunks)

    # Generate embeddings asynchronously in parallel using AsyncClient (non-blocking)
    child_embeddings = await get_embeddings_async(child_texts)

    collection = get_collection()
    
    print("\n[DEBUG] --- HARD VALIDATION START ---")
    print(f"[DEBUG] len(chunks) = {len(child_texts)}")
    print(f"[DEBUG] len(ids) = {len(child_ids)}")
    print(f"[DEBUG] len(metadatas) = {len(child_metadatas)}")
    print(f"[DEBUG] len(embeddings) = {len(child_embeddings)}")
    
    if not (len(child_texts) == len(child_ids) == len(child_metadatas) == len(child_embeddings)):
        raise ValueError(f"Number of embeddings {len(child_embeddings)} must match number of ids {len(child_ids)}")
        
    for i, emb in enumerate(child_embeddings):
        if emb is None:
            raise ValueError(f"Embedding at index {i} is None")
        if not isinstance(emb, list):
            raise ValueError(f"Embedding at index {i} is not a list, got {type(emb)}")
        if len(emb) == 0:
            raise ValueError(f"Embedding at index {i} is empty")
        if i > 0 and len(emb) != len(child_embeddings[0]):
            raise ValueError(f"Embedding dimension mismatch at index {i}: expected {len(child_embeddings[0])}, got {len(emb)}")
            
    if len(set(child_ids)) != len(child_ids):
        raise ValueError("Duplicate IDs found in child_ids")
        
    # Validate against vector store configuration
    validate_dimensions(child_embeddings)
        
    print("[DEBUG] --- HARD VALIDATION PASSED ---\n")
    
    # Store child chunks in ChromaDB (runs in background thread)
    await asyncio.to_thread(
        collection.add,
        documents=child_texts,
        embeddings=child_embeddings,
        ids=child_ids,
        metadatas=child_metadatas
    )

    return {
        "message": "PDF uploaded, chunked (parent-child), and indexed",
        "file_id": file_id,
        "parent_chunks_stored": len(parent_chunks),
        "child_chunks_stored": len(child_texts)
    }


# ---------- Ask (Synchronous) ----------
@app.post("/ask/")
async def ask_question(file_id: str = Body(...), question: str = Body(...)):
    collection = get_collection()

    # Get query embedding
    embed_client = AIProvider.get_embedding_client()
    try:
        query_embedding = await embed_client.embed(question)
    except Exception as e:
        print("Embedding error in ask:", e)
        return {"answer": "Error generating query embeddings.", "chunks_used": []}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=8,
        where={"file_id": file_id}
    )

    retrieved_meta = (results.get("metadatas") or [[]])[0]

    if not retrieved_meta:
        return {
            "answer": "Not provided in PDF.",
            "chunks_used": []
        }

    # Gather unique parent chunk numbers
    parent_nos = []
    seen_parents = set()
    for meta in retrieved_meta:
        if meta and "parent_chunk_no" in meta:
            p_no = meta["parent_chunk_no"]
            if p_no not in seen_parents:
                seen_parents.add(p_no)
                parent_nos.append(p_no)

    # Sort parent chunk numbers so context flows logically in order of the document
    parent_nos.sort()

    parent_texts = []
    for p_no in parent_nos:
        text = get_parent_chunk_by_no(file_id, p_no)
        if text:
            parent_texts.append((p_no, text))

    if not parent_texts:
        return {
            "answer": "Not provided in PDF.",
            "chunks_used": []
        }

    context = "\n\n".join([
        f"[Chunk {p_no}] {text}"
        for p_no, text in parent_texts
    ])

    prompt = f"""
You are an assistant answering questions based ONLY on the provided context.

Rules:
- Base your answer strictly on the text provided below.
- If the question asks for a general summary, topics, or an outline, provide the best answer you can using the context provided.
- If the answer to a specific factual question is completely absent from the context, reply exactly:
Not provided in PDF.

Context:
{context}

Question:
{question}
"""

    llm_client = AIProvider.get_chat_client()
    cache_key = get_md5_hash(f"{llm_client.model_name}_ask_" + prompt)
    cached = get_cached_response(cache_key)
    if cached:
        return {
            "answer": cached,
            "chunks_used": [p_no for p_no, _ in parent_texts],
            "cached": True
        }

    try:
        answer = await llm_client.chat(prompt)
        answer = answer.strip()
    except Exception as e:
        print("LLM error in ask:", e)
        return {"answer": "Failed to connect to LLM server.", "chunks_used": []}

    if "not provided" in answer.lower():
        answer = "Not provided in PDF."

    save_cached_response(cache_key, answer)

    return {
        "answer": answer,
        "chunks_used": [p_no for p_no, _ in parent_texts]
    }


# ---------- Ask (Streaming) ----------
@app.post("/ask-stream/")
async def ask_question_stream(file_id: str = Body(...), question: str = Body(...)):
    async def event_generator():
        collection = get_collection()
        embed_client = AIProvider.get_embedding_client()

        # Get query embedding
        try:
            query_embedding = await embed_client.embed(question)
        except Exception as e:
            yield json.dumps({"type": "content", "text": f"Error generating query embeddings: {str(e)}"}) + "\n"
            return

        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=8,
            where={"file_id": file_id}
        )

        retrieved_meta = (results.get("metadatas") or [[]])[0]
        if not retrieved_meta:
            yield json.dumps({"type": "metadata", "chunks_used": [], "cached": False}) + "\n"
            yield json.dumps({"type": "content", "text": "Not provided in PDF."}) + "\n"
            return

        # Gather unique parent chunk numbers
        parent_nos = []
        seen_parents = set()
        for meta in retrieved_meta:
            if meta and "parent_chunk_no" in meta:
                p_no = meta["parent_chunk_no"]
                if p_no not in seen_parents:
                    seen_parents.add(p_no)
                    parent_nos.append(p_no)

        parent_nos.sort()

        parent_texts = []
        for p_no in parent_nos:
            text = get_parent_chunk_by_no(file_id, p_no)
            if text:
                parent_texts.append((p_no, text))

        if not parent_texts:
            yield json.dumps({"type": "metadata", "chunks_used": [], "cached": False}) + "\n"
            yield json.dumps({"type": "content", "text": "Not provided in PDF."}) + "\n"
            return

        context = "\n\n".join([
            f"[Chunk {p_no}] {text}"
            for p_no, text in parent_texts
        ])

        prompt = f"""
You are an assistant answering questions based ONLY on the provided context.

Rules:
- Base your answer strictly on the text provided below.
- If the question asks for a general summary, topics, or an outline, provide the best answer you can using the context provided.
- If the answer to a specific factual question is completely absent from the context, reply exactly:
Not provided in PDF.

Context:
{context}

Question:
{question}
"""

        llm_client = AIProvider.get_chat_client()
        cache_key = get_md5_hash(f"{llm_client.model_name}_ask_" + prompt)
        cached = get_cached_response(cache_key)
        
        chunk_numbers = [p_no for p_no, _ in parent_texts]

        if cached:
            yield json.dumps({"type": "metadata", "chunks_used": chunk_numbers, "cached": True}) + "\n"
            # Stream the cached answer back with micro-delays
            words = cached.split(" ")
            for i, word in enumerate(words):
                space = " " if i < len(words) - 1 else ""
                yield json.dumps({"type": "content", "text": word + space}) + "\n"
                await asyncio.sleep(0.01)
            return

        yield json.dumps({"type": "metadata", "chunks_used": chunk_numbers, "cached": False}) + "\n"

        full_answer = ""
        try:
            async for content in llm_client.chat_stream(prompt):
                if content:
                    full_answer += content
                    yield json.dumps({"type": "content", "text": content}) + "\n"
        except Exception as e:
            yield json.dumps({"type": "content", "text": f"\nError from LLM server: {str(e)}"}) + "\n"
            return

        # Save to cache if valid
        if full_answer:
            if "not provided" in full_answer.lower():
                # Correct it to the standard response
                full_answer = "Not provided in PDF."
            save_cached_response(cache_key, full_answer.strip())

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


# ---------- Summary ----------
@app.post("/summarize/")
async def summarize_pdf(req: SummaryRequest):
    # Fetch parent chunks from SQLite (guarantees correct document order)
    parent_docs = get_parent_chunks(req.file_id, limit=12)

    if not parent_docs:
        return {"error": "No content found"}

    combined_text = "\n\n".join(parent_docs)

    prompt = f"""
Summarize the document into:
1. A comprehensive and genuinely useful summary (at least 2-3 paragraphs) capturing the essence of the document.
2. Key topics
3. Important terms

Material:
{combined_text}
"""

    llm_client = AIProvider.get_chat_client()
    cache_key = get_md5_hash(f"{llm_client.model_name}_summary_" + prompt)
    cached = get_cached_response(cache_key)
    if cached:
        return {
            "file_id": req.file_id,
            "summary": cached,
            "cached": True
        }

    try:
        summary = await llm_client.chat(prompt)
    except Exception as e:
        return {"error": f"LLM error: {str(e)}"}

    save_cached_response(cache_key, summary)

    return {
        "file_id": req.file_id,
        "summary": summary
    }


# ---------- Quiz ----------
@app.post("/generate-quiz/")
async def generate_quiz(req: QuizRequest):
    # Fetch parent chunks from SQLite (guarantees correct document order)
    parent_docs = get_parent_chunks(req.file_id, limit=8)

    if not parent_docs:
        return {"error": "No content found"}

    combined_text = "\n\n".join(parent_docs)

    prompt = f"""
Generate {req.num_questions} MCQs.

Return ONLY valid JSON.

Format:
[
  {{
    "question": "...",
    "topic": "...",
    "options": {{
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "..."
    }},
    "answer": "A"
  }}
]

Material:
{combined_text}
"""

    llm_client = AIProvider.get_chat_client()
    cache_key = get_md5_hash(f"{llm_client.model_name}_quiz_" + prompt)
    cached = get_cached_response(cache_key)
    
    quiz_list = []
    raw = ""

    if cached:
        raw = cached
    else:
        try:
            raw = await llm_client.chat(prompt)
            save_cached_response(cache_key, raw)
        except Exception as e:
            return {"error": f"LLM error: {str(e)}", "quiz": []}

    match = re.search(r'\[[\s\S]*\]', raw)
    if not match:
        return {"quiz": [], "raw_output": raw}

    json_text = match.group(0)
    try:
        quiz_list = json.loads(json_text)
    except Exception as e:
        print("JSON ERROR in generate_quiz:", e)
        quiz_list = []

    return {
        "file_id": req.file_id,
        "quiz": quiz_list
    }


# ---------- Submit Quiz ----------
@app.post("/submit-quiz/")
async def submit_quiz(req: SubmitQuizRequest):
    correct_count = 0
    attempt_id = str(uuid.uuid4())

    for r in req.responses:
        question = r["question"]
        topic = r["topic"]
        selected = r["selected"]
        correct = r["correct"]

        is_correct = 1 if selected == correct else 0

        if is_correct:
            correct_count += 1

        save_result(
            student_id=req.student_id,
            file_id=req.file_id,
            attempt_id=attempt_id,
            topic=topic,
            question=question,
            selected_option=selected,
            correct_option=correct,
            is_correct=is_correct
        )

    total = len(req.responses)
    percentage = (correct_count / total) * 100 if total > 0 else 0

    return {
        "student_id": req.student_id,
        "score": f"{correct_count}/{total}",
        "percentage": percentage
    }


# ---------- Progress ----------
@app.post("/student-progress/")
async def student_progress(req: ProgressRequest):
    total, correct = get_student_stats(req.student_id, req.file_id)

    wrongs = get_wrong_questions(req.student_id, req.file_id)
    wrong_summary = get_wrong_summary(req.student_id, req.file_id)

    topic_rows = get_topic_progress(req.student_id, req.file_id)

    accuracy = (correct / total) * 100 if total > 0 else 0

    wrong_list = []
    for w in wrongs:
        wrong_list.append({
            "question": w[0],
            "selected": w[1],
            "correct": w[2]
        })

    topic_progress = []
    for topic, total_q, correct_q in topic_rows:
        percent = int((correct_q / total_q) * 100) if total_q > 0 else 0
        topic_progress.append({
            "topic": topic,
            "total": total_q,
            "correct": correct_q,
            "progress": percent
        })

    recommendation = "No topic data yet."
    if topic_progress:
        weakest = min(topic_progress, key=lambda x: x["progress"])
        if weakest["progress"] < 50:
            recommendation = f"Strongly concentrate on {weakest['topic']} before moving ahead."
        elif weakest["progress"] < 80:
            recommendation = f"Practice more questions in {weakest['topic']}."
        elif all(t["progress"] == 100 for t in topic_progress):
            recommendation = "All current topics are mastered. Move to a new topic."
        else:
            recommendation = f"Review {weakest['topic']} once more, then continue."

    roadmap = "No wrong answers yet."

    if len(wrong_summary) > 0:
        wrong_questions_text = "\n".join([f"- {w[0]}" for w in wrong_summary])
        weak_topics_text = "\n".join([
            f"- {t['topic']}" for t in topic_progress if t["progress"] < 80
        ])

        prompt = f"""
Below are questions the student answered incorrectly.

Weak topics:
{weak_topics_text}

Wrong questions:
{wrong_questions_text}

Analyze the mistakes and identify:

1. Weak topics involved
2. Why the student may be struggling
3. A practical learning roadmap

The roadmap must include:
- concepts to revise first
- what to practice next
- suggested order of study
- how to improve accuracy

Return clearly in this format:

Weak Topics:
- ...

Reason:
- ...

Roadmap:
1. ...
2. ...
3. ...
"""
        llm_client = AIProvider.get_chat_client()
        cache_key = get_md5_hash(f"{llm_client.model_name}_roadmap_" + prompt)
        cached = get_cached_response(cache_key)

        if cached:
            roadmap = cached
        else:
            try:
                roadmap = await llm_client.chat(prompt)
                save_cached_response(cache_key, roadmap)
            except Exception as e:
                roadmap = f"Failed to generate custom roadmap: {str(e)}"

    return {
        "student_id": req.student_id,
        "total_attempted": total,
        "correct": correct,
        "accuracy": accuracy,
        "wrong_questions": wrong_list,
        "topic_progress": topic_progress,
        "recommendation": recommendation,
        "personalized_roadmap": roadmap
    }


# ---------- Teacher Dashboard ----------
@app.post("/teacher-dashboard/")
async def teacher_dashboard(req: TeacherDashboardRequest):
    students = get_all_students(req.file_id)

    report = []
    for s in students:
        total, correct, accuracy = get_student_summary(s, req.file_id)
        report.append({
            "student_id": s,
            "attempted": total,
            "correct": correct,
            "accuracy": accuracy
        })

    total_students = len(report)
    avg_accuracy = (
        sum(r["accuracy"] for r in report) / total_students
        if total_students else 0
    )

    return {
        "file_id": req.file_id,
        "total_students": total_students,
        "avg_accuracy": avg_accuracy,
        "student_report": report
    }


# ---------- Adaptive Quiz ----------
@app.post("/generate-adaptive-quiz/")
async def generate_adaptive_quiz(req: AdaptiveQuizRequest):
    # Fetch parent chunks from SQLite
    parent_docs = get_parent_chunks(req.file_id, limit=8)

    if not parent_docs:
        return {"error": "No content found"}

    combined_text = "\n\n".join(parent_docs)

    wrong_qs = get_recent_wrong_questions(req.student_id, req.file_id)
    if not wrong_qs:
        # Fallback to general quiz if no weak areas
        return await generate_quiz(QuizRequest(file_id=req.file_id, num_questions=req.num_questions))

    wrong_text = "\n".join([f"- {q}" for q in wrong_qs])

    prompt = f"""
Generate {req.num_questions} MCQs focused on weak questions.

Return ONLY valid JSON.

Format:
[
  {{
    "question": "...",
    "topic": "...",
    "options": {{
      "A": "...",
      "B": "...",
      "C": "...",
      "D": "..."
    }},
    "answer": "A"
  }}
]

Weak questions:
{wrong_text}

Material:
{combined_text}
"""

    llm_client = AIProvider.get_chat_client()
    cache_key = get_md5_hash(f"{llm_client.model_name}_adaptive_" + prompt)
    cached = get_cached_response(cache_key)

    raw = ""
    if cached:
        raw = cached
    else:
        try:
            raw = await llm_client.chat(prompt)
            save_cached_response(cache_key, raw)
        except Exception as e:
            return {"error": f"LLM error: {str(e)}", "quiz": []}

    match = re.search(r'\[[\s\S]*\]', raw)
    if not match:
        return {"quiz": [], "raw_output": raw}

    json_text = match.group(0)
    try:
        quiz_list = json.loads(json_text)
    except Exception as e:
        print("Adaptive JSON ERROR:", e)
        quiz_list = []

    return {
        "student_id": req.student_id,
        "quiz": quiz_list
    }

# ---------- Serve Frontend ----------
if os.path.isdir("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join("static", full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join("static", "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {"error": "Frontend not built"}