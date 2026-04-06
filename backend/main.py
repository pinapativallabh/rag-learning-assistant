from fastapi import FastAPI, UploadFile, File, Body
from pydantic import BaseModel
import fitz
import ollama
import re
import json
import os
import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter
from vector_store import get_collection

from db import (
    init_db,
    save_result,
    get_student_stats,
    get_wrong_questions,
    get_all_students,
    get_student_summary,
    get_recent_wrong_questions,
    get_wrong_summary
)
from db import get_topic_progress

from fastapi.middleware.cors import CORSMiddleware

init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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


# ---------- Root ----------
@app.get("/")
def root():
    return {"status": "Backend running"}


# ---------- Upload PDF ----------
@app.post("/upload-pdf/")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        return {"error": "Only PDF files allowed"}

    file_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

    with open(save_path, "wb") as f:
        f.write(await file.read())

    doc = fitz.open(save_path)
    full_text = ""

    for page in doc:
        full_text += page.get_text()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    chunks = splitter.split_text(full_text)

    collection = get_collection()

    ids = [f"{file_id}_chunk_{i+1}" for i in range(len(chunks))]

    metadatas = [
        {
            "file_id": file_id,
            "chunk_no": i + 1
        }
        for i in range(len(chunks))
    ]

    collection.add(
        documents=chunks,
        ids=ids,
        metadatas=metadatas
    )

    return {
        "message": "PDF uploaded + stored in vector DB",
        "file_id": file_id,
        "chunks_stored": len(chunks)
    }


# ---------- Ask ----------
@app.post("/ask/")
async def ask_question(file_id: str = Body(...), question: str = Body(...)):
    collection = get_collection()

    results = collection.query(
        query_texts=[question],
        n_results=4,
        where={"file_id": file_id}
    )

    retrieved_docs = results.get("documents", [[]])[0]
    retrieved_meta = results.get("metadatas", [[]])[0]

    if not retrieved_docs:
        return {
            "answer": "Not provided in PDF.",
            "chunks_used": []
        }

    context = "\n\n".join([
        f"[Chunk {meta['chunk_no']}] {doc}"
        for doc, meta in zip(retrieved_docs, retrieved_meta)
    ])

    prompt = f"""
Answer strictly from the context.

Rules:
- Use only the context.
- If answer is absent, reply exactly:
Not provided in PDF.

Context:
{context}

Question:
{question}

Answer briefly.
"""

    response = ollama.chat(
        model="llama3:8b",
        messages=[{"role": "user", "content": prompt}]
    )

    answer = response["message"]["content"].strip()

    if "not provided" in answer.lower():
        return {
            "answer": "Not provided in PDF.",
            "chunks_used": []
        }

    chunk_numbers = [meta["chunk_no"] for meta in retrieved_meta]

    return {
        "answer": answer,
        "chunks_used": chunk_numbers
    }


# ---------- Summary ----------
@app.post("/summarize/")
async def summarize_pdf(req: SummaryRequest):
    collection = get_collection()
    data = collection.get(where={"file_id": req.file_id})
    docs = data["documents"]

    if not docs:
        return {"error": "No content found"}

    combined_text = "\n\n".join(docs[:12])

    prompt = f"""
Summarize into:
1. Short summary
2. Key topics
3. Important terms

Material:
{combined_text}
"""

    response = ollama.chat(
        model="llama3:8b",
        messages=[{"role": "user", "content": prompt}]
    )

    return {
        "file_id": req.file_id,
        "summary": response["message"]["content"]
    }


# ---------- Quiz ----------
@app.post("/generate-quiz/")
async def generate_quiz(req: QuizRequest):
    collection = get_collection()
    data = collection.get(where={"file_id": req.file_id})
    docs = data["documents"]

    if not docs:
        return {"error": "No content found"}

    combined_text = "\n\n".join(docs[:8])

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

    response = ollama.chat(
        model="llama3:8b",
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response["message"]["content"]

    match = re.search(r'\[[\s\S]*\]', raw)

    if not match:
        return {"quiz": [], "raw_output": raw}

    json_text = match.group(0)

    try:
        quiz_list = json.loads(json_text)
    except Exception as e:
        print("JSON ERROR:", e)
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

    return {
        "student_id": req.student_id,
        "score": f"{correct_count}/{total}",
        "percentage": (correct_count / total) * 100
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

    wrong_questions_text = "\n".join([f"- {w[0]}" for w in wrong_summary])

    weak_topics_text = "\n".join([
        f"- {t['topic']}" for t in topic_progress if t["progress"] < 80
    ])

    roadmap = "No wrong answers yet."

    if len(wrong_summary) > 0:
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

        response = ollama.chat(
            model="llama3:8b",
            messages=[{"role": "user", "content": prompt}]
        )

        roadmap = response["message"]["content"]

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
    collection = get_collection()
    data = collection.get(where={"file_id": req.file_id})
    docs = data["documents"]

    if not docs:
        return {"error": "No content found"}

    combined_text = "\n\n".join(docs[:8])

    wrong_qs = get_recent_wrong_questions(req.student_id, req.file_id)

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

    response = ollama.chat(
        model="llama3:8b",
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response["message"]["content"]

    match = re.search(r'\[[\s\S]*\]', raw)

    if not match:
        return {"quiz": [], "raw_output": raw}

    json_text = match.group(0)

    try:
        quiz_list = json.loads(json_text)
    except Exception as e:
        print("Adaptive JSON ERROR:", e)
        print(json_text)
        quiz_list = []

    return {
        "student_id": req.student_id,
        "quiz": quiz_list
    }