/**
 * SpamShield AI – Result Page Script
 * result.js
 *
 * Handles: SVG Gauge animation, progress bar, PDF export,
 *          copy result, confidence countdown.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── SVG Circular Gauge ─────────────────────────────────────────────
  function initGauge() {
    const gauge = document.getElementById('gauge-circle');
    if (!gauge) return;

    const pct      = parseFloat(gauge.getAttribute('data-value') || '0');
    const radius   = 80;
    const circumf  = 2 * Math.PI * radius;
    const isSpam   = gauge.getAttribute('data-is-spam') === 'true';

    gauge.setAttribute('r', radius);
    gauge.setAttribute('stroke-dasharray', circumf);
    gauge.setAttribute('stroke-dashoffset', circumf);

    // Color based on spam probability
    let color;
    if (isSpam)     color = '#ff1744';
    else if (pct > 40) color = '#ffb300';
    else               color = '#00e676';

    gauge.setAttribute('stroke', color);

    // Animate fill
    const offset = circumf - (pct / 100) * circumf;
    gauge.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
    requestAnimationFrame(() => {
      setTimeout(() => {
        gauge.setAttribute('stroke-dashoffset', offset);
      }, 200);
    });

    // Animate center percentage text
    const pctEl = document.getElementById('gauge-percent');
    if (pctEl) {
      let current = 0;
      const target = pct;
      const duration = 1500;
      const startTs = performance.now();

      function tick(ts) {
        const progress = Math.min((ts - startTs) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        current = eased * target;
        pctEl.textContent = current.toFixed(1) + '%';
        if (progress < 1) requestAnimationFrame(tick);
        else pctEl.textContent = target.toFixed(1) + '%';
      }

      requestAnimationFrame(tick);
    }
  }

  // ── Copy Result ───────────────────────────────────────────────────
  function initCopyBtn() {
    const btn = document.getElementById('copy-result-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const result = document.getElementById('result-data');
      if (result) {
        const text = result.getAttribute('data-copy') || result.innerText;
        window.SpamShield?.copyToClipboard(text, 'Result copied to clipboard!');
      }
    });
  }

  // ── PDF Export ────────────────────────────────────────────────────
  function initPdfExport() {
    const btn = document.getElementById('export-pdf-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      // Dynamically load jsPDF
      if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
        await new Promise(resolve => { script.onload = resolve; });
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      // Header
      doc.setFillColor(8, 12, 20);
      doc.rect(0, 0, 210, 297, 'F');

      doc.setTextColor(0, 212, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('SpamShield AI', 20, 25);

      doc.setTextColor(139, 158, 199);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Email Security Analysis Report', 20, 33);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 39);

      // Divider
      doc.setDrawColor(255, 255, 255, 30);
      doc.line(20, 44, 190, 44);

      // Classification result
      const resultData = document.getElementById('result-data');
      const isSpam = resultData?.getAttribute('data-spam') === 'true';
      const confidence = resultData?.getAttribute('data-confidence') || '0';
      const spamProb = resultData?.getAttribute('data-spam-prob') || '0';
      const timestamp = resultData?.getAttribute('data-timestamp') || '';

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      if (isSpam) {
        doc.setTextColor(255, 23, 68);
        doc.text('SPAM DETECTED', 20, 56);
      } else {
        doc.setTextColor(0, 230, 118);
        doc.text('LEGITIMATE EMAIL', 20, 56);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(240, 244, 255);
      doc.text(`Spam Probability: ${spamProb}%`, 20, 66);
      doc.text(`Confidence: ${confidence}%`, 20, 73);
      doc.text(`Analyzed at: ${timestamp}`, 20, 80);

      // Reasons
      const reasons = document.querySelectorAll('.reason-item');
      if (reasons.length) {
        doc.line(20, 87, 190, 87);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 212, 255);
        doc.text('Analysis Reasons', 20, 95);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(240, 244, 255);
        let y = 103;
        reasons.forEach(r => {
          const text = r.querySelector('.reason-text')?.textContent || r.textContent.trim();
          const lines = doc.splitTextToSize(`• ${text}`, 165);
          lines.forEach(line => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(line, 20, y);
            y += 6;
          });
        });
      }

      // Keywords
      const keywords = document.querySelectorAll('.keyword-tag');
      if (keywords.length) {
        doc.line(20, doc.lastAutoTable?.finalY + 5 || 200, 190, doc.lastAutoTable?.finalY + 5 || 200);
        doc.setFontSize(10);
        doc.setTextColor(255, 179, 0);
        const kwText = Array.from(keywords).map(k => k.textContent.trim()).join(', ');
        doc.text(`Suspicious Keywords: ${kwText}`, 20, doc.internal.getCurrentPageInfo().pageNumber > 1 ? 30 : 220);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(74, 90, 122);
      doc.text('SpamShield AI | Powered by ML | For Educational Use', 20, 285);

      doc.save(`SpamShield_Report_${Date.now()}.pdf`);
      window.SpamShield?.Toast.success('Report exported as PDF!');
    });
  }

  // ── Stagger Reason Items ──────────────────────────────────────────
  function animateReasons() {
    const items = document.querySelectorAll('.reason-item');
    items.forEach((item, i) => {
      item.style.animationDelay = `${i * 0.1}s`;
    });
  }

  // ── Animate Progress Bars on Entry ────────────────────────────────
  function animateBars() {
    const bars = document.querySelectorAll('[data-progress]');
    setTimeout(() => {
      bars.forEach(bar => {
        const val = bar.getAttribute('data-progress');
        bar.style.width = val + '%';
      });
    }, 400);
  }

  // Init all
  initGauge();
  initCopyBtn();
  initPdfExport();
  animateReasons();
  animateBars();
});
