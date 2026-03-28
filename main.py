from flask import Flask, request, jsonify
from flask import Response, stream_with_context
from flask_cors import CORS
from groq import Groq
from tavily import TavilyClient
from dotenv import load_dotenv
import json
import os
import math
import re
import sqlite3
import subprocess
import tempfile
import wikipediaapi

load_dotenv()

app = Flask(__name__)
CORS(app)

# ─── API CLIENTS ─────────────────────────────────────
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

# Gemini Key Rotation
gemini_keys = [k for k in [os.getenv("GEMINI_API_KEY_1"), os.getenv("GEMINI_API_KEY_2"), os.getenv("GEMINI_API_KEY_3")] if k]
gemini_key_index = 0

# ─── PROMPTS ─────────────────────────────────────────
SYSTEM_PROMPT = """நீ ExamGenie — Tamil students-க்கு help பண்ற AI tutor.
உன்னை develop பண்ணவர் Padmakumar — Full Stack Developer & AI enthusiast.

!!STRICT LANGUAGE RULE!!
- Detect user's language from their message
- Reply ONLY in that SAME language — NO mixing!
- Tamil message → Tamil ONLY reply
- English message → English ONLY reply
- Tanglish message → Tanglish ONLY reply
- NEVER add "In English:" or "In Tamil:" sections
- NEVER translate your answer
- ONE language per response — STRICTLY!

Be encouraging. Use simple words.
If asked who made you: 'என்னை உருவாக்கியவர் Padmakumar, a passionate Full Stack Developer.'"""

EXAM_PROMPT = """நீ ExamGenie — Tamil students-க்கு TNPSC, NEET, JEE, 10th/12th TN Board exam help பண்ற AI tutor.
Web search results கொடுக்கப்படும் — அதை வச்சு accurate answer சொல்லு.
Always explain in Tamil first, then English.
Syllabus, previous year questions, important topics — எல்லாம் accurate-ஆ சொல்லு."""

# ─── MCP TOOLS ───────────────────────────────────────

# Wikipedia
wiki = wikipediaapi.Wikipedia(language='en', user_agent='ExamGenie/1.0')

def tool_wikipedia(query):
    try:
        page = wiki.page(query)
        if page.exists():
            return page.summary[:1500]
        return f"'{query}' Wikipedia-ல கிடைக்கல!"
    except:
        return "Wikipedia search failed!"

# Calculator
def tool_calculator(expression):
    try:
        allowed = {k: getattr(math, k) for k in dir(math) if not k.startswith('_')}
        allowed['abs'] = abs
        result = eval(expression, {"__builtins__": {}}, allowed)
        return f"Result: {result}"
    except Exception as e:
        return f"Calculation error: {str(e)}"

# Web Search
def tool_web_search(query):
    try:
        results = tavily.search(query=query, search_depth="basic", max_results=3)
        return "\n\n".join([r.get("content", "") for r in results.get("results", [])])
    except:
        return "Search failed!"

# Code Executor
NOTES_DIR = "student_notes"
os.makedirs(NOTES_DIR, exist_ok=True)

def tool_code_executor(code):
    try:
        dangerous = ['import os', 'import sys', 'subprocess', 'open(', '__import__',
                    'eval(', 'exec(', 'shutil', 'requests', 'socket']
        for d in dangerous:
            if d in code:
                return f"❌ Dangerous code blocked: {d}"
        safe_code = "import math\nimport statistics\n" + code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(safe_code)
            tmp_path = f.name
        result = subprocess.run(['python', tmp_path], capture_output=True, text=True, timeout=5)
        os.unlink(tmp_path)
        if result.returncode == 0:
            return f"✅ Output:\n{result.stdout}"
        else:
            return f"❌ Error:\n{result.stderr}"
    except subprocess.TimeoutExpired:
        return "⏱ Code timeout!"
    except Exception as e:
        return f"Error: {str(e)}"

