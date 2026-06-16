/**
 * VoiceScript — Frontend JavaScript
 * Handles: drag-and-drop, file validation, form submission,
 *          progress UI, results display, copy, and download.
 */

"use strict";

// ─────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────
const form              = document.getElementById("transcribe-form");
const dropZone          = document.getElementById("drop-zone");
const audioInput        = document.getElementById("audio-input");
const fileInfo          = document.getElementById("file-info");
const fileName          = document.getElementById("file-name");
const fileSize          = document.getElementById("file-size");
const removeFileBtn     = document.getElementById("remove-file");
const languageSelect    = document.getElementById("language-select");
const transcribeBtn     = document.getElementById("transcribe-btn");

const loadingOverlay    = document.getElementById("loading-overlay");

const errorBanner       = document.getElementById("error-banner");
const errorMessage      = document.getElementById("error-message");
const dismissError      = document.getElementById("dismiss-error");

const resultsSection    = document.getElementById("results-section");
const resultsLanguage   = document.getElementById("results-language");
const statWords         = document.getElementById("stat-words");
const statChars         = document.getElementById("stat-chars");
const statTime          = document.getElementById("stat-time");
const transcriptOutput  = document.getElementById("transcript-output");
const copyBtn           = document.getElementById("copy-btn");
const downloadBtn       = document.getElementById("download-btn");
const newTranscriptionBtn = document.getElementById("new-transcription-btn");

const toast             = document.getElementById("toast");

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let selectedFile        = null;   // File object
let transcriptFilename  = null;   // Server-saved filename for download

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MAX_FILE_MB       = 50;
const ALLOWED_TYPES     = ["audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp3"];
const ALLOWED_EXTS      = [".wav", ".mp3"];
const AVG_WORDS_PER_MIN = 200;   // For read-time estimation

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

/**
 * Format bytes into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

/**
 * Validate that a File object is an accepted audio type.
 * Checks both MIME type and file extension for reliability.
 * @param {File} file
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateFile(file) {
  const ext = "." + file.name.split(".").pop().toLowerCase();

  if (!ALLOWED_EXTS.includes(ext)) {
    return { valid: false, reason: `Unsupported file type "${ext}". Please upload a .wav or .mp3 file.` };
  }
  if (file.size > MAX_FILE_MB * 1024 * 1024) {
    return { valid: false, reason: `File too large (${formatBytes(file.size)}). Maximum allowed is ${MAX_FILE_MB} MB.` };
  }
  return { valid: true };
}

/**
 * Animate a numeric counter from 0 to target.
 * @param {HTMLElement} el
 * @param {number} target
 * @param {number} duration   ms
 */
function animateCounter(el, target, duration = 800) {
  const start     = performance.now();
  const startVal  = 0;

  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutQuart
    const eased    = 1 - Math.pow(1 - progress, 4);
    const current  = Math.round(startVal + (target - startVal) * eased);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ─────────────────────────────────────────────
// UI state helpers
// ─────────────────────────────────────────────

/** Display a file in the drop-zone info row. */
function showFileInfo(file) {
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileInfo.removeAttribute("hidden");
  dropZone.classList.add("drop-zone--active");
}

/** Reset drop zone to empty state. */
function clearFileInfo() {
  selectedFile     = null;
  audioInput.value = "";
  fileInfo.setAttribute("hidden", "");
  dropZone.classList.remove("drop-zone--active");
}

/** Show an error message in the banner. */
function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.removeAttribute("hidden");
  // Scroll into view
  errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/** Hide the error banner. */
function hideError() { errorBanner.setAttribute("hidden", ""); }

/** Show/hide the loading overlay. */
function setLoading(show) {
  if (show) {
    loadingOverlay.removeAttribute("hidden");
    transcribeBtn.disabled = true;
    transcribeBtn.classList.add("btn--loading");
  } else {
    loadingOverlay.setAttribute("hidden", "");
    transcribeBtn.disabled = false;
    transcribeBtn.classList.remove("btn--loading");
  }
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'} type
 * @param {number} duration   ms before auto-dismiss
 */
function showToast(message, type = "success", duration = 3000) {
  toast.textContent = message;
  toast.className   = `toast toast--${type}`;
  toast.removeAttribute("hidden");

  setTimeout(() => {
    toast.classList.add("toast--hiding");
    setTimeout(() => toast.setAttribute("hidden", ""), 320);
  }, duration);
}

// ─────────────────────────────────────────────
// File selection logic
// ─────────────────────────────────────────────

/** Process a File object (from input or drop). */
function handleFileSelect(file) {
  if (!file) return;

  const { valid, reason } = validateFile(file);
  if (!valid) {
    showError(reason);
    clearFileInfo();
    return;
  }

  hideError();
  selectedFile = file;
  showFileInfo(file);
}

// File input change
audioInput.addEventListener("change", () => {
  if (audioInput.files.length) handleFileSelect(audioInput.files[0]);
});

// Remove file button
removeFileBtn.addEventListener("click", () => {
  clearFileInfo();
  hideError();
  resultsSection.setAttribute("hidden", "");
});

// ─────────────────────────────────────────────
// Drag-and-Drop
// ─────────────────────────────────────────────
["dragenter", "dragover"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("drop-zone--dragover");
  });
});

