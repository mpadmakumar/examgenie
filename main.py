from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import json
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """நீ ExamGenie — Tamil students-க்கு help பண்ற AI tutor.
Always explain in Tamil first, then English.
Be encouraging, never discouraging. Use simple words."""

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
Generate exactly 5 multiple choice questions in TAMIL in this EXACT JSON format:
{{"questions": [{{"question": "Tamil question", "options": ["A) விடை1", "B) விடை2", "C) விடை3", "D) விடை4"], "answer": "A", "explanation": "Tamil explanation", "topic": "specific topic name"}}]}}
IMPORTANT: Add a "topic" field for each question — the specific topic it tests.
Return ONLY the JSON. No extra text."""
    else:
        return f"""You are ExamGenie Quiz Master.
Generate {difficulty['english']} questions.
Generate exactly 5 multiple choice questions in ENGLISH in this EXACT JSON format:
{{"questions": [{{"question": "English question", "options": ["A) opt1", "B) opt2", "C) opt3", "D) opt4"], "answer": "A", "explanation": "English explanation", "topic": "specific topic name"}}]}}
IMPORTANT: Add a "topic" field for each question — the specific topic it tests.
Return ONLY the JSON. No extra text."""

@app.route("/ask", methods=["POST"])
def ask():
    data = request.get_json()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": data["text"]}
        ]
    )
    return jsonify({"answer": response.choices[0].message.content})

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
        # Weak topics இருந்தா அதை focus பண்ணு!
        weak_str = ", ".join(weak_topics[:3])
        prompt += f". FOCUS on these weak topics the student struggles with: {weak_str}"

    quiz_prompt = get_quiz_prompt(language, level)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": quiz_prompt},
            {"role": "user", "content": prompt}
        ]
    )
    text = response.choices[0].message.content
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        quiz_data = json.loads(text[start:end])
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
Identify the top 3 weak areas and give a short encouraging advice in Tamil (2 sentences max).
Return JSON: {{"weak_topics": ["topic1", "topic2"], "advice": "Tamil advice here"}}
Return ONLY JSON."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    text = response.choices[0].message.content
    try:
        start = text.find("{")
        end = text.rfind("}") + 1
        return jsonify(json.loads(text[start:end]))
    except:
        return jsonify({"weak_topics": wrong_topics[:3], "advice": "இந்த topics-ஐ மேலும் படி!"})

if __name__ == "__main__":
    app.run(debug=True, port=8000)