# Database Tool
def init_db():
    conn = sqlite3.connect("examgenie.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS student_progress
                 (id INTEGER PRIMARY KEY, student_id TEXT, subject TEXT,
                  score INTEGER, total INTEGER, weak_topics TEXT, timestamp TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS notes
                 (id INTEGER PRIMARY KEY, student_id TEXT, title TEXT,
                  content TEXT, subject TEXT, timestamp TEXT)''')
    conn.commit()
    conn.close()

init_db()

def tool_database(action, data={}):
    try:
        conn = sqlite3.connect("examgenie.db")
        c = conn.cursor()
        if action == "save_progress":
            c.execute("INSERT INTO student_progress (student_id, subject, score, total, weak_topics, timestamp) VALUES (?,?,?,?,?,?)",
                     (data.get("student_id", "default"), data.get("subject"),
                      data.get("score"), data.get("total"),
                      data.get("weak_topics", ""), data.get("timestamp", "")))
            conn.commit()
            return "Progress saved! ✅"
        elif action == "get_progress":
            c.execute("SELECT subject, score, total, timestamp FROM student_progress WHERE student_id=? ORDER BY id DESC LIMIT 10",
                     (data.get("student_id", "default"),))
            rows = c.fetchall()
            conn.close()
            if not rows:
                return "Progress இல்ல!"
            return "\n".join([f"📚 {r[0]}: {r[1]}/{r[2]} — {r[3]}" for r in rows])
        elif action == "save_note":
            c.execute("INSERT INTO notes (student_id, title, content, subject, timestamp) VALUES (?,?,?,?,?)",
                     (data.get("student_id", "default"), data.get("title"),
                      data.get("content"), data.get("subject"), data.get("timestamp", "")))
            conn.commit()
            conn.close()
            return "Note saved! ✅"
        elif action == "get_notes":
            c.execute("SELECT title, content, subject FROM notes WHERE student_id=? ORDER BY id DESC LIMIT 5",
                     (data.get("student_id", "default"),))
            rows = c.fetchall()
            conn.close()
            if not rows:
                return "Notes இல்ல!"
            return "\n".join([f"📝 {r[0]} ({r[2]}): {r[1][:100]}" for r in rows])
    except Exception as e:
        return f"DB Error: {str(e)}"

# File System Tool
def tool_filesystem(action, data={}):
    try:
        if action == "save":
            filename = f"{NOTES_DIR}/{data.get('filename', 'note')}.txt"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(data.get('content', ''))
            return f"✅ Saved: {filename}"
        elif action == "read":
            filename = f"{NOTES_DIR}/{data.get('filename', 'note')}.txt"
            if os.path.exists(filename):
                with open(filename, 'r', encoding='utf-8') as f:
                    return f.read()
            return "File இல்ல!"
        elif action == "list":
            files = os.listdir(NOTES_DIR)
            return "\n".join(files) if files else "Files இல்ல!"
    except Exception as e:
        return f"Error: {str(e)}"

TOOLS = {
    "wikipedia": tool_wikipedia,
    "calculator": tool_calculator,
    "web_search": tool_web_search,
    "code_executor": tool_code_executor,
    "database": tool_database,
    "filesystem": tool_filesystem,
}

def run_tools(question):
    results = {}
    # Calculator
    if any(op in question for op in ['+', '-', '*', '/', '^', 'calculate', 'solve']) and any(c.isdigit() for c in question):
        expr = re.sub(r'[^\d\+\-\*\/\.\(\)\^]', '', question.replace('^', '**'))
        if expr:
            results['calculator'] = tool_calculator(expr)
    # Wikipedia
    if any(word in question.lower() for word in ['what is', 'who is', 'explain', 'define', 'history', 'என்ன', 'விளக்கு', 'யார்']):
        key = question.split()[:4]
        results['wikipedia'] = tool_wikipedia(' '.join(key))
    # Web Search
    if any(word in question.lower() for word in ['tnpsc', 'neet', 'jee', 'exam', 'syllabus', '2024', '2025', '2026', 'latest', 'current']):
        results['web_search'] = tool_web_search(question)
    # Code Executor
    if '```python' in question or 'run this' in question.lower() or 'execute' in question.lower():
        code = re.findall(r'```python(.*?)```', question, re.DOTALL)
        if code:
            results['code_executor'] = tool_code_executor(code[0].strip())
    # Notes
    if any(word in question.lower() for word in ['my notes', 'get notes', 'list notes', 'show notes']):
        results['filesystem'] = tool_filesystem("list")
    return results

# ─── QUIZ PROMPT ─────────────────────────────────────
def get_quiz_prompt(language, level):
    level_map = {
        "Beginner": {"tamil": "எளிமையான (5th-7th std level)", "english": "easy (5th-7th grade level)"},
        "Intermediate": {"tamil": "நடுத்தர (8th-10th std level)", "english": "medium (8th-10th grade level)"},
        "Pro": {"tamil": "கடினமான (11th-12th / competitive exam level)", "english": "hard (11th-12th / competitive exam level)"}
    }
    difficulty = level_map.get(level, level_map["Intermediate"])
    if language == "Tamil":
        return f"""நீ ExamGenie Quiz Master.
{difficulty['tamil']} கேள்விகள் generate பண்ணு.
Generate exactly 5 MCQ in TAMIL in JSON:
{{"questions": [{{"question": "...", "options": ["A)...","B)...","C)...","D)..."], "answer": "A", "explanation": "...", "topic": "..."}}]}}
Return ONLY JSON."""
    else:
        return f"""You are ExamGenie Quiz Master.
Generate {difficulty['english']} questions in ENGLISH in JSON:
{{"questions": [{{"question": "...", "options": ["A)...","B)...","C)...","D)..."], "answer": "A", "explanation": "...", "topic": "..."}}]}}
Return ONLY JSON."""

# ─── ROUTES ──────────────────────────────────────────
@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    question = data.get("text", "")
    exam_mode = data.get("exam_mode", False)
    history = data.get("history", [])

    tool_results = run_tools(question)

    context = ""
    if tool_results.get("calculator"):
        context += f"\n🧠 Calculator Result:\n{tool_results['calculator']}\n"
    if tool_results.get("wikipedia"):
        context += f"\n📚 Wikipedia Info:\n{tool_results['wikipedia']}\n"
    if tool_results.get("web_search"):
        context += f"\n🌐 Web Search Results:\n{tool_results['web_search']}\n"
    if tool_results.get("code_executor"):
        context += f"\n💻 Code Output:\n{tool_results['code_executor']}\n"
    if tool_results.get("filesystem"):
        context += f"\n📂 Files:\n{tool_results['filesystem']}\n"

    if exam_mode and not context:
        try:
            search_results = tavily.search(query=question, search_depth="basic", max_results=3)
            context += "\n🌐 Web Search:\n" + "\n\n".join([r.get("content", "") for r in search_results.get("results", [])])
        except:
            pass

    # Detect language
    import re
    tamil_chars = sum(1 for c in question if '\u0B80' <= c <= '\u0BFF')
    tamil_words = ['என்ன', 'எப்படி', 'ஏன்', 'யார்', 'எங்கு', 'எது']
    tanglish_words = ['enna', 'epdi', 'eppadi', 'sollu', 'pannau', 'panna', 'iruku',
                      'varuma', 'soli', 'kudu', 'theriyuma', 'nalla', 'romba', 'konjam',
                      'puraya', 'puriyala', 'sari', 'inga', 'anda', 'ithu', 'athu',
                      'enga', 'yaru', 'eppo', 'paaru', 'pakka', 'paarunga', 'sollunga',
                      'pannunga', 'theriyum', 'illa', 'bro', 'ma', 'nga', 'nu']

    q_lower = question.lower()
    q_words = re.findall(r'\b\w+\b', q_lower)
    is_tamil = tamil_chars > 3 or any(w in question for w in tamil_words)
    is_tanglish = any(w in q_words for w in tanglish_words)

    if is_tamil:
        lang_instruction = "RESPOND IN TAMIL ONLY. NO ENGLISH."
    elif is_tanglish:
        lang_instruction = "RESPOND IN TANGLISH ONLY. NO PURE TAMIL SCRIPT."
    else:
        lang_instruction = "RESPOND IN ENGLISH ONLY. NO TAMIL."

    if context:
        prompt = f"""Tool Results:\n{context}\nStudent Question: {question}\n{lang_instruction}"""
        system = EXAM_PROMPT
    else:
        prompt = f"{lang_instruction}\n\n{question}"
        system = SYSTEM_PROMPT

    messages = [{"role": "system", "content": system}]
    for h in history[:-1]:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": prompt})

    def generate():
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {delta}\n\n"
        yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate()), mimetype="text/event-stream",
                   headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.route("/analyze-file", methods=["POST"])
def analyze_file():
    global gemini_key_index
    data = request.get_json()
    file_data = data.get("file_data", "")
    file_type = data.get("file_type", "")
    question = data.get("question", "இந்த file பத்தி சொல்லு")
    try:
        from google import genai
        from google.genai import types
        import base64
        client_g = genai.Client(api_key=gemini_keys[gemini_key_index])
        prompt = f"""நீ ExamGenie — Tamil students-க்கு help பண்ற AI tutor.
இந்த file-ஐ analyze பண்ணி Tamil-ல explain பண்ணு.
Student question: {question}
Important points, key concepts எல்லாம் சொல்லு."""
        file_bytes = base64.b64decode(file_data)
        response = client_g.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=[types.Part.from_bytes(data=file_bytes, mime_type=file_type), prompt]
        )
        return jsonify({"answer": response.text})
    except Exception as e:
        gemini_key_index = (gemini_key_index + 1) % len(gemini_keys)
        return jsonify({"error": str(e)}), 500

@app.route("/quiz", methods=["POST"])
def quiz():
    data = request.get_json()
    subject = data.get("subject", "General")
    topic = data.get("topic", "")
    language = data.get("language", "Tamil")
    level = data.get("level", "Intermediate")
    weak_topics = data.get("weak_topics", [])
    prompt = f"Generate 5 MCQ questions for subject: {subject}"
    if topic:
        prompt += f", specific topic: {topic}"
    elif weak_topics:
        prompt += f". FOCUS on weak topics: {', '.join(weak_topics[:3])}"
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": get_quiz_prompt(language, level)},
            {"role": "user", "content": prompt}
        ]
    )
    text = response.choices[0].message.content
    try:
        quiz_data = json.loads(text[text.find("{"):text.rfind("}")+1])
        return jsonify(quiz_data)
    except:
        return jsonify({"error": "Quiz generate ஆகல!"}), 500

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    wrong_topics = data.get("wrong_topics", [])
    subject = data.get("subject", "General")
    if not wrong_topics:
        return jsonify({"weak_topics": [], "advice": ""})
    prompt = f"""Student got these topics wrong in {subject}: {', '.join(wrong_topics)}.
Identify top 3 weak areas and give short encouraging advice in Tamil (2 sentences).
Return JSON: {{"weak_topics": ["topic1", "topic2"], "advice": "Tamil advice"}}
Return ONLY JSON."""
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content
    try:
        return jsonify(json.loads(text[text.find("{"):text.rfind("}")+1]))
    except:
        return jsonify({"weak_topics": wrong_topics[:3], "advice": "இந்த topics-ஐ மேலும் படி!"})

@app.route("/search", methods=["POST"])
def search():
    data = request.get_json()
    query = data.get("query", "")
    try:
        return jsonify(tavily.search(query=query, search_depth="basic", max_results=3))
    except:
        return jsonify({"error": "Search failed"}), 500

@app.route("/daily-challenge", methods=["GET"])
def daily_challenge():
    import datetime
    today = datetime.date.today().strftime("%Y-%m-%d")
    day = datetime.date.today().day
    
    challenges = [
        {"level": "10th Standard", "subject": "Science", "exam": "TN Board"},
        {"level": "12th Standard", "subject": "Maths", "exam": "TN Board"},
        {"level": "College", "subject": "Aptitude", "exam": "Campus Placement"},
        {"level": "TNPSC", "subject": "General Studies", "exam": "TNPSC Group 2"},
        {"level": "NEET", "subject": "Biology", "exam": "NEET"},
        {"level": "JEE", "subject": "Physics", "exam": "JEE"},
        {"level": "College", "subject": "Data Structures", "exam": "Technical Interview"},
    ]
    
    challenge = challenges[day % len(challenges)]
    
    prompt = f"""Generate 1 MCQ question for {challenge['level']} students.
Subject: {challenge['subject']}, Exam: {challenge['exam']}, Date: {today}
Return ONLY JSON:
{{"question": "...", "options": ["A)...", "B)...", "C)...", "D)..."], "answer": "A", "explanation": "...", "subject": "{challenge['subject']}", "level": "{challenge['level']}", "exam": "{challenge['exam']}", "date": "{today}"}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content
    try:
        data = json.loads(text[text.find("{"):text.rfind("}")+1])
        return jsonify(data)
    except:
        return jsonify({"error": "Challenge generate ஆகல!"}), 500
    
@app.route("/exam-info", methods=["POST"])
def exam_info():
    data = request.get_json()
    exam = data.get("exam", "TNPSC")
    info_type = data.get("type", "syllabus")  # syllabus / previous_years / important_topics

    if info_type == "syllabus":
        prompt = f"""Give chapter-wise syllabus for {exam} exam in Tamil Nadu.
Format as JSON:
{{"exam": "{exam}", "type": "syllabus", "data": [{{"subject": "...", "chapters": ["chapter1", "chapter2"]}}]}}
Return ONLY JSON."""

    elif info_type == "previous_years":
        prompt = f"""Give 5 important previous year questions for {exam} exam.
Format as JSON:
{{"exam": "{exam}", "type": "previous_years", "data": [{{"year": "2023", "question": "...", "answer": "...", "subject": "..."}}]}}
Return ONLY JSON."""

    elif info_type == "important_topics":
        prompt = f"""Give most important topics for {exam} exam preparation.
Format as JSON:
{{"exam": "{exam}", "type": "important_topics", "data": [{{"subject": "...", "topics": ["topic1", "topic2"], "weightage": "high/medium/low"}}]}}
Return ONLY JSON."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content
    try:
        result = json.loads(text[text.find("{"):text.rfind("}")+1])
        return jsonify(result)
    except:
        return jsonify({"error": "Info generate ஆகல!"}), 500

@app.route("/mock-test", methods=["POST"])
def mock_test():
    data = request.get_json()
    exam = data.get("exam", "TNPSC")
    num_questions = data.get("num_questions", 10)
    
    exam_config = {
        "TNPSC": {"time": 30, "subjects": ["General Studies", "Tamil", "History", "Geography", "Science", "Polity"]},
        "NEET": {"time": 180, "subjects": ["Physics", "Chemistry", "Biology"]},
        "JEE": {"time": 180, "subjects": ["Physics", "Chemistry", "Maths"]},
        "10th TN Board": {"time": 150, "subjects": ["Maths", "Science", "Social", "Tamil", "English"]},
        "12th TN Board": {"time": 150, "subjects": ["Maths", "Physics", "Chemistry", "Biology"]},
    }
    
    config = exam_config.get(exam, exam_config["TNPSC"])
    
    prompt = f"""Generate {num_questions} MCQ questions for {exam} exam mock test.
Mix questions from these subjects: {', '.join(config['subjects'])}
Return ONLY JSON:
{{"exam": "{exam}", "time_minutes": {config['time']}, "questions": [{{"question": "...", "options": ["A)...", "B)...", "C)...", "D)..."], "answer": "A", "explanation": "...", "subject": "...", "topic": "..."}}]}}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content
    try:
        result = json.loads(text[text.find("{"):text.rfind("}")+1])
        return jsonify(result)
    except:
        return jsonify({"error": "Mock test generate ஆகல!"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    app.run(debug=False, host="0.0.0.0", port=port)