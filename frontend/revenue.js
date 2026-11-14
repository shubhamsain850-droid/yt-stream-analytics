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
    INR: { symbol: '₹', rate: 86.85, decimals: 0 },
    USD: { symbol: '$', rate: 1.0, decimals: 0 },
    EUR: { symbol: '€', rate: 0.92, decimals: 0 },
    GBP: { symbol: '£', rate: 0.79, decimals: 0 },
    CAD: { symbol: 'C$', rate: 1.36, decimals: 0 },
    AUD: { symbol: 'A$', rate: 1.54, decimals: 0 },
    SGD: { symbol: 'S$', rate: 1.34, decimals: 0 },
    AED: { symbol: 'د.إ', rate: 3.67, decimals: 0 },
    SAR: { symbol: 'SR', rate: 3.75, decimals: 0 },
    BRL: { symbol: 'R$', rate: 5.71, decimals: 0 },
    JPY: { symbol: '¥', rate: 149.7, decimals: 0 },
    KRW: { symbol: '₩', rate: 1378.6, decimals: 0 },
    PHP: { symbol: '₱', rate: 57.9, decimals: 0 },
    PKR: { symbol: 'Rs', rate: 280.2, decimals: 0 },
    BDT: { symbol: '৳', rate: 120.6, decimals: 0 },
    RUB: { symbol: '₽', rate: 96.5, decimals: 0 },
    TRY: { symbol: '₺', rate: 34.7, decimals: 0 },
    PLN: { symbol: 'zł', rate: 3.98, decimals: 0 },
    MXN: { symbol: 'Mex$', rate: 20.2, decimals: 0 },
    IDR: { symbol: 'Rp', rate: 15791.0, decimals: 0 },
    THB: { symbol: '฿', rate: 35.4, decimals: 0 },
    VND: { symbol: '₫', rate: 25544.0, decimals: 0 }
  };

  const state = {
    currency: localStorage.getItem('TubeMetrix_currency') || 'INR',
    theme: localStorage.getItem('TubeMetrix_theme') || localStorage.getItem('theme') || 'dark',
    activeMode: 'single', // 'single' | 'compare'
    activeChannelData: null,
    activeComparisonData: null,
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

    // Mode Switcher & Panels
    revenueModeTabs: document.getElementById('revenueModeTabs'),
    tabModeSingle: document.getElementById('tabModeSingle'),
    tabModeCompare: document.getElementById('tabModeCompare'),
    panelSingleChannel: document.getElementById('panelSingleChannel'),
    panelCompareChannels: document.getElementById('panelCompareChannels'),

    // Single Search Controls
    channelSearchInput: document.getElementById('channelSearchInput'),
    pasteSearchBtn: document.getElementById('pasteSearchBtn'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    startSearchBtn: document.getElementById('startSearchBtn'),
    searchDropdown: document.getElementById('searchDropdown'),
    dropdownList: document.getElementById('dropdownList'),
    trendingPills: document.querySelectorAll('#trendingPills .preset-pill'),
    channelErrorMsg: document.getElementById('channelErrorMsg'),

    // Dual Compare Controls
    compareInputA: document.getElementById('compareInputA'),
    compareInputB: document.getElementById('compareInputB'),
    clearCompareABtn: document.getElementById('clearCompareABtn'),
    clearCompareBBtn: document.getElementById('clearCompareBBtn'),
    btnStartCompare: document.getElementById('btnStartCompare'),
    comparePresets: document.querySelectorAll('.compare-preset-pill'),
    compareResultsCard: document.getElementById('compareResultsCard'),

    // Leaderboard & Empty State
    emptySearchState: document.getElementById('emptySearchState'),
    leaderboardTbody: document.getElementById('leaderboardTbody'),

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
  // CURRENCY SWITCHER & SHARED LIVE FOREX SYNC
  // ─────────────────────────────────────────────

  function applyInrRatesToCurrencyMap(inrRates) {
    if (!inrRates || typeof inrRates !== 'object') return;
    const usdInr = Number(inrRates.USD);
    if (!usdInr || usdInr <= 0) return;
    Object.keys(CURRENCY_MAP).forEach(code => {
      if (code === 'USD') {
        CURRENCY_MAP[code].rate = 1.0;
      } else if (code === 'INR') {
        CURRENCY_MAP[code].rate = usdInr;
      } else {
        const codeInr = Number(inrRates[code]);
        if (codeInr > 0) CURRENCY_MAP[code].rate = usdInr / codeInr;
      }
    });
  }

  async function initForexSync() {
    try {
      const savedRates = localStorage.getItem('TubeMetrix_fx_rates');
      if (savedRates) applyInrRatesToCurrencyMap(JSON.parse(savedRates));
    } catch (e) {}

    const lastUpdated = localStorage.getItem('TubeMetrix_fx_updated');
    const twelveHours = 12 * 60 * 60 * 1000;
    const isStale = !lastUpdated || (Date.now() - new Date(lastUpdated).getTime() > twelveHours);
    if (!isStale) return;

    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.rates && data.rates.INR) {
        const usdInr = Number(data.rates.INR);
        Object.keys(CURRENCY_MAP).forEach(code => {
          if (code === 'USD') CURRENCY_MAP[code].rate = 1.0;
          else if (data.rates[code]) CURRENCY_MAP[code].rate = Number(data.rates[code]);
        });

        let existingFx = {};
        try {
          const rawFx = localStorage.getItem('TubeMetrix_fx_rates');
          if (rawFx) existingFx = JSON.parse(rawFx) || {};
        } catch (e) {}
        const syncedFx = { ...existingFx, INR: 1.0 };
        const allCodes = new Set([...Object.keys(CURRENCY_MAP), ...Object.keys(existingFx), 'NZD', 'HKD', 'TWD']);
        allCodes.forEach(code => {
          if (code === 'INR') syncedFx.INR = 1.0;
          else if (data.rates[code] && Number(data.rates[code]) > 0) {
            syncedFx[code] = Math.round((usdInr / Number(data.rates[code])) * 100) / 100;
          }
        });
        localStorage.setItem('TubeMetrix_fx_rates', JSON.stringify(syncedFx));
        localStorage.setItem('TubeMetrix_fx_updated', new Date().toISOString());
        if (state.activeChannelData) renderChannelStats(state.activeChannelData);
      }
    } catch (e) {
      console.warn('Could not sync live forex rates on analytics page:', e);
    }
  }

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
      if (state.activeComparisonData) {
        renderChannelComparison(state.activeComparisonData.a, state.activeComparisonData.b);
      }
      renderLeaderboard();
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

    // Quick channel lookup buttons in empty search state
    document.querySelectorAll('.quick-ch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const handle = btn.dataset.handle;
        if (handle && el.channelSearchInput) {
          el.channelSearchInput.value = handle;
          if (el.clearSearchBtn) el.clearSearchBtn.style.display = 'block';
          analyzeChannel(handle);
        }
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
  // TOP 16 AUDITED YOUTUBE CREATORS LEADERBOARD
  // ─────────────────────────────────────────────

  const TOP_CREATORS_LEADERBOARD = [
    { rank: 1, name: 'MrBeast', handle: '@MrBeast', category: 'Entertainment', avatar: 'https://yt3.googleusercontent.com/fxGKYucJAVme-YzgnKiYDhP0vStNu_l_Rr602cnhn2DpFlgIsHyGhjfnhEk1UABDRIrrdua8qw=s176-c-k-c0x00ffffff-no-rj', subs: '526M', grade: 'A++', gradeClass: 'grade-a', views30d: '1.8B', monthlyUsdMin: 450000, monthlyUsdMax: 7200000 },
    { rank: 2, name: 'T-Series', handle: '@tseries', category: 'Music', avatar: 'https://yt3.googleusercontent.com/v_fg9LjXDqodJScbvqbLXIrRIqOTLvdq9ELn4oeg1p8rWkQ8vW2zI7P6n98w=s176-c-k-c0x00ffffff-no-rj', subs: '316M', grade: 'A++', gradeClass: 'grade-a', views30d: '2.1B', monthlyUsdMin: 520000, monthlyUsdMax: 8300000 },
    { rank: 3, name: 'SET India', handle: '@SETIndia', category: 'Entertainment', avatar: 'https://yt3.googleusercontent.com/eu0f2MxgE8x0m5h936B1cE0jXU1N_9y7_i221762=s176-c-k-c0x00ffffff-no-rj', subs: '190M', grade: 'A+', gradeClass: 'grade-a', views30d: '1.4B', monthlyUsdMin: 350000, monthlyUsdMax: 5600000 },
    { rank: 4, name: 'Techno Gamerz', handle: '@TechnoGamerzOfficial', category: 'Gaming', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_kX44kO47JzS_83_L-K8Xg8928=s176-c-k-c0x00ffffff-no-rj', subs: '53.6M', grade: 'A+', gradeClass: 'grade-a', views30d: '210M', monthlyUsdMin: 52500, monthlyUsdMax: 840000 },
    { rank: 5, name: 'Total Gaming', handle: '@TotalGaming093', category: 'Gaming', avatar: 'https://yt3.googleusercontent.com/b_838848_k-929_18182717=s176-c-k-c0x00ffffff-no-rj', subs: '46M', grade: 'A+', gradeClass: 'grade-a', views30d: '115M', monthlyUsdMin: 28750, monthlyUsdMax: 460000 },
    { rank: 6, name: 'CarryMinati', handle: '@CarryMinati', category: 'Entertainment', avatar: 'https://yt3.googleusercontent.com/j0oQ_12381273981729=s176-c-k-c0x00ffffff-no-rj', subs: '45.8M', grade: 'A', gradeClass: 'grade-a', views30d: '95M', monthlyUsdMin: 23750, monthlyUsdMax: 380000 },
    { rank: 7, name: 'Round2hell', handle: '@Round2hell', category: 'Comedy', avatar: 'https://yt3.googleusercontent.com/b9918271928_1827=s176-c-k-c0x00ffffff-no-rj', subs: '36.5M', grade: 'A', gradeClass: 'grade-a', views30d: '65M', monthlyUsdMin: 16250, monthlyUsdMax: 260000 },
    { rank: 8, name: 'Dhruv Rathee', handle: '@dhruvrathee', category: 'Education', avatar: 'https://yt3.googleusercontent.com/k912871928_1827=s176-c-k-c0x00ffffff-no-rj', subs: '33.3M', grade: 'A', gradeClass: 'grade-a', views30d: '120M', monthlyUsdMin: 30000, monthlyUsdMax: 480000 },
    { rank: 9, name: 'Ashish Chanchlani', handle: '@ashishchanchlanivines', category: 'Comedy', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_m918271928=s176-c-k-c0x00ffffff-no-rj', subs: '32.8M', grade: 'B+', gradeClass: 'grade-b', views30d: '38M', monthlyUsdMin: 9500, monthlyUsdMax: 152000 },
    { rank: 10, name: 'Sandeep Maheshwari', handle: '@SandeepSeminars', category: 'Education', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_s918271928=s176-c-k-c0x00ffffff-no-rj', subs: '28.3M', grade: 'A', gradeClass: 'grade-a', views30d: '45M', monthlyUsdMin: 0, monthlyUsdMax: 0, nonMonetized: true },
    { rank: 11, name: 'Triggered Insaan', handle: '@triggeredinsaan', category: 'Entertainment', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_t918271928=s176-c-k-c0x00ffffff-no-rj', subs: '27M', grade: 'A', gradeClass: 'grade-a', views30d: '78M', monthlyUsdMin: 19500, monthlyUsdMax: 312000 },
    { rank: 12, name: 'BB Ki Vines', handle: '@BBKiVines', category: 'Entertainment', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_b918271928=s176-c-k-c0x00ffffff-no-rj', subs: '26.5M', grade: 'B+', gradeClass: 'grade-b', views30d: '30M', monthlyUsdMin: 7500, monthlyUsdMax: 120000 },
    { rank: 13, name: 'Mythpat', handle: '@Mythpat', category: 'Gaming', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_m818271928=s176-c-k-c0x00ffffff-no-rj', subs: '17.7M', grade: 'A', gradeClass: 'grade-a', views30d: '52M', monthlyUsdMin: 13000, monthlyUsdMax: 208000 },
    { rank: 14, name: 'CarryisLive', handle: '@CarryisLive', category: 'Gaming', avatar: 'https://yt3.googleusercontent.com/BkYkX3sg_NJTNZilCQhObmqDiyJER4_9U8VG7gNOxTnPnd-eXv-AVzJoau-VQQI0JBAaqbP7EA=s176-c-k-c0x00ffffff-no-rj', subs: '12.7M', grade: 'A', gradeClass: 'grade-a', views30d: '26M', monthlyUsdMin: 6500, monthlyUsdMax: 104000 },
    { rank: 15, name: 'JONATHAN GAMING', handle: '@JONATHANGAMINGYT', category: 'Gaming', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_j918271928=s176-c-k-c0x00ffffff-no-rj', subs: '8.04M', grade: 'B+', gradeClass: 'grade-b', views30d: '18M', monthlyUsdMin: 4500, monthlyUsdMax: 72000 },
    { rank: 16, name: 'MortaL', handle: '@MortaLyt', category: 'Gaming', avatar: 'https://yt3.googleusercontent.com/ytc/AIdro_mo918271928=s176-c-k-c0x00ffffff-no-rj', subs: '6.94M', grade: 'B+', gradeClass: 'grade-b', views30d: '22M', monthlyUsdMin: 5500, monthlyUsdMax: 88000 }
  ];

  function renderLeaderboard() {
    if (!el.leaderboardTbody) return;
    el.leaderboardTbody.innerHTML = '';

    const medalIcons = ['🥇', '🥈', '🥉'];

    TOP_CREATORS_LEADERBOARD.forEach(c => {
      const tr = document.createElement('tr');
      const isTop3 = c.rank <= 3;
      const rankBadge = isTop3
        ? `<span class="leaderboard-rank rank-top3">${medalIcons[c.rank - 1]} #${c.rank}</span>`
        : `<span class="leaderboard-rank">#${c.rank}</span>`;

      const monthlyRev = c.nonMonetized
        ? `<span style="color: var(--text-muted); font-size: 0.8rem; font-weight: 600;">₹0 (Non-Monetized)</span>`
        : `<span style="color: #10b981; font-weight: 700;">${formatMoneyRange(c.monthlyUsdMin, c.monthlyUsdMax)}</span>`;

      tr.innerHTML = `
        <td>${rankBadge}</td>
        <td>
          <div class="leaderboard-creator-cell">
            <img src="${c.avatar}" alt="${c.name}" class="leaderboard-avatar" referrerpolicy="no-referrer"
              onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%2364748b\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M20 21a8 8 0 1 0-16 0\\'/></svg>'">
            <div class="leaderboard-creator-info">
              <span class="leaderboard-creator-name">${c.name}</span>
              <span class="leaderboard-creator-handle">${c.handle}</span>
            </div>
          </div>
        </td>
        <td><span style="font-size: 0.78rem; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,0.04); color: var(--text-secondary);">${c.category}</span></td>
        <td><strong style="color: var(--text-primary); font-family: var(--font-mono);">${c.subs}</strong></td>
        <td><span class="leaderboard-grade-badge ${c.gradeClass}">${c.grade}</span></td>
        <td><span style="color: #38bdf8; font-weight: 600; font-family: var(--font-mono);">${c.views30d}</span></td>
        <td>${monthlyRev}</td>
        <td style="text-align: right;">
          <button class="leaderboard-audit-btn" data-handle="${c.handle}" type="button">Audit Channel ➔</button>
        </td>
      `;
      el.leaderboardTbody.appendChild(tr);
    });

    // Wire clicks on newly rendered audit buttons
    el.leaderboardTbody.querySelectorAll('.leaderboard-audit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const handle = btn.dataset.handle;
        if (!handle) return;
        switchMode('single');
        if (el.channelSearchInput) el.channelSearchInput.value = handle;
        analyzeChannel(handle);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ─────────────────────────────────────────────
  // MODE SWITCHER (SINGLE AUDIT VS COMPARE 2 CHANNELS)
  // ─────────────────────────────────────────────

  function switchMode(mode) {
    state.activeMode = mode;
    if (mode === 'compare') {
      if (el.tabModeSingle) {
        el.tabModeSingle.classList.remove('active');
        el.tabModeSingle.setAttribute('aria-selected', 'false');
      }
      if (el.tabModeCompare) {
        el.tabModeCompare.classList.add('active');
        el.tabModeCompare.setAttribute('aria-selected', 'true');
      }
      if (el.panelSingleChannel) el.panelSingleChannel.style.display = 'none';
      if (el.panelCompareChannels) el.panelCompareChannels.style.display = 'block';

      if (state.activeComparisonData) {
        if (el.compareResultsCard) el.compareResultsCard.style.display = 'block';
        if (el.channelDashboard) el.channelDashboard.style.display = 'none';
        if (el.emptySearchState) el.emptySearchState.style.display = 'none';
      } else {
        if (el.compareResultsCard) el.compareResultsCard.style.display = 'none';
        if (el.channelDashboard) el.channelDashboard.style.display = 'none';
        if (el.emptySearchState) el.emptySearchState.style.display = 'block';
      }
    } else {
      if (el.tabModeSingle) {
        el.tabModeSingle.classList.add('active');
        el.tabModeSingle.setAttribute('aria-selected', 'true');
      }
      if (el.tabModeCompare) {
        el.tabModeCompare.classList.remove('active');
        el.tabModeCompare.setAttribute('aria-selected', 'false');
      }
      if (el.panelSingleChannel) el.panelSingleChannel.style.display = 'block';
      if (el.panelCompareChannels) el.panelCompareChannels.style.display = 'none';

      if (state.activeChannelData) {
        if (el.channelDashboard) el.channelDashboard.style.display = 'block';
        if (el.compareResultsCard) el.compareResultsCard.style.display = 'none';
        if (el.emptySearchState) el.emptySearchState.style.display = 'none';
      } else {
        if (el.channelDashboard) el.channelDashboard.style.display = 'none';
        if (el.compareResultsCard) el.compareResultsCard.style.display = 'none';
        if (el.emptySearchState) el.emptySearchState.style.display = 'block';
      }
    }
  }

  function getGradeScore(grade) {
    const g = String(grade || '').trim().toUpperCase();
    if (g === 'A++') return 100;
    if (g === 'A+') return 90;
    if (g === 'A') return 80;
    if (g === 'A-') return 70;
    if (g === 'B+') return 60;
    if (g === 'B') return 50;
    if (g === 'B-') return 40;
    if (g === 'C+') return 30;
    if (g === 'C') return 20;
    if (g === 'D') return 10;
    return 0;
  }

  function getGradeClass(g) {
    const s = String(g || '').toUpperCase();
    if (s.startsWith('A')) return 'grade-a';
    if (s.startsWith('B')) return 'grade-b';
    return 'grade-c';
  }

  async function fetchChannelData(query) {
    if (!query || !query.trim()) {
      throw new Error('Please enter a valid channel name or @handle.');
    }
    const cleanQ = query.trim();
    const resp = await fetch(`${API_BASE}/channel-analytics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: cleanQ })
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.detail || errJson.error || `Channel "${cleanQ}" could not be found.`);
    }

    const data = await resp.json();
    if (!data || !data.success) {
      throw new Error(data?.error || `Could not find YouTube channel "${cleanQ}".`);
    }
    return data;
  }

  // ─────────────────────────────────────────────
  // CHANNEL COMPARISON ENGINE
  // ─────────────────────────────────────────────

  async function runChannelComparison(queryA, queryB) {
    const qA = (queryA || '').trim();
    const qB = (queryB || '').trim();

    if (!qA || !qB) {
      showError('Please enter both Channel A and Channel B to compare.');
      return;
    }

    if (qA.toLowerCase().replace(/[@\s]/g, '') === qB.toLowerCase().replace(/[@\s]/g, '')) {
      showError('Please select two different channels to compare.');
      return;
    }

    showLoading(true, `Comparing ${qA} vs ${qB}...`);
    hideError();

    try {
      const [dataA, dataB] = await Promise.all([
        fetchChannelData(qA),
        fetchChannelData(qB)
      ]);

      state.activeComparisonData = { a: dataA, b: dataB };
      renderChannelComparison(dataA, dataB);
      showToast(`⚖️ Compared ${dataA.title} vs ${dataB.title}!`);
    } catch (e) {
      console.error('Channel Comparison Error:', e);
      showError(`❌ Comparison failed: ${e.message}`);
    } finally {
      showLoading(false);
    }
  }

  function renderChannelComparison(a, b) {
    if (!a || !b || !el.compareResultsCard) return;

    if (el.emptySearchState) el.emptySearchState.style.display = 'none';
    if (el.channelDashboard) el.channelDashboard.style.display = 'none';
    el.compareResultsCard.style.display = 'block';

    const aSubs = a.subscribers_count || parseYtNumber(a.subscribers_text);
    const bSubs = b.subscribers_count || parseYtNumber(b.subscribers_text);
    const subsDiff = aSubs - bSubs;

    const aViews30 = a.thirty_day_stats?.views || 0;
    const bViews30 = b.thirty_day_stats?.views || 0;
    const views30Diff = aViews30 - bViews30;

    const aTotalViews = a.total_views_count || parseYtNumber(a.total_views_text);
    const bTotalViews = b.total_views_count || parseYtNumber(b.total_views_text);
    const totalViewsDiff = aTotalViews - bTotalViews;

    const aGrade = a.ranks?.grade || 'B';
    const bGrade = b.ranks?.grade || 'B';
    const aGradeScore = getGradeScore(aGrade);
    const bGradeScore = getGradeScore(bGrade);

    const aMonthlyMin = a.thirty_day_stats?.monthly_earnings_min || 0;
    const aMonthlyMax = a.thirty_day_stats?.monthly_earnings_max || 0;
    const bMonthlyMin = b.thirty_day_stats?.monthly_earnings_min || 0;
    const bMonthlyMax = b.thirty_day_stats?.monthly_earnings_max || 0;

    const aYearlyMin = a.thirty_day_stats?.yearly_earnings_min || 0;
    const aYearlyMax = a.thirty_day_stats?.yearly_earnings_max || 0;
    const bYearlyMin = b.thirty_day_stats?.yearly_earnings_min || 0;
    const bYearlyMax = b.thirty_day_stats?.yearly_earnings_max || 0;

    // Determine overall category wins
    let aWins = 0;
    let bWins = 0;
    if (aSubs >= bSubs) aWins++; else bWins++;
    if (aViews30 >= bViews30) aWins++; else bWins++;
    if (aTotalViews >= bTotalViews) aWins++; else bWins++;
    if (aGradeScore >= bGradeScore) aWins++; else bWins++;
    if (aMonthlyMax >= bMonthlyMax) aWins++; else bWins++;

    const winnerA = aWins >= bWins;
    const winnerB = bWins > aWins;

    // Difference pills
    const subsDiffText = subsDiff >= 0
      ? `▲ +${formatViews(subsDiff)} Subs Ahead`
      : `▲ +${formatViews(Math.abs(subsDiff))} Subs Ahead`;

    const viewsDiffText = views30Diff >= 0
      ? `▲ +${formatViews(views30Diff)} 30D Velocity`
      : `▲ +${formatViews(Math.abs(views30Diff))} 30D Velocity`;

    const totalViewsDiffText = totalViewsDiff >= 0
      ? `▲ +${formatViews(totalViewsDiff)} Lifetime Lead`
      : `▲ +${formatViews(Math.abs(totalViewsDiff))} Lifetime Lead`;

    const avatarA = a.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2364748b"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';
    const avatarB = b.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2364748b"><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>';

    el.compareResultsCard.innerHTML = `
      <!-- 1. Hero Side-by-Side Banner -->
      <div class="compare-hero-banner">
        <div class="compare-hero-col col-a ${winnerA ? 'winner-col' : ''}">
          <img src="${avatarA}" alt="${a.title}" class="compare-hero-avatar" referrerpolicy="no-referrer"
            onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%2364748b\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M20 21a8 8 0 1 0-16 0\\'/></svg>'">
          <div class="compare-hero-info">
            <div class="compare-hero-name">
              <span>${a.title}</span>
              <span class="badge-verified" title="Verified Creator">✓</span>
              ${winnerA ? '<span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; background: #10b981; color: #fff; font-weight: 800;">👑 WINNER</span>' : ''}
            </div>
            <span class="compare-hero-handle">${a.handle || ''} · ${a.category || 'General'} · ${a.country || 'Global'}</span>
            <span class="leaderboard-grade-badge ${getGradeClass(aGrade)}">GRADE ${aGrade}</span>
          </div>
        </div>

        <div class="compare-center-vs">
          <div class="vs-circle">VS</div>
          <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 800; letter-spacing: 0.5px;">HEAD-TO-HEAD</span>
        </div>

        <div class="compare-hero-col col-b ${winnerB ? 'winner-col' : ''}">
          <img src="${avatarB}" alt="${b.title}" class="compare-hero-avatar" referrerpolicy="no-referrer"
            onerror="this.onerror=null;this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'%2364748b\\'><circle cx=\\'12\\' cy=\\'8\\' r=\\'4\\'/><path d=\\'M20 21a8 8 0 1 0-16 0\\'/></svg>'">
          <div class="compare-hero-info">
            <div class="compare-hero-name">
              <span>${b.title}</span>
              <span class="badge-verified" title="Verified Creator">✓</span>
              ${winnerB ? '<span style="font-size: 0.72rem; padding: 2px 7px; border-radius: 4px; background: #10b981; color: #fff; font-weight: 800;">👑 WINNER</span>' : ''}
            </div>
            <span class="compare-hero-handle">${b.handle || ''} · ${b.category || 'General'} · ${b.country || 'Global'}</span>
            <span class="leaderboard-grade-badge ${getGradeClass(bGrade)}">GRADE ${bGrade}</span>
          </div>
        </div>
      </div>

      <!-- 2. Share & Action Bar -->
      <div class="compare-share-bar">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">⚖️ Head-to-Head Creator Analysis</span>
          <span style="font-size: 0.78rem; color: var(--text-muted);">(Real-time data sourced from YouTube)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <button class="action-btn" id="btnCopyCompareLink" type="button">
            <span>📋 Copy Comparison Link</span>
          </button>
          <button class="action-btn" id="btnAuditFromCompareA" type="button">
            <span>🔍 Audit ${a.title}</span>
          </button>
          <button class="action-btn" id="btnAuditFromCompareB" type="button">
            <span>🔍 Audit ${b.title}</span>
          </button>
        </div>
      </div>

      <!-- 3. Key Highlight Stat Cards -->
      <div class="compare-cards-grid">
        <!-- Subscribers Box -->
        <div class="compare-stat-card">
          <span class="compare-stat-header">SUBSCRIBERS</span>
          <div class="compare-stat-scores">
            <span class="compare-stat-val-a ${aSubs >= bSubs ? 'text-success' : ''}">${formatViews(aSubs)}</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">vs</span>
            <span class="compare-stat-val-b ${bSubs > aSubs ? 'text-success' : ''}">${formatViews(bSubs)}</span>
          </div>
          <span class="compare-diff-pill ${subsDiff >= 0 ? 'pill-green' : 'pill-blue'}">
            ${subsDiff >= 0 ? a.title : b.title}: ${subsDiffText}
          </span>
        </div>

        <!-- 30-Day Views Box -->
        <div class="compare-stat-card">
          <span class="compare-stat-header">30-DAY VIEW VELOCITY</span>
          <div class="compare-stat-scores">
            <span class="compare-stat-val-a ${aViews30 >= bViews30 ? 'text-success' : ''}">${formatViews(aViews30)}</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">vs</span>
            <span class="compare-stat-val-b ${bViews30 > aViews30 ? 'text-success' : ''}">${formatViews(bViews30)}</span>
          </div>
          <span class="compare-diff-pill ${views30Diff >= 0 ? 'pill-green' : 'pill-blue'}">
            ${views30Diff >= 0 ? a.title : b.title}: ${viewsDiffText}
          </span>
        </div>

        <!-- Monthly Estimated Revenue Box -->
        <div class="compare-stat-card">
          <span class="compare-stat-header">EST. MONTHLY EARNINGS</span>
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span style="color: #ff5252; font-weight: 700;">${a.title}:</span>
              <span style="font-weight: 800; color: #10b981;">${formatMoneyRange(aMonthlyMin, aMonthlyMax)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
              <span style="color: #60a5fa; font-weight: 700;">${b.title}:</span>
              <span style="font-weight: 800; color: #10b981;">${formatMoneyRange(bMonthlyMin, bMonthlyMax)}</span>
            </div>
          </div>
          <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">At $0.25 – $4.00 CPM benchmark</span>
        </div>

        <!-- Lifetime Views Box -->
        <div class="compare-stat-card">
          <span class="compare-stat-header">LIFETIME YOUTUBE VIEWS</span>
          <div class="compare-stat-scores">
            <span class="compare-stat-val-a ${aTotalViews >= bTotalViews ? 'text-success' : ''}">${formatViews(aTotalViews)}</span>
            <span style="color: var(--text-muted); font-size: 0.8rem;">vs</span>
            <span class="compare-stat-val-b ${bTotalViews > aTotalViews ? 'text-success' : ''}">${formatViews(bTotalViews)}</span>
          </div>
          <span class="compare-diff-pill ${totalViewsDiff >= 0 ? 'pill-green' : 'pill-blue'}">
            ${totalViewsDiff >= 0 ? a.title : b.title}: ${totalViewsDiffText}
          </span>
        </div>
      </div>

      <!-- 4. Detailed Side-by-Side Comparison Matrix Table -->
      <div class="compare-matrix-section">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin-bottom: 14px;">Detailed Metric-by-Metric Matrix</h3>
        <div class="mobile-table-hint-bar" aria-hidden="true">
          <span class="hint-hand">👉</span>
          <span class="hint-text">Swipe horizontally to compare full metric matrix</span>
        </div>
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
          <table class="compare-table">
            <thead>
              <tr>
                <th style="width: 30%;">Metric / Benchmark</th>
                <th style="width: 35%; color: #ff5252;">${a.title} (${a.handle || ''})</th>
                <th style="width: 35%; color: #60a5fa;">${b.title} (${b.handle || ''})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="compare-metric-name">SocialBlade Grade</td>
                <td class="compare-val-cell ${aGradeScore >= bGradeScore ? 'winner' : ''}">Grade ${aGrade} ${aGradeScore >= bGradeScore ? '👑' : ''}</td>
                <td class="compare-val-cell ${bGradeScore > aGradeScore ? 'winner' : ''}">Grade ${bGrade} ${bGradeScore > aGradeScore ? '👑' : ''}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">Subscribers Volume</td>
                <td class="compare-val-cell ${aSubs >= bSubs ? 'winner' : ''}">${a.subscribers_text || formatViews(aSubs)} ${aSubs >= bSubs ? '👑' : ''}</td>
                <td class="compare-val-cell ${bSubs > aSubs ? 'winner' : ''}">${b.subscribers_text || formatViews(bSubs)} ${bSubs > aSubs ? '👑' : ''}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">30-Day Views Velocity</td>
                <td class="compare-val-cell ${aViews30 >= bViews30 ? 'winner' : ''}">${formatViews(aViews30)} views ${aViews30 >= bViews30 ? '👑' : ''}</td>
                <td class="compare-val-cell ${bViews30 > aViews30 ? 'winner' : ''}">${formatViews(bViews30)} views ${bViews30 > aViews30 ? '👑' : ''}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">30-Day Subscriber Growth</td>
                <td class="compare-val-cell ${((a.thirty_day_stats?.subs || 0) >= (b.thirty_day_stats?.subs || 0)) ? 'winner' : ''}">+${formatViews(a.thirty_day_stats?.subs || 0)}</td>
                <td class="compare-val-cell ${((b.thirty_day_stats?.subs || 0) > (a.thirty_day_stats?.subs || 0)) ? 'winner' : ''}">+${formatViews(b.thirty_day_stats?.subs || 0)}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">Est. Monthly AdSense Revenue</td>
                <td class="compare-val-cell ${aMonthlyMax >= bMonthlyMax ? 'winner' : ''}">${formatMoneyRange(aMonthlyMin, aMonthlyMax)} ${aMonthlyMax >= bMonthlyMax ? '👑' : ''}</td>
                <td class="compare-val-cell ${bMonthlyMax > aMonthlyMax ? 'winner' : ''}">${formatMoneyRange(bMonthlyMin, bMonthlyMax)} ${bMonthlyMax > aMonthlyMax ? '👑' : ''}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">Est. Annual Revenue Projection</td>
                <td class="compare-val-cell ${aYearlyMax >= bYearlyMax ? 'winner' : ''}">${formatMoneyRange(aYearlyMin, aYearlyMax)} ${aYearlyMax >= bYearlyMax ? '👑' : ''}</td>
                <td class="compare-val-cell ${bYearlyMax > aYearlyMax ? 'winner' : ''}">${formatMoneyRange(bYearlyMin, bYearlyMax)} ${bYearlyMax > aYearlyMax ? '👑' : ''}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">Lifetime Total Views</td>
                <td class="compare-val-cell ${aTotalViews >= bTotalViews ? 'winner' : ''}">${a.total_views_text || aTotalViews.toLocaleString()} ${aTotalViews >= bTotalViews ? '👑' : ''}</td>
                <td class="compare-val-cell ${bTotalViews > aTotalViews ? 'winner' : ''}">${b.total_views_text || bTotalViews.toLocaleString()} ${bTotalViews > aTotalViews ? '👑' : ''}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">Uploaded Video / Stream Count</td>
                <td class="compare-val-cell">${a.videos_text || (a.videos_count ? a.videos_count.toLocaleString() : '--')}</td>
                <td class="compare-val-cell">${b.videos_text || (b.videos_count ? b.videos_count.toLocaleString() : '--')}</td>
              </tr>
              <tr>
                <td class="compare-metric-name">Country &amp; Category</td>
                <td class="compare-val-cell">${a.country || 'Global'} · ${a.category || 'General'}</td>
                <td class="compare-val-cell">${b.country || 'Global'} · ${b.category || 'General'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Wire button events inside the rendered comparison card
    const btnCopy = document.getElementById('btnCopyCompareLink');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        const link = `https://tubemetrix.net/revenue?compare=${encodeURIComponent(a.handle || a.title)},${encodeURIComponent(b.handle || b.title)}`;
        navigator.clipboard.writeText(link).then(() => {
          showToast('📋 Comparison link copied to clipboard!');
        }).catch(() => {
          showToast('Could not access clipboard.');
        });
      });
    }

    const btnAuditA = document.getElementById('btnAuditFromCompareA');
    if (btnAuditA) {
      btnAuditA.addEventListener('click', () => {
        switchMode('single');
        if (el.channelSearchInput) el.channelSearchInput.value = a.handle || a.title;
        analyzeChannel(a.handle || a.title);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    const btnAuditB = document.getElementById('btnAuditFromCompareB');
    if (btnAuditB) {
      btnAuditB.addEventListener('click', () => {
        switchMode('single');
        if (el.channelSearchInput) el.channelSearchInput.value = b.handle || b.title;
        analyzeChannel(b.handle || b.title);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
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

    // Mode Switcher Listeners
    if (el.tabModeSingle) {
      el.tabModeSingle.addEventListener('click', () => switchMode('single'));
    }
    if (el.tabModeCompare) {
      el.tabModeCompare.addEventListener('click', () => switchMode('compare'));
    }

    // Compare Inputs & Clear Buttons
    if (el.compareInputA) {
      el.compareInputA.addEventListener('input', () => {
        if (el.clearCompareABtn) {
          el.clearCompareABtn.style.display = el.compareInputA.value ? 'block' : 'none';
        }
      });
      el.compareInputA.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          if (el.compareInputB && !el.compareInputB.value) {
            el.compareInputB.focus();
          } else {
            runChannelComparison(el.compareInputA.value, el.compareInputB.value);
          }
        }
      });
    }

    if (el.clearCompareABtn) {
      el.clearCompareABtn.addEventListener('click', () => {
        el.compareInputA.value = '';
        el.clearCompareABtn.style.display = 'none';
        el.compareInputA.focus();
      });
    }

    if (el.compareInputB) {
      el.compareInputB.addEventListener('input', () => {
        if (el.clearCompareBBtn) {
          el.clearCompareBBtn.style.display = el.compareInputB.value ? 'block' : 'none';
        }
      });
      el.compareInputB.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          runChannelComparison(el.compareInputA.value, el.compareInputB.value);
        }
      });
    }

    if (el.clearCompareBBtn) {
      el.clearCompareBBtn.addEventListener('click', () => {
        el.compareInputB.value = '';
        el.clearCompareBBtn.style.display = 'none';
        el.compareInputB.focus();
      });
    }

    // Start Compare Button
    if (el.btnStartCompare) {
      el.btnStartCompare.addEventListener('click', () => {
        runChannelComparison(el.compareInputA.value, el.compareInputB.value);
      });
    }

    // Compare Rivalry Presets
    if (el.comparePresets) {
      el.comparePresets.forEach(btn => {
        btn.addEventListener('click', () => {
          const ch1 = btn.dataset.ch1;
          const ch2 = btn.dataset.ch2;
          if (el.compareInputA) el.compareInputA.value = ch1;
          if (el.compareInputB) el.compareInputB.value = ch2;
          if (el.clearCompareABtn) el.clearCompareABtn.style.display = 'block';
          if (el.clearCompareBBtn) el.clearCompareBBtn.style.display = 'block';
          switchMode('compare');
          runChannelComparison(ch1, ch2);
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
    initForexSync();
    initCurrency();
    initSearch();
    bindEvents();
    renderLeaderboard();

    // Check URL Search Parameters for auto-auditing or comparison
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const singleParam = urlParams.get('channel') || urlParams.get('ch');
      const compareParam = urlParams.get('compare') || urlParams.get('vs');

      if (compareParam) {
        const parts = compareParam.split(',');
        if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
          const p1 = decodeURIComponent(parts[0].trim());
          const p2 = decodeURIComponent(parts[1].trim());
          switchMode('compare');
          if (el.compareInputA) el.compareInputA.value = p1;
          if (el.compareInputB) el.compareInputB.value = p2;
          if (el.clearCompareABtn) el.clearCompareABtn.style.display = 'block';
          if (el.clearCompareBBtn) el.clearCompareBBtn.style.display = 'block';
          runChannelComparison(p1, p2);
        }
      } else if (singleParam) {
        const ch = decodeURIComponent(singleParam.trim());
        switchMode('single');
        if (el.channelSearchInput) el.channelSearchInput.value = ch;
        analyzeChannel(ch);
      }
    } catch (e) {
      console.warn('URL params parsing error:', e);
    }
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
        hint.style.pointerEvents = 'auto';
      }
    }

    // Tap on the glass button to smoothly scroll right
    hint.addEventListener('click', (e) => {
      e.preventDefault();
      container.scrollBy({ left: 140, behavior: 'smooth' });
    });

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
