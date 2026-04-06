import sqlite3
import os

DB_FOLDER = "data"
DB_NAME = os.path.join(DB_FOLDER, "students.db")

os.makedirs(DB_FOLDER, exist_ok=True)


# ---------- Init DB ----------
def init_db():
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        file_id TEXT,
        attempt_id TEXT,
        topic TEXT,
        question TEXT,
        selected_option TEXT,
        correct_option TEXT,
        is_correct INTEGER
    )
    """)

    conn.commit()
    conn.close()


# ---------- Save Result ----------
def save_result(student_id, file_id, attempt_id, topic, question, selected_option, correct_option, is_correct):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO quiz_results (
        student_id, file_id, attempt_id, topic, question,
        selected_option, correct_option, is_correct
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        student_id,
        file_id,
        attempt_id,
        topic,
        question,
        selected_option,
        correct_option,
        is_correct
    ))

    conn.commit()
    conn.close()


# ---------- Latest Attempt ----------
def get_latest_attempt_id(student_id, file_id):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT attempt_id
    FROM quiz_results
    WHERE student_id=? AND file_id=?
    ORDER BY id DESC
    LIMIT 1
    """, (student_id, file_id))

    row = cur.fetchone()
    conn.close()

    return row[0] if row else None


# ---------- Student Stats ----------
def get_student_stats(student_id, file_id):
    attempt_id = get_latest_attempt_id(student_id, file_id)

    if not attempt_id:
        return 0, 0

    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT COUNT(*)
    FROM quiz_results
    WHERE student_id=? AND file_id=? AND attempt_id=?
    """, (student_id, file_id, attempt_id))
    total = cur.fetchone()[0]

    cur.execute("""
    SELECT COUNT(*)
    FROM quiz_results
    WHERE student_id=? AND file_id=? AND attempt_id=? AND is_correct=1
    """, (student_id, file_id, attempt_id))
    correct = cur.fetchone()[0]

    conn.close()

    return total, correct


# ---------- Wrong Questions (Latest Attempt Only) ----------
def get_wrong_questions(student_id, file_id):
    attempt_id = get_latest_attempt_id(student_id, file_id)

    if not attempt_id:
        return []

    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT question, selected_option, correct_option
    FROM quiz_results
    WHERE student_id=? AND file_id=? AND attempt_id=? AND is_correct=0
    """, (student_id, file_id, attempt_id))

    rows = cur.fetchall()
    conn.close()

    return rows


# ---------- All Students ----------
def get_all_students(file_id):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT DISTINCT student_id
    FROM quiz_results
    WHERE file_id=?
    """, (file_id,))

    rows = cur.fetchall()
    conn.close()

    return [r[0] for r in rows]


# ---------- Student Summary (Latest Attempt Only) ----------
def get_student_summary(student_id, file_id):
    total, correct = get_student_stats(student_id, file_id)

    accuracy = (correct / total) * 100 if total > 0 else 0

    return total, correct, accuracy


# ---------- Adaptive Quiz Uses History ----------
def get_recent_wrong_questions(student_id, file_id, limit=5):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT question
    FROM quiz_results
    WHERE student_id=? AND file_id=? AND is_correct=0
    ORDER BY id DESC
    LIMIT ?
    """, (student_id, file_id, limit))

    rows = cur.fetchall()
    conn.close()

    return [r[0] for r in rows]


# ---------- Wrong Summary Uses History ----------
def get_wrong_summary(student_id, file_id):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT question, COUNT(*) as times_wrong
    FROM quiz_results
    WHERE student_id=? AND file_id=? AND is_correct=0
    GROUP BY question
    ORDER BY times_wrong DESC
    """, (student_id, file_id))

    rows = cur.fetchall()
    conn.close()

    return rows


# ---------- Topic Progress (for later progress bars) ----------
def get_topic_progress(student_id, file_id):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT topic, question, is_correct
    FROM quiz_results
    WHERE student_id=? AND file_id=?
    ORDER BY id DESC
    """, (student_id, file_id))

    rows = cur.fetchall()
    conn.close()

    topic_map = {}

    for topic, question, is_correct in rows:
        if topic not in topic_map:
            topic_map[topic] = {}

        if question not in topic_map[topic]:
            topic_map[topic][question] = is_correct

    result = []

    for topic, qmap in topic_map.items():
        total = len(qmap)
        correct = sum(qmap.values())
        result.append((topic, total, correct))

    return result               

def get_student_summary_all(student_id, file_id):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT COUNT(*)
    FROM quiz_results
    WHERE student_id=? AND file_id=?
    """, (student_id, file_id))
    total = cur.fetchone()[0]

    cur.execute("""
    SELECT COUNT(*)
    FROM quiz_results
    WHERE student_id=? AND file_id=? AND is_correct=1
    """, (student_id, file_id))
    correct = cur.fetchone()[0]

    conn.close()

    accuracy = (correct / total) * 100 if total > 0 else 0

    return total, correct, accuracy

def get_weak_topics(student_id, file_id):
    conn = sqlite3.connect(DB_NAME)
    cur = conn.cursor()

    cur.execute("""
    SELECT topic, COUNT(*) as wrong_count
    FROM quiz_results
    WHERE student_id=? AND file_id=? AND is_correct=0
    GROUP BY topic
    ORDER BY wrong_count DESC
    """, (student_id, file_id))

    rows = cur.fetchall()
    conn.close()

    return rows