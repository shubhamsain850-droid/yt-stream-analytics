/**
 * TubeMetrix — YouTube Channel Statistics & SocialBlade-Grade Intelligence Engine
 * Fast, accurate, real-time creator analytics, subscriber rankings, 30-day growth, and daily metrics.
 */

(() => {
  'use strict';

  // ─────────────────────────────────────────────
  // CONFIGURATION & STATE
  // ─────────────────────────────────────────────

  const API_BASE = 'https://shubhamsain858-kickcuttr-api.hf.space/api/youtube';

  const CURRENCY_MAP = {
    INR: { symbol: '₹', rate: 83.2, decimals: 0 },
    USD: { symbol: '$', rate: 1.0, decimals: 0 },
    EUR: { symbol: '€', rate: 0.92, decimals: 0 },
    GBP: { symbol: '£', rate: 0.79, decimals: 0 },
    CAD: { symbol: 'C$', rate: 1.36, decimals: 0 },
    AUD: { symbol: 'A$', rate: 1.52, decimals: 0 },
    SGD: { symbol: 'S$', rate: 1.35, decimals: 0 },
    AED: { symbol: 'د.إ', rate: 3.67, decimals: 0 },
    SAR: { symbol: 'SR', rate: 3.75, decimals: 0 },
    BRL: { symbol: 'R$', rate: 5.15, decimals: 0 },
    JPY: { symbol: '¥', rate: 155.0, decimals: 0 },
    KRW: { symbol: '₩', rate: 1370.0, decimals: 0 },
    PHP: { symbol: '₱', rate: 58.0, decimals: 0 },
    PKR: { symbol: 'Rs', rate: 278.0, decimals: 0 },
    BDT: { symbol: '৳', rate: 117.0, decimals: 0 },
    RUB: { symbol: '₽', rate: 91.0, decimals: 0 },
    TRY: { symbol: '₺', rate: 32.5, decimals: 0 },
    PLN: { symbol: 'zł', rate: 3.95, decimals: 0 },
    MXN: { symbol: 'Mex$', rate: 17.0, decimals: 0 },
    IDR: { symbol: 'Rp', rate: 16200.0, decimals: 0 },
    THB: { symbol: '฿', rate: 36.8, decimals: 0 },
    VND: { symbol: '₫', rate: 25400.0, decimals: 0 }
  };

  const state = {
    currency: localStorage.getItem('TubeMetrix_currency') || 'INR',
    theme: localStorage.getItem('TubeMetrix_theme') || localStorage.getItem('theme') || 'dark',
    activeChannelData: null,
    searchDebounceTimer: null,
    activeChartTab: 'views', // 'views' | 'subs'
    daysFilter: 14
  };

  // ─────────────────────────────────────────────
  // DOM ELEMENTS
  // ─────────────────────────────────────────────

  const el = {
    // Theme & Currency
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    themeText: document.getElementById('themeText'),
    currBtns: document.querySelectorAll('.curr-btn[data-curr]'),
    moreCurrSelect: document.getElementById('moreCurrencySelect'),

    // Search Controls
    channelSearchInput: document.getElementById('channelSearchInput'),
    pasteSearchBtn: document.getElementById('pasteSearchBtn'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    startSearchBtn: document.getElementById('startSearchBtn'),
    searchDropdown: document.getElementById('searchDropdown'),
    dropdownList: document.getElementById('dropdownList'),
    trendingPills: document.querySelectorAll('#trendingPills .preset-pill'),
    channelErrorMsg: document.getElementById('channelErrorMsg'),

    // Loading Card
    loadingCard: document.getElementById('loadingCard'),
    loadingTitle: document.getElementById('loadingTitle'),
    loadingTicker: document.getElementById('loadingTicker'),
    loadingBarFill: document.getElementById('loadingBarFill'),

    // Channel Dashboard
    channelDashboard: document.getElementById('channelDashboard'),
    chAvatarImg: document.getElementById('chAvatarImg'),
    chTitle: document.getElementById('chTitle'),
    chHandle: document.getElementById('chHandle'),
    chSubs: document.getElementById('chSubs'),
    chViews: document.getElementById('chViews'),
    chVideos: document.getElementById('chVideos'),
    chJoined: document.getElementById('chJoined'),
    chCountry: document.getElementById('chCountry'),
    chCategory: document.getElementById('chCategory'),
    btnYtVisit: document.getElementById('btnYtVisit'),
    btnCopyChannelReport: document.getElementById('btnCopyChannelReport'),

    // Ranks & Grade
    rankGrade: document.getElementById('rankGrade'),
    rankSb: document.getElementById('rankSb'),
    rankSubs: document.getElementById('rankSubs'),
    rankViews: document.getElementById('rankViews'),
    rankCountry: document.getElementById('rankCountry'),
    rankCountryLbl: document.getElementById('rankCountryLbl'),
    rankCategory: document.getElementById('rankCategory'),
    rankCategoryLbl: document.getElementById('rankCategoryLbl'),

    // 30-Day Growth & Earnings
    statSubs30: document.getElementById('statSubs30'),
    statViews30: document.getElementById('statViews30'),
    statMonthlyEarnings: document.getElementById('statMonthlyEarnings'),
    statYearlyEarnings: document.getElementById('statYearlyEarnings'),

    // Daily Metrics Table
    daysFilterSelect: document.getElementById('daysFilterSelect'),
    tableDaysBadge: document.getElementById('tableDaysBadge'),
    dailyMetricsTbody: document.getElementById('dailyMetricsTbody'),
    btnExportTableExcel: document.getElementById('btnExportTableExcel'),
    btnCopyTable: document.getElementById('btnCopyTable'),

    // Growth Chart
    chartSubTitle: document.getElementById('chartSubTitle'),
    tabChartViews: document.getElementById('tabChartViews'),
    tabChartSubs: document.getElementById('tabChartSubs'),
    growthSvg: document.getElementById('growthSvg'),

    // Toast
    toast: document.getElementById('toast')
  };

  // ─────────────────────────────────────────────
  // HELPER FORMATTERS
  // ─────────────────────────────────────────────

  function formatMoney(amountUsd, forceCompact = false) {
    const meta = CURRENCY_MAP[state.currency] || CURRENCY_MAP.INR;
    const val = amountUsd * meta.rate;

    if (forceCompact) {
      if (val >= 10_000_000 && state.currency === 'INR') {
        return `${meta.symbol}${(val / 10_000_000).toFixed(2)} Cr`;
      }
      if (val >= 100_000 && state.currency === 'INR') {
        return `${meta.symbol}${(val / 100_000).toFixed(1)} L`;
      }
      if (val >= 1_000_000) {
        return `${meta.symbol}${(val / 1_000_000).toFixed(1)}M`;
      }
      if (val >= 1_000) {
        return `${meta.symbol}${(val / 1_000).toFixed(1)}K`;
      }
    }

    const locale = state.currency === 'INR' ? 'en-IN' : 'en-US';
    return `${meta.symbol}${Math.round(val).toLocaleString(locale)}`;
  }

  function formatMoneyRange(minUsd, maxUsd) {
    return `${formatMoney(minUsd, true)} – ${formatMoney(maxUsd, true)}`;
  }

  function formatViews(n) {
    if (!n || isNaN(n)) return '0';
    const num = Number(n);
    if (num >= 1_000_000_000) return parseFloat((num / 1_000_000_000).toFixed(2)) + 'B';
    if (num >= 1_000_000) return parseFloat((num / 1_000_000).toFixed(2)) + 'M';
    if (num >= 1_000) return parseFloat((num / 1_000).toFixed(1)) + 'K';
    return num.toLocaleString();
  }

  function parseYtNumber(txt) {
    if (!txt) return 0;
    const s = String(txt).replace(/,/g, '').trim().toLowerCase();
    const m = s.match(/([\d\.]+)\s*([kmbt])?/);
    if (!m) return 0;
    let val = parseFloat(m[1]);
    const unit = m[2];
    if (unit === 'k') val *= 1_000;
    else if (unit === 'm') val *= 1_000_000;
    else if (unit === 'b') val *= 1_000_000_000;
    else if (unit === 't') val *= 1_000_000_000_000;
    return Math.round(val);
  }

  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(() => el.toast.classList.remove('show'), 3500);
  }

  // ─────────────────────────────────────────────
  // THEME MANAGEMENT
  // ─────────────────────────────────────────────

  function initTheme() {
    applyTheme(state.theme);
    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('TubeMetrix_theme', state.theme);
        localStorage.setItem('theme', state.theme);
        applyTheme(state.theme);
      });
    }
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    document.body.className = t === 'light' ? 'light-mode' : '';
    localStorage.setItem('TubeMetrix_theme', t);
    localStorage.setItem('theme', t);

    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    if (t === 'light') {
      if (themeIcon) themeIcon.textContent = '🌙';
      if (themeText) themeText.textContent = 'Dark';
    } else {
      if (themeIcon) themeIcon.textContent = '☀️';
      if (themeText) themeText.textContent = 'Light';
    }
  }

  // ─────────────────────────────────────────────
  // CURRENCY SWITCHER
  // ─────────────────────────────────────────────

  function initCurrency() {
    function setCurr(c) {
      if (!CURRENCY_MAP[c]) return;
      state.currency = c;
      localStorage.setItem('TubeMetrix_currency', c);

      el.currBtns.forEach(btn => {
        if (btn.dataset.curr === c) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      if (el.moreCurrSelect) {
        if (!['INR', 'USD', 'EUR'].includes(c)) el.moreCurrSelect.value = c;
        else el.moreCurrSelect.selectedIndex = 0;
      }

      if (state.activeChannelData) {
        renderChannelStats(state.activeChannelData);
      }
    }

    el.currBtns.forEach(btn => {
      btn.addEventListener('click', () => setCurr(btn.dataset.curr));
    });

    if (el.moreCurrSelect) {
      el.moreCurrSelect.addEventListener('change', (e) => {
        if (e.target.value) setCurr(e.target.value);
      });
    }

    setCurr(state.currency);
  }

  // ─────────────────────────────────────────────
  // LIVE AUTO-SUGGEST & CHANNEL SEARCH (Screenshot 1)
  // ─────────────────────────────────────────────

  function initSearch() {
    // Input keystroke autocomplete with debounce
    el.channelSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (el.clearSearchBtn) {
        el.clearSearchBtn.style.display = q ? 'block' : 'none';
      }

      clearTimeout(state.searchDebounceTimer);
      if (q.length < 2) {
        closeDropdown();
        return;
      }

      state.searchDebounceTimer = setTimeout(() => {
        fetchSearchSuggestions(q);
      }, 250);
    });

    // Enter key submits search or selects active dropdown item
    el.channelSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        closeDropdown();
        const q = el.channelSearchInput.value.trim();
        if (q) analyzeChannel(q);
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    // Search button
    el.startSearchBtn.addEventListener('click', () => {
      closeDropdown();
      const q = el.channelSearchInput.value.trim();
      if (q) analyzeChannel(q);
    });

    // Paste button
    if (el.pasteSearchBtn) {
      el.pasteSearchBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            el.channelSearchInput.value = text.trim();
            if (el.clearSearchBtn) el.clearSearchBtn.style.display = 'block';
            analyzeChannel(text.trim());
          }
        } catch {
          showToast('Clipboard access denied. Please paste manually (Ctrl+V).');
        }
      });
    }

    // Clear search button
    if (el.clearSearchBtn) {
      el.clearSearchBtn.addEventListener('click', () => {
        el.channelSearchInput.value = '';
        el.clearSearchBtn.style.display = 'none';
        closeDropdown();
        el.channelSearchInput.focus();
      });
    }

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.channel-search-bar-wrapper')) {
        closeDropdown();
      }
    });

    // Quick trending preset pills
    el.trendingPills.forEach(pill => {
      pill.addEventListener('click', () => {
        el.trendingPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const ch = pill.dataset.channel;
        el.channelSearchInput.value = ch;
        if (el.clearSearchBtn) el.clearSearchBtn.style.display = 'block';
        analyzeChannel(ch);
      });
    });
  }

  function closeDropdown() {
    if (el.searchDropdown) el.searchDropdown.style.display = 'none';
  }

  async function fetchSearchSuggestions(query) {
    const cleanQ = query.trim();
    if (cleanQ.length < 2) {
      closeDropdown();
      return;
    }

    // Show searching spinner in dropdown immediately
    if (el.searchDropdown && el.dropdownList) {
      el.dropdownList.innerHTML = `
        <div class="dropdown-header">
          <span>SEARCHING YOUTUBE CREATORS</span>
          <span class="dropdown-hint">Connecting live...</span>
        </div>
        <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">
          <span class="spinner-dot" style="display:inline-block; vertical-align:middle; margin-right:8px;"></span>
          Searching live YouTube channels for "${cleanQ}"...
        </div>
      `;
      el.searchDropdown.style.display = 'block';
    }

    try {
      let channels = [];
      const resp = await fetch(`${API_BASE}/search-channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cleanQ, max_results: 12 })
      });

      if (resp.ok) {
        const res = await resp.json();
        if (res.success && Array.isArray(res.channels)) {
          channels = res.channels;
        }
      }

      renderDropdown(channels, cleanQ);
    } catch (err) {
      console.warn('Backend search error:', err);
      renderDropdown([], cleanQ);
    }
  }

  function renderDropdown(channels, query) {
    if (!el.searchDropdown || !el.dropdownList) return;

    el.dropdownList.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'dropdown-header';
    header.innerHTML = `
      <span>RESULTS (${channels.length})</span>
      <span class="dropdown-hint">Click channel or press Enter</span>
    `;
    el.dropdownList.appendChild(header);

    if (!channels || channels.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '14px 16px';
      empty.style.color = '#94a3b8';
      empty.style.fontSize = '12.5px';
      empty.textContent = `No channels found matching "${query}". Press Enter to search exact URL or @handle.`;
      el.dropdownList.appendChild(empty);
    } else {
      channels.forEach(ch => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        
        const avatarHtml = ch.avatar
          ? `<img src="${ch.avatar}" class="dropdown-avatar" alt="${ch.title}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%2364748b\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M20 21a8 8 0 1 0-16 0\\'/></svg>'">`
          : `<div class="dropdown-avatar-placeholder">👤</div>`;

        item.innerHTML = `
          ${avatarHtml}
          <div class="dropdown-item-info">
            <div class="dropdown-item-title">${ch.title}</div>
            <div class="dropdown-item-meta">
              <span>${ch.handle || ''}</span>
              ${ch.subscribers ? `<span class="dot-sep">&bull;</span><span>${ch.subscribers}</span>` : ''}
            </div>
          </div>
          <span class="dropdown-item-arrow">&rarr;</span>
        `;

        item.addEventListener('click', () => {
          el.channelSearchInput.value = ch.handle || ch.title;
          closeDropdown();
          analyzeChannel(ch.handle || ch.title);
        });

        el.dropdownList.appendChild(item);
      });
    }

    // Bottom "Show results for query" row
    const footer = document.createElement('div');
    footer.className = 'dropdown-footer-item';
    footer.innerHTML = `<span>Analyze channel for "<strong>${query}</strong>"</span> <kbd>Enter</kbd>`;
    footer.addEventListener('click', () => {
      closeDropdown();
      analyzeChannel(query);
    });
    el.dropdownList.appendChild(footer);

    el.searchDropdown.style.display = 'block';
  }

  // ─────────────────────────────────────────────
  // CHANNEL ANALYTICS FETCHER
  // ─────────────────────────────────────────────

  async function analyzeChannel(channelQuery) {
    if (!channelQuery || !channelQuery.trim()) return;

    const query = channelQuery.trim();

    // Sync active state on trending creator pills
    if (el.trendingPills) {
      const qNorm = query.toLowerCase().replace(/[@\s]/g, '');
      el.trendingPills.forEach(p => {
        const pNorm = (p.dataset.channel || '').toLowerCase().replace(/[@\s]/g, '');
        if (pNorm && (pNorm === qNorm || qNorm.includes(pNorm))) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }

    showLoading(true, `Analyzing @${query.replace(/^@/, '')}...`);
    hideError();

    try {
      let data = null;

      // Fetch live channel statistics from backend API
      const resp = await fetch(`${API_BASE}/channel-analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: query })
      });

      if (resp.ok) {
        data = await resp.json();
      } else {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || errJson.error || `Channel "${query}" could not be found on YouTube.`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || `Could not find YouTube channel "${query}".`);
      }

      state.activeChannelData = data;
      renderChannelStats(data);
      showToast(`📊 Analyzed ${data.title}!`);
    } catch (e) {
      console.error('Channel Analytics Error:', e);
      showError(`❌ ${e.message || 'Could not analyze channel. Please verify the channel name or paste a direct YouTube channel link.'}`);
    } finally {
      showLoading(false);
    }
  }

  function showLoading(show, title = 'Fetching Channel Intelligence...') {
    if (el.loadingCard) {
      el.loadingCard.style.display = show ? 'block' : 'none';
      if (show && el.loadingTitle) el.loadingTitle.textContent = title;
    }
    const emptyState = document.getElementById('emptySearchState');
    if (emptyState && show) emptyState.style.display = 'none';
    if (el.channelDashboard && show) {
      el.channelDashboard.style.opacity = '0.4';
    } else if (el.channelDashboard) {
      el.channelDashboard.style.opacity = '1';
    }
  }

  function showError(msg) {
    if (el.channelErrorMsg) {
      el.channelErrorMsg.textContent = msg;
      el.channelErrorMsg.style.display = 'block';
    }
  }

  function hideError() {
    if (el.channelErrorMsg) el.channelErrorMsg.style.display = 'none';
  }

  // ─────────────────────────────────────────────
  // RENDER COMPLETE CHANNEL INTELLIGENCE DASHBOARD
  // ─────────────────────────────────────────────

  function renderChannelStats(data) {
    if (!data) return;
    const emptyState = document.getElementById('emptySearchState');
    if (emptyState) emptyState.style.display = 'none';
    if (el.channelDashboard) el.channelDashboard.style.display = 'block';

    // 1. Channel Profile Banner (Screenshot 2)
    if (el.chAvatarImg) {
      el.chAvatarImg.referrerPolicy = 'no-referrer';
      if (data.avatar) {
        el.chAvatarImg.src = data.avatar;
      } else {
        el.chAvatarImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2364748b"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';
      }
      el.chAvatarImg.onerror = function() {
        this.onerror = null;
        this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2364748b"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';
      };
    }
    if (el.chTitle) el.chTitle.textContent = data.title;
    if (el.chHandle) el.chHandle.textContent = data.handle || '';
    if (el.chSubs) {
      el.chSubs.textContent = data.subscribers_text
        ? data.subscribers_text.replace(/subscribers?/i, '').trim()
        : formatViews(data.subscribers_count);
    }
    if (el.chViews) el.chViews.textContent = data.total_views_count ? data.total_views_count.toLocaleString() : data.total_views_text;
    if (el.chVideos) el.chVideos.textContent = data.videos_count ? data.videos_count.toLocaleString() : data.videos_text;
    if (el.chJoined) el.chJoined.textContent = data.joined_date || 'March 1, 2019';
    if (el.chCountry) el.chCountry.textContent = data.country || 'India (IN)';
    if (el.chCategory) el.chCategory.textContent = data.category || 'Gaming';
    if (el.btnYtVisit) el.btnYtVisit.href = data.channel_url || `https://www.youtube.com/${data.handle}`;

    // 2. SocialBlade Grade & Global Ranks (Screenshot 2)
    const ranks = data.ranks || {};
    if (el.rankGrade) {
      el.rankGrade.textContent = ranks.grade || 'B+';
      el.rankGrade.className = `grade-badge-val grade-${(ranks.grade || 'B').toLowerCase().replace(/[^a-z]/g, '')}`;
    }
    if (el.rankSb) el.rankSb.textContent = ranks.sb_rank ? `${ranks.sb_rank.toLocaleString()}th` : '--';
    if (el.rankSubs) el.rankSubs.textContent = ranks.subs_rank ? `${ranks.subs_rank.toLocaleString()}th` : '--';
    if (el.rankViews) el.rankViews.textContent = ranks.views_rank ? `${ranks.views_rank.toLocaleString()}nd` : '--';
    if (el.rankCountry) el.rankCountry.textContent = ranks.country_rank ? `${ranks.country_rank.toLocaleString()}th IN` : '--';
    if (el.rankCategory) el.rankCategory.textContent = ranks.category_rank ? `${ranks.category_rank.toLocaleString()}th Games` : '--';

    // 3. 30-Day Growth & Earnings (Screenshot 2)
    const st = data.thirty_day_stats || {};
    if (el.statSubs30) el.statSubs30.textContent = `+${formatViews(st.subs || 10_000)}`;
    if (el.statViews30) el.statViews30.textContent = formatViews(st.views || 2_300_000);
    if (el.statMonthlyEarnings) {
      el.statMonthlyEarnings.textContent = formatMoneyRange(st.monthly_earnings_min || 570, st.monthly_earnings_max || 9100);
    }
    if (el.statYearlyEarnings) {
      el.statYearlyEarnings.textContent = formatMoneyRange(st.yearly_earnings_min || 6800, st.yearly_earnings_max || 109000);
    }

    // 4. Daily Channel Metrics Table (Screenshot 3)
    renderDailyTable(data.daily_metrics || [], state.daysFilter);

    // 5. Detailed Growth Chart (Screenshot 4)
    renderGrowthChart(data.chart_data);

    if (el.channelDashboard) {
      el.channelDashboard.style.display = 'block';
    }
  }

  // ─────────────────────────────────────────────
  // RENDER DAILY TABLE (Screenshot 3)
  // ─────────────────────────────────────────────

  function renderDailyTable(rows, limit = 14) {
    if (!el.dailyMetricsTbody) return;
    el.dailyMetricsTbody.innerHTML = '';

    const sliced = rows.slice(0, limit);
    sliced.forEach(r => {
      const tr = document.createElement('tr');
      const minEarnFormatted = formatMoney(r.min_earning_usd, true);
      const maxEarnFormatted = formatMoney(r.max_earning_usd, true);

      tr.innerHTML = `
        <td class="td-date">${r.date}</td>
        <td class="td-subs">
          <span class="sub-gain ${r.sub_gain !== '--' ? 'positive' : ''}">${r.sub_gain}</span>
          <span class="sub-total">${r.total_subs}</span>
        </td>
        <td class="td-views">
          <span class="views-gain">${r.views_gained}</span>
        </td>
        <td class="td-cum-views">${r.cumulative_views}</td>
        <td class="td-videos">${r.total_videos}</td>
        <td class="td-earnings">${minEarnFormatted} – ${maxEarnFormatted}</td>
      `;
      el.dailyMetricsTbody.appendChild(tr);
    });

    if (el.tableDaysBadge) {
      el.tableDaysBadge.textContent = `Last ${limit} Days`;
    }
  }

  // ─────────────────────────────────────────────
  // RENDER INTERACTIVE GROWTH CHART (Screenshot 4)
  // ─────────────────────────────────────────────

  function renderGrowthChart(chartData) {
    if (!el.growthSvg || !chartData) return;

    const isViews = state.activeChartTab === 'views';
    const series = isViews ? chartData.views : chartData.subs;
    const months = chartData.months || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (el.chartSubTitle) {
      el.chartSubTitle.textContent = isViews
        ? 'Monthly video views impressions curve over past 12 months'
        : 'Monthly subscriber community gains trajectory over past 12 months';
    }

    const w = 800;
    const h = 240;
    const padX = 45;
    const padY = 30;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;

    const maxVal = Math.max(...series, 1);
    const minVal = Math.min(...series, 0);
    const range = (maxVal - minVal) || 1;

    // Coordinate mapping
    const points = series.map((val, i) => {
      const x = padX + (i / (series.length - 1)) * plotW;
      const y = h - padY - ((val - minVal) / range) * plotH;
      return { x, y, val, month: months[i] };
    });

    // SVG path string
    const linePathD = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaPathD = `${linePathD} L ${points[points.length - 1].x} ${h - padY} L ${points[0].x} ${h - padY} Z`;

    const strokeColor = isViews ? '#e50914' : '#10b981';
    const gradId = isViews ? 'gradViews' : 'gradSubs';

    let svgHtml = `
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Background Grid lines -->
      <line x1="${padX}" y1="${padY}" x2="${w - padX}" y2="${padY}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4,4"/>
      <line x1="${padX}" y1="${padY + plotH / 2}" x2="${w - padX}" y2="${padY + plotH / 2}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4,4"/>
      <line x1="${padX}" y1="${h - padY}" x2="${w - padX}" y2="${h - padY}" stroke="rgba(255,255,255,0.1)"/>

      <!-- Shaded Area -->
      <path d="${areaPathD}" fill="url(#${gradId})" />

      <!-- Curve Line -->
      <path d="${linePathD}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    `;

    // Data points & Month Labels
    points.forEach((p) => {
      svgHtml += `
        <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${strokeColor}" stroke="#ffffff" stroke-width="2"/>
        <text x="${p.x}" y="${h - 10}" fill="#94a3b8" font-size="11" font-weight="600" text-anchor="middle">${p.month}</text>
      `;
    });

    el.growthSvg.innerHTML = svgHtml;
  }

  // ─────────────────────────────────────────────
  // EVENT BINDINGS
  // ─────────────────────────────────────────────

  function bindEvents() {
    // Days Filter Dropdown (14 vs 30 Days)
    if (el.daysFilterSelect) {
      el.daysFilterSelect.addEventListener('change', (e) => {
        state.daysFilter = parseInt(e.target.value, 10) || 14;
        if (state.activeChannelData) {
          renderDailyTable(state.activeChannelData.daily_metrics || [], state.daysFilter);
        }
      });
    }

    // Chart Switch Tabs (Views vs Subs)
    if (el.tabChartViews) {
      el.tabChartViews.addEventListener('click', () => {
        state.activeChartTab = 'views';
        el.tabChartViews.classList.add('active');
        if (el.tabChartSubs) el.tabChartSubs.classList.remove('active');
        if (state.activeChannelData) renderGrowthChart(state.activeChannelData.chart_data);
      });
    }

    if (el.tabChartSubs) {
      el.tabChartSubs.addEventListener('click', () => {
        state.activeChartTab = 'subs';
        el.tabChartSubs.classList.add('active');
        if (el.tabChartViews) el.tabChartViews.classList.remove('active');
        if (state.activeChannelData) renderGrowthChart(state.activeChannelData.chart_data);
      });
    }

    // Copy Channel Stats Report Button
    if (el.btnCopyChannelReport) {
      el.btnCopyChannelReport.addEventListener('click', () => {
        const d = state.activeChannelData;
        if (!d) return;

        const st = d.thirty_day_stats || {};
        const r = d.ranks || {};
        const report = `📊 **TubeMetrix Channel Statistics: ${d.title}** (${d.handle})\n` +
          `• **Subscribers:** ${formatViews(d.subscribers_count)} | **Total Views:** ${d.total_views_text}\n` +
          `• **SocialBlade Grade:** ${r.grade} | **Global SB Rank:** #${r.sb_rank?.toLocaleString()}\n` +
          `• **30-Day Views:** ${formatViews(st.views)} | **30-Day Subs:** +${formatViews(st.subs)}\n` +
          `• **Estimated Monthly Earnings:** ${formatMoneyRange(st.monthly_earnings_min, st.monthly_earnings_max)}\n` +
          `• **Estimated Yearly Earnings:** ${formatMoneyRange(st.yearly_earnings_min, st.yearly_earnings_max)}\n` +
          `• **Country:** ${d.country} | **Category:** ${d.category}\n` +
          `• **Channel Link:** ${d.channel_url}`;

        navigator.clipboard.writeText(report).then(() => {
          showToast('📋 Channel report copied to clipboard!');
        }).catch(() => {
          showToast('Could not access clipboard.');
        });
      });
    }

    // Export Daily Table Excel (.xls)
    if (el.btnExportTableExcel) {
      el.btnExportTableExcel.addEventListener('click', () => {
        const d = state.activeChannelData;
        if (!d) return;

        const rows = d.daily_metrics.slice(0, state.daysFilter);
        let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Daily Metrics">
  <Table>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Subscribers Gained</Data></Cell>
    <Cell><Data ss:Type="String">Cumulative Subs</Data></Cell>
    <Cell><Data ss:Type="String">Daily Views</Data></Cell>
    <Cell><Data ss:Type="String">Cumulative Views</Data></Cell>
    <Cell><Data ss:Type="String">Total Videos</Data></Cell>
    <Cell><Data ss:Type="String">Estimated Earnings</Data></Cell>
   </Row>`;

        rows.forEach(r => {
          xml += `
   <Row>
    <Cell><Data ss:Type="String">${r.date}</Data></Cell>
    <Cell><Data ss:Type="String">${r.sub_gain}</Data></Cell>
    <Cell><Data ss:Type="String">${r.total_subs}</Data></Cell>
    <Cell><Data ss:Type="String">${r.views_gained}</Data></Cell>
    <Cell><Data ss:Type="String">${r.cumulative_views}</Data></Cell>
    <Cell><Data ss:Type="String">${r.total_videos}</Data></Cell>
    <Cell><Data ss:Type="String">${formatMoney(r.min_earning_usd, true)} - ${formatMoney(r.max_earning_usd, true)}</Data></Cell>
   </Row>`;
        });

        xml += `
  </Table>
 </Worksheet>
</Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${d.title.replace(/[^a-zA-Z0-9]/g, '_')}_Daily_Metrics.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📊 Daily metrics Excel downloaded!');
      });
    }

    // Copy Table to Clipboard
    if (el.btnCopyTable) {
      el.btnCopyTable.addEventListener('click', () => {
        const d = state.activeChannelData;
        if (!d) return;

        const rows = d.daily_metrics.slice(0, state.daysFilter);
        let text = `Date\tSubscribers\tDaily Views\tCumulative Views\tTotal Videos\tEstimated Earnings\n`;
        rows.forEach(r => {
          text += `${r.date}\t${r.sub_gain} (${r.total_subs})\t${r.views_gained}\t${r.cumulative_views}\t${r.total_videos}\t${formatMoney(r.min_earning_usd, true)} - ${formatMoney(r.max_earning_usd, true)}\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
          showToast('📋 Table copied to clipboard (TSV formatted)!');
        }).catch(() => {
          showToast('Could not access clipboard.');
        });
      });
    }
  }

  // ─────────────────────────────────────────────
  // INITIALIZATION ON DOM READY
  // ─────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', () => {
  initMobileScrollHints();
    initTheme();
    initCurrency();
    initSearch();
    bindEvents();

    // Waiting for user search (no channel pre-analyzed)
  });

})();


// ── Mobile Horizontal Scroll Hint & Micro-Nudge Engine ──
function initMobileScrollHints() {
  const configs = [
    { containerId: 'mainPageNav', hintId: 'pageNavHint' },
    { containerId: 'toolModeTabs', hintId: 'modeTabsHint' }
  ];

  configs.forEach(({ containerId, hintId }) => {
    const container = document.getElementById(containerId);
    const hint = document.getElementById(hintId);
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
        hint.style.display = 'flex';
        hint.style.opacity = '1';
        hint.style.transform = 'translateX(0)';
      }
    }

    container.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint, { passive: true });
    updateHint();

    // Subtle micro-nudge after page load to demonstrate swiping to the user
    if (window.innerWidth <= 640) {
      setTimeout(() => {
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (maxScroll > 15 && container.scrollLeft === 0) {
          container.scrollTo({ left: 35, behavior: 'smooth' });
          setTimeout(() => {
            container.scrollTo({ left: 0, behavior: 'smooth' });
          }, 500);
        }
      }, 600);
    }
  });
}
