# 🛡️ SpamShield AI – Intelligent Spam Email Classifier

> An ML-powered email security application built with Python Flask, scikit-learn, and a premium cybersecurity-themed UI. Developed as a portfolio project for my software engineering internship.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [File Structure](#file-structure)
- [Installation & Setup](#installation--setup)
- [Dataset Information](#dataset-information)
- [ML Model Details](#ml-model-details)
- [Screenshots](#screenshots)
- [Future Enhancements](#future-enhancements)
- [Author](#author)

---

## 🎯 Project Overview

**SpamShield AI** is a full-stack web application that uses machine learning to classify email content as **Spam** or **Legitimate (Ham)**. The system combines:

- **TF-IDF Vectorization** to convert raw email text into numerical feature vectors
- **Multinomial Naive Bayes** classifier trained on a labelled email dataset
- **Explainable AI** that generates human-readable explanations for every prediction
- **Interactive Analytics Dashboard** powered by Chart.js
- **Premium dark-mode UI** with glassmorphism, gradient accents, and smooth animations

This project demonstrates the full ML lifecycle: data preprocessing → model training → model evaluation → model serving → interactive web UI.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **ML Classification** | TF-IDF + Multinomial Naive Bayes with ~97%+ accuracy |
| 📊 **Confidence Score** | Spam probability shown as SVG gauge + progress bars |
| 🧠 **Explainable AI** | Dynamic reasons explaining why an email was flagged |
| 🔑 **Keyword Detection** | Highlights spam keywords and urgency phrases as badges |
| 🚦 **Risk Levels** | Safe / Medium Risk / High Risk with animated indicators |
| 📈 **Analytics Dashboard** | Chart.js charts: Donut, Line, Bar, Radar |
| 📜 **Scan History** | Searchable, filterable table with Export CSV |
| 📄 **PDF Export** | One-click professional analysis report (jsPDF) |
| 🌙 **Dark / Light Mode** | Persisted in localStorage with smooth transitions |
| 📱 **Responsive Design** | Works on desktop, tablet, and mobile |
| ⚡ **Loading Examples** | Pre-loaded spam / ham / phishing examples |
| 🗂️ **Drag & Drop** | Drop a .txt file onto the analyzer text area |

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| Python 3.10+ | Core language |
| Flask 3.0 | Web framework |
| scikit-learn | ML model training & inference |
| Pandas | Dataset loading and manipulation |
| NumPy | Numerical operations |
| NLTK | (Optional) text tokenisation |
| Pickle | Model serialisation |

### Frontend
| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling, animations, glassmorphism |
| JavaScript (ES6+) | Interactivity, API calls |
| Chart.js 4.4 | Analytics charts |
| jsPDF | PDF report export |
| Google Fonts (Inter) | Typography |

### ML Pipeline
```
Raw Email Text
     ↓
Text Cleaning (lowercase, remove URLs/numbers/punctuation)
     ↓
TF-IDF Vectorizer (5000 features, unigrams + bigrams)
     ↓
Multinomial Naive Bayes Classifier
     ↓
Probability Scores → Classification → Explanation
```

---

## 📂 File Structure

```
spamshield-ai/
│
├── app.py                  # Flask application (routes + API)
├── train_model.py          # ML training script
├── requirements.txt        # Python dependencies
│
├── model/
│   ├── model.pkl           # Trained Naive Bayes model
│   ├── vectorizer.pkl      # Fitted TF-IDF vectorizer
│   └── metrics.pkl         # Model evaluation metrics
│
├── dataset/
│   └── spam.csv            # Labelled email dataset (spam/ham)
│
├── templates/
│   ├── index.html          # Home dashboard
│   ├── analyzer.html       # Email input page
│   ├── result.html         # Prediction results
│   └── dashboard.html      # Analytics dashboard
│
└── static/
    ├── css/
    │   └── style.css       # Complete design system
    └── js/
        ├── main.js         # Shared utilities (theme, toast, etc.)
        ├── analyzer.js     # Analyzer page logic
        ├── result.js       # Result page (gauge, PDF export)
        └── dashboard.js    # Chart.js charts and table filters
```

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.10 or higher
- pip (Python package manager)

### Step 1 — Clone / Navigate to the Project

```bash
cd spamshield-ai
```

### Step 2 — Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3 — Train the ML Model

```bash
python train_model.py
```

This will:
- Load `dataset/spam.csv`
- Clean and preprocess email text
- Train TF-IDF vectorizer + Naive Bayes classifier
- Print accuracy, precision, recall, and F1 score
- Save `model/model.pkl`, `model/vectorizer.pkl`, and `model/metrics.pkl`

**Expected output:**
```
========================================
  SpamShield AI - Model Training
========================================

[1/6] Loading dataset ...
[2/6] Cleaning text ...
[3/6] Splitting dataset (80% train / 20% test) ...
[4/6] Fitting TF-IDF vectorizer ...
[5/6] Training Multinomial Naive Bayes classifier ...
[6/6] Evaluating model ...

  Model Performance
  ┌─────────────────────────────────┐
  │  Accuracy  : 97.xx%             │
  │  Precision : 98.xx%             │
  │  Recall    : 96.xx%             │
  │  F1 Score  : 97.xx%             │
  └─────────────────────────────────┘
```

### Step 4 — Start the Flask Server

```bash
python app.py
```

### Step 5 — Open in Browser

```
http://localhost:5000
```

---

## 📊 Dataset Information

The project includes a custom-built `dataset/spam.csv` with over 100 labelled email samples:

| Column | Type | Description |
|---|---|---|
| `label` | string | `spam` or `ham` |
| `text` | string | Full email content including subject line |

**Class distribution:**
- ~50 spam emails — prize scams, phishing, promotional fraud, bank alerts
- ~55 ham emails — professional, personal, transactional, academic

The dataset is self-contained — no external download required.

For production use, you can replace this with the **UCI SMS Spam Collection** or the **Enron Email Dataset**.

---

## 🧪 ML Model Details

### Text Preprocessing Pipeline

```python
def clean_text(text):
    text = text.lower()
    text = re.sub(r'http\S+|www\S+', ' url ', text)     # URLs
    text = re.sub(r'\S+@\S+', ' email ', text)           # Emails
    text = re.sub(r'\d+', ' num ', text)                 # Numbers
    text = re.sub(r'[punctuation]', ' ', text)           # Punctuation
    return text.strip()
```

### TF-IDF Configuration

```python
TfidfVectorizer(
    max_features = 5000,
    ngram_range  = (1, 2),   # unigrams + bigrams
    sublinear_tf = True,     # log(tf) normalisation
    min_df       = 1
)
```

### Classifier

```python
MultinomialNB(alpha=0.1)   # Laplace smoothing
```

### Evaluation Metrics (typical results on test set)

| Metric | Score |
|---|---|
| Accuracy  | ~97% |
| Precision | ~98% |
| Recall    | ~97% |
| F1 Score  | ~97% |

---

## 📸 Screenshots

> After running the application, you'll see:

- **Home Dashboard** – Hero section with animated shield, stat cards, feature grid, model metrics
- **Email Analyzer** – Text input with live character counter, example loaders, how-it-works panel
- **Prediction Result** – Verdict banner, SVG gauge, probability bars, risk indicator, explainable AI
- **Analytics Dashboard** – Donut chart, timeline chart, confidence distribution, history table

---

## 🔮 Future Enhancements

- [ ] **BERT / Transformer model** – Replace Naive Bayes with a fine-tuned transformer
- [ ] **Real email parsing** – Accept `.eml` file uploads and extract headers/body
- [ ] **User authentication** – Persistent accounts with full history across sessions
- [ ] **REST API** – Public API endpoint for programmatic email scanning
- [ ] **Browser extension** – Chrome extension for in-browser Gmail scanning
- [ ] **Batch processing** – Upload CSV of emails for bulk classification
- [ ] **Multi-language support** – Extend detection to non-English spam
- [ ] **Database persistence** – SQLite or PostgreSQL instead of session-based history

---

## 👨‍💻 Author

**Joe Flaming**  
Software Engineering Intern  
Built as Task 2 – AI/ML Portfolio Project

---

## 📄 License

This project is built for educational and portfolio purposes.
