"""
SpamShield AI - Model Training Script
======================================
Trains a TF-IDF + Multinomial Naive Bayes spam classifier
and saves the model and vectorizer as .pkl files.

Usage:
    python train_model.py
"""

import os
import re
import pickle
import string
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import (
    accuracy_score, precision_score,
    recall_score, f1_score, confusion_matrix,
    classification_report
)

# ─────────────────────────────────────────────
# 1. Configuration
# ─────────────────────────────────────────────
DATASET_PATH  = os.path.join("dataset", "spam.csv")
MODEL_DIR     = "model"
MODEL_PATH    = os.path.join(MODEL_DIR, "model.pkl")
VECTORIZER_PATH = os.path.join(MODEL_DIR, "vectorizer.pkl")
METRICS_PATH  = os.path.join(MODEL_DIR, "metrics.pkl")

# ─────────────────────────────────────────────
# 2. Text Preprocessing
# ─────────────────────────────────────────────
def clean_text(text: str) -> str:
    """
    Cleans and normalises email text.
    - Lowercase
    - Remove URLs
    - Remove email addresses
    - Remove punctuation and digits
    - Strip extra whitespace
    """
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", " url ", text)          # URLs → 'url'
    text = re.sub(r"\S+@\S+", " email ", text)               # emails → 'email'
    text = re.sub(r"\d+", " num ", text)                     # numbers → 'num'
    text = re.sub(r"[%s]" % re.escape(string.punctuation), " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

# ─────────────────────────────────────────────
# 3. Load Dataset
# ─────────────────────────────────────────────
print("=" * 60)
print("  SpamShield AI - Model Training")
print("=" * 60)

print(f"\n[1/6] Loading dataset from '{DATASET_PATH}' ...")
df = pd.read_csv(DATASET_PATH)
print(f"      Total records loaded: {len(df)}")
print(f"      Columns: {list(df.columns)}")

# Normalise label column → 0 (ham) / 1 (spam)
df["label_num"] = df["label"].map({"ham": 0, "spam": 1})

spam_count = df["label_num"].sum()
ham_count  = len(df) - spam_count
print(f"      Spam: {spam_count}  |  Ham: {ham_count}")

# ─────────────────────────────────────────────
# 4. Clean Text
# ─────────────────────────────────────────────
print("\n[2/6] Cleaning text ...")
df["clean_text"] = df["text"].apply(clean_text)
print("      Done.")

# ─────────────────────────────────────────────
# 5. Train / Test Split
# ─────────────────────────────────────────────
print("\n[3/6] Splitting dataset (80% train / 20% test) ...")
X = df["clean_text"]
y = df["label_num"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"      Training samples: {len(X_train)}")
print(f"      Testing  samples: {len(X_test)}")

# ─────────────────────────────────────────────
# 6. TF-IDF Vectorisation
# ─────────────────────────────────────────────
print("\n[4/6] Fitting TF-IDF vectorizer ...")
vectorizer = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 2),    # unigrams + bigrams
    sublinear_tf=True,     # apply log normalisation
    min_df=1
)
X_train_tfidf = vectorizer.fit_transform(X_train)
X_test_tfidf  = vectorizer.transform(X_test)
print(f"      Vocabulary size: {len(vectorizer.vocabulary_)}")

# ─────────────────────────────────────────────
# 7. Train Multinomial Naive Bayes
# ─────────────────────────────────────────────
print("\n[5/6] Training Multinomial Naive Bayes classifier ...")
model = MultinomialNB(alpha=0.1)
model.fit(X_train_tfidf, y_train)
print("      Training complete.")

# ─────────────────────────────────────────────
# 8. Evaluate
# ─────────────────────────────────────────────
print("\n[6/6] Evaluating model ...")
y_pred = model.predict(X_test_tfidf)
y_prob = model.predict_proba(X_test_tfidf)

accuracy  = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred, zero_division=0)
recall    = recall_score(y_test, y_pred, zero_division=0)
f1        = f1_score(y_test, y_pred, zero_division=0)
cm        = confusion_matrix(y_test, y_pred).tolist()

metrics = {
    "accuracy":  round(float(accuracy) * 100, 2),
    "precision": round(float(precision) * 100, 2),
    "recall":    round(float(recall) * 100, 2),
    "f1_score":  round(float(f1) * 100, 2),
    "confusion_matrix": cm,
    "spam_count": int(spam_count),
    "ham_count":  int(ham_count),
    "total":      int(len(df)),
}

print(f"\n  === Model Performance ===")
print(f"  Accuracy  : {accuracy*100:.2f}%")
print(f"  Precision : {precision*100:.2f}%")
print(f"  Recall    : {recall*100:.2f}%")
print(f"  F1 Score  : {f1*100:.2f}%")
print(f"  =========================")
print()
print("  Detailed Classification Report:")
print(classification_report(y_test, y_pred, target_names=["Ham", "Spam"]))

# ─────────────────────────────────────────────
# 9. Save Artifacts
# ─────────────────────────────────────────────
os.makedirs(MODEL_DIR, exist_ok=True)

with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)

with open(VECTORIZER_PATH, "wb") as f:
    pickle.dump(vectorizer, f)

with open(METRICS_PATH, "wb") as f:
    pickle.dump(metrics, f)

print(f"  [OK] Model saved      -> {MODEL_PATH}")
print(f"  [OK] Vectorizer saved -> {VECTORIZER_PATH}")
print(f"  [OK] Metrics saved    -> {METRICS_PATH}")
print("\n  Training complete! Run 'python app.py' to start the server.")
print("=" * 60)
