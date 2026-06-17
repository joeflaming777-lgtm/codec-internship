# 🎙️ Speech-to-Text Transcription Web Application

A modern Speech-to-Text Transcription Web Application built using **Python Flask** and **SpeechRecognition**. This application allows users to upload audio files and convert spoken words into text with support for multiple languages.

## 🚀 Features

* 🎤 Convert speech from audio files into text
* 📂 Upload `.wav` and `.mp3` files
* 🌐 Multi-language support

  * English (`en-US`)
  * Tamil (`ta-IN`)
* 📄 Display transcription results instantly
* 💾 Save transcripts automatically
* ⬇️ Download transcripts as `.txt` files
* 📊 Word Count and Character Count
* ⚠️ Error handling for invalid files and recognition failures
* 🎨 Modern and responsive web interface

---

## 🛠️ Tech Stack

### Frontend

* HTML5
* CSS3
* JavaScript

### Backend

* Python
* Flask

### Libraries

* SpeechRecognition
* pydub
* Werkzeug

---

## 📁 Project Structure

```text
speech-to-text-web/
│
├── app.py
├── requirements.txt
│
├── uploads/
├── transcripts/
│
├── templates/
│   └── index.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       └── script.js
│
└── README.md
```

---

## ⚙️ Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/speech-to-text-web.git
cd speech-to-text-web
```

### 2️⃣ Create Virtual Environment (Optional)

```bash
python -m venv venv
```

### Activate Virtual Environment

**Windows**

```bash
venv\Scripts\activate
```

**Linux / macOS**

```bash
source venv/bin/activate
```

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

---

## ▶️ Run the Application

```bash
python app.py
```

Open your browser and visit:

```text
http://127.0.0.1:5000
```

---

## 📖 How to Use

1. Open the web application.
2. Upload a `.wav` or `.mp3` audio file.
3. Select your preferred language.
4. Click the **Transcribe** button.
5. View the generated transcript.
6. Download the transcript as a `.txt` file if needed.

---

## 📊 Output Information

After transcription, the application displays:

* Transcript Text
* Word Count
* Character Count
* Download Option

---

## 🌍 Supported Languages

| Language | Code  |
| -------- | ----- |
| English  | en-US |
| Tamil    | ta-IN |

---

## 🔒 Error Handling

The application handles:

* Unsupported file formats
* Empty audio files
* Speech recognition failures
* Network/API errors
* Missing file uploads

---

## 🔮 Future Enhancements

* Real-time microphone transcription
* AI-powered transcript summarization
* Speaker identification
* PDF and DOCX export
* Additional language support
* Dark/Light mode toggle
* Cloud transcript storage

---

## 🎯 Learning Outcomes

Through this project, I gained hands-on experience in:

* Python Web Development
* Flask Framework
* Speech Recognition
* Audio Processing
* File Handling
* Frontend Development
* Error Handling and Validation



