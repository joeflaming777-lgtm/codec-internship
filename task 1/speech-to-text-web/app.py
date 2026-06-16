"""
Speech-to-Text Transcription Web Application
Backend: Flask + SpeechRecognition + pydub
Author: Generated Production-Ready Code
"""

import os
import uuid
import datetime
import warnings

# ── Configure bundled ffmpeg BEFORE importing pydub ───────────────────────────
# imageio-ffmpeg ships a pre-compiled ffmpeg binary inside the wheel, so no
# system-level ffmpeg installation is needed for MP3 support.
try:
    # pyrefly: ignore [missing-import]
    import imageio_ffmpeg as _iio_ffmpeg
    _FFMPEG_EXE  = _iio_ffmpeg.get_ffmpeg_exe()
    _FFPROBE_EXE = os.path.join(os.path.dirname(_FFMPEG_EXE), "ffprobe.exe")
    # Prepend the binary directory to PATH so child processes can find ffmpeg too
    os.environ["PATH"] = os.path.dirname(_FFMPEG_EXE) + os.pathsep + os.environ.get("PATH", "")
    _HAS_BUNDLED_FFMPEG = True
except ImportError:
    _FFMPEG_EXE = _FFPROBE_EXE = None
    _HAS_BUNDLED_FFMPEG = False

# Suppress pydub's "couldn't find ffmpeg" RuntimeWarning — we handle it ourselves
with warnings.catch_warnings():
    warnings.simplefilter("ignore", RuntimeWarning)
    # pyrefly: ignore [missing-import]
    from pydub import AudioSegment
    # pyrefly: ignore [missing-import]
    from pydub.utils import mediainfo  # noqa: F401 — import here to avoid later lazy-load warning

# Apply converter + ffprobe paths to pydub now that it is imported
if _HAS_BUNDLED_FFMPEG:
    AudioSegment.converter = _FFMPEG_EXE

    # ── Monkey-patch pydub's mediainfo_json ──────────────────────────────────
    # imageio-ffmpeg bundles only ffmpeg.exe (not ffprobe).  pydub's mediainfo_json
    # runs ffprobe -show_format -show_streams which ffmpeg doesn't support.
    # We replace it with a lightweight version that calls ffmpeg -i and parses
    # enough metadata for pydub's from_file() to work correctly.
    import subprocess as _sp
    import re as _re
    import json as _json

    def _ffmpeg_mediainfo_json(filepath, read_ahead_limit=-1):
        """Drop-in replacement for pydub.utils.mediainfo_json using ffmpeg -i."""
        try:
            result = _sp.run(
                [_FFMPEG_EXE, "-v", "error", "-i", str(filepath),
                 "-f", "null", "-"],
                stdout=_sp.PIPE, stderr=_sp.PIPE
            )
            stderr = result.stderr.decode("utf-8", errors="ignore")
        except Exception:
            stderr = ""

        # Parse sample rate, channels and sample format from ffmpeg -i stderr.
        # Example line: "Stream #0:0: Audio: mp3, 44100 Hz, stereo, fltp, 128 kb/s"
        sample_rate, channels = 44100, 2

        m_sr = _re.search(r"(\d+) Hz", stderr)
        if m_sr:
            sample_rate = int(m_sr.group(1))

        if "mono" in stderr:
            channels = 1
        elif "stereo" in stderr or "2 channels" in stderr:
            channels = 2

        # Extract the audio codec name (e.g., "mp3", "pcm_s16le") from the stream line.
        # pydub has a special branch: if sample_fmt=='fltp' AND codec_name in
        # ['mp3','mp4','aac','webm','ogg'], it overrides bits_per_sample=16 → pcm_s16le.
        # We rely on that branch by providing the correct codec_name here.
        codec_name = "unknown"
        m_codec = _re.search(r"Audio:\s+(\S+?)(?:\s|\(|,)", stderr)
        if m_codec:
            codec_name = m_codec.group(1).lower().rstrip(",")

        # Sample format
        sample_fmt = "s16"
        if "fltp" in stderr or "flt " in stderr:
            sample_fmt = "fltp"
        elif "s32" in stderr:
            sample_fmt = "s32"
        elif "u8" in stderr:
            sample_fmt = "u8"

        # Return a minimal structure that satisfies pydub's from_file() logic.
        # Setting bits_per_sample=0 with sample_fmt='fltp' + codec_name='mp3'
        # triggers pydub's own workaround: bits_per_sample → 16 → acodec = pcm_s16le.
        return {
            "streams": [{
                "index": 0,
                "codec_type": "audio",
                "codec_name": codec_name,
                "sample_rate": str(sample_rate),
                "channels": channels,
                "sample_fmt": sample_fmt,
                "bits_per_sample": 0,
                "bits_per_raw_sample": 0,
            }],
            "format": {"duration": "0"}
        }

    # pyrefly: ignore [missing-import]
    import pydub.utils as _pydub_utils
    # pyrefly: ignore [missing-import]
    import pydub.audio_segment as _pydub_as
    # Patch the reference inside audio_segment (where from_file actually calls it)
    _pydub_utils.mediainfo_json = _ffmpeg_mediainfo_json   # keep utils in sync too
    _pydub_as.mediainfo_json    = _ffmpeg_mediainfo_json   # this is what from_file uses

