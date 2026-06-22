/**
 * SpamShield AI – Main JavaScript
 * main.js
 *
 * Handles: Dark/Light mode, loading screen, navigation,
 *          toast notifications, global utilities.
 */

// ── Theme Management ──────────────────────────────────────────────
const Theme = (() => {
  const KEY = 'spamshield-theme';
  const root = document.documentElement;

  function get() {
    return localStorage.getItem(KEY) || 'dark';
  }

  function set(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
    updateToggleBtn(theme);
  }

  function toggle() {
    const current = get();
    set(current === 'dark' ? 'light' : 'dark');
  }

  function init() {
    set(get());
  }

  function updateToggleBtn(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  return { get, set, toggle, init };
})();

// ── Loading Screen ─────────────────────────────────────────────────
function initLoadingScreen() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;

  // Hide after 1.6s (animation completes)
  setTimeout(() => {
    screen.classList.add('hidden');
    // Remove from DOM after fade
    setTimeout(() => screen.remove(), 500);
  }, 1600);
}

// ── Navigation ─────────────────────────────────────────────────────
function initNavigation() {
  // Active link highlighting
  const links = document.querySelectorAll('.nav-link[data-page]');
  const current = window.location.pathname.replace(/\/$/, '') || '/';

  links.forEach(link => {
    const page = link.getAttribute('data-page');
    const href = link.getAttribute('href') || '';

    if (
      (current === '/' && page === 'home') ||
      (current.startsWith(href) && href !== '/')
    ) {
      link.classList.add('active');
    }
  });

  // Hamburger
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      hamburger.textContent = mobileMenu.classList.contains('open') ? '✕' : '☰';
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.textContent = '☰';
      }
    });
  }

  // Theme toggle
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', Theme.toggle);
  }
}

// ── Toast Notifications ────────────────────────────────────────────
const Toast = (() => {
  function getContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function show(message, icon = 'ℹ️', duration = 3500) {
    const container = getContainer();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return {
    show,
    success: (msg) => show(msg, '✅'),
    error:   (msg) => show(msg, '❌'),
    info:    (msg) => show(msg, 'ℹ️'),
    warn:    (msg) => show(msg, '⚠️'),
  };
})();

// ── Copy to Clipboard ──────────────────────────────────────────────
function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text)
      .then(() => Toast.success(successMsg))
      .catch(() => Toast.error('Copy failed'));
  } else {
    // Fallback
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:absolute;left:-9999px;';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    Toast.success(successMsg);
  }
}

// ── Intersection Observer (Scroll Animations) ──────────────────────
function initScrollAnimations() {
  const targets = document.querySelectorAll('.fade-in-up, .fade-in');
  if (!targets.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(el => {
    el.style.animationPlayState = 'paused';
    observer.observe(el);
  });
}

// ── Number Counter Animation ───────────────────────────────────────
function animateCounter(el, target, duration = 1500, prefix = '', suffix = '') {
  const start    = 0;
  const startTs  = performance.now();
  const isFloat  = !Number.isInteger(target);

  function step(ts) {
    const progress = Math.min((ts - startTs) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current  = eased * target;
    el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;

    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = prefix + (isFloat ? target.toFixed(1) : target) + suffix;
  }

  requestAnimationFrame(step);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseFloat(el.getAttribute('data-counter'));
        const prefix = el.getAttribute('data-prefix') || '';
        const suffix = el.getAttribute('data-suffix') || '';
        animateCounter(el, target, 1500, prefix, suffix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

// ── Progress Bar Animations ────────────────────────────────────────
function animateProgressBars() {
  const bars = document.querySelectorAll('[data-progress]');
  bars.forEach(bar => {
    const value = bar.getAttribute('data-progress');
    const color = bar.getAttribute('data-color');
    if (color) bar.style.background = color;
    // Trigger after a tick so CSS transition fires
    requestAnimationFrame(() => {
      setTimeout(() => { bar.style.width = value + '%'; }, 50);
    });
  });
}

// ── CSV Download ───────────────────────────────────────────────────
function downloadCSV(data, filename = 'spamshield_history.csv') {
  if (!data || !data.length) {
    Toast.warn('No history to download.');
    return;
  }

  const headers = ['Timestamp', 'Classification', 'Confidence (%)', 'Spam Prob (%)', 'Keywords', 'Email Preview'];
  const rows = data.map(item => [
    `"${item.timestamp}"`,
    item.is_spam ? 'SPAM' : 'HAM',
    item.confidence,
    item.spam_probability,
    `"${(item.keywords || []).join(', ')}"`,
    `"${(item.email_preview || '').replace(/"/g, '""')}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href     = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  Toast.success('History downloaded as CSV!');
}

// ── Utilities ──────────────────────────────────────────────────────
function formatDate(dateStr) {
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function truncate(str, maxLen = 60) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

// ── DOMContentLoaded ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  initLoadingScreen();
  initNavigation();
  initScrollAnimations();
  initCounters();
  animateProgressBars();
});

// Export for use in other scripts
window.SpamShield = { Toast, copyToClipboard, downloadCSV, formatDate, truncate, Theme };
