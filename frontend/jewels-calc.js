/**
 * TubeMetrix — YouTube Jewels & Rubies Calculator & Live Stream Auditor
 * 1. Automatic Live Stream Chat Replay Auditor (Direct YouTube Public API via Hugging Face Backend)
 * 2. Instant Client-Side Unit Economics Calculator (Official 2 Jewels = 1 Ruby formula)
 * 3. 100% Free & Frictionless: Zero sign-in or credits required.
 */

(function () {
  'use strict';

  const API_ENDPOINT = 'https://shubhamsain858-kickcuttr-api.hf.space/api/youtube/analyze-stream';
  let usdToInrRate = 86.85; // Live fallback, synced with open.er-api.com
  const INR_PER_JEWEL_CREATOR = 0.42; // Standard ~Rs. 0.42 net creator rate
  const INR_PER_JEWEL_VIEWER = 1.20;  // Approx. retail bundle price in India

  // Active state for current audit result
  let currentAuditData = null;

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileScrollHints();
    initForex();
    initInteractiveCalculator();
    initStreamAuditor();
    checkUrlParams();
  });

  // ─────────────────────────────────────────────
  // 1. Theme Management
  // ─────────────────────────────────────────────
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

  // Mobile horizontal nav scroll cue
  function initMobileScrollHints() {
    const container = document.getElementById('mainPageNav');
    const hint = document.getElementById('pageNavHint');
    if (!container || !hint) return;

    function updateHint() {
      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll <= 8) {
        hint.style.display = 'none';
      } else if (container.scrollLeft >= 20) {
        hint.style.opacity = '0';
        hint.style.transform = 'translateX(6px)';
        hint.style.pointerEvents = 'none';
      } else {
        hint.style.display = 'block';
        hint.style.opacity = '1';
        hint.style.transform = 'none';
        hint.style.pointerEvents = 'auto';
      }
    }

    container.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint);
    updateHint();

    hint.addEventListener('click', () => {
      container.scrollBy({ left: 160, behavior: 'smooth' });
    });
  }

  // ─────────────────────────────────────────────
  // 2. Live Forex Rate
  // ─────────────────────────────────────────────
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
          updateGiftCatalogRates();
          recalcInteractive();
          if (currentAuditData) {
            renderAuditResults(currentAuditData);
          }
        }
      }
    } catch (e) {
      // Keep default fallback
    }
  }

  function updateGiftCatalogRates() {
    document.querySelectorAll('.gift-preset-card').forEach(card => {
      const jewels = parseInt(card.dataset.jewels, 10);
      if (!isNaN(jewels)) {
        const rubies = jewels / 2;
        const takeInr = rubies * 0.01 * usdToInrRate;
        const label = card.querySelector('.gift-take-label');
        if (label) {
          label.textContent = `Take: ~₹${takeInr >= 100 ? Math.round(takeInr).toLocaleString() : takeInr.toFixed(2)}`;
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // 3. Interactive Instant Calculator (What-If Math)
  // ─────────────────────────────────────────────
  function initInteractiveCalculator() {
    const input = document.getElementById('calcJewelsInput');
    if (!input) return;

    input.addEventListener('input', () => {
      const val = parseInt(input.value.replace(/[^0-9]/g, ''), 10);
      document.querySelectorAll('.jewel-preset-chip').forEach(c => {
        if (parseInt(c.dataset.jewels, 10) === val) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
      recalcInteractive();
    });

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

    // Gift quick-click cards
    document.querySelectorAll('.gift-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const count = parseInt(card.dataset.jewels, 10);
        if (!isNaN(count)) {
          input.value = count;
          document.querySelectorAll('.jewel-preset-chip').forEach(c => {
            if (parseInt(c.dataset.jewels, 10) === count) {
              c.classList.add('active');
            } else {
              c.classList.remove('active');
            }
          });
          recalcInteractive();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    updateGiftCatalogRates();
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
    const creatorInr = creatorUsd * usdToInrRate;
    const inrPerJewel = jewels > 0 ? (creatorInr / jewels).toFixed(2) : (0.5 * 0.01 * usdToInrRate).toFixed(2);

    // Update main UI elements in calculator card
    setElText('calcRubiesVal', rubies.toLocaleString(undefined, { maximumFractionDigits: 1 }));
    setElText('calcUsdVal', `$${creatorUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setElText('calcInrVal', `₹${(creatorInr >= 100 ? Math.round(creatorInr) : creatorInr.toFixed(2)).toLocaleString()}`);
    setElText('calcInrSub', `~₹${inrPerJewel} net per Jewel`);

    const formulaEl = document.getElementById('calcFormulaNote');
    if (formulaEl) {
      formulaEl.innerHTML = `Formula: <strong>${jewels.toLocaleString()} Jewels ÷ 2 = ${rubies.toLocaleString()} Rubies × $0.01 = $${creatorUsd.toFixed(2)} USD (≈ ₹${Math.round(creatorInr).toLocaleString()})</strong>`;
    }

    // Legacy fallbacks
    setElText('resJewels', jewels.toLocaleString());
    setElText('resRubies', rubies.toLocaleString(undefined, { maximumFractionDigits: 1 }));
    setElText('resUsd', `$${creatorUsd.toFixed(2)} USD`);
    setElText('resInr', `₹${Math.round(creatorInr).toLocaleString()}`);
  }

  // ─────────────────────────────────────────────
  // 4. Live Stream URL Jewels & Rubies Auditor
  // ─────────────────────────────────────────────
  function initStreamAuditor() {
    const input = document.getElementById('auditStreamUrlInput');
    const pasteBtn = document.getElementById('pasteAuditUrlBtn');
    const auditBtn = document.getElementById('startJewelsAuditBtn');
    const demoBtn = document.getElementById('loadSampleStreamBtn');
    const dismissErrBtn = document.getElementById('dismissErrorBtn');
    const copyBtn = document.getElementById('copyAuditSummaryBtn');
    const csvBtn = document.getElementById('downloadAuditCsvBtn');
    const resetBtn = document.getElementById('resetAuditBtn');

    if (pasteBtn && input) {
      pasteBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            input.value = text.trim();
            input.focus();
          }
        } catch (e) {
          input.focus();
        }
      });
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          executeStreamAudit();
        }
      });
    }

    if (auditBtn) {
      auditBtn.addEventListener('click', executeStreamAudit);
    }

    if (demoBtn) {
      demoBtn.addEventListener('click', loadDemoStream);
    }

    if (dismissErrBtn) {
      dismissErrBtn.addEventListener('click', () => {
        hideEl('auditErrorBanner');
        hideEl('auditErrorState');
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', copyAuditSummary);
    }

    if (csvBtn) {
      csvBtn.addEventListener('click', downloadAuditCsv);
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (input) input.value = '';
        currentAuditData = null;
        hideEl('auditResultsContainer');
        hideEl('auditErrorBanner');
        hideEl('auditErrorState');
        hideEl('auditStatusTicker');
        hideEl('auditLoadingState');
      });
    }
  }

  async function executeStreamAudit() {
    const input = document.getElementById('auditStreamUrlInput');
    if (!input) return;

    const raw = input.value.trim();
    const vid = extractVideoId(raw);

    if (!vid) {
      showError('Invalid YouTube Stream Link', 'Please enter a valid YouTube Live Stream URL or Video ID (e.g. https://www.youtube.com/watch?v=... or live/...).');
      input.focus();
      return;
    }

    hideEl('auditErrorBanner');
    hideEl('auditErrorState');
    hideEl('auditResultsContainer');

    const ticker = document.getElementById('auditStatusTicker');
    const statusMsg = document.getElementById('auditStatusMsg');
    const statusPct = document.getElementById('auditStatusPct');
    const progressBar = document.getElementById('auditProgressBar');

    if (ticker) ticker.style.display = 'block';
    if (statusMsg) statusMsg.textContent = 'Connecting to YouTube Live Replay...';
    if (statusPct) statusPct.textContent = '20%';
    if (progressBar) progressBar.style.width = '20%';

    const auditBtn = document.getElementById('startJewelsAuditBtn');
    if (auditBtn) auditBtn.disabled = true;

    // Loading status animation ticker
    const tickerMsgs = [
      { msg: 'Streaming public live chat replay...', pct: '45%' },
      { msg: 'Extracting giftMessageViewModel events...', pct: '70%' },
      { msg: 'Calculating Jewels, Rubies & Net Payout...', pct: '90%' }
    ];
    let tickerIdx = 0;
    const tickerInterval = setInterval(() => {
      if (tickerIdx < tickerMsgs.length) {
        if (statusMsg) statusMsg.textContent = tickerMsgs[tickerIdx].msg;
        if (statusPct) statusPct.textContent = tickerMsgs[tickerIdx].pct;
        if (progressBar) progressBar.style.width = tickerMsgs[tickerIdx].pct;
        tickerIdx++;
      }
    }, 1200);

    try {
      const resp = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.youtube.com/watch?v=${vid}` })
      });

      clearInterval(tickerInterval);
      if (ticker) ticker.style.display = 'none';
      hideEl('auditLoadingState');
      if (auditBtn) auditBtn.disabled = false;

      if (!resp.ok) {
        showError('Audit Request Failed', `The server returned error ${resp.status}. Please check your connection or try again.`);
        return;
      }

      const resData = await resp.json();

      if (!resData.success) {
        const errorMsg = resData.message || 'Live chat replay was not found or is disabled for this stream.';
        showError('Live Chat Replay Unavailable', errorMsg);
        return;
      }

      let finalTitle = resData.title || `Live Stream [${vid}]`;
      let finalChannel = resData.channel || 'YouTube Creator';

      // Fast oEmbed lookup to get the real YouTube title and creator name if backend returned fallback
      if (!finalTitle || finalTitle.startsWith('Live Stream [')) {
        try {
          const oeResp = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${vid}`);
          if (oeResp.ok) {
            const oeData = await oeResp.json();
            if (oeData.title) finalTitle = oeData.title;
            if (oeData.author_name) finalChannel = oeData.author_name;
          }
        } catch (oeErr) {
          // ignore fallback
        }
      }

      currentAuditData = {
        vid: vid,
        title: finalTitle,
        channel: finalChannel,
        thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        data: resData.data || {}
      };

      renderAuditResults(currentAuditData);

    } catch (err) {
      clearInterval(tickerInterval);
      if (ticker) ticker.style.display = 'none';
      hideEl('auditLoadingState');
      if (auditBtn) auditBtn.disabled = false;
      showError('Connection Error', 'Could not communicate with the stream audit service. Please verify your internet connection.');
    }
  }

  // ─────────────────────────────────────────────
  // 5. Render Audit Results
  // ─────────────────────────────────────────────
  function renderAuditResults(audit) {
    if (!audit) return;

    const streamData = audit.data || {};
    const jewelsList = streamData.jewels || [];
    const totals = streamData.totals || {};

    const vid = audit.vid;
    const title = audit.title;
    const channel = audit.channel;
    const thumb = audit.thumbnail || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

    // 1. Stream Header Bar
    const thumbEl = document.getElementById('resStreamThumb');
    if (thumbEl) {
      thumbEl.src = thumb;
      thumbEl.onerror = () => { thumbEl.src = 'https://tubemetrix.net/og-image.png'; };
    }
    setElText('resStreamTitle', title);
    setElText('resStreamId', `ID: ${vid}`);
    setElText('resStreamChannel', channel);
    const linkEl = document.getElementById('resStreamLink');
    if (linkEl) {
      linkEl.href = `https://www.youtube.com/watch?v=${vid}`;
    }

    // 2. Calculate Totals
    let totalJewels = 0;
    let totalGiftsComboed = 0;

    jewelsList.forEach(j => {
      totalJewels += (j.jewels || 0);
      totalGiftsComboed += (j.quantity || 1);
    });

    if (totals.jewels_count && totals.jewels_count > totalJewels) {
      totalJewels = totals.jewels_count;
    }

    const rubies = totalJewels / 2;
    const creatorUsd = rubies * 0.01;
    const creatorInr = creatorUsd * usdToInrRate;

    // Donors & supporters set
    const uniqueDonorsSet = new Set();
    jewelsList.forEach(j => {
      if (j.author) uniqueDonorsSet.add(j.author);
    });
    const donorsCount = uniqueDonorsSet.size;

    // Superchat / Horizontal metrics
    const scCount = totals.superchat_count || (streamData.superchats ? streamData.superchats.length : 0);
    const scInr = totals.superchat_inr || (streamData.superchats ? streamData.superchats.reduce((s, c) => s + (c.amount_inr || 0), 0) : 0);
    const memCount = totals.memberships_count || (streamData.memberships ? streamData.memberships.length : 0);
    const memInr = totals.memberships_inr || (streamData.memberships ? streamData.memberships.reduce((s, m) => s + (m.price_inr || 0), 0) : 0);
    const grossInr = totals.gross_inr || (scInr + memInr);
    const netInr = totals.net_creator_inr || (grossInr * 0.70);

    const kpiBanner = document.getElementById('resKpiBanner');
    const formatBadge = document.getElementById('resFormatBadge');
    const horizNotice = document.getElementById('resHorizontalNotice');
    const zeroNotice = document.getElementById('resZeroAllNotice');
    const giftsSection = document.getElementById('resGiftsTableSection');
    const lbSection = document.getElementById('resLeaderboardSection');

    // ──────────────────────────────────────────────────────────
    // CASE A: Stream received YouTube Jewels (> 0 Jewels)
    // ──────────────────────────────────────────────────────────
    if (totalJewels > 0) {
      if (formatBadge) {
        formatBadge.style.display = 'inline-block';
        formatBadge.className = 'pill-badge pill-purple';
        formatBadge.textContent = 'Vertical Stream Gifts';
      }
      if (horizNotice) horizNotice.style.display = 'none';
      if (zeroNotice) zeroNotice.style.display = 'none';
      if (giftsSection) giftsSection.style.display = 'block';
      if (lbSection) lbSection.style.display = 'block';

      if (kpiBanner) {
        kpiBanner.innerHTML = `
          <div class="kpi-card highlight">
            <span class="kpi-badge">Net Creator Earnings</span>
            <div class="kpi-amount" style="color: #10b981;">₹${Math.round(creatorInr).toLocaleString()}</div>
            <span class="kpi-sub">approx. $${creatorUsd.toFixed(2)} USD (at ₹${usdToInrRate.toFixed(2)}/USD)</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Total Jewels</span>
              <span class="pill-badge pill-purple">Gifts Sent</span>
            </div>
            <div class="kpi-value">${totalJewels.toLocaleString()}</div>
            <span class="kpi-note">${totalGiftsComboed.toLocaleString()} virtual gifts received</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Rubies Earned</span>
              <span class="pill-badge pill-red">2:1 Ratio</span>
            </div>
            <div class="kpi-value">${rubies.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
            <span class="kpi-note">$0.01 USD payout per Ruby</span>
          </div>

          <div class="kpi-card">
            <div class="kpi-top">
              <span class="kpi-title">Gifts &amp; Supporters</span>
              <span class="pill-badge pill-amber">Backers</span>
            </div>
            <div class="kpi-value">${totalGiftsComboed.toLocaleString()}</div>
            <span class="kpi-note">from ${donorsCount.toLocaleString()} unique supporter${donorsCount === 1 ? '' : 's'}</span>
          </div>
        `;
      }

      // Aggregate Itemized Gifts
      const giftMap = {};
      jewelsList.forEach(j => {
        const name = j.gift_name || 'Virtual Gift';
        if (!giftMap[name]) {
          giftMap[name] = {
            name: name,
            quantity: 0,
            jewelsTotal: 0,
            icon: getGiftIcon(name)
          };
        }
        giftMap[name].quantity += (j.quantity || 1);
        giftMap[name].jewelsTotal += (j.jewels || 0);
      });

      const aggregatedGifts = Object.values(giftMap).sort((a, b) => b.jewelsTotal - a.jewelsTotal);
      renderGiftsTable(aggregatedGifts);

      // Aggregate Top Gifters Leaderboard
      const donorMap = {};
      jewelsList.forEach(j => {
        const author = j.author || 'Anonymous Supporter';
        if (!donorMap[author]) {
          donorMap[author] = {
            name: author,
            jewelsTotal: 0,
            giftsCount: 0
          };
        }
        donorMap[author].jewelsTotal += (j.jewels || 0);
        donorMap[author].giftsCount += (j.quantity || 1);
      });

      const topGifters = Object.values(donorMap).sort((a, b) => b.jewelsTotal - a.jewelsTotal);
      renderLeaderboard(topGifters);

    } else {
      // ──────────────────────────────────────────────────────────
      // CASE B: 0 Jewels Detected (e.g. Horizontal Stream with Superchats)
      // ──────────────────────────────────────────────────────────
      if (formatBadge) {
        formatBadge.style.display = 'inline-block';
        formatBadge.className = 'pill-badge pill-amber';
        formatBadge.textContent = 'Horizontal Broadcast';
      }
      if (giftsSection) giftsSection.style.display = 'none';
      if (lbSection) lbSection.style.display = 'none';

      if (grossInr > 0 || scCount > 0 || memCount > 0) {
        // Horizontal stream WITH Superchats / Memberships
        if (horizNotice) {
          horizNotice.style.display = 'block';
          const horizAuditBtn = document.getElementById('resHorizontalAuditBtn');
          if (horizAuditBtn) {
            horizAuditBtn.href = `/?stream=${vid}`;
            horizAuditBtn.innerHTML = `<span>View Full Super Chat Audit (₹${Math.round(grossInr).toLocaleString()})</span> ➔`;
          }
        }
        if (zeroNotice) zeroNotice.style.display = 'none';

        if (kpiBanner) {
          kpiBanner.innerHTML = `
            <div class="kpi-card highlight">
              <span class="kpi-badge">Net Creator Take</span>
              <div class="kpi-amount" style="color: #10b981;">₹${Math.round(netInr).toLocaleString()}</div>
              <span class="kpi-sub">approx. $${(netInr / usdToInrRate).toFixed(2)} USD (70% net split)</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-title">Super Chats</span>
                <span class="pill-badge pill-green">${scCount} Donated</span>
              </div>
              <div class="kpi-value" style="color: #10b981;">₹${Math.round(scInr).toLocaleString()}</div>
              <span class="kpi-note">${scCount} Super Chats in chat replay</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-title">Memberships</span>
                <span class="pill-badge pill-purple">${memCount} Members</span>
              </div>
              <div class="kpi-value" style="color: #8b5cf6;">₹${Math.round(memInr).toLocaleString()}</div>
              <span class="kpi-note">${memCount} new joins &amp; milestones</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-title">YouTube Jewels</span>
                <span class="pill-badge pill-amber">Vertical Only</span>
              </div>
              <div class="kpi-value" style="color: var(--text-muted);">0</div>
              <span class="kpi-note">Exclusive to Shorts mobile feed</span>
            </div>
          `;
        }

      } else {
        // Stream had 0 jewels AND 0 superchats
        if (horizNotice) horizNotice.style.display = 'none';
        if (zeroNotice) zeroNotice.style.display = 'block';

        if (kpiBanner) {
          kpiBanner.innerHTML = `
            <div class="kpi-card highlight">
              <span class="kpi-badge">Chat Replay Status</span>
              <div class="kpi-amount" style="color: var(--text-primary); font-size: 1.35rem;">Chat Scanned</div>
              <span class="kpi-sub">0 donations or gifts recorded</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-title">YouTube Jewels</span>
                <span class="pill-badge pill-purple">Vertical</span>
              </div>
              <div class="kpi-value" style="color: var(--text-muted);">0</div>
              <span class="kpi-note">No gifts comboed</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-title">Super Chats</span>
                <span class="pill-badge pill-amber">0</span>
              </div>
              <div class="kpi-value" style="color: var(--text-muted);">₹0</div>
              <span class="kpi-note">0 Super Chats</span>
            </div>

            <div class="kpi-card">
              <div class="kpi-top">
                <span class="kpi-title">Memberships</span>
                <span class="pill-badge pill-amber">0</span>
              </div>
              <div class="kpi-value" style="color: var(--text-muted);">₹0</div>
              <span class="kpi-note">0 joins in replay</span>
            </div>
          `;
        }
      }
    }

    // Reveal results and smoothly scroll
    showEl('auditResultsContainer');
    const container = document.getElementById('auditResultsContainer');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function renderGiftsTable(gifts) {
    const tbody = document.getElementById('resGiftsTableBody');
    if (!tbody) return;

    if (!gifts || gifts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">No gift breakdown available.</td></tr>`;
      return;
    }

    tbody.innerHTML = gifts.map(g => {
      const jewelsPerUnit = g.quantity > 0 ? Math.round(g.jewelsTotal / g.quantity) : g.jewelsTotal;
      const viewerSpend = g.jewelsTotal * INR_PER_JEWEL_VIEWER;
      const rubies = g.jewelsTotal / 2;
      const creatorUsd = rubies * 0.01;
      const creatorInr = creatorUsd * usdToInrRate;

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="gift-icon-bubble" style="font-size: 1.3rem;">${g.icon}</span>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(g.name)}</strong>
            </div>
          </td>
          <td><strong style="color: var(--text-primary);">${g.quantity.toLocaleString()}</strong></td>
          <td style="font-family: 'JetBrains Mono', monospace; font-size: 0.88rem;">${jewelsPerUnit.toLocaleString()} Jewels</td>
          <td><strong style="color: #8b5cf6;">${g.jewelsTotal.toLocaleString()} Jewels</strong></td>
          <td style="color: var(--text-secondary); font-size: 0.88rem;">~₹${Math.round(viewerSpend).toLocaleString()}</td>
          <td>
            <strong style="color: #10b981;">₹${Math.round(creatorInr).toLocaleString()}</strong>
            <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 4px;">($${creatorUsd.toFixed(2)})</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderLeaderboard(donors) {
    const tbody = document.getElementById('resLeaderboardBody');
    if (!tbody) return;

    if (!donors || donors.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No supporter data available.</td></tr>`;
      return;
    }

    tbody.innerHTML = donors.slice(0, 15).map((d, index) => {
      const rank = index + 1;
      let medalClass = 'rank-medal-other';
      let medalIcon = `${rank}`;
      if (rank === 1) { medalClass = 'rank-medal-1'; medalIcon = '🥇'; }
      else if (rank === 2) { medalClass = 'rank-medal-2'; medalIcon = '🥈'; }
      else if (rank === 3) { medalClass = 'rank-medal-3'; medalIcon = '🥉'; }

      const rubies = d.jewelsTotal / 2;
      const creatorUsd = rubies * 0.01;
      const creatorInr = creatorUsd * usdToInrRate;

      return `
        <tr>
          <td><span class="rank-medal-badge ${medalClass}">${medalIcon}</span></td>
          <td><strong style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(d.name)}</strong></td>
          <td><strong style="color: #8b5cf6;">${d.jewelsTotal.toLocaleString()} Jewels</strong></td>
          <td style="color: var(--text-secondary);">${d.giftsCount.toLocaleString()} gift${d.giftsCount === 1 ? '' : 's'}</td>
          <td>
            <strong style="color: #10b981;">~₹${Math.round(creatorInr).toLocaleString()}</strong>
            <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 4px;">($${creatorUsd.toFixed(2)})</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ─────────────────────────────────────────────
  // 6. Demo Stream Loader
  // ─────────────────────────────────────────────
  function loadDemoStream() {
    const input = document.getElementById('auditStreamUrlInput');
    if (input) input.value = 'https://www.youtube.com/watch?v=demo_vertical_stream';

    hideEl('auditErrorBanner');
    hideEl('auditErrorState');
    hideEl('auditResultsContainer');

    const ticker = document.getElementById('auditStatusTicker');
    const statusMsg = document.getElementById('auditStatusMsg');
    const statusPct = document.getElementById('auditStatusPct');
    const progressBar = document.getElementById('auditProgressBar');
    if (ticker) ticker.style.display = 'block';
    if (statusMsg) statusMsg.textContent = 'Loading realistic YouTube vertical stream sample data...';
    if (statusPct) statusPct.textContent = '85%';
    if (progressBar) progressBar.style.width = '85%';

    setTimeout(() => {
      if (ticker) ticker.style.display = 'none';
      hideEl('auditLoadingState');

      currentAuditData = {
        vid: 'Mortal_BGMI_Live',
        title: '🔴 BGMI Custom Rooms Championship (Vertical Mobile Stream) • YouTube Jewels Special',
        channel: 'Mortal (7.1M Subscribers)',
        thumbnail: 'https://tubemetrix.net/og-image.png',
        data: {
          jewels: [
            { gift_name: 'Panipuri', author: 'Rohan Sharma', quantity: 6, jewels: 60, inr_value: 25.2 },
            { gift_name: 'Panipuri', author: 'Simran_Gamer', quantity: 9, jewels: 90, inr_value: 37.8 },
            { gift_name: 'Samosa', author: 'GamingWithAman', quantity: 8, jewels: 200, inr_value: 84.0 },
            { gift_name: 'Masala Chai', author: 'Sneha_07', quantity: 6, jewels: 300, inr_value: 126.0 },
            { gift_name: 'Mic Drop', author: 'Vikram Rathore', quantity: 4, jewels: 400, inr_value: 168.0 },
            { gift_name: 'Heart Fireworks', author: 'Pooja_Sharma', quantity: 3, jewels: 750, inr_value: 315.0 },
            { gift_name: 'Royal Crown', author: 'MegaFan_Rishi', quantity: 1, jewels: 1000, inr_value: 420.0 },
            { gift_name: 'Golden Castle', author: 'Vipul_VIP', quantity: 1, jewels: 5000, inr_value: 2100.0 }
          ],
          totals: {
            jewels_count: 7800,
            jewels_inr: 3276.0
          }
        }
      };

      renderAuditResults(currentAuditData);
    }, 600);
  }

  // ─────────────────────────────────────────────
  // 7. Copy Summary & Export CSV
  // ─────────────────────────────────────────────
  async function copyAuditSummary() {
    if (!currentAuditData) return;

    const streamData = currentAuditData.data || {};
    const jewelsList = streamData.jewels || [];
    const totals = streamData.totals || {};

    let totalJewels = 0;
    let giftsCount = 0;
    jewelsList.forEach(j => {
      totalJewels += (j.jewels || 0);
      giftsCount += (j.quantity || 1);
    });
    if (totals?.jewels_count && totals.jewels_count > totalJewels) {
      totalJewels = totals.jewels_count;
    }

    const rubies = totalJewels / 2;
    const usd = rubies * 0.01;
    const inr = usd * usdToInrRate;

    const lines = [
      `TubeMetrix — YouTube Live Stream Audit Report`,
      `Stream Title: ${currentAuditData.title}`,
      `Stream ID   : https://www.youtube.com/watch?v=${currentAuditData.vid}`,
      `Channel     : ${currentAuditData.channel}`,
      `----------------------------------------`
    ];

    if (totalJewels > 0) {
      lines.push(
        `💎 Total Jewels Received: ${totalJewels.toLocaleString()} Jewels`,
        `🔴 Rubies Earned (2:1)  : ${rubies.toLocaleString()} Rubies`,
        `💰 Net Creator Take     : ₹${Math.round(inr).toLocaleString()} INR ($${usd.toFixed(2)} USD)`,
        `🎁 Gifts Comboed Count  : ${giftsCount.toLocaleString()} gifts`
      );
    } else {
      lines.push(
        `🔴 Stream Format        : Horizontal Broadcast (0 Jewels)`,
        `💬 Super Chats Received : ₹${Math.round(totals.superchat_inr || 0).toLocaleString()} INR (${totals.superchat_count || 0} Super Chats)`,
        `⭐ Memberships Revenue  : ₹${Math.round(totals.memberships_inr || 0).toLocaleString()} INR (${totals.memberships_count || 0} Members)`,
        `💰 Net Creator Take     : ₹${Math.round(totals.net_creator_inr || 0).toLocaleString()} INR`
      );
    }

    lines.push(
      `----------------------------------------`,
      `Audited free & instant at https://tubemetrix.net/youtube-jewels-calculator`
    );

    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      const btnText = document.getElementById('copySummaryBtnText');
      if (btnText) {
        const orig = btnText.textContent;
        btnText.textContent = '✅ Copied to Clipboard!';
        setTimeout(() => { btnText.textContent = orig; }, 2200);
      }
    } catch (e) {
      alert(text);
    }
  }

  function downloadAuditCsv() {
    if (!currentAuditData) return;

    const streamData = currentAuditData.data || {};
    const jewelsList = streamData.jewels || [];

    if (jewelsList.length > 0) {
      const headers = ['Gift Name', 'Supporter / Author', 'Quantity Comboed', 'Jewels Total', 'Net Creator INR', 'Net Creator USD'];
      const rows = jewelsList.map(j => {
        const rubies = (j.jewels || 0) / 2;
        const usd = rubies * 0.01;
        const inr = usd * usdToInrRate;
        return [
          `"${(j.gift_name || '').replace(/"/g, '""')}"`,
          `"${(j.author || 'Anonymous').replace(/"/g, '""')}"`,
          j.quantity || 1,
          j.jewels || 0,
          Math.round(inr),
          usd.toFixed(2)
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      triggerDownload(csvContent, `tubemetrix-jewels-audit-${currentAuditData.vid}.csv`);
    } else {
      // Export superchats if horizontal stream
      const superchats = streamData.superchats || [];
      const headers = ['Super Chat ID', 'Author', 'Amount', 'Currency', 'Amount INR', 'Time', 'Message'];
      const rows = superchats.map(s => [
        `"${s.id || ''}"`,
        `"${(s.author || '').replace(/"/g, '""')}"`,
        s.amount || 0,
        `"${s.currency || 'INR'}"`,
        s.amount_inr || 0,
        `"${s.time || ''}"`,
        `"${(s.message || '').replace(/"/g, '""')}"`
      ].join(','));

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      triggerDownload(csvContent, `tubemetrix-stream-audit-${currentAuditData.vid}.csv`);
    }
  }

  function triggerDownload(content, filename) {
    const encodedUri = encodeURI(content);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ─────────────────────────────────────────────
  // 8. URL Param Check (e.g. ?stream=VID)
  // ─────────────────────────────────────────────
  function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const streamParam = urlParams.get('stream') || urlParams.get('v') || urlParams.get('video_id');
    if (streamParam) {
      const input = document.getElementById('auditStreamUrlInput');
      if (input) {
        input.value = `https://www.youtube.com/watch?v=${streamParam}`;
        executeStreamAudit();
      }
    }
  }

  // ─────────────────────────────────────────────
  // Helper Utilities
  // ─────────────────────────────────────────────
  function extractVideoId(input) {
    if (!input) return null;
    const clean = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = clean.match(regExp);
    return match ? match[1] : null;
  }

  function getGiftIcon(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('panipuri') || n.includes('pani puri') || n.includes('golgappa')) return '🍲';
    if (n.includes('samosa')) return '🥟';
    if (n.includes('chai') || n.includes('tea')) return '☕';
    if (n.includes('mic drop') || n.includes('mic')) return '🎤';
    if (n.includes('heart') || n.includes('firework')) return '💖';
    if (n.includes('crown') || n.includes('royal')) return '👑';
    if (n.includes('castle')) return '🏰';
    if (n.includes('galaxy')) return '🌌';
    if (n.includes('rocket')) return '🚀';
    if (n.includes('fire') || n.includes('flame')) return '🔥';
    if (n.includes('diamond') || n.includes('gem')) return '💎';
    return '🎁';
  }

  function showError(title, msg) {
    const banner = document.getElementById('auditErrorBanner');
    const msgEl = document.getElementById('auditErrorMessage');
    if (msgEl) msgEl.textContent = msg ? `${title}: ${msg}` : title;
    if (banner) banner.style.display = 'flex';

    setElText('auditErrorTitle', title);
    setElText('auditErrorMsg', msg);
    showEl('auditErrorState');
  }

  function setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showEl(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'block';
  }

  function hideEl(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