from flask import Flask, request, jsonify, render_template, send_from_directory
from werkzeug.utils import secure_filename
# pyrefly: ignore [missing-import]
import speech_recognition as sr

# ─────────────────────────────────────────────
# App Configuration
# ─────────────────────────────────────────────
app = Flask(__name__)

BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER   = os.path.join(BASE_DIR, "uploads")
TRANSCRIPT_DIR  = os.path.join(BASE_DIR, "transcripts")
ALLOWED_EXT     = {"wav", "mp3"}
MAX_CONTENT_MB  = 50  # Maximum upload size in MB

app.config["UPLOAD_FOLDER"]    = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_MB * 1024 * 1024

# Ensure required directories exist
os.makedirs(UPLOAD_FOLDER,  exist_ok=True)
os.makedirs(TRANSCRIPT_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# Supported language codes
# ─────────────────────────────────────────────
SUPPORTED_LANGUAGES = {
    "en-US": "English (US)",
    "ta-IN": "Tamil (India)",
}


# ─────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────
def allowed_file(filename: str) -> bool:
    """Check if the uploaded file has an allowed extension."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT
    )


def convert_to_wav(src_path: str) -> str:
    """
    Convert any supported audio format to a normalised WAV file using ffmpeg
    directly via subprocess.  This approach bypasses pydub's mediainfo/ffprobe
    dependency entirely — imageio-ffmpeg provides ffmpeg.exe which is all we need.

    Output: mono, 16-bit PCM, 16 kHz — optimal for Google Speech API.
    """
    import subprocess as _subprocess

    wav_path = src_path.rsplit(".", 1)[0] + "_converted.wav"

    ffmpeg_exe = AudioSegment.converter  # set by imageio_ffmpeg at startup

    cmd = [
        ffmpeg_exe,
        "-y",                  # overwrite output without asking
        "-i", src_path,        # input file (WAV or MP3)
        "-ac", "1",            # mono
        "-ar", "16000",        # 16 kHz sample rate
        "-acodec", "pcm_s16le",# 16-bit signed little-endian PCM
        wav_path,
    ]

    result = _subprocess.run(
        cmd,
        stdout=_subprocess.PIPE,
        stderr=_subprocess.PIPE,
    )

    if result.returncode != 0:
        stderr_txt = result.stderr.decode("utf-8", errors="ignore")
        raise RuntimeError(
            f"ffmpeg conversion failed (exit {result.returncode}):\n{stderr_txt}"
        )

    return wav_path


def save_transcript(text: str, language: str, original_filename: str) -> str:
    """
    Save the transcript to the transcripts/ folder.
    Returns the filename of the saved transcript.
    """
    timestamp   = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name   = secure_filename(original_filename.rsplit(".", 1)[0])
    trans_file  = f"transcript_{safe_name}_{timestamp}.txt"
    trans_path  = os.path.join(TRANSCRIPT_DIR, trans_file)

    with open(trans_path, "w", encoding="utf-8") as f:
        f.write(f"Speech-to-Text Transcript\n")
        f.write(f"{'=' * 40}\n")
        f.write(f"Date       : {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Source File: {original_filename}\n")
        f.write(f"Language   : {SUPPORTED_LANGUAGES.get(language, language)}\n")
        f.write(f"Word Count : {len(text.split())}\n")
        f.write(f"Char Count : {len(text)}\n")
        f.write(f"{'=' * 40}\n\n")
        f.write(text)

    return trans_file


def cleanup_file(path: str):
    """Silently remove a file; ignore errors."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except OSError:
        pass


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────
@app.route("/")
def index():
    """Serve the main HTML page."""
    return render_template("index.html")


@app.route("/transcribe", methods=["POST"])
def transcribe():
    """
    POST /transcribe
    Accepts: multipart/form-data with fields:
      - audio  : audio file (.wav or .mp3)
      - language: BCP-47 language tag (e.g. 'en-US')
    Returns: JSON with transcript, word_count, char_count, transcript_file
    """
    # ── 1. Validate request ──────────────────
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided."}), 400

    file     = request.files["audio"]
    language = request.form.get("language", "en-US").strip()

    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "error": "Unsupported file type. Please upload a .wav or .mp3 file."
        }), 415

    if language not in SUPPORTED_LANGUAGES:
        return jsonify({
            "error": f"Unsupported language '{language}'. Choose from: {list(SUPPORTED_LANGUAGES.keys())}"
        }), 400

    # ── 2. Save uploaded file ─────────────────
    original_name = secure_filename(file.filename)
    unique_prefix = uuid.uuid4().hex[:8]
    saved_name    = f"{unique_prefix}_{original_name}"
    upload_path   = os.path.join(UPLOAD_FOLDER, saved_name)
    file.save(upload_path)

    wav_path = None
    try:
        # ── 3. Convert to WAV if needed ──────────
        wav_path = convert_to_wav(upload_path)

        # ── 4. Perform speech recognition ────────
        recognizer = sr.Recognizer()
        recognizer.pause_threshold          = 0.8   # seconds of silence before phrase end
        recognizer.non_speaking_duration    = 0.5

        with sr.AudioFile(wav_path) as source:
            # Adjust for ambient noise in first 0.5 s
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio_data = recognizer.record(source)

        transcript = recognizer.recognize_google(audio_data, language=language)

        # ── 5. Compute statistics ─────────────────
        word_count = len(transcript.split())
        char_count = len(transcript)

        # ── 6. Persist transcript ─────────────────
        trans_file = save_transcript(transcript, language, original_name)

        return jsonify({
            "success"        : True,
            "transcript"     : transcript,
            "word_count"     : word_count,
            "char_count"     : char_count,
            "language"       : SUPPORTED_LANGUAGES[language],
            "transcript_file": trans_file,
        })

    # ── 7. Graceful error handling ────────────
    except sr.UnknownValueError:
        return jsonify({
            "error": "No speech detected. Please ensure the audio contains clear spoken words."
        }), 422

    except sr.RequestError as exc:
        return jsonify({
            "error": f"Google Speech API is unavailable: {exc}. Check your internet connection."
        }), 503

    except Exception as exc:  # noqa: BLE001
        app.logger.error("Transcription error: %s", exc)
        return jsonify({"error": f"An unexpected error occurred: {str(exc)}"}), 500

    finally:
        # Always clean up temporary files
        cleanup_file(upload_path)
        cleanup_file(wav_path)


@app.route("/download/<filename>")
def download_transcript(filename: str):
    """
    GET /download/<filename>
    Serves a transcript file from the transcripts/ directory.
    """
    safe = secure_filename(filename)
    trans_path = os.path.join(TRANSCRIPT_DIR, safe)

    if not os.path.isfile(trans_path):
        return jsonify({"error": "Transcript file not found."}), 404

    return send_from_directory(
        TRANSCRIPT_DIR,
        safe,
        as_attachment=True,
        download_name=safe,
        mimetype="text/plain; charset=utf-8",
    )


# ─────────────────────────────────────────────
# Error handlers
# ─────────────────────────────────────────────
@app.errorhandler(413)
def request_too_large(_):
    return jsonify({"error": f"File too large. Maximum allowed size is {MAX_CONTENT_MB} MB."}), 413


@app.errorhandler(404)
def not_found(_):
    return jsonify({"error": "Resource not found."}), 404


@app.errorhandler(500)
def internal_error(_):
    return jsonify({"error": "Internal server error."}), 500


# ─────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