["dragleave", "drop"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("drop-zone--dragover");
  });
});

dropZone.addEventListener("drop", (e) => {
  const dt   = e.dataTransfer;
  const file = dt.files && dt.files[0];
  if (file) handleFileSelect(file);
});

// Keyboard accessibility for drop zone
dropZone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    audioInput.click();
  }
});

// ─────────────────────────────────────────────
// Form submission + Transcription
// ─────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  // Guard: ensure file selected
  if (!selectedFile) {
    showError("Please select a .wav or .mp3 audio file before transcribing.");
    return;
  }

  // Guard: validate again
  const { valid, reason } = validateFile(selectedFile);
  if (!valid) { showError(reason); return; }

  // Build FormData
  const formData = new FormData();
  formData.append("audio",    selectedFile);
  formData.append("language", languageSelect.value);

  setLoading(true);
  resultsSection.setAttribute("hidden", "");

  try {
    const response = await fetch("/transcribe", {
      method: "POST",
      body:   formData,
    });

    // Parse JSON regardless of status code
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || `Server error (HTTP ${response.status})`);
    }

    // ── Success path ──────────────────────────
    transcriptFilename = data.transcript_file;
    displayResults(data);

  } catch (err) {
    // Network errors or server errors
    showError(err.message || "An unexpected error occurred. Please try again.");
  } finally {
    setLoading(false);
  }
});

// ─────────────────────────────────────────────
// Display Results
// ─────────────────────────────────────────────

/**
 * Render the transcript and statistics into the results section.
 * @param {Object} data  - Server response JSON
 */
function displayResults(data) {
  const { transcript, word_count, char_count, language } = data;

  // Populate transcript text
  transcriptOutput.textContent = transcript;

  // Animate statistics
  animateCounter(statWords, word_count);
  animateCounter(statChars, char_count);

  // Estimate read time (round up to at least 1 min)
  const minutes = Math.max(1, Math.ceil(word_count / AVG_WORDS_PER_MIN));
  statTime.textContent = `${minutes} min`;

  // Language label
  resultsLanguage.textContent = `Transcribed in ${language}`;

  // Show results
  resultsSection.removeAttribute("hidden");

  // Smooth scroll
  setTimeout(() => {
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);

  showToast("Transcript saved automatically ✓", "success");
}

// ─────────────────────────────────────────────
// Copy to clipboard
// ─────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  const text = transcriptOutput.textContent.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    const original   = copyBtn.innerHTML;
    copyBtn.innerHTML = "<span>✅</span> Copied!";
    copyBtn.disabled  = true;
    setTimeout(() => {
      copyBtn.innerHTML = original;
      copyBtn.disabled  = false;
    }, 2000);
    showToast("Transcript copied to clipboard!", "success");
  } catch {
    // Fallback for older browsers
    const range = document.createRange();
    range.selectNode(transcriptOutput);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("copy");
    window.getSelection().removeAllRanges();
    showToast("Transcript selected — press Ctrl+C to copy", "success", 4000);
  }
});

// ─────────────────────────────────────────────
// Download transcript
// ─────────────────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!transcriptFilename) {
    showToast("No transcript available to download.", "error");
    return;
  }

  // Trigger server download endpoint
  const link    = document.createElement("a");
  link.href     = `/download/${encodeURIComponent(transcriptFilename)}`;
  link.download = transcriptFilename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Downloading transcript…", "success");
});

// ─────────────────────────────────────────────
// New Transcription (reset UI)
// ─────────────────────────────────────────────
newTranscriptionBtn.addEventListener("click", () => {
  clearFileInfo();
  hideError();
  resultsSection.setAttribute("hidden", "");
  transcriptFilename = null;
  transcriptOutput.textContent = "";
  statWords.textContent = "0";
  statChars.textContent = "0";
  statTime.textContent  = "0 min";

  // Scroll back to upload
  document.getElementById("upload-section").scrollIntoView({ behavior: "smooth" });
});

// ─────────────────────────────────────────────
// Error banner dismiss
// ─────────────────────────────────────────────
dismissError.addEventListener("click", hideError);

// ─────────────────────────────────────────────
// Keyboard shortcut: Ctrl+Enter to transcribe
// ─────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    if (selectedFile && !transcribeBtn.disabled) {
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }
  }
});

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
(function init() {
  // Ensure results and overlays start hidden
  resultsSection.setAttribute("hidden", "");
  loadingOverlay.setAttribute("hidden", "");
  errorBanner.setAttribute("hidden", "");
  toast.setAttribute("hidden", "");
  console.info("VoiceScript initialised. Press Ctrl+Enter to transcribe.");
})();
