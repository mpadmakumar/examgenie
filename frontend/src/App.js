import { useState, useEffect, useRef } from "react";
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
        body: JSON.stringify({
          subject, topic, language, level,
          weak_topics: useWeakFocus ? weakTopics : []
        })
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
    if (opt.charAt(0) === q.answer) {
      setScore(s => s + 1);
    } else {
      // Wrong answer — topic save பண்ணு
      if (q.topic) setWrongTopics(w => [...w, q.topic]);
    }
  }

  async function next() {
    if (current + 1 >= questions.length) {
      setFinished(true);
      // Analyze weak topics
      if (wrongTopics.length > 0) {
        setAnalyzing(true);
        try {
          const res = await fetch(`${API_URL}/analyze`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wrong_topics: wrongTopics, subject })
          });
          const data = await res.json();
          setAnalysis(data);
          onQuizComplete(data.weak_topics || []);
        } catch { }
        setAnalyzing(false);
      }
      return;
    }
    setCurrent(c => c + 1); setSelected(null); setAnswered(false);
  }

  const S = { bg: "#0f0f0f", card: "#1a1a1a", border: "#2a2a2a", green: "#4ade80", darkGreen: "#166534" };

  // START SCREEN
  if (!started) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: S.bg, padding: "16px", overflowY: "auto" }}>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: "20px", padding: "20px", width: "100%", maxWidth: "520px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <span style={{ fontSize: "32px" }}>🏆</span>
          <h2 style={{ color: S.green, margin: "4px 0 0", fontSize: "1.2rem" }}>Quiz Mode</h2>
        </div>

        {/* Weak Focus Banner */}
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
              placeholder="Optional..." style={{ width: "100%", background: "#2a2a2a", border: `1px solid ${S.border}`, borderRadius: "8px", padding: "10px 12px", color: "white", fontSize: "14px", outline: "none" }} />
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

        <button onClick={loadQuiz} style={{ width: "100%", background: "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "12px", padding: "14px", color: "white", fontWeight: "bold", fontSize: "16px", cursor: "pointer", marginBottom: "8px", boxShadow: "0 4px 15px rgba(22,101,52,0.4)" }}>
          🚀 Quiz Start பண்ணு!
        </button>
        <button onClick={onExit} style={{ width: "100%", background: "none", border: `1px solid ${S.border}`, borderRadius: "10px", padding: "10px", color: "#9ca3af", fontSize: "13px", cursor: "pointer" }}>
          ← Chat-க்கு திரும்பு
        </button>
      </div>
    </div>
  );

  // LOADING
  if (loading) return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: S.bg, color: "white" }}>
      <p style={{ fontSize: "48px" }}>⏳</p>
      <p style={{ color: S.green, fontSize: "18px", fontWeight: "bold" }}>{useWeakFocus ? "🎯 Weak topics focus quiz..." : `${topic || subject} Quiz தயாராகுது...`}</p>
      <p style={{ color: "#6b7280" }}>Groq AI questions generate பண்றது</p>
    </div>
  );

  // RESULT SCREEN
  if (finished) {
    const percent = Math.round((score / questions.length) * 100);
    const emoji = score === questions.length ? "🏆" : score >= 3 ? "🎉" : "💪";
    const msg = score === questions.length ? "Perfect Score!" : score >= 3 ? "நல்லா பண்ணினே!" : "மேலும் படி!";
    const barColor = score === questions.length ? "#4ade80" : score >= 3 ? "#fbbf24" : "#f87171";

    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: S.bg, padding: "20px", overflowY: "auto" }}>
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: "24px", padding: "28px", width: "100%", maxWidth: "480px", textAlign: "center" }}>
          <div style={{ fontSize: "56px" }}>{emoji}</div>
          <h2 style={{ color: S.green, margin: "4px 0", fontSize: "1.4rem" }}>Quiz முடிஞ்சது!</h2>
          <p style={{ color: "#6b7280", margin: "0 0 20px", fontSize: "12px" }}>{topic || subject} • {language} • {level}</p>

          <div style={{ background: "#0f0f0f", borderRadius: "16px", padding: "20px", marginBottom: "16px" }}>
            <div style={{ fontSize: "48px", fontWeight: 900, color: barColor }}>{score}/{questions.length}</div>
            <div style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "10px" }}>{percent}% correct</div>
            <div style={{ background: "#2a2a2a", borderRadius: "999px", height: "8px" }}>
              <div style={{ width: `${percent}%`, background: barColor, height: "8px", borderRadius: "999px", transition: "width 1s ease" }} />
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

          {/* AI Analysis */}
          {analyzing && (
            <div style={{ background: "#1a1a2e", border: "1px solid #3b3b6b", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}>
              <p style={{ color: "#818cf8", margin: 0, fontSize: "13px" }}>🤖 AI உன் weak topics analyze பண்றது...</p>
            </div>
          )}
          {analysis && (
            <div style={{ background: "#1a1a2e", border: "1px solid #818cf8", borderRadius: "12px", padding: "16px", marginBottom: "16px", textAlign: "left" }}>
              <p style={{ color: "#818cf8", fontWeight: "bold", margin: "0 0 8px", fontSize: "13px" }}>🤖 AI Analysis:</p>
              {analysis.weak_topics?.length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  <p style={{ color: "#f87171", fontSize: "12px", margin: "0 0 4px" }}>⚠️ Weak Topics:</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {analysis.weak_topics.map(t => (
                      <span key={t} style={{ background: "#450a0a", color: "#f87171", padding: "2px 8px", borderRadius: "6px", fontSize: "11px" }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {analysis.advice && <p style={{ color: "#d1d5db", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>{analysis.advice}</p>}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button onClick={loadQuiz} style={{ width: "100%", background: "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "12px", padding: "12px", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(22,101,52,0.3)" }}>↺ Same Topic Again</button>
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
        <p style={{ fontSize: "40px" }}>❌</p>
        <p>Quiz load ஆகல!</p>
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

      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <span style={{ background: "#1e3a5f", color: "#60a5fa", padding: "4px 16px", borderRadius: "999px", fontSize: "12px", fontWeight: "bold" }}>
          📚 {topic || subject} • {language} • {level}
          {useWeakFocus && <span style={{ color: "#fbbf24", marginLeft: "8px" }}>🎯 Weak Focus</span>}
        </span>
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "16px", padding: "24px", marginBottom: "16px", maxWidth: "700px", width: "100%", alignSelf: "center" }}>
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
              style={{ background: bg, border: `2px solid ${border}`, borderRadius: "12px", padding: "14px 18px", color, textAlign: "left", cursor: answered ? "default" : "pointer", fontSize: "15px", transition: "all 0.2s", boxShadow: answered && isCorrect ? "0 0 12px rgba(74,222,128,0.3)" : "none" }}>
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
          <button onClick={next} style={{ width: "100%", background: "linear-gradient(135deg, #166534, #15803d)", color: "white", border: "none", borderRadius: "12px", padding: "14px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 15px rgba(22,101,52,0.3)" }}>
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quizMode, setQuizMode] = useState(false);
  const bottomRef = useRef(null);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
  const S = { bg: "#0f0f0f", sidebar: "#1a1a1a", border: "#2a2a2a", green: "#4ade80", darkGreen: "#166534" };

  useEffect(() => {
    localStorage.setItem("examgenie_chats", JSON.stringify(chats));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  useEffect(() => {
    localStorage.setItem("examgenie_weak_topics", JSON.stringify(weakTopics));
  }, [weakTopics]);

  function updateChat(id, updates) { setChats(cs => cs.map(c => c.id === id ? { ...c, ...updates } : c)); }
  function addNewChat() { const c = newChat(); setChats(cs => [c, ...cs]); setActiveChatId(c.id); setInput(""); setQuizMode(false); }
  function deleteChat(id) {
    const r = chats.filter(c => c.id !== id);
    if (!r.length) { const c = newChat(); setChats([c]); setActiveChatId(c.id); }
    else { setChats(r); if (activeChatId === id) setActiveChatId(r[0].id); }
  }
  function setSubject(val) { updateChat(activeChat.id, { subject: val }); }

  function handleQuizComplete(newWeakTopics) {
    setWeakTopics(prev => {
      const combined = [...new Set([...prev, ...newWeakTopics])].slice(0, 10);
      return combined;
    });
  }

  async function send(customText) {
    const question = customText || input;
    if (!question.trim() || loading) return;
    const msgs = [...activeChat.messages, { role: "user", text: question }];
    const title = activeChat.title === "New Chat" ? question.slice(0, 28) + "..." : activeChat.title;
    updateChat(activeChat.id, { messages: msgs, title });
    setInput(""); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ask`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: `[Subject: ${activeChat.subject}] ${question}` }) });
      const data = await res.json();
      updateChat(activeChat.id, { messages: [...msgs, { role: "ai", text: data.answer }] });
    } catch {
      updateChat(activeChat.id, { messages: [...msgs, { role: "ai", text: "❌ Server connect ஆகல!" }] });
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', Arial, sans-serif", background: S.bg, color: "white" }}>

      {/* SIDEBAR */}
      {sidebarOpen && (
        <div style={{ width: "260px", minWidth: "260px", background: S.sidebar, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column" }}>

          <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid ${S.border}` }}>
            <div style={{ fontSize: "28px" }}>🎓</div>
            <h1 style={{ margin: "4px 0 0", fontSize: "1.3rem", fontWeight: 900 }}>Exam<span style={{ color: S.green }}>Genie</span></h1>
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#6b7280" }}>Tamil AI Tutor • Free</p>
          </div>

          <div style={{ padding: "12px" }}>
            <button onClick={addNewChat} style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px dashed #3f3f3f", background: "transparent", color: S.green, fontWeight: "bold", fontSize: "14px", cursor: "pointer" }}>➕ New Chat</button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
            <p style={{ fontSize: "10px", color: "#6b7280", fontWeight: "bold", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Recent Chats</p>
            {chats.map(chat => (
              <div key={chat.id} onClick={() => { setActiveChatId(chat.id); setQuizMode(false); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", borderRadius: "10px", marginBottom: "4px", cursor: "pointer", background: chat.id === activeChatId ? S.darkGreen : "transparent" }}>
                <div style={{ overflow: "hidden" }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: chat.id === activeChatId ? "bold" : "normal", color: chat.id === activeChatId ? "white" : "#d1d5db", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>💬 {chat.title}</p>
                  <p style={{ margin: 0, fontSize: "10px", color: chat.id === activeChatId ? "#86efac" : "#6b7280" }}>{chat.subject} • {chat.createdAt}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteChat(chat.id); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", opacity: 0.6 }}>🗑️</button>
              </div>
            ))}
          </div>

          {/* Weak Topics Section */}
          {weakTopics.length > 0 && (
            <div style={{ padding: "12px", borderTop: `1px solid ${S.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <p style={{ fontSize: "10px", color: "#f87171", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>⚠️ Weak Topics</p>
                <button onClick={() => setWeakTopics([])} style={{ background: "none", border: "none", color: "#6b7280", fontSize: "10px", cursor: "pointer" }}>clear</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {weakTopics.slice(0, 6).map(t => (
                  <span key={t} style={{ background: "#450a0a", color: "#f87171", padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: "12px", borderTop: `1px solid ${S.border}` }}>
            <p style={{ fontSize: "10px", color: "#6b7280", fontWeight: "bold", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>📚 Subject</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {SUBJECTS.map(s => (
                <button key={s.value} onClick={() => setSubject(s.value)}
                  style={{ padding: "6px 10px", borderRadius: "8px", border: `1px solid ${activeChat?.subject === s.value ? S.green : S.border}`, cursor: "pointer", fontSize: "11px", fontWeight: "bold", background: activeChat?.subject === s.value ? S.darkGreen : "#2a2a2a", color: activeChat?.subject === s.value ? "white" : "#9ca3af", transition: "all 0.2s" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "12px", borderTop: `1px solid ${S.border}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <span style={{ background: "#14532d", color: S.green, padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}>⚡ Powered by Groq</span>
              <span style={{ background: "#1e3a5f", color: "#60a5fa", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}>🆓 100% Free Forever</span>
              <span style={{ background: "#3b1f00", color: "#fbbf24", padding: "4px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "bold" }}>🌐 Open Source</span>
            </div>
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", gap: "12px", background: S.sidebar }}>
          <button onClick={() => setSidebarOpen(o => !o)} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "20px", cursor: "pointer" }}>☰</button>
          <div>
            <span style={{ fontWeight: "bold", fontSize: "15px" }}>🧞 Genie</span>
            <span style={{ fontSize: "11px", color: S.green, marginLeft: "8px" }}>● Online • {activeChat?.subject}</span>
          </div>
          {weakTopics.length > 0 && (
            <div style={{ background: "#3b1f00", border: "1px solid #f59e0b", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", color: "#fbbf24", fontWeight: "bold" }}>
              ⚠️ {weakTopics.length} weak topics
            </div>
          )}
          <button onClick={() => setQuizMode(q => !q)}
            style={{ marginLeft: "auto", background: quizMode ? S.darkGreen : "#2a2a2a", border: `1px solid ${quizMode ? S.green : S.border}`, color: quizMode ? "white" : S.green, borderRadius: "10px", padding: "8px 16px", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>
            {quizMode ? "💬 Chat Mode" : "🏆 Quiz Mode"}
          </button>
        </div>

        {quizMode
          ? <QuizMode subject={activeChat?.subject || "General"} onExit={() => setQuizMode(false)} weakTopics={weakTopics} onQuizComplete={handleQuizComplete} />
          : <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {(!activeChat?.messages?.length) && (
                <div style={{ textAlign: "center", marginTop: "12%" }}>
                  <p style={{ fontSize: "48px" }}>🧞</p>
                  <h2 style={{ color: S.green, marginBottom: "8px" }}>வணக்கம்! நான் Genie</h2>
                  <p style={{ color: "#6b7280", marginBottom: "24px" }}>Subject select பண்ணி கேளு!</p>
                  {weakTopics.length > 0 && (
                    <div style={{ background: "#3b1f00", border: "1px solid #f59e0b", borderRadius: "12px", padding: "12px", marginBottom: "16px", maxWidth: "400px", margin: "0 auto 16px" }}>
                      <p style={{ color: "#fbbf24", fontWeight: "bold", margin: "0 0 6px", fontSize: "13px" }}>🎯 உன் Weak Topics:</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                        {weakTopics.slice(0, 5).map(t => (
                          <span key={t} style={{ background: "#450a0a", color: "#f87171", padding: "2px 8px", borderRadius: "6px", fontSize: "11px" }}>{t}</span>
                        ))}
                      </div>
                      <button onClick={() => setQuizMode(true)} style={{ background: "#f59e0b", color: "#1a1a1a", border: "none", borderRadius: "8px", padding: "6px 14px", fontWeight: "bold", fontSize: "12px", cursor: "pointer", marginTop: "8px" }}>
                        🏆 Weak Topics Quiz பண்ணு!
                      </button>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
                    {QUICK.map(q => (
                      <button key={q} onClick={() => send(q)} style={{ background: "#1a1a1a", border: `1px solid ${S.border}`, borderRadius: "12px", padding: "10px 16px", fontSize: "13px", color: "#d1d5db", cursor: "pointer" }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}
              {activeChat?.messages.map((m, i) => (
                <div key={i} style={{ marginBottom: "16px", display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
                  {m.role === "ai" && <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: S.darkGreen, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginRight: "8px", flexShrink: 0 }}>🧞</div>}
                  <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? S.darkGreen : "#1e1e1e", color: "white", whiteSpace: "pre-wrap", lineHeight: "1.7", fontSize: "14px", border: m.role === "ai" ? `1px solid ${S.border}` : "none" }}>{m.text}</div>
                  {m.role === "user" && <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", marginLeft: "8px", flexShrink: 0 }}>👤</div>}
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

            <div style={{ padding: "16px 20px", borderTop: `1px solid ${S.border}`, background: S.sidebar }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "#2a2a2a", borderRadius: "14px", padding: "8px 8px 8px 16px" }}>
                <input style={{ flex: 1, background: "none", border: "none", outline: "none", color: "white", fontSize: "15px", minWidth: 0 }}
                  placeholder={`${activeChat?.subject} பத்தி கேளு...`}
                  value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} />
                <button onClick={() => send()} style={{ background: loading ? "#14532d" : "linear-gradient(135deg, #166534, #15803d)", border: "none", borderRadius: "10px", padding: "10px 20px", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 12px rgba(22,101,52,0.3)", whiteSpace: "nowrap" }}>
                  {loading ? "..." : "கேளு ➤"}
                </button>
              </div>
              <p style={{ textAlign: "center", fontSize: "11px", color: "#4b5563", margin: "8px 0 0" }}>ExamGenie • Free Tamil AI Tutor • Open Source</p>
            </div>
          </>
        }
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #3f3f3f; border-radius: 4px; }
      `}</style>
    </div>
  );
}
