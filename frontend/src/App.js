import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const API_URL = window.location.hostname === "localhost"
  ? "http://127.0.0.1:8000"
  : "https://examgenie-backend-jzyl.onrender.com";

const SUBJECTS = [
  { label: "📐 Maths", value: "Maths" },
  { label: "⚗️ Chemistry", value: "Chemistry" },
  { label: "🔭 Physics", value: "Physics" },
  { label: "🌿 Biology", value: "Biology" },
  { label: "📜 History", value: "History" },
  { label: "🌍 Geography", value: "Geography" },
];

const QUICK = ["Newton's law என்ன?", "Photosynthesis விளக்கு", "Important 10th questions"];
function generateId() { return Date.now().toString(); }
function newChat() { return { id: generateId(), title: "New Chat", subject: "General", messages: [], createdAt: new Date().toLocaleTimeString() }; }
const S = { bg: "#0f0f0f", sidebar: "#1a1a1a", border: "#2a2a2a", green: "#4ade80", darkGreen: "#166534" };

function MsgText({ text }) {
  return (
    <ReactMarkdown components={{
      p: ({ children }) => <p style={{ margin: "0 0 8px", lineHeight: "1.7" }}>{children}</p>,
      strong: ({ children }) => <strong style={{ color: "#4ade80" }}>{children}</strong>,
      ul: ({ children }) => <ul style={{ margin: "4px 0 8px", paddingLeft: "20px" }}>{children}</ul>,
      ol: ({ children }) => <ol style={{ margin: "4px 0 8px", paddingLeft: "20px" }}>{children}</ol>,
      li: ({ children }) => <li style={{ marginBottom: "4px", lineHeight: "1.6" }}>{children}</li>,
      code: ({ inline, children }) => inline
        ? <code style={{ background: "#2a2a2a", padding: "2px 6px", borderRadius: "4px", fontSize: "13px", color: "#fbbf24" }}>{children}</code>
        : <pre style={{ background: "#0f0f0f", border: "1px solid #2a2a2a", borderRadius: "8px", padding: "12px", overflowX: "auto", fontSize: "13px", color: "#e5e7eb" }}><code>{children}</code></pre>,
      h1: ({ children }) => <h1 style={{ color: "#4ade80", fontSize: "18px", margin: "8px 0 4px" }}>{children}</h1>,
      h2: ({ children }) => <h2 style={{ color: "#60a5fa", fontSize: "16px", margin: "8px 0 4px" }}>{children}</h2>,
      h3: ({ children }) => <h3 style={{ color: "#fbbf24", fontSize: "14px", margin: "6px 0 4px" }}>{children}</h3>,
      blockquote: ({ children }) => <blockquote style={{ borderLeft: "3px solid #4ade80", paddingLeft: "12px", color: "#9ca3af", margin: "8px 0" }}>{children}</blockquote>,
    }}>{text}</ReactMarkdown>
  );
}

