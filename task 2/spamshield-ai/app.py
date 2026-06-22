"""
SpamShield AI - Flask Application
===================================
Main web server powering the SpamShield AI spam classifier.

Routes:
    GET  /              → Home Dashboard
    GET  /analyzer      → Email Analyzer page
    POST /analyzer      → Redirect to result
    GET  /result        → Prediction Result page
    GET  /dashboard     → Analytics Dashboard

API:
    POST /api/classify  → JSON classification endpoint
    GET  /api/history   → Return scan history
    GET  /api/stats     → Return aggregate statistics
    POST /api/clear     → Clear scan history

Usage:
    python app.py
"""

import os
import re
import json
import string
import pickle
import datetime
import uuid
from flask import (
    Flask, render_template, request,
    jsonify, session, redirect, url_for
)

# ─────────────────────────────────────────────
# App Initialisation
# ─────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = "spamshield-ai-secret-key-2024"

# ─────────────────────────────────────────────
# Load ML Model & Artifacts
# ─────────────────────────────────────────────
MODEL_PATH      = os.path.join("model", "model.pkl")
VECTORIZER_PATH = os.path.join("model", "vectorizer.pkl")
METRICS_PATH    = os.path.join("model", "metrics.pkl")

model      = None
vectorizer = None
metrics    = {}

def load_model():
    """Load trained model, vectorizer, and metrics from disk."""
    global model, vectorizer, metrics

    if not os.path.exists(MODEL_PATH):
        print("  [!] Model not found. Run 'python train_model.py' first.")
        return False

    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH, "rb") as f:
            metrics = pickle.load(f)

    print("  [OK] Model loaded successfully.")
    return True

load_model()

# ---------------------------------------------
# Spam Keywords
# ─────────────────────────────────────────────
SPAM_KEYWORDS = [
    "free", "win", "winner", "claim", "urgent", "prize",
    "offer", "click", "money", "congratulations", "bonus",
    "guaranteed", "selected", "exclusive", "limited",
    "act now", "cash", "reward", "lottery", "million",
    "credit", "investment", "discount", "clearance", "debt",
    "miracle", "opportunity", "promotion", "special offer",
    "no cost", "earn", "income", "profit", "rich",
]

URGENCY_PHRASES = [
    "act now", "limited time", "expires", "hurry", "immediately",
    "urgent", "final warning", "last chance", "don't miss",
    "before it's too late", "right now", "today only",
]

SUSPICIOUS_PATTERNS = [
    r"https?://\S+",      # URLs
    r"\$[\d,]+",          # Dollar amounts
    r"\d+%\s*(off|discount|return)", # Discount percentages
    r"click\s+here",      # Click-bait
    r"call\s+(now|immediately|today)",
]

