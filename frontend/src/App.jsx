import { useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState("upload");
  const [messages, setMessages] = useState([]);
  const [file, setFile] = useState(null);
  const [fileId, setFileId] = useState("");
  const [uploadResult, setUploadResult] = useState(null);

  const [question, setQuestion] = useState("");
  const [summaryResult, setSummaryResult] = useState(null);

  const [quizResult, setQuizResult] = useState(null);
  const [studentId, setStudentId] = useState("student_1");
  const [quizAnswers, setQuizAnswers] = useState({});
  const [submitResult, setSubmitResult] = useState(null);

  const [progressResult, setProgressResult] = useState(null);
  const [teacherResult, setTeacherResult] = useState(null);

  const navItems = [
    ["upload", "Faculty Upload"],
    ["chat", "Student Chat"],
    ["summary", "Summary"],
    ["quiz", "Quiz"],
    ["progress", "Progress"],
    ["teacher", "Teacher Dashboard"]
  ];

  const handleUpload = async () => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(`${API}/upload-pdf/`, formData);
    setUploadResult(res.data);
    setFileId(res.data.file_id);
  };

  const handleAsk = async () => {
    const userMsg = { role: "user", text: question };
    setMessages(prev => [...prev, userMsg]);

    const res = await axios.post(`${API}/ask/`, {
      file_id: fileId,
      question
    });

    setMessages(prev => [
      ...prev,
      {
        role: "assistant",
        text: res.data.answer,
        chunks: res.data.chunks_used
      }
    ]);

    setQuestion("");
  };

  const handleSummarize = async () => {
    const res = await axios.post(`${API}/summarize/`, { file_id: fileId });
    setSummaryResult(res.data);
  };

  const handleGenerateQuiz = async () => {
    const res = await axios.post(`${API}/generate-quiz/`, {
      file_id: fileId,
      num_questions: 5
    });
    setQuizResult(res.data.quiz);
  };

  const handleAdaptiveQuiz = async () => {
    const res = await axios.post(`${API}/generate-adaptive-quiz/`, {
      student_id: studentId,
      file_id: fileId,
      num_questions: 5
    });
    setQuizResult(res.data.quiz);
  };

  const handleSubmitQuiz = async () => {
    const responses = quizResult.map(q => ({
      question: q.question,
      topic: q.topic,
      selected: quizAnswers[q.question] || "",
      correct: q.answer
    }));

    const res = await axios.post(`${API}/submit-quiz/`, {
      student_id: studentId,
      file_id: fileId,
      responses
    });

    setSubmitResult(res.data);
  };

  const handleProgress = async () => {
    const res = await axios.post(`${API}/student-progress/`, {
      student_id: studentId,
      file_id: fileId
    });
    setProgressResult(res.data);
  };

  const handleTeacherDashboard = async () => {
    const res = await axios.post(`${API}/teacher-dashboard/`, {
      file_id: fileId
    });
    setTeacherResult(res.data);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background: "#0b1220",
        color: "white",
        fontFamily: "Inter, Arial, sans-serif"
      }}
    >
      <aside
        style={{
          width: "250px",
          background: "#111827",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "28px"
        }}
      >
        <h2 style={{ marginBottom: "28px" }}>Learning AI</h2>

        {navItems.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              width: "100%",
              textAlign: "left",
              marginBottom: "10px",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "none",
              background: activeTab === key ? "#2563eb" : "transparent",
              color: "white",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            {label}
          </button>
        ))}
      </aside>

      <main
        style={{
          flex: 1,
          padding: "40px",
          maxWidth: "1200px"
        }}
      >
        <div
          style={{
            marginBottom: "24px",
            padding: "22px",
            borderRadius: "18px",
            background: "#111827",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >
          <h1 style={{ marginBottom: "8px" }}>
            LLM Personalized Learning Assistant
          </h1>
          <p style={{ color: "#94a3b8" }}>
            Adaptive PDF learning with retrieval, quizzes, and mastery tracking
          </p>

          <input
            value={fileId}
            onChange={e => setFileId(e.target.value)}
            placeholder="Paste file_id here"
            style={{
              width: "100%",
              marginTop: "16px",
              padding: "12px",
              borderRadius: "10px",
              border: "1px solid #334155",
              background: "#0f172a",
              color: "white"
            }}
          />
        </div>

        <div
          style={{
            background: "#111827",
            borderRadius: "18px",
            padding: "28px",
            border: "1px solid rgba(255,255,255,0.06)"
          }}
        >

          {activeTab === "upload" && (
            <>
              <input type="file" onChange={e => setFile(e.target.files[0])} />
              <br /><br />
              <button onClick={handleUpload}>Upload PDF</button>

              {uploadResult && (
                <div style={{ marginTop: "20px" }}>
                  <p>File ID: {uploadResult.file_id}</p>
                  <p>Chunks Stored: {uploadResult.chunks_stored}</p>
                </div>
              )}
            </>
          )}

          {activeTab === "chat" && (
            <>
              <div
                style={{
                  height: "500px",
                  overflowY: "auto",
                  background: "#0f172a",
                  borderRadius: "16px",
                  padding: "18px",
                  marginBottom: "14px"
                }}
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent:
                        m.role === "user" ? "flex-end" : "flex-start",
                      marginBottom: "14px"
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "12px 14px",
                        borderRadius: "14px",
                        background:
                          m.role === "user" ? "#2563eb" : "#1e293b"
                      }}
                    >
                      <div>{m.text}</div>

                      {m.chunks?.length > 0 && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "12px",
                            opacity: 0.6
                          }}
                        >
                          Chunks: {m.chunks.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <textarea
                rows="3"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  padding: "12px",
                  background: "#0f172a",
                  color: "white",
                  border: "1px solid #334155"
                }}
              />

              <br /><br />
              <button onClick={handleAsk}>Send</button>
            </>
          )}

          {activeTab === "summary" && (
            <>
              <button onClick={handleSummarize}>Generate Summary</button>
              {summaryResult && <pre>{summaryResult.summary}</pre>}
            </>
          )}

          {activeTab === "quiz" && (
            <>
              <button onClick={handleGenerateQuiz}>Generate Quiz</button>
              <button onClick={handleAdaptiveQuiz} style={{ marginLeft: "10px" }}>
                Adaptive Quiz
              </button>

              {quizResult?.map((q, i) => (
                <div
                  key={i}
                  style={{
                    marginTop: "18px",
                    padding: "16px",
                    borderRadius: "14px",
                    background: "#0f172a"
                  }}
                >
                  <b>{i + 1}. {q.question}</b>
                  <div style={{ opacity: 0.6, fontSize: "12px" }}>{q.topic}</div>

                  {Object.entries(q.options).map(([k, v]) => (
                    <label key={k} style={{ display: "block", marginTop: "8px" }}>
                      <input
                        type="radio"
                        name={q.question}
                        value={k}
                        onChange={() =>
                          setQuizAnswers({
                            ...quizAnswers,
                            [q.question]: k
                          })
                        }
                      />
                      {k}. {v}
                    </label>
                  ))}
                </div>
              ))}

              {quizResult && (
                <button style={{ marginTop: "20px" }} onClick={handleSubmitQuiz}>
                  Submit Quiz
                </button>
              )}

              {submitResult && (
                <div style={{ marginTop: "20px" }}>
                  Score: {submitResult.score}
                </div>
              )}
            </>
          )}

          {activeTab === "progress" && (
            <>
              <button onClick={handleProgress}>Load Progress</button>

              {progressResult?.topic_progress?.map((t, i) => (
                <div key={i} style={{ marginTop: "18px" }}>
                  <div>{t.topic}</div>

                  <div
                    style={{
                      height: "10px",
                      background: "#334155",
                      borderRadius: "8px"
                    }}
                  >
                    <div
                      style={{
                        width: `${t.progress}%`,
                        height: "10px",
                        background: "#22c55e",
                        borderRadius: "8px"
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === "teacher" && (
            <>
              <button onClick={handleTeacherDashboard}>
                Load Teacher Dashboard
              </button>

              {teacherResult?.student_report?.map((s, i) => (
                <div key={i} style={{ marginTop: "16px" }}>
                  {s.student_id} | {s.accuracy.toFixed(2)}%
                </div>
              ))}
            </>
          )}

        </div>
      </main>
    </div>
  );
}