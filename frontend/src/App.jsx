import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE = "";

// ---------- Inline SVG Icons ----------
const IconUpload = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const IconChat = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const IconSummary = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const IconQuiz = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const IconProgress = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconTeacher = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const IconCopy = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const IconBrain = () => (
  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 01-2 2h0a2 2 0 01-2-2v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

export default function App() {
  // Navigation & Core States
  const [activeTab, setActiveTab] = useState("upload");
  const [fileId, setFileId] = useState(() => localStorage.getItem("rag_llm_file_id") || "");
  const [studentId, setStudentId] = useState(() => localStorage.getItem("rag_llm_student_id") || "student_1");

  // File Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Chat State
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatBottomRef = useRef(null);

  // Summary State
  const [summaryData, setSummaryData] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Quiz State
  const [quizCount, setQuizCount] = useState(5);
  const [quizResult, setQuizResult] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizType, setQuizType] = useState("general"); // "general" or "adaptive"

  // Progress State
  const [progressData, setProgressData] = useState(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  // Teacher Dashboard State
  const [teacherReport, setTeacherReport] = useState(null);
  const [isLoadingTeacher, setIsLoadingTeacher] = useState(false);

  // UX Feedback states
  const [copiedId, setCopiedId] = useState(false);
  const [systemInfo, setSystemInfo] = useState({ provider: "local", model: "llama3:8b" });

  // Persist config
  useEffect(() => {
    localStorage.setItem("rag_llm_file_id", fileId);
  }, [fileId]);

  useEffect(() => {
    localStorage.setItem("rag_llm_student_id", studentId);
  }, [studentId]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch Backend LLM System Info
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/health`);
        const data = await res.json();
        if (data.llm_provider) {
          setSystemInfo({ provider: data.llm_provider, model: data.llm_model });
        }
      } catch (err) {
        console.error("Failed to fetch system info:", err);
      }
    };
    fetchSystemInfo();
  }, []);

  // Copy helper
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ---------- API Handlers ----------
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF document first.");
    
    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload-pdf/`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setUploadResult(data);
        setFileId(data.file_id);
        setMessages([]); // Clear previous chat
        setSummaryData(null); // Clear previous summary
        setQuizResult(null); // Clear previous quiz
      }
    } catch (err) {
      alert("Failed to connect to backend server. Ensure backend is running.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleAskStream = async (e) => {
    e.preventDefault();
    if (!fileId) return alert("Please set or upload a PDF to get a File ID.");
    if (!question.trim()) return;

    const userMsg = { id: Date.now(), role: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    const currentQuestion = question;
    setQuestion("");
    setIsLoadingChat(true);

    // Placeholder bot message
    const botMsgId = Date.now() + 1;
    const initialBotMsg = { id: botMsgId, role: "assistant", text: "", chunks: [], isStreaming: true };
    setMessages((prev) => [...prev, initialBotMsg]);

    try {
      const response = await fetch(`${API_BASE}/ask-stream/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, question: currentQuestion }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "metadata") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId
                    ? { ...msg, chunks: parsed.chunks_used }
                    : msg
                )
              );
            } else if (parsed.type === "content") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === botMsgId
                    ? { ...msg, text: msg.text + parsed.text }
                    : msg
                )
              );
            }
          } catch (e) {
            console.error("Error parsing NDJSON line:", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? { ...msg, text: msg.text + "\n\n[Error: Connection lost or failed to generate response.]", isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoadingChat(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  const handleGetSummary = async () => {
    if (!fileId) return alert("Please set or upload a PDF first.");
    setIsLoadingSummary(true);
    setSummaryData(null);

    try {
      const res = await fetch(`${API_BASE}/summarize/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setSummaryData(data);
      }
    } catch (err) {
      alert("Failed to fetch summary.");
      console.error(err);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleGenerateQuiz = async (type = "general") => {
    if (!fileId) return alert("Please set or upload a PDF first.");
    setIsLoadingQuiz(true);
    setQuizResult(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setSubmitResult(null);
    setQuizType(type);

    const endpoint = type === "adaptive" ? "generate-adaptive-quiz" : "generate-quiz";

    try {
      const body = {
        file_id: fileId,
        num_questions: quizCount,
      };
      if (type === "adaptive") {
        body.student_id = studentId;
      }

      const res = await fetch(`${API_BASE}/${endpoint}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setQuizResult(data.quiz);
      }
    } catch (err) {
      alert("Failed to generate quiz.");
      console.error(err);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizResult) return;
    
    const responses = quizResult.map((q) => ({
      question: q.question,
      topic: q.topic || "General",
      selected: quizAnswers[q.question] || "",
      correct: q.answer,
    }));

    try {
      const res = await fetch(`${API_BASE}/submit-quiz/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          file_id: fileId,
          responses: responses,
        }),
      });
      const data = await res.json();
      setSubmitResult(data);
      setQuizSubmitted(true);
    } catch (err) {
      alert("Failed to submit quiz.");
      console.error(err);
    }
  };

  const handleGetProgress = async () => {
    if (!fileId) return alert("Please set or upload a PDF first.");
    setIsLoadingProgress(true);
    setProgressData(null);

    try {
      const res = await fetch(`${API_BASE}/student-progress/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          file_id: fileId,
        }),
      });
      const data = await res.json();
      setProgressData(data);
    } catch (err) {
      alert("Failed to load progress data.");
      console.error(err);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const handleLoadTeacherReport = async () => {
    if (!fileId) return alert("Please set or upload a PDF first.");
    setIsLoadingTeacher(true);
    setTeacherReport(null);

    try {
      const res = await fetch(`${API_BASE}/teacher-dashboard/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId }),
      });
      const data = await res.json();
      setTeacherReport(data);
    } catch (err) {
      alert("Failed to load teacher dashboard data.");
      console.error(err);
    } finally {
      setIsLoadingTeacher(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: "280px",
        borderRight: "1px solid var(--border-color)",
        background: "rgba(11, 15, 25, 0.9)",
        backdropFilter: "blur(12px)",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
        position: "sticky",
        top: 0,
        height: "100vh",
        zIndex: 10
      }}>
        {/* Brand/Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 8px" }}>
          <div style={{
            background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)"
          }}>
            <IconBrain />
          </div>
          <div>
            <h1 style={{ fontSize: "1.1rem", color: "#ffffff", lineHeight: 1.2, fontWeight: 800 }}>RAG-LLM Neural Engine</h1>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 500 }}>AI Learning Assistant</span>
          </div>
        </div>

        {/* Global Settings inside Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Active Student ID</label>
            <input 
              type="text" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)} 
              placeholder="Enter Student ID"
              style={{ padding: "8px 12px", fontSize: "0.85rem" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>Active File ID</label>
            <div style={{ display: "flex", gap: "6px" }}>
              <input 
                type="text" 
                value={fileId} 
                onChange={(e) => setFileId(e.target.value)} 
                placeholder="No PDF uploaded"
                style={{ padding: "8px 12px", fontSize: "0.85rem" }}
              />
              {fileId && (
                <button 
                  onClick={() => copyToClipboard(fileId)} 
                  className="btn-ghost" 
                  style={{ padding: "8px 10px", borderRadius: "var(--radius-sm)" }}
                  title="Copy File ID"
                >
                  {copiedId ? <IconCheck /> : <IconCopy />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          <button 
            onClick={() => setActiveTab("upload")} 
            className="btn-menu"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              background: activeTab === "upload" ? "linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)" : "transparent",
              color: activeTab === "upload" ? "var(--primary)" : "var(--text-secondary)",
              borderLeft: activeTab === "upload" ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
          >
            <IconUpload /> Faculty Upload
          </button>
          <button 
            onClick={() => setActiveTab("chat")} 
            className="btn-menu"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              background: activeTab === "chat" ? "linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)" : "transparent",
              color: activeTab === "chat" ? "var(--primary)" : "var(--text-secondary)",
              borderLeft: activeTab === "chat" ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
            disabled={!fileId}
          >
            <IconChat /> Study Chat
          </button>
          <button 
            onClick={() => setActiveTab("summary")} 
            className="btn-menu"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              background: activeTab === "summary" ? "linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)" : "transparent",
              color: activeTab === "summary" ? "var(--primary)" : "var(--text-secondary)",
              borderLeft: activeTab === "summary" ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
            disabled={!fileId}
          >
            <IconSummary /> AI Study Guide
          </button>
          <button 
            onClick={() => setActiveTab("quiz")} 
            className="btn-menu"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              background: activeTab === "quiz" ? "linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)" : "transparent",
              color: activeTab === "quiz" ? "var(--primary)" : "var(--text-secondary)",
              borderLeft: activeTab === "quiz" ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
            disabled={!fileId}
          >
            <IconQuiz /> Assessment
          </button>
          <button 
            onClick={() => setActiveTab("progress")} 
            className="btn-menu"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              background: activeTab === "progress" ? "linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)" : "transparent",
              color: activeTab === "progress" ? "var(--primary)" : "var(--text-secondary)",
              borderLeft: activeTab === "progress" ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
            disabled={!fileId}
          >
            <IconProgress /> Performance Insights
          </button>
          <button 
            onClick={() => setActiveTab("teacher")} 
            className="btn-menu"
            style={{
              justifyContent: "flex-start",
              width: "100%",
              padding: "12px 16px",
              borderRadius: "10px",
              background: activeTab === "teacher" ? "linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%)" : "transparent",
              color: activeTab === "teacher" ? "var(--primary)" : "var(--text-secondary)",
              borderLeft: activeTab === "teacher" ? "3px solid var(--primary)" : "3px solid transparent",
              transition: "all 0.2s"
            }}
            disabled={!fileId}
          >
            <IconTeacher /> Teacher Portal
          </button>
        </nav>

        {/* Footer info */}
        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", borderTop: "1px solid var(--border-color)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div>Backend API: <span style={{ color: "var(--success)" }}>Online</span></div>
          <div style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>
            LLM: <span style={{ color: "var(--primary)", fontWeight: "bold", textTransform: "capitalize" }}>{systemInfo.provider}</span> ({systemInfo.model})
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main style={{
        flex: 1,
        padding: "40px",
        overflowY: "auto",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>
        {/* Header Indicator */}
        {!fileId && activeTab !== "upload" && (
          <div className="glass-panel animate-fade-in" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "4px solid var(--warning)", background: "rgba(245, 158, 11, 0.05)" }}>
            <span style={{ color: "var(--warning)", fontWeight: 700 }}>⚠️ No active document.</span>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Please upload a PDF first in the Faculty Upload tab or enter a valid File ID.</span>
          </div>
        )}

        {/* 1. Faculty Upload Panel */}
        {activeTab === "upload" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "30px", maxWidth: "680px", margin: "0 auto", width: "100%" }}>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>Faculty Ingestion Hub</h2>
              <p style={{ color: "var(--text-secondary)" }}>Upload academic lecture notes, slides, or chapters to generate parent-child neural chunks.</p>
            </div>

            {/* Drop Zone */}
            <form onSubmit={handleUpload} className="glass-panel glass-panel-glow" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div style={{
                border: "2px dashed var(--border-color)",
                borderRadius: "var(--radius-md)",
                padding: "40px 20px",
                textAlign: "center",
                background: "rgba(8,11,17,0.4)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                transition: "all 0.2s"
              }}
              onClick={() => document.getElementById("pdf-selector").click()}
              >
                <div style={{ color: file ? "var(--primary)" : "var(--text-muted)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <svg style={{ width: "48px", height: "48px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {file ? (
                  <div>
                    <p style={{ fontWeight: 600, color: "#ffffff" }}>{file.name}</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 500 }}>Select a PDF document</p>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>Maximum file size: 50MB</p>
                  </div>
                )}
                <input 
                  id="pdf-selector" 
                  type="file" 
                  accept="application/pdf" 
                  onChange={(e) => setFile(e.target.files[0])} 
                  style={{ display: "none" }} 
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width: "100%", height: "48px" }}
                disabled={uploading || !file}
              >
                {uploading ? (
                  <span className="animate-pulse">Parsing and Embedding Chunks...</span>
                ) : (
                  <>
                    <IconUpload /> Index Course Material
                  </>
                )}
              </button>
            </form>

            {/* Upload Result */}
            {uploadResult && (
              <div className="glass-panel animate-fade-in" style={{ padding: "30px", borderLeft: "4px solid var(--success)", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--success)", fontWeight: 700 }}>Success</span>
                  <h3 style={{ fontSize: "1.4rem", marginTop: "4px" }}>Course Material Indexed</h3>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Parent Chunks</span>
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px" }}>{uploadResult.parent_chunks_stored}</p>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Vector Child Chunks</span>
                    <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "4px" }}>{uploadResult.child_chunks_stored}</p>
                  </div>
                </div>
                <div style={{ background: "rgba(8,11,17,0.6)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Persistent File ID</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <code style={{ fontSize: "0.85rem", color: "var(--secondary)", fontWeight: 700, wordBreak: "break-all" }}>{uploadResult.file_id}</code>
                    <button 
                      onClick={() => copyToClipboard(uploadResult.file_id)} 
                      className="btn-ghost" 
                      style={{ padding: "6px 10px", fontSize: "0.8rem", flexShrink: 0, marginLeft: "10px" }}
                    >
                      {copiedId ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* System Architecture */}
            {!uploadResult && (
              <div className="glass-panel animate-fade-in" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: "16px", background: "rgba(255,255,255,0.01)" }}>
                <h4 style={{ color: "var(--text-secondary)" }}>System Architecture & Chunking</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Upon uploading, the document undergoes <b>Parent-Child split modeling</b>:
                </p>
                <ul style={{ fontSize: "0.85rem", color: "var(--text-muted)", paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <li><b>Parent blocks (~1200 characters)</b> are loaded into SQLite relational cache storage to maintain overall content layout.</li>
                  <li><b>Child blocks (~300 characters with overlapping)</b> are asynchronously sent to the local model to build embedding matrices stored in ChromaDB vector space.</li>
                  <li>This maintains search relevance (via small chunks) while providing rich context (via parent blocks) to LLM questions.</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 2. Study Chat Panel */}
        {activeTab === "chat" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>
            <div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>Cognitive Study Companion</h2>
              <p style={{ color: "var(--text-secondary)" }}>Ask precise questions about the course document. Retrieval outputs parent context chunks in real-time.</p>
            </div>

            {/* Chat Board */}
            <div className="glass-panel" style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: "450px",
              maxHeight: "calc(100vh - 250px)",
              background: "rgba(11,15,25,0.4)"
            }}>
              {/* Message History */}
              <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                {messages.length === 0 ? (
                  <div style={{ margin: "auto", textAlign: "center", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "16px", color: "var(--text-muted)" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(99,102,241,0.06)", display: "flex", alignItems: "center", justifyCenter: "center", margin: "0 auto" }}>
                      <svg style={{ width: "32px", height: "32px", color: "var(--primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h4 style={{ color: "#ffffff", marginBottom: "4px" }}>Start Learning Session</h4>
                      <p style={{ fontSize: "0.85rem" }}>Ask any question about the document to query the vector index.</p>
                    </div>
                    {/* Preset Buttons */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginTop: "10px" }}>
                      <button onClick={() => setQuestion("Give me a brief summary of the main points.")} className="btn-ghost" style={{ padding: "8px 12px", fontSize: "0.8rem", borderRadius: "var(--radius-sm)" }}>"Summarize key points"</button>
                      <button onClick={() => setQuestion("What are the key terms or concepts discussed?")} className="btn-ghost" style={{ padding: "8px 12px", fontSize: "0.8rem", borderRadius: "var(--radius-sm)" }}>"What are the key terms?"</button>
                    </div>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className="animate-fade-in" style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "80%",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px"
                    }}>
                      <div style={{
                        padding: "16px 20px",
                        borderRadius: "16px",
                        fontSize: "0.95rem",
                        lineHeight: 1.5,
                        background: m.role === "user" ? "var(--primary)" : "rgba(255, 255, 255, 0.04)",
                        color: "#ffffff",
                        border: m.role === "user" ? "none" : "1px solid var(--border-color)",
                        boxShadow: m.role === "user" ? "0 4px 12px rgba(99, 102, 241, 0.25)" : "none",
                        whiteSpace: "pre-wrap"
                      }}>
                        {m.text}
                        {m.isStreaming && (
                          <span className="animate-pulse" style={{ display: "inline-block", marginLeft: "4px", width: "8px", height: "16px", background: "var(--secondary)", verticalAlign: "middle" }}></span>
                        )}
                      </div>

                      {/* Source Badges */}
                      {m.chunks && m.chunks.length > 0 && (
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                          padding: "0 4px"
                        }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Retrieved:</span>
                          {m.chunks.map((chnk) => (
                            <span 
                              key={chnk} 
                              style={{
                                fontSize: "0.7rem",
                                background: "rgba(6, 182, 212, 0.08)",
                                border: "1px solid rgba(6, 182, 212, 0.2)",
                                color: "var(--secondary)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: 600
                              }}
                            >
                              Parent Chunk {chnk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleAskStream} style={{
                padding: "20px",
                borderTop: "1px solid var(--border-color)",
                background: "rgba(8,11,17,0.3)",
                display: "flex",
                gap: "12px"
              }}>
                <input 
                  type="text" 
                  value={question} 
                  onChange={(e) => setQuestion(e.target.value)} 
                  placeholder="Ask a question about the indexed text..."
                  disabled={isLoadingChat}
                />
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ width: "100px", height: "48px" }}
                  disabled={isLoadingChat || !question.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 3. AI Study Guide Summary Panel */}
        {activeTab === "summary" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>AI Study Guide</h2>
                <p style={{ color: "var(--text-secondary)" }}>Instant summary, primary key topics, and core glossaries from document chunks.</p>
              </div>
              <button 
                onClick={handleGetSummary} 
                className="btn-primary"
                disabled={isLoadingSummary}
              >
                {isLoadingSummary ? "Analyzing Text..." : "Compile Study Guide"}
              </button>
            </div>

            {summaryData ? (
              <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                <div className="glass-panel" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "32px", height: "32px", background: "rgba(6,182,212,0.1)", color: "var(--secondary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <IconSummary />
                    </div>
                    <h3 style={{ fontSize: "1.25rem" }}>Document Summary & Concepts</h3>
                  </div>
                  <div style={{
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    color: "rgba(255,255,255,0.9)",
                    background: "rgba(8,11,17,0.4)",
                    padding: "24px",
                    borderRadius: "10px",
                    border: "1px solid var(--border-color)",
                    fontFamily: "var(--font-sans)",
                    overflowWrap: "break-word"
                  }} className="markdown-body">
                    <ReactMarkdown>{summaryData.summary}</ReactMarkdown>
                  </div>
                  {summaryData.cached && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "flex-end" }}>⚡ Retrieved from local cache</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                {isLoadingSummary ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <div className="animate-spin" style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid var(--primary)", borderTopColor: "transparent" }}></div>
                    <p>Scanning document slices and composing structure...</p>
                  </div>
                ) : (
                  <p>Click "Compile Study Guide" to extract and structure the document summary.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. Assessment (Quiz) Panel */}
        {activeTab === "quiz" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>Assessment Center</h2>
              <p style={{ color: "var(--text-secondary)" }}>Test your understanding with AI generated multiple-choice tests. Generate standard or adaptive quizzes based on weak topics.</p>
            </div>

            {/* Config panel */}
            <div className="glass-panel" style={{ padding: "20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Questions Count:</span>
                <input 
                  type="number" 
                  value={quizCount} 
                  onChange={(e) => setQuizCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 5)))}
                  style={{ width: "80px", padding: "8px 12px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginLeft: "auto" }}>
                <button 
                  onClick={() => handleGenerateQuiz("general")} 
                  className="btn-ghost"
                  disabled={isLoadingQuiz}
                >
                  Generate General Quiz
                </button>
                <button 
                  onClick={() => handleGenerateQuiz("adaptive")} 
                  className="btn-primary"
                  disabled={isLoadingQuiz}
                >
                  Generate Adaptive Quiz
                </button>
              </div>
            </div>

            {/* Quiz Board */}
            {isLoadingQuiz ? (
              <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                  <div className="animate-spin" style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid var(--primary)", borderTopColor: "transparent" }}></div>
                  <p>Synthesizing {quizCount} questions focusing on {quizType === "adaptive" ? "prior mistakes" : "core topics"}...</p>
                </div>
              </div>
            ) : quizResult && quizResult.length > 0 ? (
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Score Summary */}
                {quizSubmitted && submitResult && (
                  <div className="glass-panel animate-fade-in" style={{ padding: "24px", borderLeft: "4px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ fontSize: "1.2rem" }}>Test Completed</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "4px" }}>Your score: <b>{submitResult.score}</b> correctly answered.</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "2rem", fontWeight: 800, color: "var(--primary)" }}>{submitResult.percentage.toFixed(0)}%</span>
                    </div>
                  </div>
                )}

                {/* MCQs */}
                {quizResult.map((q, idx) => {
                  const hasAnswered = quizAnswers[q.question] !== undefined;
                  const isCorrect = quizAnswers[q.question] === q.answer;

                  return (
                    <div 
                      key={idx} 
                      className="glass-panel" 
                      style={{ 
                        padding: "24px", 
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "16px",
                        borderLeft: quizSubmitted 
                          ? isCorrect 
                            ? "4px solid var(--success)" 
                            : "4px solid var(--danger)"
                          : "1px solid var(--border-color)"
                      }}
                    >
                      <div style={{ display: "flex", justify: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <h4 style={{ fontSize: "1.05rem", lineHeight: 1.4 }}>{idx + 1}. {q.question}</h4>
                        <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", padding: "4px 8px", borderRadius: "4px", color: "var(--text-secondary)", flexShrink: 0 }}>
                          {q.topic || "General"}
                        </span>
                      </div>

                      {/* Options */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                        {Object.entries(q.options).map(([key, value]) => {
                          const isSelected = quizAnswers[q.question] === key;
                          
                          // Style states for submitted quiz
                          let optionBg = "rgba(8,11,17,0.4)";
                          let optionBorder = "1px solid var(--border-color)";
                          if (quizSubmitted) {
                            if (key === q.answer) {
                              optionBg = "rgba(16, 185, 129, 0.08)";
                              optionBorder = "1px solid var(--success)";
                            } else if (isSelected && !isCorrect) {
                              optionBg = "rgba(244, 63, 94, 0.08)";
                              optionBorder = "1px solid var(--danger)";
                            }
                          } else if (isSelected) {
                            optionBg = "rgba(99, 102, 241, 0.08)";
                            optionBorder = "1px solid var(--primary)";
                          }

                          return (
                            <label 
                              key={key} 
                              style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: "12px", 
                                padding: "14px 18px", 
                                borderRadius: "8px", 
                                background: optionBg, 
                                border: optionBorder,
                                cursor: quizSubmitted ? "default" : "pointer",
                                transition: "all 0.15s"
                              }}
                            >
                              <input 
                                type="radio" 
                                name={`q-${idx}`}
                                value={key}
                                checked={isSelected}
                                onChange={() => !quizSubmitted && setQuizAnswers({ ...quizAnswers, [q.question]: key })}
                                disabled={quizSubmitted}
                                style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                              />
                              <span style={{ fontSize: "0.95rem" }}>
                                <b>{key}.</b> {value}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Submit button */}
                {!quizSubmitted && (
                  <button 
                    onClick={handleSubmitQuiz} 
                    className="btn-primary" 
                    style={{ height: "48px", alignSelf: "flex-end" }}
                    disabled={Object.keys(quizAnswers).length < quizResult.length}
                  >
                    Submit Answers
                  </button>
                )}
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                <p>Generate a quiz using the panel above to begin self-assessment.</p>
              </div>
            )}
          </div>
        )}

        {/* 5. Performance Insights Panel */}
        {activeTab === "progress" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>Performance Insights</h2>
                <p style={{ color: "var(--text-secondary)" }}>Track your accuracy, weakest concepts, and review your AI generated study roadmap.</p>
              </div>
              <button 
                onClick={handleGetProgress} 
                className="btn-primary"
                disabled={isLoadingProgress}
              >
                {isLoadingProgress ? "Loading Stats..." : "Refresh Insights"}
              </button>
            </div>

            {progressData ? (
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Scorecards */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "20px" }}>
                  <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Total Attempted</span>
                    <h3 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--primary)" }}>{progressData.total_attempted}</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>individual question submissions</p>
                  </div>
                  <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Average Accuracy</span>
                    <h3 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--success)" }}>{progressData.accuracy.toFixed(0)}%</h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>correct vs incorrect ratio</p>
                  </div>
                  <div className="glass-panel" style={{ padding: "24px", borderLeft: "4px solid var(--secondary)", display: "flex", flexDirection: "column", justifyContent: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Smart Recommendation</span>
                    <p style={{ fontSize: "1.05rem", fontWeight: 500, lineHeight: 1.5, color: "#ffffff" }}>{progressData.recommendation}</p>
                  </div>
                </div>

                {/* Main section: Topic Progress & Roadmap */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "24px" }}>
                  {/* Topic Progress */}
                  <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                    <h3 style={{ fontSize: "1.15rem" }}>Topic Accuracy Breakdown</h3>
                    {progressData.topic_progress && progressData.topic_progress.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {progressData.topic_progress.map((t, idx) => (
                          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                              <span style={{ fontWeight: 600 }}>{t.topic}</span>
                              <span style={{ color: "var(--text-secondary)" }}>{t.correct}/{t.total} ({t.progress}%)</span>
                            </div>
                            {/* Progress bar */}
                            <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "4px", overflow: "hidden" }}>
                              <div style={{ width: `${t.progress}%`, height: "100%", background: t.progress >= 80 ? "var(--success)" : t.progress >= 50 ? "var(--warning)" : "var(--danger)", borderRadius: "4px" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No topic data found. Attempt a quiz first.</p>
                    )}
                  </div>

                  {/* Personalized Roadmap */}
                  <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h3 style={{ fontSize: "1.15rem" }}>Personalized Learning Roadmap</h3>
                    <div style={{
                      background: "rgba(8,11,17,0.4)",
                      border: "1px solid var(--border-color)",
                      padding: "20px",
                      borderRadius: "10px",
                      fontSize: "0.9rem",
                      lineHeight: 1.6,
                      color: "rgba(255,255,255,0.9)",
                      fontFamily: "var(--font-sans)",
                      overflowY: "auto",
                      maxHeight: "350px",
                      overflowWrap: "break-word"
                    }} className="markdown-body">
                      <ReactMarkdown>{progressData.personalized_roadmap}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                {isLoadingProgress ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <div className="animate-spin" style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid var(--primary)", borderTopColor: "transparent" }}></div>
                    <p>Compiling stats and generating customized roadmap...</p>
                  </div>
                ) : (
                  <p>Click "Refresh Insights" to load progress analysis.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. Teacher Dashboard Portal Panel */}
        {activeTab === "teacher" && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", marginBottom: "4px" }}>Teacher Dashboard Portal</h2>
                <p style={{ color: "var(--text-secondary)" }}>Audit all active student attempts, performance stats, and document metrics.</p>
              </div>
              <button 
                onClick={handleLoadTeacherReport} 
                className="btn-primary"
                disabled={isLoadingTeacher}
              >
                {isLoadingTeacher ? "Loading Report..." : "Sync Teacher Portal"}
              </button>
            </div>

            {teacherReport ? (
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div className="glass-panel" style={{ padding: "24px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Active Students</span>
                    <h3 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: "8px", color: "var(--secondary)" }}>{teacherReport.total_students}</h3>
                  </div>
                  <div className="glass-panel" style={{ padding: "24px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Average Student Accuracy</span>
                    <h3 style={{ fontSize: "2.2rem", fontWeight: 800, marginTop: "8px", color: "var(--primary)" }}>{teacherReport.avg_accuracy.toFixed(1)}%</h3>
                  </div>
                </div>

                {/* Table */}
                <div className="glass-panel" style={{ padding: "24px", overflowX: "auto" }}>
                  <h3 style={{ fontSize: "1.15rem", marginBottom: "16px" }}>Student Report Details</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlignment: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Student ID</th>
                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Questions Attempted</th>
                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Correct Submissions</th>
                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Accuracy</th>
                        <th style={{ padding: "12px", color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase" }}>Standing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherReport.student_report && teacherReport.student_report.length > 0 ? (
                        teacherReport.student_report.map((r, idx) => {
                          const statusColor = r.accuracy >= 80 ? "var(--success)" : r.accuracy >= 50 ? "var(--warning)" : "var(--danger)";
                          const statusBg = r.accuracy >= 80 ? "rgba(16, 185, 129, 0.08)" : r.accuracy >= 50 ? "rgba(245, 158, 11, 0.08)" : "rgba(244, 63, 94, 0.08)";
                          const statusLabel = r.accuracy >= 80 ? "Mastered" : r.accuracy >= 50 ? "Reviewing" : "Needs Help";

                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                              <td style={{ padding: "16px 12px", fontWeight: 600 }}>{r.student_id}</td>
                              <td style={{ padding: "16px 12px" }}>{r.attempted}</td>
                              <td style={{ padding: "16px 12px" }}>{r.correct}</td>
                              <td style={{ padding: "16px 12px", color: statusColor, fontWeight: 700 }}>{r.accuracy.toFixed(0)}%</td>
                              <td style={{ padding: "16px 12px" }}>
                                <span style={{
                                  fontSize: "0.75rem",
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  background: statusBg,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}33`
                                }}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>No students have attempted quizzes for this file.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                {isLoadingTeacher ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
                    <div className="animate-spin" style={{ width: "48px", height: "48px", borderRadius: "50%", border: "3px solid var(--primary)", borderTopColor: "transparent" }}></div>
                    <p>Syncing teacher records from relational tables...</p>
                  </div>
                ) : (
                  <p>Click "Sync Teacher Portal" to audit performance lists.</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}