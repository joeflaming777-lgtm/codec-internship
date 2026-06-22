/**
 * SpamShield AI – Analyzer Page Script
 * analyzer.js
 *
 * Handles: Character counter, example loader, live preview,
 *          async AJAX submission, loading state.
 */

document.addEventListener('DOMContentLoaded', () => {
  const textarea    = document.getElementById('email-input');
  const form        = document.getElementById('analyze-form');
  const analyzeBtn  = document.getElementById('analyze-btn');
  const charDisplay = document.getElementById('char-count');
  const wordDisplay = document.getElementById('word-count');
  const clearBtn    = document.getElementById('clear-btn');
  const exampleBtns = document.querySelectorAll('[data-example]');

  // ── Example Emails ────────────────────────────────────────────────
  const EXAMPLES = {
    spam: `Subject: CONGRATULATIONS! You Have Won $1,000,000!!!

Dear Lucky Winner,

You have been SELECTED as our grand prize winner for the month!

🎉 CLAIM YOUR PRIZE NOW! 🎉

You have won:
✓ $1,000,000 Cash Prize
✓ FREE iPhone 15 Pro
✓ All-Expenses-Paid Vacation to Bahamas

This is a LIMITED TIME OFFER — expires in 24 hours!

Click here IMMEDIATELY to claim: http://claim-prize-now.fake/winner

Don't miss this EXCLUSIVE opportunity. Act NOW!

Best regards,
International Lucky Draw Committee`,

    ham: `Subject: Q4 Project Status Update

Hi Team,

I hope everyone is doing well. I wanted to share a quick update on our Q4 project progress before Thursday's board meeting.

Key highlights this week:
- Feature development is 85% complete
- QA testing is scheduled to begin Monday
- Documentation is being finalized by the end of week

Please review the attached report and come prepared with your team updates for the meeting at 10 AM on Thursday in Conference Room B.

Let me know if you have any questions or blockers.

Best regards,
Sarah Johnson
Senior Project Manager`,

    phishing: `Subject: URGENT: Your Bank Account Has Been Suspended

Dear Valued Customer,

We have detected suspicious activity on your account and have temporarily suspended access for your security.

To restore access, you must verify your identity IMMEDIATELY by clicking the link below:

>> VERIFY NOW: https://secure-bank-verify.fake/login <<

Failure to verify within 24 hours will result in permanent account closure and loss of funds.

Required information to verify:
- Full name
- Account number
- PIN/Password
- Social Security Number

This is an automated security alert. Do not ignore this message.

Security Department
National Banking Corporation`,
  };

  // ── Character / Word Counter ───────────────────────────────────────
  function updateCounters() {
    if (!textarea) return;
    const text  = textarea.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    if (charDisplay) {
      charDisplay.textContent = chars.toLocaleString();
      charDisplay.parentElement.classList.toggle('warn', chars > 5000);
    }
    if (wordDisplay) wordDisplay.textContent = words.toLocaleString();
  }

  if (textarea) {
    textarea.addEventListener('input', updateCounters);
    updateCounters();
  }

  // ── Load Example ──────────────────────────────────────────────────
  exampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-example');
      if (EXAMPLES[key] && textarea) {
        textarea.value = EXAMPLES[key];
        textarea.focus();
        updateCounters();
        // Scroll to textarea
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        window.SpamShield?.Toast.info(`Loaded ${key} email example`);
      }
    });
  });

  // ── Clear ─────────────────────────────────────────────────────────
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (textarea) {
        textarea.value = '';
        textarea.focus();
        updateCounters();
      }
    });
  }

  // ── Form Submit (with loading state) ──────────────────────────────
  if (form) {
    form.addEventListener('submit', (e) => {
      const text = textarea?.value.trim();
      if (!text) {
        e.preventDefault();
        window.SpamShield?.Toast.error('Please enter email content to analyze.');
        textarea?.focus();
        return;
      }

      if (text.length < 10) {
        e.preventDefault();
        window.SpamShield?.Toast.warn('Email content is too short to analyze.');
        return;
      }

      // Show loading state
      if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = `
          <span class="btn-spinner"></span>
          Analyzing...
        `;
        analyzeBtn.style.opacity = '0.8';
      }
    });
  }

  // ── Drag & Drop ──────────────────────────────────────────────────
  if (textarea) {
    textarea.addEventListener('dragover', e => {
      e.preventDefault();
      textarea.style.borderColor = 'var(--cyan)';
    });

    textarea.addEventListener('dragleave', () => {
      textarea.style.borderColor = '';
    });

    textarea.addEventListener('drop', e => {
      e.preventDefault();
      textarea.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = evt => {
          textarea.value = evt.target.result;
          updateCounters();
          window.SpamShield?.Toast.success('Email loaded from file!');
        };
        reader.readAsText(file);
      } else if (e.dataTransfer.getData('text')) {
        textarea.value = e.dataTransfer.getData('text');
        updateCounters();
      }
    });
  }
});
