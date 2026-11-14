/**
 * TubeMetrix — YouTube Jewels & Rubies Calculator
 * Handles instant client-side conversions and live stream jewels audits.
 */

(function () {
  'use strict';

  let usdToInrRate = 86.85; // Default fallback, synced with open.er-api.com
  const INR_PER_JEWEL_CREATOR = 0.42; // Standard ~Rs. 0.42 net creator rate
  const INR_PER_JEWEL_VIEWER = 1.20;  // Approx. retail bundle price in India

  // Popular Gifts presets
  const GIFT_PRESETS = [
    { name: "Panipuri", jewels: 10, icon: "🍲" },
    { name: "Samosa", jewels: 25, icon: "🥟" },
    { name: "Chai (Tea)", jewels: 50, icon: "☕" },
    { name: "Mic Drop", jewels: 100, icon: "🎤" },
    { name: "Heart Fireworks", jewels: 250, icon: "💖" },
    { name: "Royal Crown", jewels: 1000, icon: "👑" },
    { name: "Golden Castle", jewels: 5000, icon: "🏰" },
    { name: "Galaxy Super Gift", jewels: 25000, icon: "🌌" }
  ];

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initForex();
    initInteractiveCalculator();
    initAuditorForm();
  });

  // 1. Theme Management
  function initTheme() {
    const saved = localStorage.getItem('TubeMetrix_theme') || localStorage.getItem('theme') || 'dark';
    applyTheme(saved);
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = cur === 'light' ? 'dark' : 'light';
        applyTheme(next);
      });
    }
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.body.className = t === 'light' ? 'light-mode' : '';
    localStorage.setItem('TubeMetrix_theme', t);
    localStorage.setItem('theme', t);
    const icon = document.getElementById('themeIcon');
    const txt = document.getElementById('themeText');
    if (icon) icon.textContent = t === 'light' ? '🌙' : '☀️';
    if (txt) txt.textContent = t === 'light' ? 'Dark' : 'Light';
  }

  // 2. Fetch Live USD to INR Rate
  async function initForex() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const data = await res.json();
        if (data?.rates?.INR) {
          usdToInrRate = data.rates.INR;
          const rateBadge = document.getElementById('forexRateBadge');
          if (rateBadge) {
            rateBadge.textContent = `Live Forex: $1 USD = ₹${usdToInrRate.toFixed(2)} INR`;
          }
          recalcInteractive();
        }
      }
    } catch (e) {
      // Keep default fallback
    }
  }

  // 3. Interactive Instant Calculator
  function initInteractiveCalculator() {
    const input = document.getElementById('calcJewelsInput');
    if (!input) return;

    input.addEventListener('input', recalcInteractive);

    // Preset chips
    document.querySelectorAll('.jewel-preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.jewel-preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const count = parseInt(chip.dataset.jewels, 10);
        if (!isNaN(count)) {
          input.value = count;
          recalcInteractive();
        }
      });
    });

    // Gift quick-click chips
    document.querySelectorAll('.gift-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const count = parseInt(card.dataset.jewels, 10);
        if (!isNaN(count)) {
          input.value = count;
          document.querySelectorAll('.jewel-preset-chip').forEach(c => c.classList.remove('active'));
          recalcInteractive();
        }
      });
    });

    recalcInteractive();
  }

  function recalcInteractive() {
    const input = document.getElementById('calcJewelsInput');
    if (!input) return;

    let jewels = parseInt(input.value.replace(/[^0-9]/g, ''), 10);
    if (isNaN(jewels) || jewels < 0) jewels = 0;

    // Official YouTube Conversion:
    // 2 Jewels = 1 Ruby
    // 1 Ruby = $0.01 USD
    const rubies = jewels / 2;
    const creatorUsd = rubies * 0.01;
    // Net creator payout in INR
    const creatorInr = creatorUsd * usdToInrRate;
    // Approx gross viewer bundle cost
    const viewerInr = jewels * INR_PER_JEWEL_VIEWER;

    // Update UI
    setElText('resJewels', jewels.toLocaleString());
    setElText('resRubies', rubies.toLocaleString(undefined, { maximumFractionDigits: 1 }));
    setElText('resUsd', `$${creatorUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setElText('resInr', `₹${Math.round(creatorInr).toLocaleString()}`);
    setElText('resViewerGross', `₹${Math.round(viewerInr).toLocaleString()}`);
    setElText('resFormulaNote', `Formula: ${jewels.toLocaleString()} Jewels ÷ 2 = ${rubies.toLocaleString()} Rubies × $0.01 = $${creatorUsd.toFixed(2)} USD (at ₹${usdToInrRate.toFixed(2)}/USD)`);
  }

  function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // 4. Live Stream Jewels Auditor Form
  function initAuditorForm() {
    const auditBtn = document.getElementById('startJewelsAuditBtn');
    const input = document.getElementById('auditStreamUrlInput');
    const pasteBtn = document.getElementById('pasteAuditUrlBtn');

    if (pasteBtn && input) {
      pasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) input.value = text.trim();
        } catch (e) {
          input.focus();
        }
      });
    }

    if (auditBtn && input) {
      auditBtn.addEventListener('click', () => {
        const raw = input.value.trim();
        const vid = extractVideoId(raw);
        if (!vid) {
          alert('Please enter a valid YouTube Live Stream URL or Video ID.');
          return;
        }
        // Redirect or load stream audit on main stream auditor
        window.location.href = `/?stream=${encodeURIComponent(vid)}#jewels`;
      });
    }
  }

  function extractVideoId(input) {
    if (!input) return null;
    const clean = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = clean.match(regExp);
    return match ? match[1] : null;
  }
})();