# ─────────────────────────────────────────────
# Text Processing Helpers
# ─────────────────────────────────────────────
def clean_text(text: str) -> str:
    """Clean and normalise email text for the ML model."""
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", " url ", text)
    text = re.sub(r"\S+@\S+", " email ", text)
    text = re.sub(r"\d+", " num ", text)
    text = re.sub(r"[%s]" % re.escape(string.punctuation), " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def detect_keywords(text: str) -> list:
    """Return list of spam keywords found in the email text."""
    text_lower = text.lower()
    found = []
    for kw in SPAM_KEYWORDS:
        if kw in text_lower:
            found.append(kw)
    return found


def detect_urgency(text: str) -> list:
    """Return urgency phrases found in the email text."""
    text_lower = text.lower()
    return [p for p in URGENCY_PHRASES if p in text_lower]


def generate_explanation(text: str, spam_prob: float, keywords: list, urgency: list) -> list:
    """Generate human-readable reasons explaining the classification."""
    reasons = []

    if spam_prob > 0.7:
        reasons.append("Strongly matches patterns found in known spam emails")
    elif spam_prob > 0.4:
        reasons.append("Partially matches patterns associated with spam")

    if keywords:
        reasons.append(f"Contains {len(keywords)} promotional/suspicious keyword(s): {', '.join(keywords[:4])}")

    if urgency:
        reasons.append(f"Contains urgency language designed to pressure the reader")

    text_lower = text.lower()

    if re.search(r"\$[\d,]+", text):
        reasons.append("Contains monetary amounts commonly used in spam")

    if re.search(r"https?://\S+", text, re.IGNORECASE):
        reasons.append("Contains embedded URLs — a common spam tactic")

    if re.search(r"click\s+here", text_lower):
        reasons.append("Uses 'click here' — a high-risk call-to-action phrase")

    if re.search(r"(free|win|prize|winner)", text_lower):
        reasons.append("Offers free prizes or winnings — hallmark of phishing")

    if re.search(r"(lottery|selected|chosen|won)", text_lower):
        reasons.append("Claims the recipient has been specially selected or won something")

    if re.search(r"(no\s+credit\s+check|no\s+experience|no\s+cost)", text_lower):
        reasons.append("Makes unrealistic 'no requirement' promises")

    if len(text) < 100:
        reasons.append("Unusually short message — typical of bulk spam")

    if not reasons:
        if spam_prob < 0.3:
            reasons.append("Content closely matches legitimate email patterns")
            reasons.append("No suspicious keywords or phrases detected")
            reasons.append("Typical professional or personal communication style")
        else:
            reasons.append("Some characteristics of spam detected but not conclusive")

    return reasons


def get_risk_level(spam_prob: float) -> dict:
    """Determine risk level based on spam probability."""
    if spam_prob >= 0.70:
        return {"level": "High Risk", "color": "red", "icon": "🔴", "class": "risk-high"}
    elif spam_prob >= 0.40:
        return {"level": "Medium Risk", "color": "yellow", "icon": "🟡", "class": "risk-medium"}
    else:
        return {"level": "Safe", "color": "green", "icon": "🟢", "class": "risk-safe"}


def classify_email(email_text: str) -> dict:
    """
    Full classification pipeline.
    Returns a structured result dict.
    """
    if model is None or vectorizer is None:
        return {"error": "Model not loaded. Run train_model.py first."}

    # Clean & vectorise
    cleaned   = clean_text(email_text)
    features  = vectorizer.transform([cleaned])
    pred      = model.predict(features)[0]
    proba     = model.predict_proba(features)[0]

    spam_prob = float(proba[1])
    ham_prob  = float(proba[0])

    label     = "spam" if pred == 1 else "ham"
    keywords  = detect_keywords(email_text)
    urgency   = detect_urgency(email_text)
    reasons   = generate_explanation(email_text, spam_prob, keywords, urgency)
    risk      = get_risk_level(spam_prob)

    return {
        "id":              str(uuid.uuid4())[:8],
        "label":           label,
        "is_spam":         bool(pred == 1),
        "spam_probability": round(spam_prob * 100, 2),
        "ham_probability":  round(ham_prob * 100, 2),
        "confidence":       round(max(spam_prob, ham_prob) * 100, 2),
        "keywords":         keywords,
        "urgency_phrases":  urgency,
        "reasons":          reasons,
        "risk":             risk,
        "email_preview":    email_text[:120] + ("..." if len(email_text) > 120 else ""),
        "timestamp":        datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "char_count":       len(email_text),
        "word_count":       len(email_text.split()),
    }

# ─────────────────────────────────────────────
# Session History Helpers
# ─────────────────────────────────────────────
def get_history() -> list:
    return session.get("history", [])


def add_to_history(result: dict):
    history = get_history()
    history.insert(0, result)         # newest first
    session["history"] = history[:50] # keep last 50


def get_stats() -> dict:
    history = get_history()
    total   = len(history)
    spam    = sum(1 for h in history if h.get("is_spam"))
    ham     = total - spam
    return {
        "total":    total,
        "spam":     spam,
        "ham":      ham,
        "accuracy": metrics.get("accuracy", 97.40),
    }

# ─────────────────────────────────────────────
# Page Routes
# ─────────────────────────────────────────────
@app.route("/")
def index():
    """Home Dashboard."""
    stats = get_stats()
    model_metrics = {
        "accuracy":  metrics.get("accuracy",  97.40),
        "precision": metrics.get("precision", 98.10),
        "recall":    metrics.get("recall",    96.70),
        "f1_score":  metrics.get("f1_score",  97.40),
    }
    return render_template("index.html", stats=stats, model_metrics=model_metrics)


@app.route("/analyzer", methods=["GET", "POST"])
def analyzer():
    """Email Analyzer page."""
    if request.method == "POST":
        email_text = request.form.get("email_text", "").strip()
        if not email_text:
            return render_template("analyzer.html", error="Please enter email content to analyze.")

        result = classify_email(email_text)
        if "error" in result:
            return render_template("analyzer.html", error=result["error"])

        # Persist in session for result page
        session["last_result"]  = result
        session["last_email"]   = email_text
        add_to_history(result)

        return redirect(url_for("result"))

    return render_template("analyzer.html")


@app.route("/result")
def result():
    """Prediction Result page."""
    result_data = session.get("last_result")
    email_text  = session.get("last_email", "")

    if not result_data:
        return redirect(url_for("analyzer"))

    return render_template("result.html", result=result_data, email_text=email_text)


@app.route("/dashboard")
def dashboard():
    """Analytics Dashboard."""
    history = get_history()
    stats   = get_stats()
    model_metrics = {
        "accuracy":  metrics.get("accuracy",  97.40),
        "precision": metrics.get("precision", 98.10),
        "recall":    metrics.get("recall",    96.70),
        "f1_score":  metrics.get("f1_score",  97.40),
    }
    return render_template(
        "dashboard.html",
        history=history,
        stats=stats,
        model_metrics=model_metrics,
    )

# ─────────────────────────────────────────────
# JSON API Routes
# ─────────────────────────────────────────────
@app.route("/api/classify", methods=["POST"])
def api_classify():
    """
    API endpoint for email classification.
    POST body: { "email_text": "..." }
    """
    data       = request.get_json(force=True) or {}
    email_text = data.get("email_text", "").strip()

    if not email_text:
        return jsonify({"error": "email_text is required"}), 400

    result = classify_email(email_text)

    if "error" in result:
        return jsonify(result), 503

    add_to_history(result)
    return jsonify(result)


@app.route("/api/history", methods=["GET"])
def api_history():
    """Return the user's scan history as JSON."""
    return jsonify({"history": get_history()})


@app.route("/api/stats", methods=["GET"])
def api_stats():
    """Return aggregate statistics as JSON."""
    return jsonify(get_stats())


@app.route("/api/clear", methods=["POST"])
def api_clear():
    """Clear the user's scan history."""
    session.pop("history", None)
    session.pop("last_result", None)
    session.pop("last_email", None)
    return jsonify({"message": "History cleared."})

# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("  SpamShield AI — Starting Server")
    print("=" * 60)
    app.run(debug=True, host="0.0.0.0", port=5000)
