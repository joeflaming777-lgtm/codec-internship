# 🎙️ VoiceScript — Speech to Text Web App

A modern, production-ready web application that converts spoken audio into text using the **Google Web Speech API**. Built with **Flask** (Python) on the backend and a sleek dark-themed UI on the frontend.

---

## 📸 Preview

> Upload a `.wav` or `.mp3` file → choose a language → get your transcript instantly.

---

## ✨ Features

- 🎵 **Supports WAV & MP3** audio formats
- 🌐 **Multi-language** — English (en-US) and Tamil (ta-IN)
- 📊 **Live statistics** — word count, character count, estimated read time
- ⬇️ **Download transcript** as a `.txt` file
- 🖱️ **Drag & Drop** file upload interface
- ⚡ **No system ffmpeg needed** — uses bundled `imageio-ffmpeg`
- 🔒 **50 MB** max file size limit
- 🌙 **Dark-themed** modern UI with smooth animations

---

## 🗂️ Project Structure

```
speech-to-text-web/
│
├── app.py                  # Flask backend — routes, audio processing, speech recognition
├── requirements.txt        # Python dependencies
│
├── templates/
│   └── index.html          # Main HTML page (Jinja2 template)
│
├── static/
│   ├── css/
│   │   └── style.css       # All styling — dark theme, animations, layout
│   ├── js/
│   │   └── script.js       # Frontend logic — drag & drop, API calls, UI updates
│   └── favicon.ico         # Browser tab icon
│
├── uploads/                # Temporary folder for uploaded audio (auto-created)
└── transcripts/            # Saved transcript .txt files (auto-created)
```

---

## ⚙️ Requirements

- **Python 3.9+**
- Internet connection (required for Google Speech API)
- No system-level `ffmpeg` installation needed

---

## 🚀 Installation & Setup

### 1. Clone / Navigate to the project folder

```bash
cd "j:\codec internship\task 1\speech-to-text-web"
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the virtual environment

```bash
# Windows
.\venv\Scripts\activate
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

---

## ▶️ Running the App

### Option A — From the project folder directly

```bash
cd "j:\codec internship\task 1\speech-to-text-web"
.\venv\Scripts\python.exe app.py
```

### Option B — From the root folder (quick launcher)

```bash
cd "j:\codec internship"
python app.py
```

Then open your browser and go to:

```
http://127.0.0.1:5000
```

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `flask >= 3.0.0` | Web framework (backend server & routing) |
| `SpeechRecognition >= 3.10.4` | Interface to Google Web Speech API |
| `pydub >= 0.25.1` | Audio format handling |
| `werkzeug >= 3.0.0` | Secure file handling utilities |
| `imageio-ffmpeg >= 0.5.0` | Bundled ffmpeg binary for MP3 conversion |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the main web UI |
| `POST` | `/transcribe` | Accepts audio file, returns transcript JSON |
| `GET` | `/download/<filename>` | Downloads a saved transcript `.txt` file |

### POST `/transcribe` — Request

```
Content-Type: multipart/form-data

Fields:
  audio     → audio file (.wav or .mp3)
  language  → BCP-47 language code (e.g. "en-US" or "ta-IN")
```

### POST `/transcribe` — Response (Success)

```json
{
  "success": true,
  "transcript": "Hello, this is the transcribed text.",
  "word_count": 7,
  "char_count": 37,
  "language": "English (US)",
  "transcript_file": "transcript_audio_20250616_193000.txt"
}
```

---

## 🌐 Supported Languages

| Code | Language |
|---|---|
| `en-US` | English (United States) |
| `ta-IN` | Tamil (India) |

---

## ⚠️ Known Limitations

- Requires an **active internet connection** — the Google Speech API is cloud-based
- Very long audio files may time out; for best results keep clips under **2–3 minutes**
- Background noise can reduce transcription accuracy — use clear recordings
- Only `.wav` and `.mp3` formats are supported

---

## 🛠️ How It Works

```
User uploads audio
      ↓
Flask saves file to uploads/
      ↓
ffmpeg converts audio → mono 16kHz WAV
      ↓
SpeechRecognition sends audio to Google Speech API
      ↓
Transcript returned → saved to transcripts/
      ↓
JSON response sent to browser → UI displays result
```

---

## 📄 License

This project was built as part of the **Codec Internship — Task 1**.

---

*Built with ❤️ using Flask & Google Web Speech API*