// ─── QUIZ ────────────────────────────────────────────────────
function QuizMode({ subject, onExit, weakTopics, onQuizComplete }) {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [topic, setTopic] = useState("");
  const [started, setStarted] = useState(false);
  const [language, setLanguage] = useState("Tamil");
  const [level, setLevel] = useState("Intermediate");
  const [wrongTopics, setWrongTopics] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [useWeakFocus, setUseWeakFocus] = useState(false);

  async function loadQuiz() {
    setLoading(true); setQuestions([]); setCurrent(0); setScore(0);
    setSelected(null); setAnswered(false); setFinished(false);
    setStarted(true); setWrongTopics([]); setAnalysis(null);
    try {
      const res = await fetch(`${API_URL}/quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, topic, language, level, weak_topics: useWeakFocus ? weakTopics : [] })
      });
      const data = await res.json();
      if (data.questions) setQuestions(data.questions);
    } catch { }
    setLoading(false);
  }

  function handleAnswer(opt) {
    if (answered) return;
    setSelected(opt); setAnswered(true);
    const q = questions[current];
    if (opt.charAt(0) === q.answer) { setScore(s => s + 1); }
    else { if (q.topic) setWrongTopics(w => [...w, q.topic]); }
  }

  async function next() {
    if (current + 1 >= questions.length) {
      setFinished(true);
      if (wrongTopics.length > 0) {
        setAnalyzing(true);
        try {
          const res = await fetch(`${API_URL}/analyze`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wrong_topics: wrongTopics, subject })
          });
          const data = await res.json();
          setAnalysis(data);
          onQuizComplete(data.weak_topics || [], score, questions.length, subject);
        } catch { }
        setAnalyzing(false);
      } else {
        onQuizComplete([], score, questions.length, subject);
      }
      return;
    }
    setCurrent(c => c + 1); setSelected(null); setAnswered(false);
  }

  if (!started) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: S.bg, padding: "16px", overflowY: "auto" }}>
      <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "20px", padding: "20px", width: "100%", maxWidth: "520px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "32px" }}>🏆</span>
          <h2 style={{ color: S.green, margin: "4px 0 0", fontSize: "1.2rem" }}>Quiz Mode</h2>
        </div>
        {weakTopics.length > 0 && (
          <div style={{ background: "#3b1f00", border: "1px solid #f59e0b", borderRadius: "12px", padding: "12px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ color: "#fbbf24", fontWeight: "bold", margin: "0 0 4px", fontSize: "13px" }}>🎯 Weak Topics Detected!</p>
                <p style={{ color: "#d97706", margin: 0, fontSize: "11px" }}>{weakTopics.slice(0, 3).join(", ")}</p>
              </div>
              <button onClick={() => setUseWeakFocus(w => !w)}
                style={{ background: useWeakFocus ? "#f59e0b" : "#2a2a2a", border: `1px solid ${useWeakFocus ? "#f59e0b" : S.border}`, color: useWeakFocus ? "#1a1a1a" : "#9ca3af", borderRadius: "8px", padding: "6px 12px", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}>
                {useWeakFocus ? "✅ ON" : "Focus?"}
              </button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase" }}>📚 Subject</p>
            <div style={{ background: S.darkGreen, borderRadius: "8px", padding: "10px 12px", fontWeight: "bold", fontSize: "14px" }}>{subject}</div>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase" }}>🎯 Topic</p>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && loadQuiz()}
              placeholder="Optional..." style={{ width: "100%", background: "#2a2a2a", border: `1px solid ${S.border}`, borderRadius: "8px", padding: "10px 12px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ marginBottom: "14px" }}>
          <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: "bold", marginBottom: "6px" }}>⚡ Quick Topics:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {["Newton's Laws", "Acids & Bases", "Photosynthesis", "French Revolution", "Trigonometry", "Cell Division"].map(t => (
              <button key={t} onClick={() => setTopic(t)}
                style={{ background: topic === t ? S.darkGreen : "#2a2a2a", border: `1px solid ${topic === t ? S.green : S.border}`, color: topic === t ? "white" : "#9ca3af", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", cursor: "pointer" }}>{t}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase" }}>🌐 Language</p>
            <div style={{ display: "flex", gap: "6px" }}>
              {["Tamil", "English"].map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", border: `2px solid ${language === lang ? S.green : S.border}`, background: language === lang ? "#14532d" : "#2a2a2a", color: language === lang ? S.green : "#9ca3af", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}>
                  {lang === "Tamil" ? "🇮🇳 Tamil" : "🇬🇧 Eng"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 2 }}>
            <p style={{ color: "#9ca3af", fontSize: "10px", fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase" }}>🎯 Level</p>
            <div style={{ display: "flex", gap: "6px" }}>
              {[{ label: "🌱 Easy", value: "Beginner", color: "#4ade80", bg: "#14532d" },
                { label: "⚡ Mid", value: "Intermediate", color: "#fbbf24", bg: "#3b2800" },
                { label: "🔥 Pro", value: "Pro", color: "#f87171", bg: "#450a0a" }].map(l => (
                <button key={l.value} onClick={() => setLevel(l.value)}
                  style={{ flex: 1, padding: "8px 4px", borderRadius: "8px", border: `2px solid ${level === l.value ? l.color : S.border}`, background: level === l.value ? l.bg : "#2a2a2a", color: level === l.value ? l.color : "#9ca3af", fontWeight: "bold", fontSize: "12px", cursor: "pointer" }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={loadQuiz} style={{ width: "100%", background: "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "12px", padding: "14px", color: "white", fontWeight: "bold", fontSize: "16px", cursor: "pointer", marginBottom: "8px" }}>
          🚀 Quiz Start பண்ணு!
        </button>
        <button onClick={onExit} style={{ width: "100%", background: "none", border: `1px solid ${S.border}`, borderRadius: "10px", padding: "10px", color: "#9ca3af", fontSize: "13px", cursor: "pointer" }}>
          ← Chat-க்கு திரும்பு
        </button>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: S.bg }}>
      <p style={{ fontSize: "48px" }}>⏳</p>
      <p style={{ color: S.green, fontSize: "18px", fontWeight: "bold" }}>Quiz தயாராகுது...</p>
    </div>
  );

  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    const emoji = score === questions.length ? "🏆" : score >= 3 ? "🎉" : "💪";
    const msg = score === questions.length ? "Perfect Score!" : score >= 3 ? "நல்லா பண்ணினே!" : "மேலும் படி!";
    const barColor = score === questions.length ? "#4ade80" : score >= 3 ? "#fbbf24" : "#f87171";
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: S.bg, padding: "20px", overflowY: "auto" }}>
        <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "24px", padding: "28px", width: "100%", maxWidth: "480px", textAlign: "center" }}>
          <div style={{ fontSize: "56px" }}>{emoji}</div>
          <h2 style={{ color: S.green, margin: "4px 0" }}>Quiz முடிஞ்சது!</h2>
          <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: "12px" }}>{topic || subject} • {language} • {level}</p>
          <div style={{ background: "#0f0f0f", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "48px", fontWeight: 900, color: barColor }}>{score}/{questions.length}</div>
            <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "10px" }}>{percent}% correct</div>
            <div style={{ background: "#2a2a2a", borderRadius: "999px", height: "8px" }}>
              <div style={{ width: `${percent}%`, background: barColor, height: "8px", borderRadius: "999px" }} />
            </div>
            <p style={{ color: barColor, fontWeight: "bold", marginTop: "10px", fontSize: "14px" }}>{msg}</p>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <div style={{ flex: 1, background: "#14532d", borderRadius: "12px", padding: "12px" }}>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#4ade80" }}>{score}</div>
              <div style={{ fontSize: "11px", color: "#86efac" }}>✅ Correct</div>
            </div>
            <div style={{ flex: 1, background: "#450a0a", borderRadius: "12px", padding: "12px" }}>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#f87171" }}>{questions.length - score}</div>
              <div style={{ fontSize: "11px", color: "#fca5a5" }}>❌ Wrong</div>
            </div>
            <div style={{ flex: 1, background: "#1e3a5f", borderRadius: "12px", padding: "12px" }}>
              <div style={{ fontSize: "22px", fontWeight: 900, color: "#60a5fa" }}>{questions.length}</div>
              <div style={{ fontSize: "11px", color: "#93c5fd" }}>📝 Total</div>
            </div>
          </div>
          {analyzing && <div style={{ background: "#1a1a2e", border: "1px solid #3b3b6b", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}><p style={{ color: "#818cf8", margin: 0, fontSize: "13px" }}>🤖 AI analyze பண்றது...</p></div>}
          {analysis && (
            <div style={{ background: "#1a1a2e", border: "1px solid #818cf8", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "left" }}>
              <p style={{ color: "#818cf8", fontWeight: "bold", margin: "0 0 8px", fontSize: "13px" }}>🤖 AI Analysis:</p>
              {analysis.weak_topics?.length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ color: "#f87171", fontSize: "12px", margin: "0 0 4px" }}>⚠️ Weak Topics:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {analysis.weak_topics.map(t => <span key={t} style={{ background: "#450a0a", color: "#f87171", padding: "2px 8px", borderRadius: "6px", fontSize: "11px" }}>{t}</span>)}
                  </div>
                </div>
              )}
              {analysis.advice && <p style={{ color: "#d1d5db", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>{analysis.advice}</p>}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={loadQuiz} style={{ width: "100%", background: "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "12px", padding: "12px", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>↺ Same Topic Again</button>
            <button onClick={() => { setStarted(false); setFinished(false); }} style={{ width: "100%", background: "#2a2a2a", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "10px", color: "white", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>🎯 New Topic</button>
            <button onClick={onExit} style={{ width: "100%", background: "none", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "10px", color: "#9ca3af", fontSize: "13px", cursor: "pointer" }}>💬 Chat-க்கு போ</button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: S.bg, color: "#ef4444" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "40px" }}>❌</p><p>Quiz load ஆகல!</p>
        <button onClick={loadQuiz} style={{ background: S.darkGreen, color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", cursor: "pointer", marginTop: "12px" }}>Retry</button>
      </div>
    </div>
  );

  const q = questions[current];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: S.bg, color: "white", padding: "20px", overflowY: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => setStarted(false)} style={{ background: "none", border: "1px solid #3f3f3f", color: "#9ca3af", borderRadius: "8px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" }}>← Back</button>
        <div style={{ flex: 1, background: "#2a2a2a", borderRadius: "999px", height: "8px" }}>
          <div style={{ width: `${((current + 1) / questions.length) * 100}%`, background: S.green, borderRadius: "999px", height: "8px", transition: "width 0.4s ease" }} />
        </div>
        <span style={{ color: S.green, fontWeight: "bold", fontSize: "14px" }}>{current + 1}/{questions.length}</span>
        <span style={{ background: "#14532d", color: S.green, padding: "4px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: "bold" }}>🏆 {score}</span>
      </div>
      <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "16px", padding: "24px", marginBottom: "16px", maxWidth: "700px", width: "100%", alignSelf: "center" }}>
        <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "8px" }}>Question {current + 1} {q.topic && <span style={{ color: "#818cf8" }}>• {q.topic}</span>}</p>
        <p style={{ fontSize: "18px", lineHeight: "1.6", margin: 0, fontWeight: "600" }}>{q.question}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "700px", width: "100%", alignSelf: "center" }}>
        {q.options.map((opt, i) => {
          const isCorrect = opt.charAt(0) === q.answer;
          const isSelected = selected === opt;
          let bg = "#1e1e1e", border = "#2a2a2a", color = "white";
          if (answered) {
            if (isCorrect) { bg = "#14532d"; border = S.green; color = S.green; }
            else if (isSelected) { bg = "#450a0a"; border = "#ef4444"; color = "#ef4444"; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(opt)}
              style={{ background: bg, border: `2px solid ${border}`, borderRadius: "12px", padding: "14px 18px", color, textAlign: "left", cursor: answered ? "default" : "pointer", fontSize: "15px", transition: "all 0.2s" }}>
              {opt}
              {answered && isCorrect && <span style={{ float: "right" }}>✅</span>}
              {answered && isSelected && !isCorrect && <span style={{ float: "right" }}>❌</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <div style={{ maxWidth: "700px", width: "100%", alignSelf: "center", marginTop: "16px" }}>
          <div style={{ background: "#1a2e1a", border: "1px solid #166534", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
            <p style={{ color: S.green, fontWeight: "bold", margin: "0 0 4px" }}>💡 Explanation:</p>
            <p style={{ color: "#d1d5db", margin: 0, lineHeight: "1.6" }}>{q.explanation}</p>
          </div>
          <button onClick={next} style={{ width: "100%", background: "linear-gradient(135deg, #166534, #15803d)", color: "white", border: "none", borderRadius: "12px", padding: "14px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
            {current + 1 >= questions.length ? "🏆 Result பாரு" : "அடுத்த Question →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [chats, setChats] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("examgenie_chats")); return s?.length ? s : [newChat()]; }
    catch { return [newChat()]; }
  });
  const [activeChatId, setActiveChatId] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem("examgenie_chats")); return s?.length ? s[0].id : null; }
    catch { return null; }
  });
  const [weakTopics, setWeakTopics] = useState(() => {
    try { return JSON.parse(localStorage.getItem("examgenie_weak_topics")) || []; }
    catch { return []; }
  });
  const [quizHistory, setQuizHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("examgenie_quiz_history")) || []; }
    catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quizMode, setQuizMode] = useState(false);
  const [examMode, setExamMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [challengeSelected, setChallengeSelected] = useState(null);
  const [challengeAnswered, setChallengeAnswered] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [showExamInfo, setShowExamInfo] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [examInfoData, setExamInfoData] = useState(null);
  const [selectedExam, setSelectedExam] = useState("TNPSC");
  const [examInfoType, setExamInfoType] = useState("syllabus");
  const [examInfoLoading, setExamInfoLoading] = useState(false);
  const fileRef = useRef(null);
  const [showMockTest, setShowMockTest] = useState(false);
const [mockTestData, setMockTestData] = useState(null);
const [mockTestLoading, setMockTestLoading] = useState(false);
const [mockCurrent, setMockCurrent] = useState(0);
const [mockSelected, setMockSelected] = useState(null);
const [mockAnswered, setMockAnswered] = useState(false);
const [mockScore, setMockScore] = useState(0);
const [mockFinished, setMockFinished] = useState(false);
const [mockTimeLeft, setMockTimeLeft] = useState(0);
const [mockSelectedExam, setMockSelectedExam] = useState("TNPSC");
const [mockNumQuestions, setMockNumQuestions] = useState(10);
const [mockWrongTopics, setMockWrongTopics] = useState([]);
  const bottomRef = useRef(null);
  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("உன் browser voice support பண்றதில்ல!"); return; }
    const r = new SR();
    r.lang = "ta-IN"; r.interimResults = false;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onresult = (e) => setInput(e.results[0][0].transcript);
    r.onerror = () => setListening(false);
    r.start();
  }

  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.name.includes("Ravi") || v.name.includes("Heera"));
    if (v) u.voice = v;
    u.lang = "en-IN"; u.rate = 0.9;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  function stopSpeak() { window.speechSynthesis.cancel(); setSpeaking(false); }

  async function loadDailyChallenge() {
    try {
      const res = await fetch(`${API_URL}/daily-challenge`);
      const data = await res.json();
      setDailyChallenge(data); setChallengeSelected(null); setChallengeAnswered(false);
    } catch { }
  }

  async function loadExamInfo(exam, type) {
    setExamInfoLoading(true); setExamInfoData(null);
    try {
      const res = await fetch(`${API_URL}/exam-info`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, type })
      });
      setExamInfoData(await res.json());
    } catch { }
    setExamInfoLoading(false);
  }

async function loadMockTest(exam, numQ) {
  setMockTestLoading(true); setMockTestData(null);
  setMockCurrent(0); setMockScore(0); setMockSelected(null);
  setMockAnswered(false); setMockFinished(false); setMockWrongTopics([]);
  try {
    const res = await fetch(`${API_URL}/mock-test`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam, num_questions: numQ })
    });
    const data = await res.json();
    setMockTestData(data);
    setMockTimeLeft(data.time_minutes * 60);
  } catch { }
  setMockTestLoading(false);
}

function handleMockAnswer(opt) {
  if (mockAnswered) return;
  setMockSelected(opt); setMockAnswered(true);
  const q = mockTestData.questions[mockCurrent];
  if (opt.charAt(0) === q.answer) { setMockScore(s => s + 1); }
  else { if (q.topic) setMockWrongTopics(w => [...w, q.topic]); }
}

function mockNext() {
  if (mockCurrent + 1 >= mockTestData.questions.length) {
    setMockFinished(true);
    handleQuizComplete(mockWrongTopics, mockScore, mockTestData.questions.length, mockSelectedExam);
    return;
  }
  setMockCurrent(c => c + 1); setMockSelected(null); setMockAnswered(false);
}

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      setUploadedFile({ base64, type: file.type, name: file.name });
      setFilePreview(file.type.startsWith("image") ? reader.result : "pdf");
    };
    reader.readAsDataURL(file);
  }

  async function sendWithFile() {
    if (!uploadedFile || loading) return;
    const question = input || "இந்த file பத்தி விளக்கு";
    const msgs = [...activeChat.messages, { role: "user", text: question, file: filePreview, fileName: uploadedFile.name }];
    updateChat(activeChat.id, { messages: msgs, title: activeChat.title === "New Chat" ? question.slice(0, 28) + "..." : activeChat.title });
    setInput(""); setLoading(true); setUploadedFile(null); setFilePreview(null);
    try {
      const res = await fetch(`${API_URL}/analyze-file`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_data: uploadedFile.base64, file_type: uploadedFile.type, question })
      });
      const data = await res.json();
      updateChat(activeChat.id, { messages: [...msgs, { role: "ai", text: data.answer || data.error }] });
    } catch {
      updateChat(activeChat.id, { messages: [...msgs, { role: "ai", text: "❌ File analyze ஆகல!" }] });
    }
    setLoading(false);
  }

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  useEffect(() => {
    localStorage.setItem("examgenie_chats", JSON.stringify(chats));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    localStorage.setItem("examgenie_weak_topics", JSON.stringify(weakTopics));
  }, [weakTopics]);
useEffect(() => {
  if (!mockTestData || mockFinished || mockTimeLeft <= 0) return;
  const timer = setInterval(() => {
    setMockTimeLeft(t => {
      if (t <= 1) { clearInterval(timer); setMockFinished(true); return 0; }
      return t - 1;
    });
  }, 1000);
  return () => clearInterval(timer);
}, [mockTestData, mockFinished, mockTimeLeft]);
  function updateChat(id, updates) { setChats(cs => cs.map(c => c.id === id ? { ...c, ...updates } : c)); }

  function addNewChat() {
    const c = newChat(); setChats(cs => [c, ...cs]); setActiveChatId(c.id);
    setInput(""); setQuizMode(false); setShowChallenge(false); setShowExamInfo(false); setShowDashboard(false);
    if (isMobile) setSidebarOpen(false);
  }

  function deleteChat(id) {
    const r = chats.filter(c => c.id !== id);
    if (!r.length) { const c = newChat(); setChats([c]); setActiveChatId(c.id); }
    else { setChats(r); if (activeChatId === id) setActiveChatId(r[0].id); }
  }

  function setSubject(val) { updateChat(activeChat.id, { subject: val }); }

  function handleQuizComplete(newWeakTopics, score, total, subject) {
    setWeakTopics(prev => [...new Set([...prev, ...newWeakTopics])].slice(0, 10));
    const entry = {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      score, total, subject,
      percent: Math.round((score / total) * 100)
    };
    setQuizHistory(prev => {
      const updated = [entry, ...prev].slice(0, 20);
      localStorage.setItem("examgenie_quiz_history", JSON.stringify(updated));
      return updated;
    });
  }

  async function send(customText) {
    const question = customText || input;
    if (!question.trim() || loading) return;
    const msgs = [...activeChat.messages, { role: "user", text: question }];
    const title = activeChat.title === "New Chat" ? question.slice(0, 28) + "..." : activeChat.title;
    updateChat(activeChat.id, { messages: msgs, title });
    setInput(""); setLoading(true);
    if (isMobile) setSidebarOpen(false);
    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `[Subject: ${activeChat.subject}] ${question}`,
          exam_mode: examMode,
          history: activeChat.messages.slice(-6).map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text
          }))
        })
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      updateChat(activeChat.id, { messages: [...msgs, { role: "ai", text: "" }] });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            fullText += data;
            updateChat(activeChat.id, { messages: [...msgs, { role: "ai", text: fullText }] });
          }
        }
      }
    } catch {
      updateChat(activeChat.id, { messages: [...msgs, { role: "ai", text: "❌ Server connect ஆகல!" }] });
    }
    setLoading(false);
  }

  // ─── DASHBOARD COMPONENT ─────────────────────────────────
  const chartData = [...quizHistory].reverse().slice(-10).map((h, i) => ({
    name: `#${i + 1}`,
    score: h.percent,
    subject: h.subject
  }));

  const subjectStats = quizHistory.reduce((acc, h) => {
    if (!acc[h.subject]) acc[h.subject] = { total: 0, count: 0 };
    acc[h.subject].total += h.percent;
    acc[h.subject].count += 1;
    return acc;
  }, {});

  const subjectChartData = Object.entries(subjectStats).map(([subject, data]) => ({
    subject: subject.slice(0, 8),
    avg: Math.round(data.total / data.count)
  }));

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', Arial, sans-serif", background: S.bg, color: "white", overflow: "hidden" }}>

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10 }} />
      )}

      {/* SIDEBAR */}
      <div style={{
        width: sidebarOpen ? "260px" : "0px",
        minWidth: sidebarOpen ? "260px" : "0px",
        background: S.sidebar,
        borderRight: sidebarOpen ? `1px solid ${S.border}` : "none",
        display: "flex", flexDirection: "column",
        position: isMobile ? "fixed" : "relative",
        top: 0, left: 0, height: "100vh",
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        transition: "all 0.3s ease",
        overflow: "hidden", zIndex: 20
      }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid ${S.border}` }}>
          <div style={{ fontSize: "28px" }}>🎓</div>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.3rem", fontWeight: 900 }}>Exam<span style={{ color: S.green }}>Genie</span></h1>
          <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#6b7280" }}>Tamil AI Tutor • Free</p>
        </div>

        <div style={{ padding: "12px" }}>
          <button onClick={addNewChat} style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px dashed #3f3f3f", background: "transparent", color: S.green, fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>➕ New Chat</button>
          <button onClick={() => { loadDailyChallenge(); setShowChallenge(true); setShowExamInfo(false); setShowDashboard(false); setQuizMode(false); if (isMobile) setSidebarOpen(false); }}
            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #f59e0b", background: showChallenge ? "#3b1f00" : "transparent", color: "#fbbf24", fontWeight: "bold", fontSize: "13px", cursor: "pointer", marginTop: "6px" }}>
            🏆 Daily Challenge
          </button>
          <button onClick={() => { setShowExamInfo(true); setShowChallenge(false); setShowDashboard(false); setQuizMode(false); loadExamInfo(selectedExam, examInfoType); if (isMobile) setSidebarOpen(false); }}
            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #3b82f6", background: showExamInfo ? "#1e3a5f" : "transparent", color: "#60a5fa", fontWeight: "bold", fontSize: "13px", cursor: "pointer", marginTop: "6px" }}>
            📚 Exam Prep
          </button>
          <button onClick={() => { setShowDashboard(true); setShowChallenge(false); setShowExamInfo(false); setQuizMode(false); if (isMobile) setSidebarOpen(false); }}
            style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #818cf8", background: showDashboard ? "#1a1a2e" : "transparent", color: "#818cf8", fontWeight: "bold", fontSize: "13px", cursor: "pointer", marginTop: "6px" }}>
            📊 Progress Dashboard
          </button>
          <button onClick={() => { setShowMockTest(true); setShowChallenge(false); setShowExamInfo(false); setShowDashboard(false); setQuizMode(false); if (isMobile) setSidebarOpen(false); }}
  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #f87171", background: showMockTest ? "#450a0a" : "transparent", color: "#f87171", fontWeight: "bold", fontSize: "13px", cursor: "pointer", marginTop: "6px" }}>
  ⏱️ Mock Test
</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
          <p style={{ fontSize: "10px", color: "#6b7280", fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Recent Chats</p>
          {chats.map(chat => (
            <div key={chat.id} onClick={() => { setActiveChatId(chat.id); setQuizMode(false); setShowChallenge(false); setShowExamInfo(false); setShowDashboard(false); if (isMobile) setSidebarOpen(false); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", borderRadius: "10px", marginBottom: "4px", cursor: "pointer", background: chat.id === activeChatId ? S.darkGreen : "transparent" }}>
              <div style={{ overflow: "hidden" }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: chat.id === activeChatId ? "bold" : "normal", color: chat.id === activeChatId ? "white" : "#d1d5db", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>💬 {chat.title}</p>
                <p style={{ margin: 0, fontSize: "10px", color: chat.id === activeChatId ? "#86efac" : "#6b7280" }}>{chat.subject} • {chat.createdAt}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteChat(chat.id); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", opacity: 0.6 }}>🗑️</button>
            </div>
          ))}
        </div>

        {weakTopics.length > 0 && (
          <div style={{ padding: "12px", borderTop: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ fontSize: "10px", color: "#f87171", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>⚠️ Weak Topics</p>
              <button onClick={() => setWeakTopics([])} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "10px", cursor: "pointer" }}>clear</button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {weakTopics.slice(0, 6).map(t => <span key={t} style={{ background: "#450a0a", color: "#f87171", padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>{t}</span>)}
            </div>
          </div>
        )}

        <div style={{ padding: "12px", borderTop: `1px solid ${S.border}` }}>
          <p style={{ fontSize: "10px", color: "#6b7280", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>📚 Subject</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {SUBJECTS.map(s => (
              <button key={s.value} onClick={() => setSubject(s.value)}
                style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${activeChat?.subject === s.value ? S.green : S.border}`, cursor: "pointer", fontSize: "11px", fontWeight: "bold", background: activeChat?.subject === s.value ? S.darkGreen : "#2a2a2a", color: activeChat?.subject === s.value ? "white" : "#9ca3af" }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: "10px", background: S.sidebar, flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "20px", cursor: "pointer", flexShrink: 0 }}>☰</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: "bold", fontSize: "15px" }}>🧞 Genie</span>
            <span style={{ fontSize: "11px", color: S.green, marginLeft: "8px" }}>● Online • {activeChat?.subject}</span>
          </div>
          {weakTopics.length > 0 && !isMobile && (
            <div style={{ background: "#3b1f00", border: "1px solid #f59e0b", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: "#fbbf24", fontWeight: "bold", flexShrink: 0 }}>
              ⚠️ {weakTopics.length} weak
            </div>
          )}
          <button onClick={() => setExamMode(e => !e)}
            style={{ background: examMode ? "#1e3a5f" : "#2a2a2a", border: `1px solid ${examMode ? "#60a5fa" : S.border}`, color: examMode ? "#60a5fa" : "#9ca3af", borderRadius: "10px", padding: "6px 12px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", flexShrink: 0 }}>
            {examMode ? "🎓 ON" : "🎓 Exam"}
          </button>
          <button onClick={() => { setQuizMode(q => !q); setShowChallenge(false); setShowExamInfo(false); setShowDashboard(false); }}
            style={{ background: quizMode ? S.darkGreen : "#2a2a2a", border: `1px solid ${quizMode ? S.green : S.border}`, color: quizMode ? "white" : S.green, borderRadius: "10px", padding: "6px 12px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", flexShrink: 0 }}>
            {quizMode ? "💬 Chat" : "🏆 Quiz"}
          </button>
        </div>

        {/* CONTENT */}
        {showDashboard ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: S.bg }}>
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              <h2 style={{ color: "#818cf8", marginBottom: "20px" }}>📊 Progress Dashboard</h2>

              {quizHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <p style={{ fontSize: "48px" }}>📊</p>
                  <p style={{ color: "#6b7280", fontSize: "16px" }}>Quiz பண்ணினா இங்க graph வரும்!</p>
                  <button onClick={() => { setShowDashboard(false); setQuizMode(true); }}
                    style={{ background: "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "12px", padding: "12px 24px", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer", marginTop: "16px" }}>
                    🏆 Quiz Start பண்ணு!
                  </button>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: "120px", background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "28px", fontWeight: 900, color: "#818cf8" }}>{quizHistory.length}</div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Quizzes</div>
                    </div>
                    <div style={{ flex: 1, minWidth: "120px", background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "28px", fontWeight: 900, color: S.green }}>
                        {Math.round(quizHistory.reduce((a, h) => a + h.percent, 0) / quizHistory.length)}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Average Score</div>
                    </div>
                    <div style={{ flex: 1, minWidth: "120px", background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "28px", fontWeight: 900, color: "#fbbf24" }}>
                        {Math.max(...quizHistory.map(h => h.percent))}%
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Best Score</div>
                    </div>
                    <div style={{ flex: 1, minWidth: "120px", background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "28px", fontWeight: 900, color: "#f87171" }}>
                        {weakTopics.length}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6b7280" }}>Weak Topics</div>
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                    <p style={{ color: "#818cf8", fontWeight: "bold", margin: "0 0 16px", fontSize: "14px" }}>📈 Score History</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                        <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                        <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", color: "white" }} />
                        <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={2} dot={{ fill: "#818cf8", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  {subjectChartData.length > 1 && (
                    <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                      <p style={{ color: "#60a5fa", fontWeight: "bold", margin: "0 0 16px", fontSize: "14px" }}>📊 Subject-wise Average</p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={subjectChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                          <XAxis dataKey="subject" stroke="#6b7280" fontSize={12} />
                          <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                          <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "8px", color: "white" }} />
                          <Bar dataKey="avg" fill="#4ade80" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Recent History */}
                  <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "20px", marginBottom: "16px" }}>
                    <p style={{ color: "#e5e7eb", fontWeight: "bold", margin: "0 0 12px", fontSize: "14px" }}>🕐 Recent Quizzes</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {quizHistory.slice(0, 5).map((h, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: S.bg, borderRadius: "10px" }}>
                          <div>
                            <span style={{ fontWeight: "bold", fontSize: "13px" }}>{h.subject}</span>
                            <span style={{ color: "#6b7280", fontSize: "11px", marginLeft: "8px" }}>{h.date} {h.time}</span>
                          </div>
                          <span style={{ fontWeight: "bold", fontSize: "15px", color: h.percent >= 80 ? S.green : h.percent >= 60 ? "#fbbf24" : "#f87171" }}>
                            {h.score}/{h.total} ({h.percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={() => { setShowDashboard(false); setQuizMode(true); }}
                    style={{ background: "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "12px", padding: "12px 24px", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer", marginRight: "8px" }}>
                    🏆 New Quiz
                  </button>
                  <button onClick={() => setShowDashboard(false)}
                    style={{ background: "#2a2a2a", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "12px 24px", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }}>
                    💬 Chat-க்கு போ
                  </button>
                </>
              )}
            </div>
          </div>

        ) : showMockTest ? (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", background: S.bg, overflow: "hidden" }}>
    {/* Mock Test Header */}
    {mockTestData && !mockFinished && !mockTestLoading && (
      <div style={{ padding: "12px 20px", background: S.sidebar, borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: "bold", color: "#f87171" }}>⏱️ {mockSelectedExam} Mock Test</span>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ color: mockTimeLeft < 60 ? "#ef4444" : "#fbbf24", fontWeight: "bold", fontSize: "18px" }}>
            ⏰ {Math.floor(mockTimeLeft / 60)}:{String(mockTimeLeft % 60).padStart(2, "0")}
          </span>
          <span style={{ color: S.green, fontWeight: "bold" }}>{mockCurrent + 1}/{mockTestData.questions.length}</span>
          <span style={{ background: "#14532d", color: S.green, padding: "4px 10px", borderRadius: "8px", fontSize: "13px" }}>🏆 {mockScore}</span>
        </div>
      </div>
    )}

    <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
      {/* Start Screen */}
      {!mockTestData && !mockTestLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "20px", padding: "28px", width: "100%", maxWidth: "520px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "40px" }}>⏱️</span>
              <h2 style={{ color: "#f87171", margin: "8px 0 4px" }}>Mock Test</h2>
              <p style={{ color: "#6b7280", margin: 0, fontSize: "13px" }}>Real exam simulation with timer!</p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>📝 Select Exam</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {["TNPSC", "NEET", "JEE", "10th TN Board", "12th TN Board"].map(e => (
                  <button key={e} onClick={() => setMockSelectedExam(e)}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: `1px solid ${mockSelectedExam === e ? "#f87171" : S.border}`, background: mockSelectedExam === e ? "#450a0a" : "#2a2a2a", color: mockSelectedExam === e ? "#f87171" : "#9ca3af", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p style={{ color: "#9ca3af", fontSize: "11px", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase" }}>❓ Questions</p>
              <div style={{ display: "flex", gap: "8px" }}>
                {[5, 10, 25, 50].map(n => (
                  <button key={n} onClick={() => setMockNumQuestions(n)}
                    style={{ flex: 1, padding: "10px", borderRadius: "10px", border: `1px solid ${mockNumQuestions === n ? "#f87171" : S.border}`, background: mockNumQuestions === n ? "#450a0a" : "#2a2a2a", color: mockNumQuestions === n ? "#f87171" : "#9ca3af", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: "#1a1a1a", borderRadius: "12px", padding: "14px", marginBottom: "20px" }}>
              <p style={{ color: "#9ca3af", fontSize: "12px", margin: "0 0 6px" }}>📋 Exam Details:</p>
              <div style={{ display: "flex", gap: "16px" }}>
                <span style={{ color: "#fbbf24", fontSize: "13px" }}>⏰ {mockSelectedExam === "TNPSC" ? "30" : "180"} mins</span>
                <span style={{ color: S.green, fontSize: "13px" }}>❓ {mockNumQuestions} questions</span>
                <span style={{ color: "#60a5fa", fontSize: "13px" }}>📚 Mixed subjects</span>
              </div>
            </div>

            <button onClick={() => loadMockTest(mockSelectedExam, mockNumQuestions)}
              style={{ width: "100%", background: "linear-gradient(135deg, #7f1d1d, #dc2626)", border: "none", borderRadius: "12px", padding: "14px", color: "white", fontWeight: "bold", fontSize: "16px", cursor: "pointer", marginBottom: "8px" }}>
              🚀 Mock Test Start!
            </button>
            <button onClick={() => setShowMockTest(false)}
              style={{ width: "100%", background: "none", border: `1px solid ${S.border}`, borderRadius: "10px", padding: "10px", color: "#9ca3af", fontSize: "13px", cursor: "pointer" }}>
              ← Back
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {mockTestLoading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <p style={{ fontSize: "48px" }}>⏳</p>
          <p style={{ color: "#f87171", fontSize: "18px", fontWeight: "bold" }}>{mockSelectedExam} Mock Test தயாராகுது...</p>
        </div>
      )}

      {/* Questions */}
      {mockTestData && !mockFinished && !mockTestLoading && (
        <div style={{ maxWidth: "700px", margin: "0 auto" }}>
          <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "16px", padding: "24px", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
                Q{mockCurrent + 1} • {mockTestData.questions[mockCurrent].subject}
                {mockTestData.questions[mockCurrent].topic && <span style={{ color: "#818cf8" }}> • {mockTestData.questions[mockCurrent].topic}</span>}
              </p>
              <div style={{ background: "#2a2a2a", borderRadius: "999px", height: "6px", width: "120px", alignSelf: "center" }}>
                <div style={{ width: `${((mockCurrent + 1) / mockTestData.questions.length) * 100}%`, background: "#f87171", height: "6px", borderRadius: "999px" }} />
              </div>
            </div>
            <p style={{ fontSize: "18px", lineHeight: "1.6", margin: 0, fontWeight: "600" }}>{mockTestData.questions[mockCurrent].question}</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {mockTestData.questions[mockCurrent].options.map((opt, i) => {
              const isCorrect = opt.charAt(0) === mockTestData.questions[mockCurrent].answer;
              const isSelected = mockSelected === opt;
              let bg = "#1e1e1e", border = "#2a2a2a", color = "white";
              if (mockAnswered) {
                if (isCorrect) { bg = "#14532d"; border = S.green; color = S.green; }
                else if (isSelected) { bg = "#450a0a"; border = "#ef4444"; color = "#ef4444"; }
              }
              return (
                <button key={i} onClick={() => handleMockAnswer(opt)}
                  style={{ background: bg, border: `2px solid ${border}`, borderRadius: "12px", padding: "14px 18px", color, textAlign: "left", cursor: mockAnswered ? "default" : "pointer", fontSize: "15px", transition: "all 0.2s" }}>
                  {opt}
                  {mockAnswered && isCorrect && <span style={{ float: "right" }}>✅</span>}
                  {mockAnswered && isSelected && !isCorrect && <span style={{ float: "right" }}>❌</span>}
                </button>
              );
            })}
          </div>

          {mockAnswered && (
            <div>
              <div style={{ background: "#1a2e1a", border: "1px solid #166534", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
                <p style={{ color: S.green, fontWeight: "bold", margin: "0 0 4px" }}>💡 Explanation:</p>
                <p style={{ color: "#d1d5db", margin: 0, lineHeight: "1.6" }}>{mockTestData.questions[mockCurrent].explanation}</p>
              </div>
              <button onClick={mockNext}
                style={{ width: "100%", background: "linear-gradient(135deg, #7f1d1d, #dc2626)", color: "white", border: "none", borderRadius: "12px", padding: "14px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}>
                {mockCurrent + 1 >= mockTestData.questions.length ? "🏆 Result பாரு" : "அடுத்த Question →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {mockFinished && mockTestData && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "24px", padding: "28px", width: "100%", maxWidth: "480px", textAlign: "center" }}>
            <div style={{ fontSize: "56px" }}>{mockScore / mockTestData.questions.length >= 0.8 ? "🏆" : mockScore / mockTestData.questions.length >= 0.6 ? "🎉" : "💪"}</div>
            <h2 style={{ color: "#f87171", margin: "4px 0" }}>Mock Test முடிஞ்சது!</h2>
            <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: "12px" }}>{mockSelectedExam} • {mockTestData.questions.length} Questions</p>
            <div style={{ background: S.bg, borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ fontSize: "48px", fontWeight: 900, color: mockScore / mockTestData.questions.length >= 0.8 ? S.green : mockScore / mockTestData.questions.length >= 0.6 ? "#fbbf24" : "#f87171" }}>
                {mockScore}/{mockTestData.questions.length}
              </div>
              <div style={{ color: "#9ca3af", fontSize: "13px" }}>{Math.round((mockScore / mockTestData.questions.length) * 100)}% correct</div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => loadMockTest(mockSelectedExam, mockNumQuestions)}
                style={{ flex: 1, background: "linear-gradient(135deg, #7f1d1d, #dc2626)", border: "none", borderRadius: "12px", padding: "12px", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
                🔄 Again
              </button>
              <button onClick={() => { setMockTestData(null); setMockFinished(false); }}
                style={{ flex: 1, background: "#2a2a2a", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "12px", color: "#9ca3af", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
                🎯 New Exam
              </button>
              <button onClick={() => setShowMockTest(false)}
                style={{ flex: 1, background: "#1a1a2e", border: "1px solid #818cf8", borderRadius: "12px", padding: "12px", color: "#818cf8", fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>
                💬 Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>

) : showChallenge ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: S.bg }}>
            <div style={{ maxWidth: "700px", margin: "0 auto" }}>
              <h2 style={{ color: "#60a5fa", marginBottom: "16px" }}>📚 Exam Prep</h2>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                {["TNPSC", "NEET", "JEE", "10th TN Board", "12th TN Board"].map(e => (
                  <button key={e} onClick={() => { setSelectedExam(e); loadExamInfo(e, examInfoType); }}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: `1px solid ${selectedExam === e ? "#3b82f6" : S.border}`, background: selectedExam === e ? "#1e3a5f" : S.sidebar, color: selectedExam === e ? "#60a5fa" : "#9ca3af", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
                    {e}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                {[["syllabus", "📖 Syllabus"], ["previous_years", "📝 Previous Years"], ["important_topics", "🎯 Important Topics"]].map(([type, label]) => (
                  <button key={type} onClick={() => { setExamInfoType(type); loadExamInfo(selectedExam, type); }}
                    style={{ padding: "8px 16px", borderRadius: "10px", border: `1px solid ${examInfoType === type ? "#f59e0b" : S.border}`, background: examInfoType === type ? "#3b1f00" : S.sidebar, color: examInfoType === type ? "#fbbf24" : "#9ca3af", cursor: "pointer", fontSize: "13px" }}>
                    {label}
                  </button>
                ))}
              </div>
              {examInfoLoading ? (
                <div style={{ textAlign: "center", padding: "40px" }}><p style={{ color: "#60a5fa" }}>⏳ Loading...</p></div>
              ) : examInfoData ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {examInfoData.data?.map((item, i) => (
                    <div key={i} style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "14px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <h3 style={{ color: "#e5e7eb", margin: 0, fontSize: "15px" }}>{item.subject}</h3>
                        {item.weightage && (
                          <span style={{ background: item.weightage === "high" ? "#14532d" : item.weightage === "medium" ? "#3b1f00" : S.sidebar, color: item.weightage === "high" ? "#4ade80" : item.weightage === "medium" ? "#fbbf24" : "#9ca3af", padding: "2px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                            {item.weightage?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {(item.chapters || item.topics) && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {(item.chapters || item.topics)?.map((t, j) => (
                            <span key={j} style={{ background: S.bg, border: `1px solid ${S.border}`, color: "#9ca3af", padding: "4px 10px", borderRadius: "8px", fontSize: "12px" }}>{t}</span>
                          ))}
                        </div>
                      )}
                      {item.question && (
                        <div>
                          <p style={{ color: "#9ca3af", fontSize: "12px", margin: "0 0 6px" }}>📅 {item.year}</p>
                          <p style={{ color: "#e5e7eb", margin: "0 0 8px", lineHeight: "1.6" }}>{item.question}</p>
                          <p style={{ color: "#4ade80", margin: 0, fontSize: "13px" }}>✅ {item.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
              <button onClick={() => setShowExamInfo(false)} style={{ marginTop: "16px", background: "#2a2a2a", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "12px 24px", color: "#9ca3af", cursor: "pointer", fontSize: "14px" }}>
                💬 Chat-க்கு போ
              </button>
            </div>
          </div>

        ) : quizMode ? (
          <QuizMode subject={activeChat?.subject || "General"} onExit={() => setQuizMode(false)} weakTopics={weakTopics} onQuizComplete={handleQuizComplete} />

        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {(!activeChat?.messages?.length) && (
                <div style={{ textAlign: "center", marginTop: "10%" }}>
                  <p style={{ fontSize: "48px" }}>🧞</p>
                  <h2 style={{ color: S.green, marginBottom: "8px" }}>வணக்கம்! நான் Genie</h2>
                  <p style={{ color: "#6b7280", marginBottom: "24px" }}>Subject select பண்ணி கேளு!</p>
                  {weakTopics.length > 0 && (
                    <div style={{ background: "#3b1f00", border: "1px solid #f59e0b", borderRadius: "12px", padding: "12px", marginBottom: "16px", maxWidth: "400px", margin: "0 auto 16px" }}>
                      <p style={{ color: "#fbbf24", fontWeight: "bold", margin: "0 0 6px", fontSize: "13px" }}>🎯 உன் Weak Topics:</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                        {weakTopics.slice(0, 5).map(t => <span key={t} style={{ background: "#450a0a", color: "#f87171", padding: "2px 8px", borderRadius: "6px", fontSize: "11px" }}>{t}</span>)}
                      </div>
                      <button onClick={() => setQuizMode(true)} style={{ background: "#f59e0b", color: "#1a1a1a", border: "none", borderRadius: "8px", padding: "6px 14px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", marginTop: "8px" }}>
                        🏆 Weak Topics Quiz பண்ணு!
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                    {QUICK.map(q => (
                      <button key={q} onClick={() => send(q)} style={{ background: S.sidebar, border: `1px solid ${S.border}`, borderRadius: "12px", padding: "10px 16px", fontSize: "13px", color: "#d1d5db", cursor: "pointer" }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {activeChat?.messages.map((m, i) => (
                <div key={i} style={{ marginBottom: "16px", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}
                  onMouseEnter={e => { const el = e.currentTarget.querySelector('.msg-actions'); if (el) el.style.opacity = "1"; }}
                  onMouseLeave={e => { const el = e.currentTarget.querySelector('.msg-actions'); if (el) el.style.opacity = "0"; }}>
                  {m.role === "ai" && <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: S.darkGreen, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginRight: "8px", flexShrink: 0, alignSelf: "flex-start" }}>🧞</div>}
                  <div style={{ maxWidth: "85%", minWidth: "40%" }}>
                    {m.file && m.file !== "pdf" && <img src={m.file} alt="upload" style={{ width: "120px", borderRadius: "8px", marginBottom: "6px", display: "block" }} />}
                    {m.file === "pdf" && <div style={{ background: "#2a2a2a", borderRadius: "8px", padding: "6px 10px", fontSize: "12px", color: "#9ca3af", marginBottom: "6px" }}>📄 {m.fileName}</div>}
                    <div style={{ padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? S.darkGreen : "#1e1e1e", color: "white", lineHeight: "1.7", fontSize: "14px", border: m.role === "ai" ? `1px solid ${S.border}` : "none" }}>
                      {m.role === "ai" ? <MsgText text={m.text} /> : <span style={{ whiteSpace: "pre-wrap" }}>{m.text}</span>}
                    </div>
                    <div className="msg-actions" style={{ display: "flex", gap: "6px", marginTop: "4px", justifyContent: m.role === "user" ? "flex-end" : "flex-start", opacity: "0", transition: "opacity 0.2s ease" }}>
                      <span style={{ color: "#4b5563", fontSize: "10px", alignSelf: "center" }}>
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <button onClick={() => navigator.clipboard.writeText(m.text)} style={{ background: "none", border: `1px solid ${S.border}`, color: "#6b7280", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>📋 Copy</button>
                      <button onClick={() => m.role === "ai" ? send(activeChat.messages[i - 1]?.text) : send(m.text)} style={{ background: "none", border: `1px solid ${S.border}`, color: "#6b7280", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>🔄 Retry</button>
                      {m.role === "user" && <button onClick={() => setInput(m.text)} style={{ background: "none", border: `1px solid ${S.border}`, color: "#6b7280", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>✏️ Edit</button>}
                      {m.role === "ai" && <button onClick={() => speaking ? stopSpeak() : speak(m.text)} style={{ background: "none", border: `1px solid ${S.border}`, color: speaking ? "#f87171" : "#6b7280", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", cursor: "pointer" }}>{speaking ? "⏹ Stop" : "🔊 Speak"}</button>}
                    </div>
                  </div>
                  {m.role === "user" && <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginLeft: "8px", flexShrink: 0, alignSelf: "flex-start" }}>👤</div>}
                </div>
              ))}

              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: S.darkGreen, display: "flex", alignItems: "center", justifyContent: "center" }}>🧞</div>
                  <div style={{ background: "#1e1e1e", border: `1px solid ${S.border}`, borderRadius: "18px", padding: "14px 18px" }}>
                    <span style={{ color: S.green }}>● </span><span style={{ color: S.green }}>● </span><span style={{ color: S.green }}>●</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ borderTop: `1px solid ${S.border}`, background: S.sidebar, flexShrink: 0 }}>
              {filePreview && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 16px", background: S.bg, borderBottom: `1px solid ${S.border}` }}>
                  {filePreview === "pdf" ? <span style={{ fontSize: "24px" }}>📄</span> : <img src={filePreview} alt="preview" style={{ width: "40px", height: "40px", borderRadius: "8px", objectFit: "cover" }} />}
                  <span style={{ color: "#9ca3af", fontSize: "12px" }}>{uploadedFile?.name}</span>
                  <button onClick={() => { setUploadedFile(null); setFilePreview(null); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "auto", fontSize: "16px" }}>✕</button>
                </div>
              )}
              <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#2a2a2a", borderRadius: "14px", padding: "8px 8px 8px 14px" }}>
                  <input type="file" ref={fileRef} onChange={handleFile} accept="image/*,.pdf" style={{ display: "none" }} />
                  <button onClick={() => fileRef.current.click()} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "18px", cursor: "pointer", padding: "4px", flexShrink: 0 }}>📎</button>
                  <input style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: "15px", minWidth: 0 }}
                    placeholder={uploadedFile ? `${uploadedFile.name} பத்தி கேளு...` : `${activeChat?.subject} பத்தி கேளு...`}
                    value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (uploadedFile ? sendWithFile() : send())} />
                  <button onClick={listening ? () => setListening(false) : startVoice}
                    style={{ background: listening ? "#450a0a" : "none", border: `1px solid ${listening ? "#ef4444" : "transparent"}`, borderRadius: "10px", padding: "8px 10px", color: listening ? "#ef4444" : "#9ca3af", fontSize: "16px", cursor: "pointer", flexShrink: 0 }}>
                    {listening ? "🔴" : "🎤"}
                  </button>
                  <button onClick={() => uploadedFile ? sendWithFile() : send()}
                    style={{ background: loading ? "#14532d" : "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "10px", padding: "10px 16px", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {loading ? "..." : uploadedFile ? "📎 Send" : "கேளு ➤"}
                  </button>
                </div>
                <p style={{ textAlign: "center", fontSize: "11px", color: "#4b5563", margin: "6px 0 0" }}>ExamGenie • Free Tamil AI Tutor • Open Source</p>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #3f3f3f; border-radius: 4px; }
        .msg-actions button:hover { background: #2a2a2a !important; }
      `}</style>
    </div>
  );
}