/**
 * TubeMetrix — YouTube Live Chat & Comments Downloader & Interactive View Engine
 * High-Speed In-Memory Client Engine (100% Client-Side Processing & Offline Viewer)
 */

(function () {
  'use strict';

  const API_BASE = 'https://shubhamsain858-kickcuttr-api.hf.space/api/youtube';
  const MAX_MULTI_STREAMS = 1000;

  async function fetchJsonWithRetry(url, payload, maxRetries = 1) {
    let lastErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) {
          if (attempt < maxRetries && [429, 502, 503, 504].includes(resp.status)) {
            await new Promise((r) => setTimeout(r, 1200 + attempt * 600));
            continue;
          }
          throw new Error(`HTTP error ${resp.status}`);
        }
        return await resp.json();
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1200 + attempt * 600));
          continue;
        }
        throw lastErr;
      }
    }
    throw lastErr || new Error('Network error');
  }

  function buildCommentsStatsFromList(commentsList, vid, title) {
    const authors = new Set();
    let likesTotal = 0;
    const normalized = (commentsList || []).map((c, idx) => {
      const a = c.author || 'Commenter';
      authors.add(a);
      likesTotal += Number(c.likes || 0);
      return { ...c, idx: idx + 1, stream_id: c.stream_id || vid };
    });
    return {
      success: true,
      video_id: vid,
      title: title || `Video [${vid}]`,
      total_comments: normalized.length,
      unique_commenters: authors.size,
      total_likes: likesTotal,
      comments: normalized,
    };
  }

  // Application State
  const state = {
    activeMode: 'single', // 'single', 'channel', 'multi', 'comments', 'view'
    multiUrlQueue: [],
    liveChatData: null,
    filteredMessages: [],
    activeChatFilter: 'all',
    activeChatSort: 'time-asc',
    commentsData: null,
    filteredComments: [],
    activeCommSort: 'likes-desc',
    theme: localStorage.getItem('TubeMetrix_theme') || localStorage.getItem('theme') || 'dark',

    lastExtractionType: 'chats',

    // Interactive View Results Window Modal State
    viewer: {
      data: null,
      sourceType: 'chats', // 'chats' or 'comments'
      filteredMessages: [],
      authorCounts: {},
      style: 'table', // 'table' or 'feed'
      filters: {
        streamId: 'all',
        event: 'all',
        role: 'all',
        minAmount: 0,
        sort: 'time-asc',
        searchQuery: ''
      }
    }
  };

  // DOM Elements
  const el = {
    // Theme
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    themeText: document.getElementById('themeText'),

    // Mode tabs & panels
    tabBtns: document.querySelectorAll('.mode-tabs .tab-btn[data-mode]'),
    panels: {
      single: document.getElementById('panel-single'),
      channel: document.getElementById('panel-channel'),
      multi: document.getElementById('panel-multi'),
      comments: document.getElementById('panel-comments')
    },

    // Mode A: Single Stream
    chatSingleUrlInput: document.getElementById('chatSingleUrlInput'),
    pasteChatSingleBtn: document.getElementById('pasteChatSingleBtn'),
    startChatSingleBtn: document.getElementById('startChatSingleBtn'),

    // Mode B: Channel
    chatChannelUrlInput: document.getElementById('chatChannelUrlInput'),
    chatFromDateInput: document.getElementById('chatFromDateInput'),
    chatToDateInput: document.getElementById('chatToDateInput'),
    startChatChannelBtn: document.getElementById('startChatChannelBtn'),

    // Mode C: Multi-URL Batch
    chatMultiUrlInput: document.getElementById('chatMultiUrlInput'),
    addChatUrlBtn: document.getElementById('addChatUrlBtn'),
    chatQueueCount: document.getElementById('chatQueueCount'),
    chatBatchLimitNotice: document.getElementById('chatBatchLimitNotice'),
    chatBatchQueueLimitText: document.getElementById('chatBatchQueueLimitText'),
    clearAllChatUrlsBtn: document.getElementById('clearAllChatUrlsBtn'),
    chatUrlQueueList: document.getElementById('chatUrlQueueList'),
    startChatMultiBtn: document.getElementById('startChatMultiBtn'),
    multiTabBadge: document.getElementById('multiTabBadge'),

    // Mode D: Comments
    commentsUrlInput: document.getElementById('commentsUrlInput'),
    pasteCommentsBtn: document.getElementById('pasteCommentsBtn'),
    commentsLimitSelect: document.getElementById('commentsLimitSelect'),
    startCommentsBtn: document.getElementById('startCommentsBtn'),

    // Modal Window for Interactive Result Viewing (Direct Online View - No Download Needed)
    viewResultsModal: document.getElementById('viewResultsModal'),
    viewModalOverlay: document.getElementById('viewModalOverlay'),
    vmCloseBtn: document.getElementById('vmCloseBtn'),
    vmCloseFooterBtn: document.getElementById('vmCloseFooterBtn'),
    vmTypeBadge: document.getElementById('vmTypeBadge'),
    vmTitle: document.getElementById('vmTitle'),
    vmCounter: document.getElementById('vmCounter'),
    vmLoadLocalFileBtn: document.getElementById('vmLoadLocalFileBtn'),
    vmFileInput: document.getElementById('vmFileInput'),

    vmQuickBar: document.getElementById('vmQuickBar'),
    vmPillAll: document.getElementById('vmPillAll'),
    vmPillSc: document.getElementById('vmPillSc'),
    vmPillMem: document.getElementById('vmPillMem'),
    vmPillJewels: document.getElementById('vmPillJewels'),
    vmPillNormal: document.getElementById('vmPillNormal'),

    vmToggleTableBtn: document.getElementById('vmToggleTableBtn'),
    vmToggleFeedBtn: document.getElementById('vmToggleFeedBtn'),

    vmStreamFilterGroup: document.getElementById('vmStreamFilterGroup'),
    vmFilterStream: document.getElementById('vmFilterStream'),
    vmRoleFilterGroup: document.getElementById('vmRoleFilterGroup'),
    vmFilterRole: document.getElementById('vmFilterRole'),
    vmMinAmountFilterGroup: document.getElementById('vmMinAmountFilterGroup'),
    vmFilterMinAmount: document.getElementById('vmFilterMinAmount'),
    vmFilterSort: document.getElementById('vmFilterSort'),
    vmSearchInput: document.getElementById('vmSearchInput'),
    vmSearchClearBtn: document.getElementById('vmSearchClearBtn'),
    vmResetFiltersBtn: document.getElementById('vmResetFiltersBtn'),

    vmTableContainer: document.getElementById('vmTableContainer'),
    vmTableBody: document.getElementById('vmTableBody'),
    vmFeedContainer: document.getElementById('vmFeedContainer'),
    vmFeedStream: document.getElementById('vmFeedStream'),

    vmFooterStatus: document.getElementById('vmFooterStatus'),
    vmExportExcelBtn: document.getElementById('vmExportExcelBtn'),
    vmExportTxtBtn: document.getElementById('vmExportTxtBtn'),
    vmExportCsvBtn: document.getElementById('vmExportCsvBtn'),
    vmCopyVisibleBtn: document.getElementById('vmCopyVisibleBtn'),

    // Trigger Buttons
    openChatViewModalBtn: document.getElementById('openChatViewModalBtn'),
    openCommViewModalBtn: document.getElementById('openCommViewModalBtn'),
    quickViewBtn: document.getElementById('quickViewBtn'),
    progressActions: document.getElementById('progressActions'),

    // Level A: Live Credits Meter & Pause/Resume Checkpoints
    chatResumeBanner: document.getElementById('chatResumeBanner'),
    chatLiveCreditBar: document.getElementById('chatLiveCreditBar'),
    chatLiveCreditPill: document.getElementById('chatLiveCreditPill'),
    chatLiveMeterNote: document.getElementById('chatLiveMeterNote'),
    pauseChatBatchBtn: document.getElementById('pauseChatBatchBtn'),
    chatCreditLimitBanner: document.getElementById('chatCreditLimitBanner'),
    commentsCreditLimitBanner: document.getElementById('commentsCreditLimitBanner'),
    chatBatchCostBar: document.getElementById('chatBatchCostBar'),
    commentsCostPreviewBar: document.getElementById('commentsCostPreviewBar'),

    // Progress Card
    processingCard: document.getElementById('processingCard'),
    statusTitle: document.getElementById('statusTitle'),
    processingElapsedBadge: document.getElementById('processingElapsedBadge'),
    progressPercent: document.getElementById('progressPercent'),
    progressBarFill: document.getElementById('progressBarFill'),
    statusTicker: document.getElementById('statusTicker'),
    countExtracted: document.getElementById('countExtracted'),
    countUnique: document.getElementById('countUnique'),
    countEvents: document.getElementById('countEvents'),
    labelExtracted: document.getElementById('labelExtracted'),

    // Live Chat Results Section (URL Downloads)
    resultsChatSection: document.getElementById('resultsChatSection'),
    kpiChatTotal: document.getElementById('kpiChatTotal'),
    kpiChatStreamInfo: document.getElementById('kpiChatStreamInfo'),
    kpiChatUnique: document.getElementById('kpiChatUnique'),
    kpiChatSuperchat: document.getElementById('kpiChatSuperchat'),
    kpiChatMemberships: document.getElementById('kpiChatMemberships'),
    kpiChatJewels: document.getElementById('kpiChatJewels'),
    leaderboardCard: document.getElementById('leaderboardCard'),
    leaderboardChips: document.getElementById('leaderboardChips'),

    chatFilterTabs: document.getElementById('chatFilterTabs'),
    badgeAllChats: document.getElementById('badgeAllChats'),
    badgeScOnly: document.getElementById('badgeScOnly'),
    badgeMemOnly: document.getElementById('badgeMemOnly'),
    badgeJewelOnly: document.getElementById('badgeJewelOnly'),
    badgeModsOnly: document.getElementById('badgeModsOnly'),
    chatSearchInput: document.getElementById('chatSearchInput'),
    chatSortSelect: document.getElementById('chatSortSelect'),
    chatFeedTableBody: document.getElementById('chatFeedTableBody'),

    exportChatExcelBtn: document.getElementById('exportChatExcelBtn'),
    exportChatTxtBtn: document.getElementById('exportChatTxtBtn'),
    exportChatCsvBtn: document.getElementById('exportChatCsvBtn'),
    exportChatJsonBtn: document.getElementById('exportChatJsonBtn'),

    // Comments Results Section
    resultsCommentsSection: document.getElementById('resultsCommentsSection'),
    kpiCommTotal: document.getElementById('kpiCommTotal'),
    kpiCommVideoTitle: document.getElementById('kpiCommVideoTitle'),
    kpiCommUnique: document.getElementById('kpiCommUnique'),
    kpiCommTotalLikes: document.getElementById('kpiCommTotalLikes'),
    kpiCommTopLikes: document.getElementById('kpiCommTopLikes'),
    kpiCommTopAuthor: document.getElementById('kpiCommTopAuthor'),

    commSearchInput: document.getElementById('commSearchInput'),
    commSortSelect: document.getElementById('commSortSelect'),
    commentsTableBody: document.getElementById('commentsTableBody'),

    exportCommExcelBtn: document.getElementById('exportCommExcelBtn'),
    exportCommTxtBtn: document.getElementById('exportCommTxtBtn'),
    exportCommCsvBtn: document.getElementById('exportCommCsvBtn'),
    exportCommJsonBtn: document.getElementById('exportCommJsonBtn')
  };

  // ─────────────────────────────────────────────
  // 1. THEME MANAGEMENT
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

  function initCurrency() {
    const saved = localStorage.getItem('TubeMetrix_currency') || 'INR';
    const currBtns = document.querySelectorAll('.currency-switch .curr-btn[data-curr]');
    const moreSelect = document.getElementById('moreCurrencySelect');

    function setCurr(c) {
      localStorage.setItem('TubeMetrix_currency', c);
      currBtns.forEach(b => {
        if (b.dataset.curr === c) b.classList.add('active');
        else b.classList.remove('active');
      });
      if (moreSelect) {
        if (!['INR', 'USD', 'EUR'].includes(c)) moreSelect.value = c;
        else moreSelect.selectedIndex = 0;
      }
    }

    currBtns.forEach(b => {
      b.addEventListener('click', () => setCurr(b.dataset.curr));
    });

    if (moreSelect) {
      moreSelect.addEventListener('change', (e) => {
        if (e.target.value) setCurr(e.target.value);
      });
    }

    setCurr(saved);
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
  // 2. MODE TABS CONTROLLER (Single, Channel, Multi, Comments, View)
  // ─────────────────────────────────────────────
  function initModeTabs() {
    el.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        switchMode(mode);
      });
    });

    // Channel Date Presets
    document.querySelectorAll('#panel-channel .preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#panel-channel .preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const p = chip.dataset.preset;
        const today = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];

        if (p === 'all') {
          if (el.chatFromDateInput) el.chatFromDateInput.value = '';
          if (el.chatToDateInput) el.chatToDateInput.value = '';
        } else if (p === '7d') {
          const past = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          el.chatFromDateInput.value = formatDate(past);
          el.chatToDateInput.value = formatDate(today);
        } else if (p === '30d') {
          const past = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          el.chatFromDateInput.value = formatDate(past);
          el.chatToDateInput.value = formatDate(today);
        } else if (p === '90d') {
          const past = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
          el.chatFromDateInput.value = formatDate(past);
          el.chatToDateInput.value = formatDate(today);
        }
      });
    });

    // Paste Buttons
    if (el.pasteChatSingleBtn && el.chatSingleUrlInput) {
      el.pasteChatSingleBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) el.chatSingleUrlInput.value = text.trim();
        } catch (e) {
          el.chatSingleUrlInput.focus();
        }
      });
    }

    if (el.pasteCommentsBtn && el.commentsUrlInput) {
      el.pasteCommentsBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          if (text) el.commentsUrlInput.value = text.trim();
        } catch (e) {
          el.commentsUrlInput.focus();
        }
      });
    }

    // Multi-URL Batch Handlers
    if (el.addChatUrlBtn) {
      el.addChatUrlBtn.addEventListener('click', addUrlToChatQueue);
    }
    if (el.chatMultiUrlInput) {
      el.chatMultiUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addUrlToChatQueue();
      });
    }
    if (el.clearAllChatUrlsBtn) {
      el.clearAllChatUrlsBtn.addEventListener('click', () => {
        if (confirm('Clear all added streams from this batch queue?')) {
          state.multiUrlQueue = [];
          updateMultiChatQueueUI();
        }
      });
    }

    // Initialize Free vs PRO queue UI on page load & expose for auth refresh
    window.refreshMultiBatchUI = updateMultiChatQueueUI;
    updateMultiChatQueueUI();

    // Action Triggers
    if (el.startChatSingleBtn) el.startChatSingleBtn.addEventListener('click', startSingleChatExtraction);
    if (el.startChatChannelBtn) el.startChatChannelBtn.addEventListener('click', startChannelChatExtraction);
    if (el.startChatMultiBtn) el.startChatMultiBtn.addEventListener('click', startMultiChatExtraction);
    if (el.startCommentsBtn) el.startCommentsBtn.addEventListener('click', startCommentsDownload);

    // Modal Window Triggers (View Results)
    if (el.openChatViewModalBtn) {
      el.openChatViewModalBtn.addEventListener('click', () => openViewResultsModal('chats'));
    }
    if (el.openCommViewModalBtn) {
      el.openCommViewModalBtn.addEventListener('click', () => openViewResultsModal('comments'));
    }
    if (el.quickViewBtn) {
      el.quickViewBtn.addEventListener('click', () => openViewResultsModal(state.lastExtractionType || 'chats'));
    }

    // Modal Close Triggers
    if (el.vmCloseBtn) el.vmCloseBtn.addEventListener('click', closeViewResultsModal);
    if (el.vmCloseFooterBtn) el.vmCloseFooterBtn.addEventListener('click', closeViewResultsModal);
    if (el.viewModalOverlay) el.viewModalOverlay.addEventListener('click', closeViewResultsModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.viewResultsModal && el.viewResultsModal.style.display !== 'none') {
        closeViewResultsModal();
      }
    });
  }

  function switchMode(mode) {
    state.activeMode = mode;

    el.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    Object.keys(el.panels).forEach(k => {
      if (el.panels[k]) el.panels[k].classList.toggle('active', k === mode);
    });

    // Manage results visibility
    if (mode === 'comments') {
      if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
      if (state.commentsData && el.resultsCommentsSection) el.resultsCommentsSection.style.display = 'block';
    } else {
      if (el.resultsCommentsSection) el.resultsCommentsSection.style.display = 'none';
      if (state.liveChatData && el.resultsChatSection) el.resultsChatSection.style.display = 'block';
    }
  }

  function updateViewerSessionButton() { }

  // ─────────────────────────────────────────────
  // 3. CUSTOM URL BATCH QUEUE (Credits System Only)
  // ─────────────────────────────────────────────
  const MAX_CUSTOM_URLS = 1000;

  function addUrlToChatQueue() {
    const raw = el.chatMultiUrlInput.value.trim();
    if (!raw) return;

    if (state.multiUrlQueue.length >= MAX_CUSTOM_URLS) {
      alert(`Maximum batch limit reached (${MAX_CUSTOM_URLS} streams).`);
      return;
    }

    const vid = extractVideoId(raw);
    if (!vid) {
      alert('Please enter a valid YouTube stream URL or 11-character Video ID.');
      return;
    }

    if (state.multiUrlQueue.includes(vid)) {
      alert('This stream is already in the batch list.');
      el.chatMultiUrlInput.value = '';
      return;
    }

    state.multiUrlQueue.push(vid);
    el.chatMultiUrlInput.value = '';
    el.chatMultiUrlInput.focus();
    updateMultiChatQueueUI();
  }

  function updateMultiChatQueueUI() {
    const auth = window.TubeMetrixAuth;
    const credits = auth && typeof auth.getCreditsBalance === 'function' ? auth.getCreditsBalance() : 0;
    const hasCredits = credits > 0;
    const count = state.multiUrlQueue.length;
    if (el.chatQueueCount) el.chatQueueCount.textContent = `${count} Added`;
    if (el.multiTabBadge) el.multiTabBadge.textContent = `${count} Added`;
    if (el.startChatMultiBtn) el.startChatMultiBtn.disabled = count === 0;
    if (el.clearAllChatUrlsBtn) el.clearAllChatUrlsBtn.style.display = count > 0 ? 'inline-block' : 'none';

    const batchNotice = el.chatBatchLimitNotice || document.querySelector('.mode-panel#panel-multi .batch-limit-pill');
    if (batchNotice) {
      if (hasCredits) {
        batchNotice.className = 'batch-limit-pill pro-pill';
        batchNotice.textContent = `💎 ${credits} Credits Available (1 Cr / 1k chats)`;
      } else {
        batchNotice.className = 'batch-limit-pill';
        batchNotice.textContent = '💎 Credits Required (No Free Quota)';
      }
    }
    if (el.chatBatchQueueLimitText) {
      el.chatBatchQueueLimitText.textContent = `Streams in Batch (${count} Added • ${count} Credit${count === 1 ? '' : 's'} Base)`;
    }

    renderChatBatchPreflightBar(count, credits, auth?.isLoggedIn?.() || false);

    if (!el.chatUrlQueueList) return;

    if (count === 0) {
      el.chatUrlQueueList.innerHTML = `
        <div class="empty-queue-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>No streams added yet. Paste a YouTube URL above and click <strong>"Add Stream"</strong> (${hasCredits ? `💎 ${credits} Credits Ready — 1 Credit / 1k chats` : 'Requires Credits • No Free Quota'}).</span>
        </div>`;
      return;
    }

    el.chatUrlQueueList.innerHTML = state.multiUrlQueue.map((vid, idx) => `
      <div class="queue-item">
        <span class="queue-item-num">#${idx + 1}</span>
        <span class="queue-item-url">https://www.youtube.com/watch?v=${vid}</span>
        <button class="queue-item-remove" data-idx="${idx}" title="Remove stream">&times;</button>
      </div>
    `).join('');

    el.chatUrlQueueList.querySelectorAll('.queue-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.target.dataset.idx, 10);
        state.multiUrlQueue.splice(i, 1);
        updateMultiChatQueueUI();
      });
    });
  }

  function renderChatPreflightBar(barEl, buyBtnId, { toneClass = '', title = '', sub = '', btnLabel = '', btnAction = 'buy', neededCredits = 1, modalSubtitle = '' }) {
    if (!barEl) return;
    if (!title) {
      barEl.style.display = 'none';
      barEl.innerHTML = '';
      return;
    }
    barEl.className = `tm-preflight-cost-bar ${toneClass}`.trim();
    barEl.innerHTML = `
      <div class="tm-preflight-copy">
        <div class="tm-preflight-title">${escapeHtml(title)}</div>
        <div class="tm-preflight-sub">${escapeHtml(sub)}</div>
      </div>
      ${btnLabel ? `<button type="button" class="tm-preflight-buy-btn" id="${buyBtnId}">${escapeHtml(btnLabel)}</button>` : ''}
    `;
    barEl.style.display = 'flex';
    const buyBtn = barEl.querySelector(`#${buyBtnId}`);
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        if (btnAction === 'auth') {
          window.TubeMetrixAuth?.openAuthModal?.(modalSubtitle);
        } else {
          window.TubeMetrixAuth?.openCreditsModal?.(modalSubtitle, { neededCredits });
        }
      });
    }
  }

  function renderChatBatchPreflightBar(count, credits, loggedIn) {
    if (!el.chatBatchCostBar) return;
    if (count <= 0) {
      el.chatBatchCostBar.style.display = 'none';
      el.chatBatchCostBar.innerHTML = '';
      return;
    }
    if (!loggedIn) {
      return renderChatPreflightBar(el.chatBatchCostBar, 'chatBatchPreflightBuyBtn', {
        toneClass: 'is-warn',
        title: `🔒 Sign in & Credits Required (${count} CR Base + Extra Volume)`,
        sub: 'Bulk batch chat extraction does not use free quota. 1 CR unlocks stream + first 1,000 chats (1 CR / extra 1k chats actually fetched).',
        btnLabel: '🔑 Sign In / Buy Credits',
        btnAction: 'auth',
        neededCredits: count,
        modalSubtitle: `Sign in with Google and buy Credits for your ${count}-stream chat batch.`
      });
    }
    if (credits === 0) {
      return renderChatPreflightBar(el.chatBatchCostBar, 'chatBatchPreflightBuyBtn', {
        toneClass: 'is-danger',
        title: `⚠️ Insufficient Credits: 0 CR Available (Batch Needs ${count}+ CR)`,
        sub: 'Top up Credits before starting — otherwise batch runs cannot unlock the first stream.',
        btnLabel: '💎 Recharge Credits',
        neededCredits: count,
        modalSubtitle: `Your ${count}-stream batch needs at least ${count} CR (currently 0 CR). Recharge below.`
      });
    }
    if (credits < count) {
      const missing = count - credits;
      return renderChatPreflightBar(el.chatBatchCostBar, 'chatBatchPreflightBuyBtn', {
        toneClass: 'is-warn',
        title: `⚠️ Partial Balance: ${credits} CR Available vs ${count}+ CR Estimated`,
        sub: `We'll extract as far as ${credits} CR reaches, pause cleanly at 0 CR with progress saved, and let you resume.`,
        btnLabel: `💎 Top Up +${missing} CR`,
        neededCredits: count,
        modalSubtitle: `Your ${count}-stream batch needs at least ${count} CR (balance: ${credits} CR). Top up to finish in one pass.`
      });
    }
    return renderChatPreflightBar(el.chatBatchCostBar, 'chatBatchPreflightBuyBtn', {
      title: `✅ Ready: ${count} CR Base + Volume Metered • ${credits} CR Available`,
      sub: 'Fair billing: 1 CR per stream + 1 CR per extra 1,000 chats actually returned.'
    });
  }

  function updateCommentsCostPreview() {
    if (!el.commentsCostPreviewBar || !el.commentsLimitSelect) return;
    const limit = parseInt(el.commentsLimitSelect.value, 10) || 1000;
    const isHighVolume = limit > 1000;
    const neededCredits = Math.max(1, Math.ceil(limit / 1000));
    const auth = window.TubeMetrixAuth;
    const loggedIn = auth?.isLoggedIn?.() || false;
    const credits = auth?.getCreditsBalance?.() ?? 0;
    const freeLeft = auth?.getRemainingStreams?.() ?? 0;

    if (!isHighVolume) {
      if (freeLeft > 0) {
        return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
          title: `✅ Free Quota Eligible (${freeLeft} weekly free run${freeLeft === 1 ? '' : 's'} left)`,
          sub: `Up to ${limit.toLocaleString()} comments covered cleanly by your weekly allowance (0 Credits deducted).`
        });
      }
      if (!loggedIn) {
        return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
          toneClass: 'is-warn',
          title: `🔒 Free Quota Used — Sign In / 1 CR Required`,
          sub: `Your free weekly runs are used up. Sign in & top up 1 Credit to download up to ${limit.toLocaleString()} comments.`,
          btnLabel: '🔑 Sign In / Buy Credits',
          btnAction: 'auth',
          neededCredits: 1,
          modalSubtitle: `Sign in to continue downloading comments (1 CR per 1,000 comments).`
        });
      }
      if (credits < 1) {
        return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
          toneClass: 'is-danger',
          title: `⚠️ Weekly Free Quota Used & 0 Credits Available (Needs 1 CR)`,
          sub: `Top up 1 Credit to download up to ${limit.toLocaleString()} video comments.`,
          btnLabel: '💎 Recharge Credits',
          neededCredits: 1,
          modalSubtitle: `Free runs reached 0/week. Recharge Credits (₹49 / $2.99 packs) to extract up to 1,000 comments for 1 CR.`
        });
      }
      return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
        title: `✅ Ready: 1 CR Max • ${credits} CR Available`,
        sub: `Weekly free quota used; this extraction uses 1 Credit cleanly.`
      });
    }

    if (!loggedIn) {
      return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
        toneClass: 'is-warn',
        title: `🔒 Sign In Required • Up to ${neededCredits} CR Max (Zero Overcharge)`,
        sub: `Only 1 CR is billed upfront; remaining credits settle strictly per 1,000 actual comments found on YouTube.`,
        btnLabel: '🔑 Sign In / Buy Credits',
        btnAction: 'auth',
        neededCredits,
        modalSubtitle: `High-volume comments (up to ${limit.toLocaleString()}) use Prepaid Credits cleanly with zero overcharge.`
      });
    }
    if (credits === 0) {
      return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
        toneClass: 'is-danger',
        title: `⚠️ Insufficient Credits: 0 CR Available (Limit Needs 1–${neededCredits} CR)`,
        sub: `High-volume limits (>1,000) require Credits. You are never billed for comments a video doesn't have.`,
        btnLabel: '💎 Recharge Credits',
        neededCredits,
        modalSubtitle: `Downloading up to ${limit.toLocaleString()} comments needs 1–${neededCredits} CR (zero overcharge on shorter videos).`
      });
    }
    if (credits < neededCredits) {
      const missing = neededCredits - credits;
      return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
        toneClass: 'is-warn',
        title: `⚠️ Partial Balance: ${credits} CR Available vs Up to ${neededCredits} CR (${limit.toLocaleString()} Cap)`,
        sub: `Only 1 CR charges upfront. We'll fetch up to ${(credits * 1000).toLocaleString()} comments now, never overcharge if fewer exist, or let you top up for the rest.`,
        btnLabel: `💎 Top Up +${missing} CR`,
        neededCredits,
        modalSubtitle: `You have ${credits} CR and selected up to ${limit.toLocaleString()} comments (max ${neededCredits} CR if video has ${limit.toLocaleString()}+ comments).`
      });
    }
    return renderChatPreflightBar(el.commentsCostPreviewBar, 'commentsPreflightBuyBtn', {
      title: `✅ Ready: Up to ${neededCredits} CR Max • ${credits} CR Available (Zero Overcharge)`,
      sub: `Only 1 CR charges upfront, then 1 CR per 1,000 actual comments fetched (unused quota stays untouched).`
    });
  }

  window.refreshMultiBatchUI = () => {
    updateMultiChatQueueUI();
    updateCommentsCostPreview();
  };

  // ─────────────────────────────────────────────
  // 4. API CALLS & EXTRACTION ENGINES
  // ─────────────────────────────────────────────
  function extractVideoId(urlOrId) {
    if (!urlOrId) return '';
    const clean = urlOrId.trim();
    const m = clean.match(/(?:v=|\/|be\/|shorts\/|live\/)([0-9A-Za-z_-]{11})/);
    return m ? m[1] : (clean.length === 11 ? clean : '');
  }

  let chatProgressHeartbeatTimer = null;
  let chatElapsedTimer = null;
  let chatProcessStartedAt = 0;

  function formatElapsedBadge(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `⏱ ${mins}:${String(secs).padStart(2, '0')}`;
  }

  function startChatElapsedTimer() {
    if (chatElapsedTimer) clearInterval(chatElapsedTimer);
    chatProcessStartedAt = Date.now();
    if (el.processingElapsedBadge) {
      el.processingElapsedBadge.textContent = '⏱ 0:00';
      el.processingElapsedBadge.style.display = 'inline-block';
    }
    chatElapsedTimer = setInterval(() => {
      if (el.processingElapsedBadge && chatProcessStartedAt > 0) {
        el.processingElapsedBadge.textContent = formatElapsedBadge(Date.now() - chatProcessStartedAt);
      }
    }, 500);
  }

  function stopChatElapsedTimer() {
    if (chatElapsedTimer) {
      clearInterval(chatElapsedTimer);
      chatElapsedTimer = null;
    }
  }

  function startChatProgressHeartbeat(startPct, maxPct, stageTexts) {
    stopChatProgressHeartbeat();
    let currentPct = Number(startPct) || 15;
    let stageIdx = 0;
    const stages = Array.isArray(stageTexts) && stageTexts.length > 0 ? stageTexts : [];
    chatProgressHeartbeatTimer = setInterval(() => {
      if (currentPct < maxPct) {
        const step = Math.max(0.6, (maxPct - currentPct) * 0.14);
        currentPct = Math.min(maxPct, currentPct + step);
        const rounded = Math.round(currentPct);
        if (el.progressPercent) el.progressPercent.textContent = `${rounded}%`;
        if (el.progressBarFill) el.progressBarFill.style.width = `${rounded}%`;
      }
      if (stages.length > 0 && el.statusTicker) {
        stageIdx = (stageIdx + 1) % stages.length;
        el.statusTicker.textContent = stages[stageIdx];
      }
    }, 900);
  }

  function stopChatProgressHeartbeat() {
    if (chatProgressHeartbeatTimer) {
      clearInterval(chatProgressHeartbeatTimer);
      chatProgressHeartbeatTimer = null;
    }
  }

  function setProgress(percent, title, ticker, extracted = 0, unique = 0, events = 0) {
    if (!el.processingCard) return;
    el.processingCard.style.display = 'block';
    if (percent < 100 && !chatElapsedTimer) {
      startChatElapsedTimer();
    } else if (percent >= 100) {
      stopChatProgressHeartbeat();
      stopChatElapsedTimer();
    }
    if (el.progressPercent) el.progressPercent.textContent = `${Math.round(percent)}%`;
    if (el.progressBarFill) el.progressBarFill.style.width = `${percent}%`;
    if (el.statusTitle) el.statusTitle.textContent = title;
    if (el.statusTicker) el.statusTicker.textContent = ticker;
    if (el.countExtracted) el.countExtracted.textContent = extracted.toLocaleString();
    if (el.countUnique) el.countUnique.textContent = unique.toLocaleString();
    if (el.countEvents) el.countEvents.textContent = events.toLocaleString();

    if (percent >= 100 && el.progressActions) {
      el.progressActions.style.display = 'block';
    } else if (el.progressActions) {
      el.progressActions.style.display = 'none';
    }
  }

  function hideProgress() {
    stopChatProgressHeartbeat();
    stopChatElapsedTimer();
    if (el.processingCard) el.processingCard.style.display = 'none';
  }

  function maybeAutoOpenRechargeModal(ckpt) {
    if (!ckpt || ckpt.pauseReason !== 'credits_exhausted') return;
    const auth = window.TubeMetrixAuth;
    if (!auth?.isLoggedIn?.()) return;
    const bal = auth.getCreditsBalance?.() ?? 0;
    if (bal > 0) return;

    const remStreams = Array.isArray(ckpt.remainingVids) ? ckpt.remainingVids.length : 0;
    const tailCredits = Math.ceil((ckpt.lockedTail?.length || 0) / 1000);
    const serverCredits = ckpt.hasMoreOnServer
      ? (ckpt.requestedLimit
          ? Math.max(1, Math.ceil((ckpt.requestedLimit - (ckpt.unlockedOnStream || 0)) / 1000))
          : 1)
      : 0;
    const neededCredits = Math.max(1, remStreams + Math.max(tailCredits, serverCredits));

    let subtitle = 'Your Credits reached 0 CR mid-run, so remaining work is safely paused. Recharge Credits below to resume!';
    if (ckpt.kind === 'comments_overflow') {
      subtitle = `Downloaded ${(ckpt.unlockedOnStream || 0).toLocaleString()} comments cleanly before hitting 0 CR. Recharge Credits below and click Resume to unlock more!`;
    } else if (remStreams > 0) {
      subtitle = `Credits finished (${ckpt.completedVids?.length || 0} of ${ckpt.totalPlannedStreams || remStreams} streams completed, ${remStreams} queued). Recharge Credits below to resume!`;
    } else {
      subtitle = `Unlocked ${(ckpt.unlockedOnStream || 0).toLocaleString()} live chat messages cleanly before reaching 0 CR. Recharge Credits below to unlock the rest!`;
    }
    auth.openCreditsModal?.(subtitle, { neededCredits });
  }

  // Option A: Single Stream Live Chat
  // ── Level A: Credit Guard, Pause/Resume & Locked Tail Closure ──
  const CHAT_PAUSE_CKPT_KEY = 'chats_pause_v1';
  let activeChatPauseRequested = false;
  let isChatExtractionRunning = false;
  let currentChatCheckpoint = null;
  let chatCheckpointEpoch = 0;

  function aggregateMessagesIntoStats(messagesList, streamIdHint = 'stream_chat') {
    const msgs = Array.isArray(messagesList) ? messagesList : [];
    const uniqueChatters = new Set();
    const userMsgCounts = {};
    let totalSc = 0;
    let totalMem = 0;
    let totalJewels = 0;

    msgs.forEach((m, idx) => {
      m.idx = idx + 1;
      if (m.author) {
        uniqueChatters.add(m.author);
        userMsgCounts[m.author] = (userMsgCounts[m.author] || 0) + 1;
      }
      if (m.event_type === 'SUPERCHAT' || m.event_type === 'STICKER') totalSc++;
      else if (m.event_type === 'MEMBERSHIP' || m.event_type === 'GIFT') totalMem++;
      else if (m.event_type === 'JEWELS') totalJewels++;
    });

    const topChatters = Object.entries(userMsgCounts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    return {
      stream_id: streamIdHint,
      total_messages: msgs.length,
      unique_chatters: uniqueChatters.size,
      superchats_count: totalSc,
      memberships_count: totalMem,
      jewels_count: totalJewels,
      events_count: totalSc + totalMem + totalJewels,
      top_chatters: topChatters,
      messages: msgs,
    };
  }

  function updateChatLiveCreditBar(visible, noteText = '') {
    if (!el.chatLiveCreditBar) return;
    if (!visible) {
      el.chatLiveCreditBar.style.display = 'none';
      return;
    }
    el.chatLiveCreditBar.style.display = 'flex';
    const bal = window.TubeMetrixAuth?.getCreditsBalance
      ? window.TubeMetrixAuth.getCreditsBalance()
      : 0;
    if (el.chatLiveCreditPill) {
      el.chatLiveCreditPill.innerHTML = `💎 Credits Left: <strong>${bal} CR</strong>`;
      el.chatLiveCreditPill.classList.toggle('low', bal <= 1);
    }
    if (el.chatLiveMeterNote && noteText) {
      el.chatLiveMeterNote.textContent = noteText;
    }
    if (el.pauseChatBatchBtn) {
      el.pauseChatBatchBtn.disabled = Boolean(activeChatPauseRequested);
      el.pauseChatBatchBtn.textContent = activeChatPauseRequested
        ? '⏳ Stopping after current stream...'
        : '⏸ Pause & Save';
    }
  }

  function chatsBeforeUnloadHandler(e) {
    if (!isChatExtractionRunning) return;
    e.preventDefault();
    e.returnValue = 'Extraction is still running. Completed progress is saved, closing now may interrupt the active fetch.';
    return e.returnValue;
  }

  function setChatRunningFlag(running) {
    isChatExtractionRunning = Boolean(running);
    if (isChatExtractionRunning) {
      window.addEventListener('beforeunload', chatsBeforeUnloadHandler);
    } else {
      window.removeEventListener('beforeunload', chatsBeforeUnloadHandler);
    }
  }

  function renderChatCloudBadge(sectionType = 'chats', status = 'idle', backupId = '') {
    const hostSection = sectionType === 'comments' ? el.resultsCommentsSection : el.resultsChatSection;
    if (!hostSection) return;
    const badgeId = sectionType === 'comments' ? 'commentsCloudStatusBadge' : 'chatsCloudStatusBadge';
    let badge = document.getElementById(badgeId);
    if (!badge) {
      badge = document.createElement('div');
      badge.id = badgeId;
      badge.className = 'tm-cloud-status-host';
      hostSection.prepend(badge);
    }
    if (!status || status === 'idle') {
      badge.innerHTML = '';
      badge.style.display = 'none';
      return;
    }
    const labelMap = {
      saving: '☁️ Syncing 14-Day Cloud Backup (All Formats ZIP)...',
      completed: '☁️ Saved to 14-Day Cloud Backup (ZIP + Resume History)',
      paused: '☁️ Partial Progress Saved to 14-Day Cloud Backup',
      restored: '☁️ Restored from 14-Day Cloud Backup (0 Credits Used)',
    };
    badge.style.display = 'flex';
    badge.style.flexWrap = 'wrap';
    badge.style.gap = '10px';
    badge.style.marginBottom = '14px';
    badge.innerHTML = `<button type="button" class="tm-cloud-saved-pill" data-backup-id="${escapeHtml(backupId)}" title="Open My Cloud Backups & Recovery">${escapeHtml(labelMap[status] || labelMap.completed)}</button>`;
    const btn = badge.querySelector('.tm-cloud-saved-pill');
    if (btn) {
      btn.addEventListener('click', () => window.TubeMetrixBackups?.openBackupsModal?.());
    }
  }

  async function saveChatCheckpoint(ckpt, { allowGuest = false } = {}) {
    chatCheckpointEpoch++;
    currentChatCheckpoint = ckpt || null;
    if (!ckpt || !window.TubeMetrixAuth?.checkpoints) {
      renderChatLimitAndResumeBanners();
      return;
    }
    await window.TubeMetrixAuth.checkpoints.save(CHAT_PAUSE_CKPT_KEY, ckpt, { allowGuest });
    renderChatLimitAndResumeBanners();
  }

  async function clearChatCheckpoint() {
    chatCheckpointEpoch++;
    currentChatCheckpoint = null;
    if (window.TubeMetrixAuth?.checkpoints) {
      await window.TubeMetrixAuth.checkpoints.clear(CHAT_PAUSE_CKPT_KEY);
    }
    renderChatLimitAndResumeBanners();
  }

  window.__tmRestoreCloudBackup = async function tmRestoreChatCloudBackup({ action, backup, payload }) {
    if (!payload) return;
    const isComments =
      backup?.toolKind === 'comments' ||
      payload.kind === 'comments_overflow' ||
      Array.isArray(payload.comments);

    if (action === 'open') {
      await clearChatCheckpoint();
      if (isComments) {
        switchMode('comments');
        state.lastExtractionType = 'comments';
        renderCommentsReport(payload);
        renderChatCloudBadge('comments', 'restored', backup?.id || '');
      } else {
        switchMode('single');
        state.lastExtractionType = 'chats';
        renderLiveChatReport(payload, payload.title || backup?.title || 'Cloud Backup');
        renderChatCloudBadge('chats', 'restored', backup?.id || '');
      }
      return;
    }

    if (action === 'resume') {
      const ckptWithId = { ...payload, cloudBackupId: backup?.id || payload.cloudBackupId || '' };
      if (isComments) {
        switchMode('comments');
        state.lastExtractionType = 'comments';
        await saveChatCheckpoint(ckptWithId, { allowGuest: false });
        if (Array.isArray(ckptWithId.unlockedMessages) && ckptWithId.unlockedMessages.length > 0) {
          renderCommentsReport(buildCommentsStatsFromList(ckptWithId.unlockedMessages, ckptWithId.streamId, ckptWithId.title));
          renderChatCloudBadge('comments', 'paused', ckptWithId.cloudBackupId);
        }
      } else {
        switchMode('single');
        state.lastExtractionType = 'chats';
        await saveChatCheckpoint(ckptWithId, { allowGuest: false });
        if (Array.isArray(ckptWithId.unlockedMessages) && ckptWithId.unlockedMessages.length > 0) {
          const aggregated = aggregateMessagesIntoStats(ckptWithId.unlockedMessages, ckptWithId.streamId || 'saved_stream');
          renderLiveChatReport(aggregated, ckptWithId.title || backup?.title || 'Saved Session');
          renderChatCloudBadge('chats', 'paused', ckptWithId.cloudBackupId);
        }
      }
      const bal = window.TubeMetrixAuth?.getCreditsBalance?.() ?? 0;
      if (bal >= 1) {
        await handleResumeOrUnlockChatCheckpoint();
      } else {
        renderChatLimitAndResumeBanners();
        maybeAutoOpenRechargeModal(ckptWithId);
      }
    }
  };

  async function restoreSavedChatCheckpoint() {
    if (!window.TubeMetrixAuth?.checkpoints) return;
    if (await window.TubeMetrixBackups?.consumePendingRestoreIfReady?.(['chats', 'comments'])) {
      return;
    }
    const startEpoch = chatCheckpointEpoch;
    const saved = await window.TubeMetrixAuth.checkpoints.load(CHAT_PAUSE_CKPT_KEY);
    if (startEpoch !== chatCheckpointEpoch || isChatExtractionRunning) {
      return;
    }
    if (saved) {
      currentChatCheckpoint = saved;
      if (saved.kind === 'comments_overflow' && Array.isArray(saved.unlockedMessages) && saved.unlockedMessages.length > 0 && !state.commentsData) {
        state.lastExtractionType = 'comments';
        renderCommentsReport(buildCommentsStatsFromList(saved.unlockedMessages, saved.streamId, saved.title));
        renderChatLimitAndResumeBanners();
      } else if (Array.isArray(saved.unlockedMessages) && saved.unlockedMessages.length > 0 && !state.liveChatData) {
        const aggregated = aggregateMessagesIntoStats(saved.unlockedMessages, saved.streamId || 'saved_stream');
        renderLiveChatReport(aggregated, saved.title || 'Saved Session');
      } else {
        renderChatLimitAndResumeBanners();
      }
      return;
    }

    // Fallback cross-device cloud check when local IndexedDB has no saved checkpoint
    if (window.TubeMetrixBackups?.isEligible?.()) {
      try {
        const list = await window.TubeMetrixBackups.listBackups();
        const cloudPending = (list?.backups || []).find(
          (b) => (b.toolKind === 'chats' || b.toolKind === 'comments') && (b.status === 'in_progress' || b.status === 'paused') && b.hasResume
        );
        if (cloudPending && startEpoch === chatCheckpointEpoch && !isChatExtractionRunning) {
          const remotePayload = await window.TubeMetrixBackups.fetchResumePayload(cloudPending.id);
          if (remotePayload && startEpoch === chatCheckpointEpoch && !isChatExtractionRunning) {
            currentChatCheckpoint = { ...remotePayload, cloudBackupId: cloudPending.id };
            if (remotePayload.kind === 'comments_overflow' && Array.isArray(remotePayload.unlockedMessages) && remotePayload.unlockedMessages.length > 0 && !state.commentsData) {
              state.lastExtractionType = 'comments';
              renderCommentsReport(buildCommentsStatsFromList(remotePayload.unlockedMessages, remotePayload.streamId, remotePayload.title));
              renderChatCloudBadge('comments', 'paused', cloudPending.id);
              renderChatLimitAndResumeBanners();
            } else if (Array.isArray(remotePayload.unlockedMessages) && remotePayload.unlockedMessages.length > 0 && !state.liveChatData) {
              const aggregated = aggregateMessagesIntoStats(remotePayload.unlockedMessages, remotePayload.streamId || 'saved_stream');
              renderLiveChatReport(aggregated, remotePayload.title || cloudPending.title || 'Saved Session');
              renderChatCloudBadge('chats', 'paused', cloudPending.id);
            } else {
              renderChatLimitAndResumeBanners();
            }
            return;
          }
        }
      } catch (e) {
        console.warn('Cloud chat resume check failed:', e);
      }
    }

    currentChatCheckpoint = null;
    renderChatLimitAndResumeBanners();
  }

  function renderChatLimitAndResumeBanners() {
    const ckpt = currentChatCheckpoint;
    const hasLockedTail = Boolean(ckpt && Array.isArray(ckpt.lockedTail) && ckpt.lockedTail.length > 0);
    const hasContinuation = Boolean(ckpt && ckpt.hasMoreOnServer && ckpt.continuationToken);
    const hasRemainingStreams = Boolean(ckpt && Array.isArray(ckpt.remainingVids) && ckpt.remainingVids.length > 0);

    if (!ckpt || (!hasLockedTail && !hasContinuation && !hasRemainingStreams)) {
      if (el.chatResumeBanner) el.chatResumeBanner.style.display = 'none';
      if (el.chatCreditLimitBanner) el.chatCreditLimitBanner.style.display = 'none';
      if (el.commentsCreditLimitBanner) el.commentsCreditLimitBanner.style.display = 'none';
      return;
    }

    const isLoggedIn = window.TubeMetrixAuth?.isLoggedIn ? window.TubeMetrixAuth.isLoggedIn() : false;
    const bal = window.TubeMetrixAuth?.getCreditsBalance ? window.TubeMetrixAuth.getCreditsBalance() : 0;
    const lockedCount = hasLockedTail ? ckpt.lockedTail.length : 0;
    const remStreamsCount = hasRemainingStreams ? ckpt.remainingVids.length : 0;
    const creditsForLocked = Math.ceil(lockedCount / 1000);
    const totalEstimatedCredits = Math.max(hasContinuation ? 1 : 0, creditsForLocked + remStreamsCount);
    const unitNoun = ckpt.kind === 'comments_overflow' ? 'comments' : 'chats';

    let headline = '';
    let subtext = '';
    let primaryLabel = '';

    if ((hasLockedTail || hasContinuation) && hasRemainingStreams) {
      headline = hasLockedTail
        ? `⏸ Paused Mid-Stream (${ckpt.unlockedOnStream?.toLocaleString() || 0} of ${ckpt.lockedStreamTotal?.toLocaleString() || 0} chats shown • ${remStreamsCount} stream(s) waiting)`
        : `⏸ Paused Mid-Stream (${ckpt.unlockedOnStream?.toLocaleString() || 0} chats unlocked • More on stream + ${remStreamsCount} stream(s) waiting)`;
      subtext = hasLockedTail
        ? `${lockedCount.toLocaleString()} chat(s) locked on current stream + ${remStreamsCount} queued stream(s) remaining. Already unlocked data stays safely saved below.`
        : `Stopped cleanly at your available credit balance without wasting extra scraping time. Add credits or click Resume to continue.`;
    } else if (hasLockedTail) {
      headline = `🔒 Credit Limit Reached — Showing ${ckpt.unlockedOnStream?.toLocaleString() || 0} of ${ckpt.lockedStreamTotal?.toLocaleString() || 0} ${ckpt.kind === 'comments_overflow' ? 'Comments' : 'Chats'}`;
      subtext = `${lockedCount.toLocaleString()} extra ${unitNoun} are safely held and need up to ${creditsForLocked} Credit(s) to unlock & export (1 Credit = 1,000 ${unitNoun}).`;
    } else if (hasContinuation) {
      const capTag = ckpt.pauseReason === 'free_limit' ? 'Free Tier Limit (1,000)' : 'Credit Limit Reached';
      headline = `🔒 ${capTag} — Showing ${(ckpt.unlockedOnStream || 0).toLocaleString()} ${ckpt.kind === 'comments_overflow' ? 'Comments' : 'Chats'} (More Available)`;
      subtext = `Stopped early at your current allowance so zero extra ${unitNoun} were wasted. Buy credits or click Unlock Next Chunk to continue seamlessly.`;
    } else {
      const doneCount = ckpt.completedVids?.length || 0;
      const totalPlanned = ckpt.totalPlannedStreams || (doneCount + remStreamsCount);
      const reasonBadge = ckpt.pauseReason === 'manual' ? 'Manually Paused' : 'Out of Credits';
      headline = `⏸ ${reasonBadge} at Stream #${doneCount} of ${totalPlanned}`;
      subtext = `${doneCount} stream(s) extracted and ready to inspect/export below. ${remStreamsCount} remaining stream(s) are safely checkpointed.`;
    }

    if (!isLoggedIn) {
      primaryLabel = '🔑 Sign In & Buy Credits to Unlock';
    } else if (bal < 1) {
      primaryLabel = '💎 Buy Credits to Continue';
    } else if (hasLockedTail && creditsForLocked > bal) {
      const unlockNowCount = bal * 1000;
      primaryLabel = `▶ Unlock +${unlockNowCount.toLocaleString()} More (${bal} CR)`;
    } else if (hasLockedTail) {
      primaryLabel = hasRemainingStreams
        ? `▶ Unlock ${lockedCount.toLocaleString()} & Resume (${totalEstimatedCredits} CR)`
        : `▶ Unlock Remaining ${lockedCount.toLocaleString()} (${creditsForLocked} CR)`;
    } else if (hasContinuation) {
      primaryLabel = hasRemainingStreams
        ? `▶ Unlock More & Resume Batch (${bal} CR available)`
        : `▶ Unlock Next Chunk (${bal} CR available)`;
    } else {
      primaryLabel = `▶ Resume from Stream #${(ckpt.completedVids?.length || 0) + 1} (${remStreamsCount} left • ${bal} CR available)`;
    }

    const bannerHtml = `
      <div class="tm-limit-banner-inner">
        <div class="tm-limit-info">
          <div class="tm-limit-headline">${escapeHtml(headline)}</div>
          <div class="tm-limit-sub">${escapeHtml(subtext)}</div>
          <div class="tm-limit-meta">
            <span>💎 Balance: <strong>${bal} CR</strong></span>
            ${lockedCount > 0 ? `<span>🔒 Locked: <strong>${lockedCount.toLocaleString()}</strong></span>` : ''}
            ${!lockedCount && hasContinuation ? '<span>⚡ Server Resume Ready</span>' : ''}
            ${remStreamsCount > 0 ? `<span>⏳ Queued Streams: <strong>${remStreamsCount}</strong></span>` : ''}
          </div>
        </div>
        <div class="tm-limit-actions">
          <button type="button" class="btn-resume-primary" data-tm-chat-action="resume">${escapeHtml(primaryLabel)}</button>
          ${bal >= 1 && bal < totalEstimatedCredits ? '<button type="button" class="btn-resume-secondary" data-tm-chat-action="buy">💎 Buy More Credits</button>' : ''}
          <button type="button" class="btn-resume-dismiss" data-tm-chat-action="dismiss" title="Discard saved task">✕ Dismiss</button>
        </div>
      </div>
    `;

    const showingChatResults = Boolean(
      ckpt.kind !== 'comments_overflow' &&
        state.liveChatData &&
        el.resultsChatSection &&
        el.resultsChatSection.style.display !== 'none'
    );
    const showingCommentsResults = Boolean(
      ckpt.kind === 'comments_overflow' &&
        state.commentsData &&
        el.resultsCommentsSection &&
        el.resultsCommentsSection.style.display !== 'none'
    );

    const bannerTargets = [
      { el: el.chatCreditLimitBanner, show: showingChatResults },
      { el: el.commentsCreditLimitBanner, show: showingCommentsResults },
      { el: el.chatResumeBanner, show: !showingChatResults && !showingCommentsResults },
    ];

    bannerTargets.forEach(({ el: bannerEl, show }) => {
      if (!bannerEl) return;
      if (!show) {
        bannerEl.style.display = 'none';
        return;
      }
      bannerEl.innerHTML = bannerHtml;
      bannerEl.style.display = 'block';
      bannerEl.querySelectorAll('[data-tm-chat-action]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const act = btn.getAttribute('data-tm-chat-action');
          if (act === 'resume') await handleResumeOrUnlockChatCheckpoint();
          else if (act === 'buy') window.TubeMetrixAuth?.openCreditsModal?.();
          else if (act === 'dismiss') await clearChatCheckpoint();
        });
      });
    });
  }

  async function checkChatOrCommentsDuplicate({ videoIds, toolKind, onRefetchFresh }) {
    const ids = [...new Set((Array.isArray(videoIds) ? videoIds : []).filter(Boolean))];
    if (!ids.length || !window.TubeMetrixBackups?.isEligible?.()) return false;
    try {
      const dup = await window.TubeMetrixBackups.findRecentDuplicates(ids, toolKind);
      if (dup && dup.backup) {
        window.TubeMetrixBackups.promptDuplicateModal({
          backup: dup.backup,
          matchedIds: dup.matchedIds,
          onUseBackup: () => window.TubeMetrixBackups.triggerBackupAction(dup.backup, 'open'),
          onRefetchFresh,
        });
        return true;
      }
    } catch (e) {
      console.warn('Duplicate check skipped:', e);
    }
    return false;
  }

  async function syncCloudChatOrCommentsBackup({
    backupId,
    toolKind,
    mode,
    title,
    status,
    completedCount,
    totalCount,
    itemsCount,
    streamKeys,
    resumePayload = null,
    reportData = null,
    isComments = false,
  }) {
    if (!window.TubeMetrixBackups?.isEligible?.() || !backupId) return false;
    const sectionType = isComments ? 'comments' : 'chats';
    const shouldZip = (status === 'completed' || status === 'paused') && reportData && itemsCount > 0;
    if (shouldZip) {
      renderChatCloudBadge(sectionType, 'saving', backupId);
    }
    const bundleFiles = shouldZip
      ? buildChatOrCommentsBundleFiles(reportData, isComments, title)
      : null;
    const isFinalState = status === 'completed' || status === 'paused';
    const savePromise = window.TubeMetrixBackups.queueBackupSave(
      {
        id: backupId,
        toolKind,
        mode,
        title,
        status,
        completedCount,
        totalCount,
        itemsCount,
        streamKeys,
        resumePayload: status === 'completed' ? null : resumePayload,
        bundleFiles,
      },
      { immediate: isFinalState }
    );
    if (isFinalState) {
      const saved = await savePromise;
      renderChatCloudBadge(
        sectionType,
        saved ? (status === 'completed' ? 'completed' : 'paused') : 'idle',
        backupId
      );
      return Boolean(saved);
    }
    return true;
  }

  async function handleResumeOrUnlockChatCheckpoint() {
    const ckpt = currentChatCheckpoint;
    if (!ckpt) return;

    if (window.TubeMetrixAuth?.whenReady) {
      await window.TubeMetrixAuth.whenReady();
    }

    if (!window.TubeMetrixAuth?.isLoggedIn()) {
      window.TubeMetrixAuth?.openAuthModal?.(
        'Sign in with Google and purchase Credits to unlock remaining messages or resume your queued streams.'
      );
      return;
    }

    let bal = window.TubeMetrixAuth.getCreditsBalance();
    if (bal < 1) {
      const remCount = (Array.isArray(ckpt.remainingVids) ? ckpt.remainingVids.length : 0) +
        Math.max(ckpt.hasMoreOnServer ? 1 : 0, Math.ceil((ckpt.lockedTail?.length || 0) / 1000));
      window.TubeMetrixAuth?.openCreditsModal?.(
        `Your saved task needs at least ${Math.max(1, remCount)} Credit(s) to continue cleanly. Buy credits below — your unlocked progress is safely saved!`
      );
      return;
    }

    const resumeBackupId = ckpt.cloudBackupId || `${ckpt.kind === 'comments_overflow' ? 'comm' : 'chat'}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Step 1A: Unlock any already-buffered in-memory tail first
    if (Array.isArray(ckpt.lockedTail) && ckpt.lockedTail.length > 0) {
      const creditsNeeded = Math.ceil(ckpt.lockedTail.length / 1000);
      const unlockRes = await window.TubeMetrixAuth.unlockRemainingChatCredits({
        streamId: ckpt.streamId || '',
        totalMessages: ckpt.lockedStreamTotal || ((ckpt.unlockedOnStream || 0) + ckpt.lockedTail.length),
        unlockedCount: ckpt.unlockedOnStream || 0,
        creditsNeeded,
      });

      const added = Number(unlockRes?.addedMessageAllowance || (unlockRes?.deducted || 0) * 1000);
      if (added <= 0) {
        renderChatLimitAndResumeBanners();
        return;
      }

      const newlyUnlocked = ckpt.lockedTail.slice(0, added);
      const updatedMessages = [...(ckpt.unlockedMessages || []), ...newlyUnlocked].map((m, idx) => ({
        ...m,
        idx: idx + 1,
      }));
      const remainingTail = ckpt.lockedTail.slice(added);

      ckpt.cloudBackupId = resumeBackupId;
      ckpt.unlockedMessages = updatedMessages;
      ckpt.lockedTail = remainingTail;
      ckpt.unlockedOnStream = (ckpt.unlockedOnStream || 0) + newlyUnlocked.length;
      bal = window.TubeMetrixAuth.getCreditsBalance();

      const hasWorkLeft = remainingTail.length > 0 || ckpt.hasMoreOnServer || (ckpt.remainingVids && ckpt.remainingVids.length > 0);
      if (!hasWorkLeft) {
        await clearChatCheckpoint();
      } else {
        await saveChatCheckpoint(ckpt, { allowGuest: false });
      }

      if (ckpt.kind === 'comments_overflow') {
        const commReport = buildCommentsStatsFromList(updatedMessages, ckpt.streamId, ckpt.title);
        renderCommentsReport(commReport);
        renderChatLimitAndResumeBanners();
        await syncCloudChatOrCommentsBackup({
          backupId: resumeBackupId,
          toolKind: 'comments',
          mode: 'comments',
          title: ckpt.title || `Comments [${ckpt.streamId}]`,
          status: hasWorkLeft ? 'paused' : 'completed',
          completedCount: hasWorkLeft ? 0 : 1,
          totalCount: 1,
          itemsCount: updatedMessages.length,
          streamKeys: ckpt.streamId ? [ckpt.streamId] : [],
          resumePayload: hasWorkLeft ? ckpt : null,
          reportData: commReport,
          isComments: true,
        });
        if (hasWorkLeft && bal === 0) maybeAutoOpenRechargeModal(ckpt);
        return;
      }
      const refreshedReport = aggregateMessagesIntoStats(updatedMessages, ckpt.streamId || 'stream_chat');
      renderLiveChatReport(refreshedReport, ckpt.title || 'Live Chat Report');
      if (hasWorkLeft || (!ckpt.remainingVids || ckpt.remainingVids.length === 0)) {
        await syncCloudChatOrCommentsBackup({
          backupId: resumeBackupId,
          toolKind: 'chats',
          mode: ckpt.mode || 'single',
          title: ckpt.title || `Live Chat [${ckpt.streamId || 'Stream'}]`,
          status: hasWorkLeft ? 'paused' : 'completed',
          completedCount: ckpt.completedVids?.length || (hasWorkLeft ? 0 : 1),
          totalCount: ckpt.totalPlannedStreams || 1,
          itemsCount: updatedMessages.length,
          streamKeys: [...new Set([...(ckpt.completedVids || []), ...(ckpt.remainingVids || []), ckpt.streamId].filter(Boolean))],
          resumePayload: hasWorkLeft ? ckpt : null,
          reportData: { ...refreshedReport, title: ckpt.title || `Live Chat [${ckpt.streamId || 'Stream'}]` },
          isComments: false,
        });
      }
      if (hasWorkLeft && bal === 0) {
        maybeAutoOpenRechargeModal(ckpt);
      }
      if (remainingTail.length > 0 || (!ckpt.hasMoreOnServer && (!ckpt.remainingVids || ckpt.remainingVids.length === 0)) || bal < 1) {
        return;
      }
    }

    // Step 1B: Level B Server Continuation Unlock (fetch ONLY next affordable slice via cursor!)
    if (ckpt.hasMoreOnServer && ckpt.continuationToken && bal >= 1) {
      const isComments = ckpt.kind === 'comments_overflow';
      const maxSlice = Math.min(100000, bal * 1000);
      setChatRunningFlag(true);
      setProgress(25, `Unlocking Next ${isComments ? 'Comments' : 'Live Chat'} Chunk...`, `Streaming next up to ${maxSlice.toLocaleString()} items via cursor...`);

      try {
        if (isComments) {
          const reqMax = ckpt.requestedLimit
            ? Math.min(maxSlice, Math.max(1, ckpt.requestedLimit - (ckpt.unlockedOnStream || 0)))
            : maxSlice;
          const res = await fetchJsonWithRetry(`${API_BASE}/fetch-comments`, {
            url: ckpt.streamId,
            max_comments: reqMax,
            continuation_token: ckpt.continuationToken,
          });
          if (!res.success) {
            throw new Error(res.error || 'Failed to continue comments extraction.');
          }
          const newItems = res.comments || [];
          let allowedNew = newItems.length;
          if (newItems.length > 0 && window.TubeMetrixAuth?.unlockRemainingChatCredits) {
            const needCr = Math.ceil(newItems.length / 1000);
            const uRes = await window.TubeMetrixAuth.unlockRemainingChatCredits({
              streamId: ckpt.streamId,
              totalMessages: newItems.length,
              unlockedCount: 0,
              creditsNeeded: needCr,
              silent: true,
            });
            allowedNew = Math.min(newItems.length, Number(uRes?.addedMessageAllowance || 0));
          }
          const revealed = newItems.slice(0, allowedNew);
          const unrevealedTail = newItems.slice(allowedNew);
          const merged = [...(ckpt.unlockedMessages || []), ...revealed];
          ckpt.cloudBackupId = resumeBackupId;
          ckpt.unlockedMessages = merged;
          ckpt.lockedTail = unrevealedTail;
          ckpt.unlockedOnStream = (ckpt.unlockedOnStream || 0) + revealed.length;
          ckpt.continuationToken = res.continuation_token || '';
          const reachedRequested = ckpt.requestedLimit ? ckpt.unlockedOnStream >= ckpt.requestedLimit : false;
          ckpt.hasMoreOnServer = Boolean(!reachedRequested && res.has_more && res.continuation_token && unrevealedTail.length === 0);
          bal = window.TubeMetrixAuth.getCreditsBalance();
          const hasLeft = Boolean(ckpt.hasMoreOnServer || unrevealedTail.length > 0);
          if (!hasLeft) {
            await clearChatCheckpoint();
          } else {
            await saveChatCheckpoint(ckpt, { allowGuest: false });
          }
          setChatRunningFlag(false);
          hideProgress();
          const commReport = buildCommentsStatsFromList(merged, ckpt.streamId, ckpt.title);
          renderCommentsReport(commReport);
          renderChatLimitAndResumeBanners();
          await syncCloudChatOrCommentsBackup({
            backupId: resumeBackupId,
            toolKind: 'comments',
            mode: 'comments',
            title: ckpt.title || `Comments [${ckpt.streamId}]`,
            status: hasLeft ? 'paused' : 'completed',
            completedCount: hasLeft ? 0 : 1,
            totalCount: 1,
            itemsCount: merged.length,
            streamKeys: ckpt.streamId ? [ckpt.streamId] : [],
            resumePayload: hasLeft ? ckpt : null,
            reportData: commReport,
            isComments: true,
          });
          if (hasLeft && bal === 0) {
            maybeAutoOpenRechargeModal(ckpt);
          }
          return;
        }

        const res = await fetchJsonWithRetry(`${API_BASE}/fetch-chat`, {
          url: ckpt.streamId,
          max_messages: maxSlice,
          continuation_token: ckpt.continuationToken,
        });
        if (!res.success || !res.data) {
          throw new Error(res.message || 'Could not continue stream extraction.');
        }

        const newMsgs = (res.data.messages || []).map((m) => ({
          ...m,
          stream_id: m.stream_id || ckpt.streamId,
        }));
        let allowedNew = newMsgs.length;
        if (newMsgs.length > 0 && window.TubeMetrixAuth?.unlockRemainingChatCredits) {
          const needCr = Math.ceil(newMsgs.length / 1000);
          const uRes = await window.TubeMetrixAuth.unlockRemainingChatCredits({
            streamId: ckpt.streamId,
            totalMessages: newMsgs.length,
            unlockedCount: 0,
            creditsNeeded: needCr,
            silent: true,
          });
          allowedNew = Math.min(newMsgs.length, Number(uRes?.addedMessageAllowance || 0));
        }

        const revealed = newMsgs.slice(0, allowedNew);
        const unrevealedTail = newMsgs.slice(allowedNew);
        const merged = [...(ckpt.unlockedMessages || []), ...revealed].map((m, idx) => ({
          ...m,
          idx: idx + 1,
        }));

        ckpt.cloudBackupId = resumeBackupId;
        ckpt.unlockedMessages = merged;
        ckpt.lockedTail = unrevealedTail;
        ckpt.unlockedOnStream = (ckpt.unlockedOnStream || 0) + revealed.length;
        ckpt.continuationToken = res.continuation_token || '';
        ckpt.hasMoreOnServer = Boolean(res.has_more && res.continuation_token && unrevealedTail.length === 0);

        const stillHasCurrentStream = ckpt.lockedTail.length > 0 || ckpt.hasMoreOnServer;
        bal = window.TubeMetrixAuth.getCreditsBalance();
        if (!stillHasCurrentStream && (!ckpt.remainingVids || ckpt.remainingVids.length === 0)) {
          await clearChatCheckpoint();
        } else {
          await saveChatCheckpoint(ckpt, { allowGuest: false });
        }

        setChatRunningFlag(false);
        hideProgress();
        const midReport = aggregateMessagesIntoStats(merged, ckpt.streamId || 'stream_chat');
        renderLiveChatReport(midReport, ckpt.title || 'Live Chat Report');
        updateViewerSessionButton();

        if (stillHasCurrentStream || !ckpt.remainingVids || ckpt.remainingVids.length === 0 || bal < 1) {
          const hasBatchRem = Boolean(stillHasCurrentStream || (ckpt.remainingVids?.length || 0) > 0);
          await syncCloudChatOrCommentsBackup({
            backupId: resumeBackupId,
            toolKind: 'chats',
            mode: ckpt.mode || 'single',
            title: ckpt.title || `Live Chat [${ckpt.streamId || 'Stream'}]`,
            status: hasBatchRem ? 'paused' : 'completed',
            completedCount: ckpt.completedVids?.length || (hasBatchRem ? 0 : 1),
            totalCount: ckpt.totalPlannedStreams || 1,
            itemsCount: merged.length,
            streamKeys: [...new Set([...(ckpt.completedVids || []), ...(ckpt.remainingVids || []), ckpt.streamId].filter(Boolean))],
            resumePayload: hasBatchRem ? ckpt : null,
            reportData: { ...midReport, title: ckpt.title || 'Live Chat Report' },
            isComments: false,
          });
          if (hasBatchRem && bal === 0) {
            maybeAutoOpenRechargeModal(ckpt);
          }
          return;
        }
      } catch (err) {
        setChatRunningFlag(false);
        hideProgress();
        alert(`Resume Error: ${err.message}`);
        renderChatLimitAndResumeBanners();
        return;
      }
    }

    // Step 2: Continue remaining queued streams
    if (Array.isArray(ckpt.remainingVids) && ckpt.remainingVids.length > 0) {
      if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
      const remainingQueue = [...ckpt.remainingVids];
      const aggregatedData = await batchExtractChatMessages(remainingQueue, {
        mode: ckpt.mode || 'batch',
        paidByCredits: true,
        title: ckpt.title || 'Resumed Batch Extraction',
        initialMessages: ckpt.unlockedMessages || [],
        completedBefore: ckpt.completedVids || [],
        totalPlannedStreams: ckpt.totalPlannedStreams || ((ckpt.completedVids?.length || 0) + remainingQueue.length),
        cloudBackupId: resumeBackupId,
      });
      hideProgress();
      updateChatLiveCreditBar(false);
      renderLiveChatReport(aggregatedData, ckpt.title || 'Resumed Batch Extraction');
      if (aggregatedData.cloudStatus) {
        renderChatCloudBadge('chats', aggregatedData.cloudStatus, aggregatedData.cloudBackupId || resumeBackupId);
      }
      updateViewerSessionButton();
      maybeAutoOpenRechargeModal(currentChatCheckpoint);
    }
  }

  async function startSingleChatExtraction(options = {}) {
    const raw = el.chatSingleUrlInput.value.trim();
    const vid = extractVideoId(raw);
    if (!vid) {
      alert('Please enter a valid YouTube Live Stream URL or Video ID.');
      return;
    }
    if (!options?.skipDupCheck) {
      const dupHandled = await checkChatOrCommentsDuplicate({
        videoIds: [vid],
        toolKind: 'chats',
        onRefetchFresh: () => startSingleChatExtraction({ skipDupCheck: true }),
      });
      if (dupHandled) return;
    }
    if (window.TubeMetrixAuth) {
      if (typeof window.TubeMetrixAuth.authorizeRun === 'function') {
        if (!(await window.TubeMetrixAuth.authorizeRun(1, { mode: 'single', credits: 1 }))) return;
      } else if (typeof window.TubeMetrixAuth.checkQuota === 'function') {
        if (!window.TubeMetrixAuth.checkQuota(1, { mode: 'single' })) return;
      }
    }
    const runAuth = window.TubeMetrixAuth?.getLastRunAuth ? window.TubeMetrixAuth.getLastRunAuth() : null;
    const paidByCredits = runAuth?.reason === 'credits';
    const runBackupId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    el.startChatSingleBtn.disabled = true;
    setChatRunningFlag(true);
    activeChatPauseRequested = false;
    renderChatCloudBadge('chats', 'idle');
    updateChatLiveCreditBar(false);
    if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
    if (el.labelExtracted) el.labelExtracted.textContent = 'Extracted Messages';
    setProgress(15, `Connecting to Stream [${vid}]...`, 'Connecting to YouTube InnerTube streaming engine...');

    try {
      setProgress(25, `Extracting Live Chat Replay...`, 'Streaming in-memory chat replay chunks...');

      const remBalAfterBase = window.TubeMetrixAuth?.getCreditsBalance
        ? window.TubeMetrixAuth.getCreditsBalance()
        : 0;
      const maxFetch = paidByCredits ? Math.min(200000, 1000 + remBalAfterBase * 1000) : 1000;
      startChatProgressHeartbeat(25, 88, [
        `Connecting to YouTube live chat replay (${vid})...`,
        `Fetching up to ${maxFetch.toLocaleString()} live chat messages...`,
        'Parsing Superchats, Memberships, Jewels & active chatters...'
      ]);

      let streamTitle = `Live Stream [${vid}]`;
      let unlockedMessages = [];
      let lockedTail = [];
      let lastResData = null;
      let resElapsed = 0.5;
      let continuationToken = '';
      let hasServerMore = false;

      if (maxFetch <= 10000) {
        const res = await fetchJsonWithRetry(`${API_BASE}/fetch-chat`, {
          url: vid,
          max_messages: maxFetch,
        });
        stopChatProgressHeartbeat();
        if (!res.success || !res.data) {
          throw new Error(res.message || 'No live chat replay was found or chat is disabled for this stream.');
        }

        const rawMessages = (res.data.messages || []).map((m, idx) => ({
          ...m,
          idx: idx + 1,
          stream_id: m.stream_id || vid,
        }));
        streamTitle = res.title || streamTitle;
        lastResData = res.data;
        resElapsed = res.elapsed_sec || 0.5;

        let allowedCount = rawMessages.length;
        if (rawMessages.length > 1000) {
          if (paidByCredits && window.TubeMetrixAuth?.settleChatVolumeCredits) {
            const settleRes = await window.TubeMetrixAuth.settleChatVolumeCredits(rawMessages.length, vid);
            const extraDeducted = Number(settleRes?.deducted || 0);
            allowedCount = (1 + extraDeducted) * 1000;
          } else {
            allowedCount = 1000;
          }
        }
        unlockedMessages = rawMessages.slice(0, allowedCount);
        lockedTail = rawMessages.slice(allowedCount);
        hasServerMore = Boolean(lockedTail.length === 0 && res.has_more && res.continuation_token);
        continuationToken = hasServerMore ? res.continuation_token : '';
      } else {
        // Chunked 10k-item extraction loop so giant streams save incremental cloud progress safely
        let chunkIdx = 0;
        let nextToken = '';
        let keepFetching = true;

        while (keepFetching && unlockedMessages.length < maxFetch) {
          const chunkLimit = Math.min(10000, maxFetch - unlockedMessages.length);
          const payload = { url: vid, max_messages: chunkLimit };
          if (chunkIdx > 0 && nextToken) {
            payload.continuation_token = nextToken;
          }
          const res = await fetchJsonWithRetry(`${API_BASE}/fetch-chat`, payload);
          if (!res.success || !res.data) {
            if (chunkIdx === 0) {
              throw new Error(res.message || 'No live chat replay was found or chat is disabled for this stream.');
            }
            break;
          }
          if (res.title) streamTitle = res.title;
          resElapsed = (resElapsed || 0) + (res.elapsed_sec || 0);

          const chunkMsgs = (res.data.messages || []).map((m) => ({
            ...m,
            stream_id: m.stream_id || vid,
          }));
          if (!chunkMsgs.length) {
            hasServerMore = false;
            continuationToken = '';
            break;
          }

          let allowedInChunk = chunkMsgs.length;
          if (chunkIdx === 0) {
            if (chunkMsgs.length > 1000 && window.TubeMetrixAuth?.settleChatVolumeCredits) {
              const settleRes = await window.TubeMetrixAuth.settleChatVolumeCredits(chunkMsgs.length, vid);
              const extraDeducted = Number(settleRes?.deducted || 0);
              allowedInChunk = (1 + extraDeducted) * 1000;
            }
          } else if (window.TubeMetrixAuth?.unlockRemainingChatCredits) {
            const needCr = Math.ceil(chunkMsgs.length / 1000);
            const uRes = await window.TubeMetrixAuth.unlockRemainingChatCredits({
              streamId: vid,
              totalMessages: chunkMsgs.length,
              unlockedCount: 0,
              creditsNeeded: needCr,
              silent: true,
            });
            allowedInChunk = Math.min(chunkMsgs.length, Number(uRes?.addedMessageAllowance || 0));
          }

          const baseOffset = unlockedMessages.length;
          const chunkUnlocked = chunkMsgs.slice(0, allowedInChunk).map((m, idx) => ({
            ...m,
            idx: baseOffset + idx + 1,
          }));
          unlockedMessages.push(...chunkUnlocked);
          lockedTail = chunkMsgs.slice(allowedInChunk);
          nextToken = res.continuation_token || '';
          continuationToken = lockedTail.length === 0 && res.has_more && nextToken ? nextToken : '';
          hasServerMore = Boolean(continuationToken);
          keepFetching = hasServerMore && lockedTail.length === 0;
          chunkIdx++;

          if (keepFetching && unlockedMessages.length < maxFetch && window.TubeMetrixBackups?.isEligible?.()) {
            const incCkpt = {
              kind: 'single_overflow',
              mode: 'single',
              cloudBackupId: runBackupId,
              title: streamTitle,
              streamId: vid,
              unlockedMessages: [...unlockedMessages],
              lockedTail: [],
              continuationToken,
              hasMoreOnServer: true,
              unlockedOnStream: unlockedMessages.length,
              remainingVids: [],
              completedVids: [vid],
              totalPlannedStreams: 1,
              pauseReason: 'interrupted',
            };
            window.TubeMetrixAuth?.checkpoints?.save(CHAT_PAUSE_CKPT_KEY, incCkpt, { allowGuest: false });
            syncCloudChatOrCommentsBackup({
              backupId: runBackupId,
              toolKind: 'chats',
              mode: 'single',
              title: streamTitle,
              status: 'in_progress',
              completedCount: 0,
              totalCount: 1,
              itemsCount: unlockedMessages.length,
              streamKeys: [vid],
              resumePayload: incCkpt,
              isComments: false,
            });
          }
        }
        stopChatProgressHeartbeat();
      }

      state.lastExtractionType = 'chats';
      const isPausedCapped = lockedTail.length > 0 || hasServerMore;
      const totalFetchedKnown = unlockedMessages.length + lockedTail.length;
      const visibleReport = (isPausedCapped || !lastResData)
        ? aggregateMessagesIntoStats(unlockedMessages, vid)
        : {
            ...lastResData,
            stream_id: lastResData.stream_id || vid,
            total_messages: unlockedMessages.length,
            messages: unlockedMessages,
          };
      visibleReport.title = streamTitle;

      const ckptSnapshot = {
        kind: 'single_overflow',
        mode: 'single',
        cloudBackupId: runBackupId,
        title: streamTitle,
        streamId: vid,
        unlockedMessages,
        lockedTail,
        continuationToken: hasServerMore ? continuationToken : '',
        hasMoreOnServer: hasServerMore,
        lockedStreamTotal: lockedTail.length > 0 ? totalFetchedKnown : null,
        unlockedOnStream: unlockedMessages.length,
        remainingVids: [],
        completedVids: [vid],
        totalPlannedStreams: 1,
        pauseReason: paidByCredits ? 'credits_exhausted' : 'free_limit',
      };

      if (isPausedCapped) {
        await saveChatCheckpoint(ckptSnapshot, { allowGuest: !paidByCredits });
      } else {
        await clearChatCheckpoint();
      }

      const statusTicker = lockedTail.length > 0
        ? `Unlocked ${unlockedMessages.length.toLocaleString()} of ${totalFetchedKnown.toLocaleString()} messages (credit cap reached)`
        : hasServerMore
          ? `Unlocked ${unlockedMessages.length.toLocaleString()} messages (stopped cleanly at your allowance)`
          : `Processed ${visibleReport.total_messages} messages in ${resElapsed || 0.5}s`;

      setProgress(
        100,
        isPausedCapped ? 'Partial Limit Reached!' : 'Complete!',
        statusTicker,
        visibleReport.total_messages,
        visibleReport.unique_chatters,
        visibleReport.events_count
      );

      setTimeout(async () => {
        hideProgress();
        renderLiveChatReport(visibleReport, streamTitle);
        updateViewerSessionButton();
        if (isPausedCapped && paidByCredits) {
          maybeAutoOpenRechargeModal(currentChatCheckpoint);
        }
        if (visibleReport.total_messages > 0 && window.TubeMetrixBackups?.isEligible?.()) {
          await syncCloudChatOrCommentsBackup({
            backupId: runBackupId,
            toolKind: 'chats',
            mode: 'single',
            title: streamTitle,
            status: isPausedCapped ? 'paused' : 'completed',
            completedCount: isPausedCapped ? 0 : 1,
            totalCount: 1,
            itemsCount: unlockedMessages.length,
            streamKeys: [vid],
            resumePayload: isPausedCapped ? ckptSnapshot : null,
            reportData: visibleReport,
            isComments: false,
          });
        }
        setTimeout(() => window.TubeMetrixAuth?.maybePromptGuestUpgrade?.(), 650);
      }, 400);

    } catch (err) {
      stopChatProgressHeartbeat();
      hideProgress();
      alert(`Chat Extraction Error: ${err.message}`);
    } finally {
      setChatRunningFlag(false);
      el.startChatSingleBtn.disabled = false;
    }
  }

  // Option B: Channel Live Streams
  async function startChannelChatExtraction(options = {}) {
    // Require at least 1 credit to begin Channel Date Range scan
    if (window.TubeMetrixAuth) {
      const allowed = typeof window.TubeMetrixAuth.authorizeRun === 'function'
        ? await window.TubeMetrixAuth.authorizeRun(1, { mode: 'channel', credits: 1, checkOnly: true })
        : window.TubeMetrixAuth.hasCredits();
      if (!allowed) {
        if (typeof window.TubeMetrixAuth.authorizeRun !== 'function') {
          window.TubeMetrixAuth.openCreditsModal();
        }
        return;
      }
    }
    const channelUrl = el.chatChannelUrlInput.value.trim();
    if (!channelUrl) {
      alert('Please enter a YouTube Channel URL or handle (e.g. @channel or https://www.youtube.com/@channel/streams)');
      return;
    }

    const fromDate = el.chatFromDateInput.value;
    const toDate = el.chatToDateInput.value;

    el.startChatChannelBtn.disabled = true;
    renderChatCloudBadge('chats', 'idle');
    if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
    if (el.labelExtracted) el.labelExtracted.textContent = 'Extracted Messages';
    setProgress(10, 'Discovering Channel Live Streams...', `Querying YouTube channel ${channelUrl}...`);

    try {
      const cResp = await fetch(`${API_BASE}/channel-streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_url: channelUrl,
          from_date: fromDate || null,
          to_date: toDate || null,
          max_results: null
        })
      });

      if (!cResp.ok) throw new Error(`Failed to fetch channel streams (HTTP ${cResp.status})`);
      const cData = await cResp.json();

      if (!cData.success || !cData.streams || cData.streams.length === 0) {
        throw new Error('No live streams found for this channel matching the specified date range.');
      }

      const streams = cData.streams;
      if (!options?.skipDupCheck) {
        const dupHandled = await checkChatOrCommentsDuplicate({
          videoIds: streams.map((s) => s.id),
          toolKind: 'chats',
          onRefetchFresh: () => startChannelChatExtraction({ skipDupCheck: true }),
        });
        if (dupHandled) {
          hideProgress();
          return;
        }
      }

      const reportTitle = `${cData.channel} (${streams.length} Streams)`;
      setProgress(20, `Found ${streams.length} Streams`, `Starting stream-by-stream chat extraction (auto-pauses cleanly at 0 CR)...`);

      const aggregatedData = await batchExtractChatMessages(streams.map(s => s.id), {
        mode: 'channel',
        paidByCredits: true,
        title: reportTitle,
      });
      hideProgress();
      updateChatLiveCreditBar(false);
      if (aggregatedData.total_messages > 0 || (aggregatedData.completed_count || 0) > 0) {
        renderLiveChatReport(aggregatedData, reportTitle);
        if (aggregatedData.cloudStatus) {
          renderChatCloudBadge('chats', aggregatedData.cloudStatus, aggregatedData.cloudBackupId || '');
        }
        updateViewerSessionButton();
        maybeAutoOpenRechargeModal(currentChatCheckpoint);
      } else {
        window.TubeMetrixAuth?.openCreditsModal?.(
          'Your balance reached 0 CR before any stream could finish. Top up Credits to run.'
        );
      }

    } catch (err) {
      hideProgress();
      updateChatLiveCreditBar(false);
      alert(`Channel Audit Error: ${err.message}`);
    } finally {
      el.startChatChannelBtn.disabled = false;
    }
  }

  // Option C: Multi-URL Batch
  async function startMultiChatExtraction(options = {}) {
    if (state.multiUrlQueue.length === 0) {
      alert('Please add at least 1 stream to the batch list.');
      return;
    }
    if (!options?.skipDupCheck) {
      const dupHandled = await checkChatOrCommentsDuplicate({
        videoIds: state.multiUrlQueue,
        toolKind: 'chats',
        onRefetchFresh: () => startMultiChatExtraction({ skipDupCheck: true }),
      });
      if (dupHandled) return;
    }
    // Require at least 1 credit to start; claims stream-by-stream and pauses cleanly if balance hits 0
    if (window.TubeMetrixAuth) {
      if (typeof window.TubeMetrixAuth.authorizeRun === 'function') {
        if (!(await window.TubeMetrixAuth.authorizeRun(1, { mode: 'batch', credits: 1, checkOnly: true }))) return;
      } else if (typeof window.TubeMetrixAuth.checkQuota === 'function') {
        if (!window.TubeMetrixAuth.checkQuota(1, { mode: 'batch' })) return;
      }
    }

    const queue = [...state.multiUrlQueue];
    const reportTitle = `Custom URL Batch (${queue.length} Streams)`;
    el.startChatMultiBtn.disabled = true;
    renderChatCloudBadge('chats', 'idle');
    if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
    if (el.labelExtracted) el.labelExtracted.textContent = 'Extracted Messages';

    try {
      const aggregatedData = await batchExtractChatMessages(queue, {
        mode: 'batch',
        paidByCredits: true,
        title: reportTitle,
      });
      hideProgress();
      updateChatLiveCreditBar(false);
      if (aggregatedData.total_messages > 0 || (aggregatedData.completed_count || 0) > 0) {
        renderLiveChatReport(aggregatedData, reportTitle);
        if (aggregatedData.cloudStatus) {
          renderChatCloudBadge('chats', aggregatedData.cloudStatus, aggregatedData.cloudBackupId || '');
        }
        updateViewerSessionButton();
        maybeAutoOpenRechargeModal(currentChatCheckpoint);
      } else {
        window.TubeMetrixAuth?.openCreditsModal?.(
          'Insufficient Credits to process the first queued stream. Buy Credits to run.'
        );
      }
    } catch (err) {
      hideProgress();
      updateChatLiveCreditBar(false);
      alert(`Batch Extraction Error: ${err.message}`);
    } finally {
      el.startChatMultiBtn.disabled = false;
    }
  }

  // Helper: Batch Stream Chat Processor (Stream-by-Stream Metering + Safe Auto-Pause)
  async function batchExtractChatMessages(vids, options = {}) {
    const mode = options?.mode || 'batch';
    const paidByCredits = Boolean(options?.paidByCredits);
    const title = options?.title || `Batch (${vids.length} Streams)`;
    const initialMessages = Array.isArray(options?.initialMessages) ? options.initialMessages : [];
    const completedVids = Array.isArray(options?.completedBefore) ? [...options.completedBefore] : [];
    const totalPlanned = Math.max(vids.length + completedVids.length, Number(options?.totalPlannedStreams || vids.length));
    const runBackupId = options?.cloudBackupId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const allPlannedStreamKeys = [...new Set([...completedVids, ...vids].filter(Boolean))];

    activeChatPauseRequested = false;
    setChatRunningFlag(true);
    let allMessages = [...initialMessages];
    let lockedTail = [];
    let continuationToken = '';
    let hasMoreOnServer = false;
    let lockedStreamId = '';
    let lockedStreamTotal = 0;
    let unlockedOnStream = 0;
    let remainingVids = [];
    let pauseReason = '';

    const preBal = window.TubeMetrixAuth?.getCreditsBalance?.() ?? 0;
    const initMeterNote = paidByCredits && preBal < vids.length
      ? `Partial balance (${preBal} CR for ${vids.length} streams) — auto-stops cleanly at 0 CR`
      : `Done ${completedVids.length}/${totalPlanned} • Auto-stops at 0 CR`;
    updateChatLiveCreditBar(true, initMeterNote);

    for (let i = 0; i < vids.length; i++) {
      if (activeChatPauseRequested) {
        remainingVids = vids.slice(i);
        pauseReason = 'manual';
        break;
      }

      if (paidByCredits && window.TubeMetrixAuth?.authorizeRun) {
        const streamOk = await window.TubeMetrixAuth.authorizeRun(1, {
          mode,
          credits: 1,
          silent: true,
        });
        updateChatLiveCreditBar(true, `Stream ${completedVids.length + 1} of ${totalPlanned}`);
        if (!streamOk) {
          remainingVids = vids.slice(i);
          pauseReason = 'credits_exhausted';
          break;
        }
      }

      const vid = vids[i];
      const overallIdx = completedVids.length + 1;
      const pct = Math.min(99, Math.round((overallIdx / totalPlanned) * 100));
      const previewStats = aggregateMessagesIntoStats(allMessages, `batch_${totalPlanned}`);
      setProgress(
        pct,
        `Processing Streams: ${overallIdx} of ${totalPlanned} (${pct}%)`,
        `[Stream ${overallIdx}/${totalPlanned}] Extracting live chat for ${vid}...`,
        previewStats.total_messages,
        previewStats.unique_chatters,
        previewStats.events_count
      );

      try {
        const remBalAfterBase = window.TubeMetrixAuth?.getCreditsBalance
          ? window.TubeMetrixAuth.getCreditsBalance()
          : 0;
        const streamCap = paidByCredits ? Math.min(200000, 1000 + remBalAfterBase * 1000) : 1000;
        const maxStreamPct = Math.min(98, Math.round(((overallIdx + 0.85) / totalPlanned) * 100));
        startChatProgressHeartbeat(pct, maxStreamPct, [
          `[Stream ${overallIdx}/${totalPlanned}] Fetching chat chunks for ${vid}...`,
          `[Stream ${overallIdx}/${totalPlanned}] Parsing contributors & donation events...`
        ]);
        const res = await fetchJsonWithRetry(`${API_BASE}/fetch-chat`, {
          url: vid,
          max_messages: streamCap,
        });
        stopChatProgressHeartbeat();

        if (res.success && res.data && res.data.messages) {
          const rawMsgs = res.data.messages.map((m) => ({
            ...m,
            stream_id: m.stream_id || vid,
          }));

          let allowedForStream = rawMsgs.length;
          if (paidByCredits && rawMsgs.length > 1000 && window.TubeMetrixAuth?.settleChatVolumeCredits) {
            const settleRes = await window.TubeMetrixAuth.settleChatVolumeCredits(rawMsgs.length, vid);
            const extraDeducted = Number(settleRes?.deducted || 0);
            allowedForStream = (1 + extraDeducted) * 1000;
            updateChatLiveCreditBar(true, `Settled Stream ${overallIdx}/${totalPlanned}`);
          }

          const unlockedSlice = rawMsgs.slice(0, allowedForStream);
          unlockedSlice.forEach((m) => allMessages.push(m));
          completedVids.push(vid);

          const serverStopped = Boolean(rawMsgs.length <= allowedForStream && res.has_more && res.continuation_token);
          if (rawMsgs.length > allowedForStream || serverStopped) {
            lockedTail = rawMsgs.slice(allowedForStream);
            continuationToken = serverStopped ? res.continuation_token : '';
            hasMoreOnServer = serverStopped;
            lockedStreamId = vid;
            lockedStreamTotal = rawMsgs.length > allowedForStream ? rawMsgs.length : 0;
            unlockedOnStream = unlockedSlice.length;
            remainingVids = vids.slice(i + 1);
            pauseReason = 'credits_exhausted';
            break;
          }
        } else {
          completedVids.push(vid);
        }
      } catch (e) {
        stopChatProgressHeartbeat();
        console.warn(`Failed to process stream ${vid}:`, e);
        completedVids.push(vid);
      }

      // Incremental power-cut protection after every stream in batch
      const remAfterStream = vids.slice(i + 1);
      if (remAfterStream.length > 0 && (paidByCredits || window.TubeMetrixBackups?.isEligible?.())) {
        const incCkpt = {
          kind: mode === 'channel' ? 'channel' : 'batch',
          mode,
          cloudBackupId: runBackupId,
          title,
          streamId: `batch_${totalPlanned}`,
          unlockedMessages: [...allMessages],
          lockedTail: [],
          continuationToken: '',
          hasMoreOnServer: false,
          lockedStreamTotal: null,
          unlockedOnStream: 0,
          remainingVids: remAfterStream,
          completedVids: [...completedVids],
          totalPlannedStreams: totalPlanned,
          pauseReason: 'interrupted',
        };
        if (paidByCredits && window.TubeMetrixAuth?.checkpoints) {
          window.TubeMetrixAuth.checkpoints.save(CHAT_PAUSE_CKPT_KEY, incCkpt, { allowGuest: false });
        }
        if (window.TubeMetrixBackups?.isEligible?.()) {
          window.TubeMetrixBackups.queueBackupSave({
            id: runBackupId,
            toolKind: 'chats',
            mode,
            title,
            status: 'in_progress',
            completedCount: completedVids.length,
            totalCount: totalPlanned,
            itemsCount: allMessages.length,
            streamKeys: allPlannedStreamKeys,
            resumePayload: incCkpt,
          });
        }
      }
    }

    const stoppedEarly = Boolean(lockedTail.length > 0 || hasMoreOnServer || remainingVids.length > 0);
    const ckptPayload = {
      kind: mode === 'channel' ? 'channel' : 'batch',
      mode,
      cloudBackupId: runBackupId,
      title,
      streamId: lockedStreamId || `batch_${totalPlanned}`,
      unlockedMessages: allMessages,
      lockedTail,
      continuationToken,
      hasMoreOnServer,
      lockedStreamTotal: lockedStreamTotal || null,
      unlockedOnStream,
      remainingVids,
      completedVids,
      totalPlannedStreams: totalPlanned,
      pauseReason: pauseReason || 'credits_exhausted',
    };

    if (stoppedEarly) {
      await saveChatCheckpoint(ckptPayload, { allowGuest: false });
    } else {
      await clearChatCheckpoint();
    }

    const finalStats = aggregateMessagesIntoStats(allMessages, `batch_${totalPlanned}`);
    finalStats.completed_count = completedVids.length;
    finalStats.title = title;
    setChatRunningFlag(false);

    if (window.TubeMetrixBackups?.isEligible?.() && (stoppedEarly ? completedVids.length > 0 : allMessages.length > 0)) {
      finalStats.cloudStatus = 'saving';
      finalStats.cloudBackupId = runBackupId;
      syncCloudChatOrCommentsBackup({
        backupId: runBackupId,
        toolKind: 'chats',
        mode,
        title,
        status: stoppedEarly ? 'paused' : 'completed',
        completedCount: completedVids.length,
        totalCount: totalPlanned,
        itemsCount: allMessages.length,
        streamKeys: allPlannedStreamKeys,
        resumePayload: stoppedEarly ? ckptPayload : null,
        reportData: finalStats,
        isComments: false,
      }).catch(() => {});
    }

    return finalStats;
  }

  // Option D: Video Comments Downloader
  async function startCommentsDownload(options = {}) {
    const raw = el.commentsUrlInput.value.trim();
    const vid = extractVideoId(raw);
    if (!vid) {
      alert('Please enter a valid YouTube Video URL or Video ID.');
      return;
    }

    if (!options?.skipDupCheck) {
      const dupHandled = await checkChatOrCommentsDuplicate({
        videoIds: [vid],
        toolKind: 'comments',
        onRefetchFresh: () => startCommentsDownload({ skipDupCheck: true }),
      });
      if (dupHandled) return;
    }

    const limit = parseInt(el.commentsLimitSelect.value, 10) || 1000;
    const isHighVolume = limit > 1000;
    if (window.TubeMetrixAuth) {
      if (isHighVolume) {
        if (window.TubeMetrixAuth.whenReady) await window.TubeMetrixAuth.whenReady();
        if (!window.TubeMetrixAuth.isLoggedIn?.()) {
          window.TubeMetrixAuth.openAuthModal?.(
            `Downloading up to ${limit.toLocaleString()} video comments requires Google Sign-In and Prepaid Credits (1 Credit = 1,000 comments).`
          );
          return;
        }
        const ok = await window.TubeMetrixAuth.authorizeRun?.(1, { mode: 'comments', credits: 1 });
        if (!ok) return;
      } else if (typeof window.TubeMetrixAuth.authorizeRun === 'function') {
        if (!(await window.TubeMetrixAuth.authorizeRun(1, { mode: 'single', credits: 1 }))) return;
      } else if (typeof window.TubeMetrixAuth.checkQuota === 'function') {
        if (!window.TubeMetrixAuth.checkQuota(1, { mode: 'single' })) return;
      }
    }

    const remBalAfterBase = window.TubeMetrixAuth?.getCreditsBalance
      ? window.TubeMetrixAuth.getCreditsBalance()
      : 0;
    const affordableLimit = isHighVolume
      ? Math.min(limit, (1 + remBalAfterBase) * 1000)
      : limit;
    const runBackupId = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    el.startCommentsBtn.disabled = true;
    setChatRunningFlag(true);
    renderChatCloudBadge('comments', 'idle');
    if (el.resultsCommentsSection) el.resultsCommentsSection.style.display = 'none';
    if (el.labelExtracted) el.labelExtracted.textContent = 'Comments Downloaded';
    setProgress(20, `Fetching Video Comments [${vid}]...`, 'Connecting to YouTube InnerTube comments engine...');

    try {
      setProgress(25, `Streaming Comments (Target: ${affordableLimit.toLocaleString()})...`, 'Extracting comments, author handles, likes & replies...');
      startChatProgressHeartbeat(25, 88, [
        `Fetching up to ${affordableLimit.toLocaleString()} comments from YouTube (${vid})...`,
        'Collecting top comments, replies & pinned threads...',
        'Settling only actual comments returned (zero overcharge)...'
      ]);

      let videoTitle = `Video [${vid}]`;
      let unlockedComments = [];
      let lockedTail = [];
      let continuationToken = '';
      let hasMoreOnServer = false;
      let lastResObj = null;
      let resElapsed = 1.5;

      if (affordableLimit <= 10000) {
        const res = await fetchJsonWithRetry(`${API_BASE}/fetch-comments`, {
          url: vid,
          max_comments: affordableLimit,
        });
        stopChatProgressHeartbeat();

        if (!res.success) {
          throw new Error(res.error || 'Failed to download comments.');
        }

        const fetchedComments = (res.comments || []).map((c, idx) => ({
          ...c,
          idx: idx + 1,
          stream_id: c.stream_id || vid,
        }));
        videoTitle = res.title || videoTitle;
        lastResObj = res;
        resElapsed = res.elapsed_sec || 1.5;

        let allowedCount = fetchedComments.length;
        if (isHighVolume && fetchedComments.length > 1000 && window.TubeMetrixAuth?.settleChatVolumeCredits) {
          const settleRes = await window.TubeMetrixAuth.settleChatVolumeCredits(fetchedComments.length, vid);
          const extraDeducted = Number(settleRes?.deducted || 0);
          allowedCount = Math.min(fetchedComments.length, (1 + extraDeducted) * 1000);
        }

        unlockedComments = fetchedComments.slice(0, allowedCount);
        lockedTail = fetchedComments.slice(allowedCount);
        hasMoreOnServer = Boolean(
          lockedTail.length === 0 &&
            res.has_more &&
            res.continuation_token &&
            unlockedComments.length < limit
        );
        continuationToken = hasMoreOnServer ? res.continuation_token : '';
      } else {
        // Chunked 10k-item comment download so giant pulls save partial progress online cleanly
        let chunkIdx = 0;
        let nextToken = '';
        let keepFetching = true;
        resElapsed = 0;

        while (keepFetching && unlockedComments.length < affordableLimit) {
          const chunkLimit = Math.min(10000, affordableLimit - unlockedComments.length);
          const payload = { url: vid, max_comments: chunkLimit };
          if (chunkIdx > 0 && nextToken) {
            payload.continuation_token = nextToken;
          }
          const res = await fetchJsonWithRetry(`${API_BASE}/fetch-comments`, payload);
          if (!res.success) {
            if (chunkIdx === 0) {
              throw new Error(res.error || 'Failed to download comments.');
            }
            break;
          }
          if (res.title) videoTitle = res.title;
          resElapsed += (res.elapsed_sec || 0);

          const chunkItems = (res.comments || []).map((c) => ({
            ...c,
            stream_id: c.stream_id || vid,
          }));
          if (!chunkItems.length) {
            hasMoreOnServer = false;
            continuationToken = '';
            break;
          }

          let allowedInChunk = chunkItems.length;
          if (chunkIdx === 0) {
            if (isHighVolume && chunkItems.length > 1000 && window.TubeMetrixAuth?.settleChatVolumeCredits) {
              const settleRes = await window.TubeMetrixAuth.settleChatVolumeCredits(chunkItems.length, vid);
              const extraDeducted = Number(settleRes?.deducted || 0);
              allowedInChunk = Math.min(chunkItems.length, (1 + extraDeducted) * 1000);
            }
          } else if (window.TubeMetrixAuth?.unlockRemainingChatCredits) {
            const needCr = Math.ceil(chunkItems.length / 1000);
            const uRes = await window.TubeMetrixAuth.unlockRemainingChatCredits({
              streamId: vid,
              totalMessages: chunkItems.length,
              unlockedCount: 0,
              creditsNeeded: needCr,
              silent: true,
            });
            allowedInChunk = Math.min(chunkItems.length, Number(uRes?.addedMessageAllowance || 0));
          }

          const baseOffset = unlockedComments.length;
          const chunkUnlocked = chunkItems.slice(0, allowedInChunk).map((c, idx) => ({
            ...c,
            idx: baseOffset + idx + 1,
          }));
          unlockedComments.push(...chunkUnlocked);
          lockedTail = chunkItems.slice(allowedInChunk);
          nextToken = res.continuation_token || '';
          continuationToken = lockedTail.length === 0 && res.has_more && nextToken && unlockedComments.length < limit
            ? nextToken
            : '';
          hasMoreOnServer = Boolean(continuationToken);
          keepFetching = hasMoreOnServer && lockedTail.length === 0;
          chunkIdx++;

          if (keepFetching && unlockedComments.length < affordableLimit && window.TubeMetrixBackups?.isEligible?.()) {
            const incCkpt = {
              kind: 'comments_overflow',
              mode: 'comments',
              cloudBackupId: runBackupId,
              title: videoTitle,
              streamId: vid,
              unlockedMessages: [...unlockedComments],
              lockedTail: [],
              continuationToken,
              hasMoreOnServer: true,
              requestedLimit: limit,
              unlockedOnStream: unlockedComments.length,
              remainingVids: [],
              completedVids: [vid],
              totalPlannedStreams: 1,
              pauseReason: 'interrupted',
            };
            window.TubeMetrixAuth?.checkpoints?.save(CHAT_PAUSE_CKPT_KEY, incCkpt, { allowGuest: false });
            syncCloudChatOrCommentsBackup({
              backupId: runBackupId,
              toolKind: 'comments',
              mode: 'comments',
              title: videoTitle,
              status: 'in_progress',
              completedCount: 0,
              totalCount: 1,
              itemsCount: unlockedComments.length,
              streamKeys: [vid],
              resumePayload: incCkpt,
              isComments: true,
            });
          }
        }
        stopChatProgressHeartbeat();
      }

      const totalFetchedKnown = unlockedComments.length + lockedTail.length;
      const isPausedCapped = lockedTail.length > 0 || hasMoreOnServer;
      const ckptSnapshot = {
        kind: 'comments_overflow',
        mode: 'comments',
        cloudBackupId: runBackupId,
        title: videoTitle,
        streamId: vid,
        unlockedMessages: unlockedComments,
        lockedTail,
        continuationToken: hasMoreOnServer ? continuationToken : '',
        hasMoreOnServer,
        requestedLimit: limit,
        lockedStreamTotal: lockedTail.length > 0 ? totalFetchedKnown : null,
        unlockedOnStream: unlockedComments.length,
        remainingVids: [],
        completedVids: [vid],
        totalPlannedStreams: 1,
        pauseReason: 'credits_exhausted',
      };

      if (isPausedCapped) {
        await saveChatCheckpoint(ckptSnapshot, { allowGuest: false });
      } else {
        await clearChatCheckpoint();
      }

      const finalReport = (lockedTail.length > 0 || !lastResObj)
        ? buildCommentsStatsFromList(unlockedComments, vid, videoTitle)
        : {
            ...lastResObj,
            comments: unlockedComments,
            total_comments: unlockedComments.length,
          };

      state.commentsData = finalReport;
      state.lastExtractionType = 'comments';

      setProgress(
        100,
        isPausedCapped ? 'Partial Limit Reached!' : 'Complete!',
        `Downloaded ${finalReport.total_comments} comments in ${resElapsed || 1.5}s`,
        finalReport.total_comments,
        finalReport.unique_commenters,
        0
      );

      setTimeout(async () => {
        hideProgress();
        renderCommentsReport(finalReport);
        renderChatLimitAndResumeBanners();
        if (isHighVolume && isPausedCapped) {
          maybeAutoOpenRechargeModal(currentChatCheckpoint);
        }
        if (finalReport.total_comments > 0 && window.TubeMetrixBackups?.isEligible?.()) {
          await syncCloudChatOrCommentsBackup({
            backupId: runBackupId,
            toolKind: 'comments',
            mode: 'comments',
            title: videoTitle,
            status: isPausedCapped ? 'paused' : 'completed',
            completedCount: isPausedCapped ? 0 : 1,
            totalCount: 1,
            itemsCount: unlockedComments.length,
            streamKeys: [vid],
            resumePayload: isPausedCapped ? ckptSnapshot : null,
            reportData: finalReport,
            isComments: true,
          });
        }
        if (!isHighVolume) {
          setTimeout(() => window.TubeMetrixAuth?.maybePromptGuestUpgrade?.(), 650);
        }
      }, 400);

    } catch (err) {
      stopChatProgressHeartbeat();
      hideProgress();
      alert(`Comments Error: ${err.message}`);
    } finally {
      setChatRunningFlag(false);
      el.startCommentsBtn.disabled = false;
    }
  }

  // ─────────────────────────────────────────────
  // 5. INTERACTIVE VIEW RESULTS MODAL CONTROLLER
  // ─────────────────────────────────────────────
  function initChatViewer() {
    initInspectionModal();
  }

  function initInspectionModal() {
    // Open Local .json File button inside modal
    if (el.vmLoadLocalFileBtn && el.vmFileInput) {
      el.vmLoadLocalFileBtn.addEventListener('click', () => el.vmFileInput.click());
      el.vmFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleUploadedFileForViewer(e.target.files[0]);
        }
      });
    }

    // Quick Event filter pills inside Modal
    if (el.vmQuickBar) {
      el.vmQuickBar.querySelectorAll('.vm-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          el.vmQuickBar.querySelectorAll('.vm-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          state.viewer.filters.event = pill.dataset.eventFilter;
          applyViewerFilters();
        });
      });
    }

    // Stream ID Filter Dropdown (Crucial for bulk streams!)
    if (el.vmFilterStream) {
      el.vmFilterStream.addEventListener('change', (e) => {
        state.viewer.filters.streamId = e.target.value;
        applyViewerFilters();
      });
    }

    // User Role Filter
    if (el.vmFilterRole) {
      el.vmFilterRole.addEventListener('change', (e) => {
        state.viewer.filters.role = e.target.value;
        applyViewerFilters();
      });
    }

    // Min Superchat Amount Filter
    if (el.vmFilterMinAmount) {
      el.vmFilterMinAmount.addEventListener('change', (e) => {
        state.viewer.filters.minAmount = parseFloat(e.target.value) || 0;
        applyViewerFilters();
      });
    }

    // Sort Dropdown
    if (el.vmFilterSort) {
      el.vmFilterSort.addEventListener('change', (e) => {
        state.viewer.filters.sort = e.target.value;
        applyViewerFilters();
      });
    }

    // Live Search Input
    if (el.vmSearchInput) {
      el.vmSearchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        state.viewer.filters.searchQuery = val.toLowerCase().trim();
        if (el.vmSearchClearBtn) {
          el.vmSearchClearBtn.style.display = val.length > 0 ? 'flex' : 'none';
        }
        applyViewerFilters();
      });
    }

    if (el.vmSearchClearBtn) {
      el.vmSearchClearBtn.addEventListener('click', () => {
        if (el.vmSearchInput) {
          el.vmSearchInput.value = '';
          el.vmSearchInput.focus();
        }
        el.vmSearchClearBtn.style.display = 'none';
        state.viewer.filters.searchQuery = '';
        applyViewerFilters();
      });
    }

    // Reset Filters Button
    if (el.vmResetFiltersBtn) {
      el.vmResetFiltersBtn.addEventListener('click', resetViewerFilters);
    }

    // Table vs Feed Toggle
    if (el.vmToggleTableBtn && el.vmToggleFeedBtn) {
      el.vmToggleTableBtn.addEventListener('click', () => {
        state.viewer.style = 'table';
        el.vmToggleTableBtn.classList.add('active');
        el.vmToggleFeedBtn.classList.remove('active');
        if (el.vmTableContainer) el.vmTableContainer.style.display = 'block';
        if (el.vmFeedContainer) el.vmFeedContainer.style.display = 'none';
      });

      el.vmToggleFeedBtn.addEventListener('click', () => {
        state.viewer.style = 'feed';
        el.vmToggleFeedBtn.classList.add('active');
        el.vmToggleTableBtn.classList.remove('active');
        if (el.vmTableContainer) el.vmTableContainer.style.display = 'none';
        if (el.vmFeedContainer) el.vmFeedContainer.style.display = 'block';
      });
    }

    // Modal Export Suite
    if (el.vmExportExcelBtn) el.vmExportExcelBtn.addEventListener('click', exportViewerFilteredExcel);
    if (el.vmExportTxtBtn) el.vmExportTxtBtn.addEventListener('click', exportViewerFilteredTxt);
    if (el.vmExportCsvBtn) el.vmExportCsvBtn.addEventListener('click', exportViewerFilteredCsv);
    if (el.vmCopyVisibleBtn) el.vmCopyVisibleBtn.addEventListener('click', copyVisibleRowsToClipboard);
  }

  function openViewResultsModal(type = 'chats') {
    state.viewer.sourceType = type;

    if (type === 'chats') {
      if (!state.liveChatData || !state.liveChatData.messages || state.liveChatData.messages.length === 0) {
        alert('No live chats currently available to view. Please fetch or extract a stream first.');
        return;
      }
      loadDataIntoViewer(state.liveChatData, state.liveChatData.title || `Live Stream [${state.liveChatData.stream_id || 'Batch'}]`, '🔴 Live Stream Replay');
    } else if (type === 'comments') {
      if (!state.commentsData || !state.commentsData.comments || state.commentsData.comments.length === 0) {
        alert('No comments currently available to view. Please download comments from a video first.');
        return;
      }
      const adapted = adaptCommentsForViewer(state.commentsData);
      loadDataIntoViewer(adapted, state.commentsData.video_title || `Video [${state.commentsData.video_id}]`, '💬 Video Comments');
    }

    if (el.viewResultsModal) {
      el.viewResultsModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeViewResultsModal() {
    if (el.viewResultsModal) {
      el.viewResultsModal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  function adaptCommentsForViewer(commData) {
    const msgs = (commData.comments || []).map((c, idx) => ({
      idx: idx + 1,
      stream_id: c.stream_id || commData.video_id || '',
      time: c.published_time || 'Uploaded',
      author: c.author || 'Anonymous',
      event_type: 'COMMENT',
      message: c.text || '',
      badges: c.badges || [],
      likes: c.likes || 0,
      reply_count: c.reply_count || 0,
      details: c.likes ? `${c.likes} Likes` : ''
    }));

    return {
      stream_id: commData.video_id || 'comments',
      title: commData.video_title || 'Video Comments Feed',
      total_messages: msgs.length,
      messages: msgs
    };
  }

  function handleUploadedFileForViewer(file) {
    if (!file.name.endsWith('.json')) {
      alert('Please select a valid .json or .live_chat.json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const text = e.target.result;
        let parsed = null;

        try {
          const directJson = JSON.parse(text);
          if (directJson.messages && Array.isArray(directJson.messages)) {
            parsed = directJson;
          } else if (Array.isArray(directJson)) {
            parsed = {
              stream_id: file.name.replace('.json', ''),
              total_messages: directJson.length,
              messages: directJson
            };
          }
        } catch (err) { }

        if (!parsed) {
          const lines = text.split('\n');
          parsed = clientSideParseAllChat(lines, file.name.replace('.live_chat.json', '').replace('.json', ''));
        }

        if (!parsed || !parsed.messages || parsed.messages.length === 0) {
          alert('Could not find any live chat messages in this file.');
          return;
        }

        loadDataIntoViewer(parsed, file.name, '📂 Exported JSON File');
        if (el.viewResultsModal) {
          el.viewResultsModal.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }

      } catch (err) {
        alert(`Failed to parse file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  }

  function loadDataIntoViewer(chatData, title, sourceBadge) {
    state.viewer.data = chatData;

    // Header info
    if (el.vmTypeBadge) el.vmTypeBadge.textContent = sourceBadge || '🔴 Live Stream Chats';
    if (el.vmTitle) el.vmTitle.textContent = title || `Stream Results [${chatData.stream_id || 'Combined'}]`;

    // Populate Stream ID filter dropdown
    const uniqueStreams = Array.from(new Set((chatData.messages || []).map(m => m.stream_id).filter(Boolean)));
    if (el.vmFilterStream) {
      if (uniqueStreams.length > 1) {
        if (el.vmStreamFilterGroup) el.vmStreamFilterGroup.style.display = 'flex';
        el.vmFilterStream.innerHTML = `<option value="all">All Streams (${uniqueStreams.length})</option>` +
          uniqueStreams.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
      } else if (uniqueStreams.length === 1) {
        if (el.vmStreamFilterGroup) el.vmStreamFilterGroup.style.display = 'flex';
        el.vmFilterStream.innerHTML = `<option value="all">Stream: ${escapeHtml(uniqueStreams[0])}</option>`;
      } else {
        if (el.vmStreamFilterGroup) el.vmStreamFilterGroup.style.display = 'none';
      }
    }

    // Role / Min Amount visibility based on whether it is comments or chats
    const isComments = state.viewer.sourceType === 'comments';
    if (el.vmRoleFilterGroup) el.vmRoleFilterGroup.style.display = isComments ? 'none' : 'flex';
    if (el.vmMinAmountFilterGroup) el.vmMinAmountFilterGroup.style.display = isComments ? 'none' : 'flex';

    // Counts for quick pills
    let scCount = 0, memCount = 0, jewelsCount = 0, normalCount = 0;
    (chatData.messages || []).forEach(m => {
      if (m.event_type === 'SUPERCHAT' || m.event_type === 'STICKER') scCount++;
      else if (m.event_type === 'MEMBERSHIP' || m.event_type === 'GIFT') memCount++;
      else if (m.event_type === 'JEWELS') jewelsCount++;
      else normalCount++;
    });

    if (el.vmPillAll) el.vmPillAll.textContent = (chatData.messages || []).length.toLocaleString();
    if (el.vmPillSc) el.vmPillSc.textContent = scCount.toLocaleString();
    if (el.vmPillMem) el.vmPillMem.textContent = memCount.toLocaleString();
    if (el.vmPillJewels) el.vmPillJewels.textContent = jewelsCount.toLocaleString();
    if (el.vmPillNormal) el.vmPillNormal.textContent = normalCount.toLocaleString();

    resetViewerFilters();
  }

  function resetViewerFilters() {
    state.viewer.filters = {
      streamId: 'all',
      event: 'all',
      role: 'all',
      minAmount: 0,
      sort: 'time-asc',
      searchQuery: ''
    };

    if (el.vmQuickBar) {
      el.vmQuickBar.querySelectorAll('.vm-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.eventFilter === 'all');
      });
    }

    if (el.vmFilterStream) el.vmFilterStream.value = 'all';
    if (el.vmFilterRole) el.vmFilterRole.value = 'all';
    if (el.vmFilterMinAmount) el.vmFilterMinAmount.value = '0';
    if (el.vmFilterSort) el.vmFilterSort.value = 'time-asc';
    if (el.vmSearchInput) el.vmSearchInput.value = '';
    if (el.vmSearchClearBtn) el.vmSearchClearBtn.style.display = 'none';

    applyViewerFilters();
  }

  function applyViewerFilters() {
    if (!state.viewer.data || !state.viewer.data.messages) return;
    const all = state.viewer.data.messages;
    const f = state.viewer.filters;

    let filtered = all.filter(m => {
      // 1. Stream ID filter
      if (f.streamId && f.streamId !== 'all' && m.stream_id && m.stream_id !== f.streamId) return false;

      // 2. Event Type filter
      if (f.event === 'SUPERCHAT' && m.event_type !== 'SUPERCHAT' && m.event_type !== 'STICKER') return false;
      if (f.event === 'MEMBERSHIP' && m.event_type !== 'MEMBERSHIP' && m.event_type !== 'GIFT') return false;
      if (f.event === 'JEWELS' && m.event_type !== 'JEWELS') return false;
      if (f.event === 'CHAT' && m.event_type !== 'CHAT' && m.event_type !== 'COMMENT') return false;

      // 3. Role / Badge filter
      if (f.role !== 'all') {
        const badges = m.badges || [];
        if (f.role === 'OWNER' && !badges.includes('OWNER')) return false;
        if (f.role === 'MODERATOR' && !badges.includes('MODERATOR')) return false;
        if (f.role === 'MEMBER' && !badges.includes('MEMBER')) return false;
        if (f.role === 'VERIFIED' && !badges.includes('VERIFIED')) return false;
        if (f.role === 'REGULAR' && badges.length > 0) return false;
      }

      // 4. Min Superchat Amount filter
      if (f.minAmount > 0) {
        if (m.event_type !== 'SUPERCHAT' && m.event_type !== 'STICKER') return false;
        const amt = extractNumericAmount(m.amount || m.details || m.badge_label);
        if (amt < f.minAmount) return false;
      }

      // 5. Search Query
      if (f.searchQuery) {
        const q = f.searchQuery;
        const inAuthor = (m.author || '').toLowerCase().includes(q);
        const inMsg = (m.message || '').toLowerCase().includes(q);
        const inStream = (m.stream_id || '').toLowerCase().includes(q);
        const inDetails = (m.details || '').toLowerCase().includes(q);
        if (!inAuthor && !inMsg && !inStream && !inDetails) return false;
      }

      return true;
    });

    // 6. Sorting
    if (f.sort === 'time-asc') {
      filtered.sort((a, b) => a.idx - b.idx);
    } else if (f.sort === 'time-desc') {
      filtered.sort((a, b) => b.idx - a.idx);
    } else if (f.sort === 'sc-desc') {
      filtered.sort((a, b) => extractNumericAmount(b.amount || b.details) - extractNumericAmount(a.amount || a.details) || a.idx - b.idx);
    } else if (f.sort === 'author-asc') {
      filtered.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    } else if (f.sort === 'events-first') {
      const isEv = (x) => x.event_type !== 'CHAT' && x.event_type !== 'COMMENT' ? 1 : 0;
      filtered.sort((a, b) => isEv(b) - isEv(a) || a.idx - b.idx);
    }

    state.viewer.filteredMessages = filtered;

    // Update Counter & Footer
    if (el.vmCounter) {
      el.vmCounter.textContent = `${filtered.length.toLocaleString()} Messages`;
    }
    if (el.vmFooterStatus) {
      el.vmFooterStatus.textContent = `Showing ${filtered.length.toLocaleString()} of ${all.length.toLocaleString()} messages matching filters`;
    }

    renderViewerTable(filtered);
    renderViewerFeed(filtered);
  }

  function renderViewerTable(messages) {
    if (!el.vmTableBody) return;

    if (messages.length === 0) {
      el.vmTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 45px 20px; color: var(--text-muted);">
            No messages found matching your active filter combination. Click "Reset" above to clear filters.
          </td>
        </tr>
      `;
      return;
    }

    el.vmTableBody.innerHTML = messages.map(m => {
      let rowClass = '';
      let eventPill = `<span class="event-badge badge-chat">💬 Chat</span>`;

      if (m.event_type === 'SUPERCHAT' || m.event_type === 'STICKER') {
        rowClass = 'row-superchat';
        eventPill = `<span class="event-badge badge-superchat">⭐ ${escapeHtml(m.badge_label || m.details || m.amount || 'Super Chat')}</span>`;
      } else if (m.event_type === 'MEMBERSHIP' || m.event_type === 'GIFT') {
        rowClass = 'row-membership';
        eventPill = `<span class="event-badge badge-membership">💎 ${escapeHtml(m.badge_label || m.details || 'Membership')}</span>`;
      } else if (m.event_type === 'JEWELS') {
        rowClass = 'row-jewels';
        eventPill = `<span class="event-badge badge-jewels">🎁 Jewels</span>`;
      } else if (m.event_type === 'COMMENT') {
        eventPill = `<span class="event-badge badge-chat">💭 Comment ${m.likes ? `(${m.likes} 👍)` : ''}</span>`;
      }

      // Author Badges
      let authorBadgesHtml = '';
      if (m.badges && m.badges.length > 0) {
        if (m.badges.includes('OWNER')) authorBadgesHtml += `<span class="author-badge-icon badge-owner" title="Streamer / Channel Owner">👑</span>`;
        if (m.badges.includes('MODERATOR')) authorBadgesHtml += `<span class="author-badge-icon badge-mod" title="Chat Moderator">🛡️</span>`;
        if (m.badges.includes('MEMBER')) authorBadgesHtml += `<span class="author-badge-icon badge-member" title="Channel Member">💎</span>`;
        if (m.badges.includes('VERIFIED')) authorBadgesHtml += `<span class="author-badge-icon badge-verified" title="Verified Channel">✓</span>`;
      }

      // Stream ID link badge
      const streamHtml = m.stream_id ? `
        <a href="https://www.youtube.com/watch?v=${m.stream_id}" target="_blank" class="stream-id-badge" title="Open YouTube stream ${m.stream_id}">
          <span>${escapeHtml(m.stream_id)}</span>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
      ` : '-';

      // Clickable timestamp
      const secs = parseTimestampToSeconds(m.time);
      const timeHtml = (secs !== null && m.stream_id && m.stream_id.length === 11) ? `
        <a href="https://www.youtube.com/watch?v=${m.stream_id}&t=${secs}s" target="_blank" class="timestamp-badge" title="Jump to ${m.time} in Video">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>${m.time || '0:00'}</span>
        </a>
      ` : `<span class="timestamp-badge">${m.time || '0:00'}</span>`;

      return `
        <tr class="${rowClass}">
          <td class="cell-num">#${m.idx}</td>
          <td>${streamHtml}</td>
          <td>${timeHtml}</td>
          <td>
            <div class="author-cell">
              <span class="author-name" title="${escapeHtml(m.author)}">${escapeHtml(m.author)}</span>
              ${authorBadgesHtml}
            </div>
          </td>
          <td>${eventPill}</td>
          <td class="chat-msg-cell">
            <span class="msg-text">${escapeHtml(m.message || '-')}</span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderViewerFeed(messages) {
    if (!el.vmFeedStream) return;

    if (messages.length === 0) {
      el.vmFeedStream.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          No chat messages to display.
        </div>
      `;
      return;
    }

    el.vmFeedStream.innerHTML = messages.map(m => {
      let badgesHtml = '';
      if (m.badges && m.badges.length > 0) {
        if (m.badges.includes('OWNER')) badgesHtml += `<span title="Streamer">👑</span>`;
        if (m.badges.includes('MODERATOR')) badgesHtml += `<span title="Moderator">🛡️</span>`;
        if (m.badges.includes('MEMBER')) badgesHtml += `<span title="Member">💎</span>`;
        if (m.badges.includes('VERIFIED')) badgesHtml += `<span title="Verified">✓</span>`;
      }

      if (m.event_type === 'SUPERCHAT' || m.event_type === 'STICKER') {
        const amtVal = extractNumericAmount(m.amount || m.details);
        let headerColor = 'sc-amber';
        if (amtVal >= 1000) headerColor = 'sc-red';
        else if (amtVal >= 500) headerColor = 'sc-amber';
        else headerColor = 'sc-green';

        return `
          <div class="feed-msg-row">
            <span class="feed-time">${m.time || '0:00'}</span>
            <div class="feed-body">
              <div class="feed-sc-card">
                <div class="feed-sc-header ${headerColor}">
                  <span>⭐ ${escapeHtml(m.author)} ${badgesHtml}</span>
                  <span>${escapeHtml(m.amount || m.details || 'Super Chat')}</span>
                </div>
                ${m.message && m.message !== '[Super Chat]' && m.message !== '[Super Sticker]' ? `
                  <div class="feed-sc-body">${escapeHtml(m.message)}</div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      } else if (m.event_type === 'MEMBERSHIP' || m.event_type === 'GIFT') {
        return `
          <div class="feed-msg-row">
            <span class="feed-time">${m.time || '0:00'}</span>
            <div class="feed-body">
              <div class="feed-mem-card">
                <strong style="color:var(--accent-purple);">💎 ${escapeHtml(m.author)}</strong> ${badgesHtml}:
                <span>${escapeHtml(m.message || m.details || 'Joined Channel Membership')}</span>
              </div>
            </div>
          </div>
        `;
      } else if (m.event_type === 'JEWELS') {
        return `
          <div class="feed-msg-row">
            <span class="feed-time">${m.time || '0:00'}</span>
            <div class="feed-body">
              <div class="feed-jewel-card">
                <strong style="color:var(--accent-amber);">🎁 ${escapeHtml(m.author)}:</strong>
                <span>${escapeHtml(m.message || 'Sent YouTube Jewels Gift')}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="feed-msg-row">
            <span class="feed-time">${m.time || '0:00'}</span>
            <div class="feed-body">
              <div class="feed-header">
                <span class="feed-author">${escapeHtml(m.author)}</span>
                ${badgesHtml}
                <span style="color:var(--text-muted); font-size:0.85rem;">:</span>
                <span class="feed-text">${escapeHtml(m.message || '')}</span>
              </div>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  function copyVisibleRowsToClipboard() {
    const list = state.viewer.filteredMessages || [];
    if (list.length === 0) {
      alert('No rows currently visible to copy.');
      return;
    }

    const header = ['#', 'Stream ID', 'Time', 'Author', 'Event Type', 'Message Content'].join('\t');
    const rows = list.map(m => [
      m.idx,
      m.stream_id || '-',
      m.time || '-',
      m.author || '-',
      m.event_type || '-',
      (m.message || '').replace(/[\r\n\t]+/g, ' ')
    ].join('\t'));

    const text = [header, ...rows].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const orig = el.vmCopyVisibleBtn.innerHTML;
      el.vmCopyVisibleBtn.innerHTML = '<span>✓ Copied to Clipboard!</span>';
      setTimeout(() => {
        el.vmCopyVisibleBtn.innerHTML = orig;
      }, 1800);
    }).catch(err => {
      alert(`Could not copy to clipboard: ${err.message}`);
    });
  }

  // ─────────────────────────────────────────────
  // 6. RENDER LIVE CHAT REPORT (URL EXTRACTOR)
  // ─────────────────────────────────────────────
  function renderLiveChatReport(data, streamTitle) {
    state.liveChatData = data;
    if (el.resultsChatSection) {
      el.resultsChatSection.style.display = 'block';
      el.resultsChatSection.scrollIntoView({ behavior: 'smooth' });
    }

    if (el.kpiChatTotal) el.kpiChatTotal.textContent = data.total_messages.toLocaleString();
    if (el.kpiChatStreamInfo) el.kpiChatStreamInfo.textContent = streamTitle || `Stream [${data.stream_id}]`;
    if (el.kpiChatUnique) el.kpiChatUnique.textContent = data.unique_chatters.toLocaleString();
    if (el.kpiChatSuperchat) el.kpiChatSuperchat.textContent = `${data.superchats_count} Recorded`;
    if (el.kpiChatMemberships) el.kpiChatMemberships.textContent = `${data.memberships_count} Sponsors`;
    if (el.kpiChatJewels) el.kpiChatJewels.textContent = `${data.jewels_count} Gifts`;

    if (data.top_chatters && data.top_chatters.length > 0 && el.leaderboardCard && el.leaderboardChips) {
      el.leaderboardCard.style.display = 'block';
      el.leaderboardChips.innerHTML = data.top_chatters.slice(0, 10).map((c, idx) => {
        const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
        return `
          <div class="leaderboard-chip ${idx < 3 ? 'top' : ''}" title="${escapeHtml(c.author)}: ${c.count} messages">
            <span class="lb-medal">${medal}</span>
            <span class="lb-author">${escapeHtml(c.author)}</span>
            <span class="lb-count">${c.count} msgs</span>
          </div>
        `;
      }).join('');
    } else if (el.leaderboardCard) {
      el.leaderboardCard.style.display = 'none';
    }

    if (el.badgeAllChats) el.badgeAllChats.textContent = data.total_messages;
    if (el.badgeScOnly) el.badgeScOnly.textContent = data.superchats_count;
    if (el.badgeMemOnly) el.badgeMemOnly.textContent = data.memberships_count;
    if (el.badgeJewelOnly) el.badgeJewelOnly.textContent = data.jewels_count;

    const modCount = data.messages.filter(m => m.badges && (m.badges.includes('MODERATOR') || m.badges.includes('MEMBER'))).length;
    if (el.badgeModsOnly) el.badgeModsOnly.textContent = modCount;

    applyChatFiltersAndRender();
    renderChatLimitAndResumeBanners();
  }

  function applyChatFiltersAndRender() {
    if (!state.liveChatData) return;
    const all = state.liveChatData.messages;
    const filter = state.activeChatFilter;
    const query = el.chatSearchInput ? el.chatSearchInput.value.toLowerCase().trim() : '';

    let filtered = all.filter(m => {
      if (filter === 'SUPERCHAT' && m.event_type !== 'SUPERCHAT' && m.event_type !== 'STICKER') return false;
      if (filter === 'MEMBERSHIP' && m.event_type !== 'MEMBERSHIP' && m.event_type !== 'GIFT') return false;
      if (filter === 'JEWELS' && m.event_type !== 'JEWELS') return false;
      if (filter === 'MODERATOR' && (!m.badges || (!m.badges.includes('MODERATOR') && !m.badges.includes('MEMBER')))) return false;

      if (query) {
        const inAuthor = (m.author || '').toLowerCase().includes(query);
        const inMsg = (m.message || '').toLowerCase().includes(query);
        const inDetails = (m.details || '').toLowerCase().includes(query);
        return inAuthor || inMsg || inDetails;
      }
      return true;
    });

    const sort = state.activeChatSort;
    if (sort === 'time-asc') {
      filtered.sort((a, b) => a.idx - b.idx);
    } else if (sort === 'time-desc') {
      filtered.sort((a, b) => b.idx - a.idx);
    } else if (sort === 'author-asc') {
      filtered.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    } else if (sort === 'events-first') {
      const isEv = (x) => x.event_type !== 'CHAT' ? 1 : 0;
      filtered.sort((a, b) => isEv(b) - isEv(a) || a.idx - b.idx);
    }

    state.filteredMessages = filtered;
    renderChatFeedTable(filtered);
  }

  function renderChatFeedTable(messages) {
    if (!el.chatFeedTableBody) return;

    if (messages.length === 0) {
      el.chatFeedTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No chat messages found matching your active filter.
          </td>
        </tr>
      `;
      return;
    }

    el.chatFeedTableBody.innerHTML = messages.map(m => {
      let rowClass = '';
      let eventPill = `<span class="event-badge badge-chat">Chat</span>`;

      if (m.event_type === 'SUPERCHAT' || m.event_type === 'STICKER') {
        rowClass = 'row-superchat';
        eventPill = `<span class="event-badge badge-superchat">⭐ ${escapeHtml(m.badge_label || 'Super Chat')}</span>`;
      } else if (m.event_type === 'MEMBERSHIP' || m.event_type === 'GIFT') {
        rowClass = 'row-membership';
        eventPill = `<span class="event-badge badge-membership">💎 ${escapeHtml(m.badge_label || 'Membership')}</span>`;
      } else if (m.event_type === 'JEWELS') {
        rowClass = 'row-jewels';
        eventPill = `<span class="event-badge badge-jewels">🎁 Jewels</span>`;
      }

      let authorBadgesHtml = '';
      if (m.badges && m.badges.length > 0) {
        if (m.badges.includes('OWNER')) authorBadgesHtml += `<span class="author-badge-icon badge-owner" title="Streamer / Channel Owner">👑</span>`;
        if (m.badges.includes('MODERATOR')) authorBadgesHtml += `<span class="author-badge-icon badge-mod" title="Chat Moderator">🛡️</span>`;
        if (m.badges.includes('MEMBER')) authorBadgesHtml += `<span class="author-badge-icon badge-member" title="Channel Member">💎</span>`;
        if (m.badges.includes('VERIFIED')) authorBadgesHtml += `<span class="author-badge-icon badge-verified" title="Verified">✓</span>`;
      }

      const secs = parseTimestampToSeconds(m.time);
      const timeHtml = (secs !== null && m.stream_id) ? `
        <a href="https://www.youtube.com/watch?v=${m.stream_id}&t=${secs}s" target="_blank" class="timestamp-badge" title="Jump to ${m.time} in Video">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <span>${m.time || '0:00'}</span>
        </a>
      ` : `<span class="timestamp-badge">${m.time || '0:00'}</span>`;

      return `
        <tr class="${rowClass}">
          <td class="cell-num">#${m.idx}</td>
          <td>${timeHtml}</td>
          <td>
            <div class="author-cell">
              <span class="author-name" title="${escapeHtml(m.author)}">${escapeHtml(m.author)}</span>
              ${authorBadgesHtml}
            </div>
          </td>
          <td>${eventPill}</td>
          <td class="chat-msg-cell">
            <span class="msg-text">${escapeHtml(m.message || '-')}</span>
          </td>
          <td>
            <a href="https://www.youtube.com/watch?v=${m.stream_id}" target="_blank" class="stream-vid-badge" title="Open Stream">
              ${m.stream_id || '-'} ↗
            </a>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ─────────────────────────────────────────────
  // 7. RENDER VIDEO COMMENTS REPORT (Tab D)
  // ─────────────────────────────────────────────
  function renderCommentsReport(data) {
    state.commentsData = data;
    if (el.resultsCommentsSection) {
      el.resultsCommentsSection.style.display = 'block';
      el.resultsCommentsSection.scrollIntoView({ behavior: 'smooth' });
    }

    if (el.kpiCommTotal) el.kpiCommTotal.textContent = data.total_comments.toLocaleString();
    if (el.kpiCommVideoTitle) el.kpiCommVideoTitle.textContent = data.title || `Video [${data.video_id}]`;
    if (el.kpiCommUnique) el.kpiCommUnique.textContent = data.unique_commenters.toLocaleString();
    if (el.kpiCommTotalLikes) el.kpiCommTotalLikes.textContent = data.total_likes.toLocaleString();

    if (data.comments && data.comments.length > 0) {
      const topLiked = [...data.comments].sort((a, b) => b.likes - a.likes)[0];
      if (el.kpiCommTopLikes) el.kpiCommTopLikes.textContent = `${topLiked.likes_display || topLiked.likes} Likes`;
      if (el.kpiCommTopAuthor) el.kpiCommTopAuthor.textContent = `${topLiked.author}`;
    }

    applyCommentsFiltersAndRender();
  }

  function applyCommentsFiltersAndRender() {
    if (!state.commentsData) return;
    const all = state.commentsData.comments;
    const query = el.commSearchInput ? el.commSearchInput.value.toLowerCase().trim() : '';

    let filtered = all.filter(c => {
      if (query) {
        return (c.author || '').toLowerCase().includes(query) || (c.text || '').toLowerCase().includes(query);
      }
      return true;
    });

    const sort = state.activeCommSort;
    if (sort === 'likes-desc') {
      filtered.sort((a, b) => b.likes - a.likes);
    } else if (sort === 'newest-first') {
      filtered.sort((a, b) => a.idx - b.idx);
    } else if (sort === 'author-asc') {
      filtered.sort((a, b) => (a.author || '').localeCompare(b.author || ''));
    } else if (sort === 'replies-desc') {
      filtered.sort((a, b) => b.reply_count - a.reply_count);
    }

    state.filteredComments = filtered;
    renderCommentsTable(filtered);
  }

  function renderCommentsTable(comments) {
    if (!el.commentsTableBody) return;

    if (comments.length === 0) {
      el.commentsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No comments found matching your active search.
          </td>
        </tr>
      `;
      return;
    }

    el.commentsTableBody.innerHTML = comments.map(c => {
      const avatarHtml = c.author_avatar ? `<img src="${c.author_avatar}" class="comment-avatar" alt="${escapeHtml(c.author)}" loading="lazy">` : `<div class="comment-avatar-placeholder">👤</div>`;
      let badges = '';
      if (c.is_pinned) badges += `<span class="comm-badge pinned" title="Pinned by creator">📌 Pinned</span> `;
      if (c.is_hearted) badges += `<span class="comm-badge hearted" title="Hearted by creator">❤️ Heart</span> `;

      return `
        <tr>
          <td class="cell-num">#${c.idx}</td>
          <td>
            <div class="commenter-cell">
              ${avatarHtml}
              <div class="commenter-info">
                <span class="commenter-name">${escapeHtml(c.author)}</span>
              </div>
            </div>
          </td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${escapeHtml(c.published_time || '-')}</td>
          <td>
            <span class="like-badge">❤️ ${c.likes_display || c.likes}</span>
          </td>
          <td>
            <span class="reply-badge">💬 ${c.reply_count}</span>
          </td>
          <td class="comment-text-cell">${escapeHtml(c.text)}</td>
          <td>${badges || '<span style="color:var(--text-muted); font-size:0.8rem;">-</span>'}</td>
        </tr>
      `;
    }).join('');
  }

  // ─────────────────────────────────────────────
  // 8. EVENT LISTENERS FOR FILTERS & EXPORTS
  // ─────────────────────────────────────────────
  function initFilterAndExports() {
    // Chat filters
    if (el.chatFilterTabs) {
      el.chatFilterTabs.querySelectorAll('.res-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          el.chatFilterTabs.querySelectorAll('.res-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.activeChatFilter = btn.dataset.filter;
          applyChatFiltersAndRender();
        });
      });
    }

    if (el.chatSearchInput) el.chatSearchInput.addEventListener('input', applyChatFiltersAndRender);
    if (el.chatSortSelect) {
      el.chatSortSelect.addEventListener('change', (e) => {
        state.activeChatSort = e.target.value;
        applyChatFiltersAndRender();
      });
    }

    // Comments filters
    if (el.commSearchInput) el.commSearchInput.addEventListener('input', applyCommentsFiltersAndRender);
    if (el.commSortSelect) {
      el.commSortSelect.addEventListener('change', (e) => {
        state.activeCommSort = e.target.value;
        applyCommentsFiltersAndRender();
      });
    }

    // Chat exports
    if (el.exportChatExcelBtn) el.exportChatExcelBtn.addEventListener('click', () => exportChatToExcel(state.filteredMessages, state.liveChatData));
    if (el.exportChatTxtBtn) el.exportChatTxtBtn.addEventListener('click', () => exportChatToTxt(state.filteredMessages, state.liveChatData));
    if (el.exportChatCsvBtn) el.exportChatCsvBtn.addEventListener('click', () => exportChatToCsv(state.filteredMessages, state.liveChatData));
    if (el.exportChatJsonBtn) el.exportChatJsonBtn.addEventListener('click', () => exportChatToJson(state.liveChatData));

    // Comments exports
    if (el.exportCommExcelBtn) el.exportCommExcelBtn.addEventListener('click', exportCommToExcel);
    if (el.exportCommTxtBtn) el.exportCommTxtBtn.addEventListener('click', exportCommToTxt);
    if (el.exportCommCsvBtn) el.exportCommCsvBtn.addEventListener('click', exportCommToCsv);
    if (el.exportCommJsonBtn) el.exportCommJsonBtn.addEventListener('click', exportCommToJson);
  }

  // Viewer Filtered Exports
  function exportViewerFilteredExcel() {
    if (!state.viewer.data) return;
    const msgs = state.viewer.filteredMessages.length > 0 ? state.viewer.filteredMessages : state.viewer.data.messages;
    exportChatToExcel(msgs, { stream_id: `view_${state.viewer.data.stream_id || 'filtered'}` });
  }

  function exportViewerFilteredTxt() {
    if (!state.viewer.data) return;
    const msgs = state.viewer.filteredMessages.length > 0 ? state.viewer.filteredMessages : state.viewer.data.messages;
    exportChatToTxt(msgs, { stream_id: `view_${state.viewer.data.stream_id || 'filtered'}` });
  }

  function exportViewerFilteredCsv() {
    if (!state.viewer.data) return;
    const msgs = state.viewer.filteredMessages.length > 0 ? state.viewer.filteredMessages : state.viewer.data.messages;
    exportChatToCsv(msgs, { stream_id: `view_${state.viewer.data.stream_id || 'filtered'}` });
  }

  function exportViewerFilteredJson() {
    if (!state.viewer.data) return;
    const msgs = state.viewer.filteredMessages.length > 0 ? state.viewer.filteredMessages : state.viewer.data.messages;
    const exportObj = {
      stream_id: state.viewer.data.stream_id || 'view_export',
      total_messages: msgs.length,
      filtered: true,
      messages: msgs
    };
    downloadBlob(JSON.stringify(exportObj, null, 2), `TubeMetrix_ViewExport_${exportObj.stream_id}.json`, 'application/json');
  }

  // ─────────────────────────────────────────────
  // 9. EXPORT SUITE IMPLEMENTATIONS
  // ─────────────────────────────────────────────
  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function buildChatExcelHtml(messagesList, metaData) {
    const msgs = Array.isArray(messagesList) ? messagesList : [];
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';
    return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <h2>TubeMetrix — YouTube Live Chat Report</h2>
      <p>Stream: ${escapeHtml(title)} | Total Messages: ${msgs.length}</p>
      <table border="1">
        <tr style="background:#cc0000; color:#fff; font-weight:bold;">
          <th># Count</th><th>Time</th><th>Author</th><th>Badges</th><th>Event Type</th><th>Details</th><th>Message Content</th><th>Stream ID</th>
        </tr>
        ${msgs.map(m => `
          <tr ${m.event_type !== 'CHAT' ? 'style="background:#fffbeb; font-weight:bold;"' : ''}>
            <td>${m.idx}</td>
            <td>${escapeHtml(m.time)}</td>
            <td>${escapeHtml(m.author)}</td>
            <td>${escapeHtml((m.badges || []).join(', '))}</td>
            <td>${escapeHtml(m.event_type)}</td>
            <td>${escapeHtml(m.details || '')}</td>
            <td>${escapeHtml(m.message)}</td>
            <td>${escapeHtml(m.stream_id || '')}</td>
          </tr>
        `).join('')}
      </table>
    </body></html>`;
  }

  function exportChatToExcel(messagesList, metaData) {
    if (!messagesList || messagesList.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';
    downloadBlob(buildChatExcelHtml(messagesList, metaData), `TubeMetrix_Chat_${title}.xls`, 'application/vnd.ms-excel');
  }

  function buildChatTxtText(messagesList, metaData) {
    const msgs = Array.isArray(messagesList) ? messagesList : [];
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';
    const lines = [
      `================================================================================`,
      ` TubeMetrix — YOUTUBE LIVE CHAT REPLAY EXPORT`,
      ` Stream ID: ${title} | Total Exported Messages: ${msgs.length}`,
      ` Generated: ${new Date().toLocaleString()}`,
      `================================================================================`,
      ''
    ];
    msgs.forEach(m => {
      const prefix = m.event_type !== 'CHAT' ? `[${m.event_type}: ${m.badge_label || m.details}] ` : '';
      lines.push(`[${m.time || '0:00'}] [${m.author}] ${prefix}${m.message}`);
    });
    return lines.join('\n');
  }

  function exportChatToTxt(messagesList, metaData) {
    if (!messagesList || messagesList.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';
    downloadBlob(buildChatTxtText(messagesList, metaData), `TubeMetrix_Chat_${title}.txt`, 'text/plain;charset=utf-8');
  }

  function buildChatCsvText(messagesList) {
    const msgs = Array.isArray(messagesList) ? messagesList : [];
    const csv = ['Count,Timestamp,Author,Badges,EventType,Details,Message,StreamID'];
    msgs.forEach(m => {
      const row = [
        m.idx,
        `"${(m.time || '').replace(/"/g, '""')}"`,
        `"${(m.author || '').replace(/"/g, '""')}"`,
        `"${((m.badges || []).join('; ')).replace(/"/g, '""')}"`,
        m.event_type,
        `"${(m.details || '').replace(/"/g, '""')}"`,
        `"${(m.message || '').replace(/"/g, '""')}"`,
        m.stream_id || ''
      ];
      csv.push(row.join(','));
    });
    return csv.join('\n');
  }

  function exportChatToCsv(messagesList, metaData) {
    if (!messagesList || messagesList.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';
    downloadBlob(buildChatCsvText(messagesList), `TubeMetrix_Chat_${title}.csv`, 'text/csv;charset=utf-8');
  }

  function exportChatToJson(dataObj) {
    if (!dataObj) return;
    const jsonStr = JSON.stringify(dataObj, null, 2);
    downloadBlob(jsonStr, `TubeMetrix_Chat_${dataObj.stream_id || 'export'}.json`, 'application/json');
  }

  function buildCommExcelHtml(commentsList, metaData) {
    const comms = Array.isArray(commentsList) ? commentsList : [];
    const title = (metaData && metaData.video_id) ? metaData.video_id : 'comments';
    return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <h2>TubeMetrix — YouTube Video Comments Export</h2>
      <p>Video: ${escapeHtml((metaData && metaData.title) || title)} | Total Comments: ${comms.length}</p>
      <table border="1">
        <tr style="background:#cc0000; color:#fff; font-weight:bold;">
          <th># Count</th><th>Author</th><th>Channel ID</th><th>Published</th><th>Likes</th><th>Replies</th><th>Comment Text</th>
        </tr>
        ${comms.map(c => `
          <tr>
            <td>${c.idx}</td>
            <td>${escapeHtml(c.author)}</td>
            <td>${escapeHtml(c.author_id || '')}</td>
            <td>${escapeHtml(c.published_time || '')}</td>
            <td>${c.likes || 0}</td>
            <td>${c.reply_count || 0}</td>
            <td>${escapeHtml(c.text || '')}</td>
          </tr>
        `).join('')}
      </table>
    </body></html>`;
  }

  function exportCommToExcel() {
    if (!state.commentsData || state.commentsData.comments.length === 0) {
      alert('No comments to export.');
      return;
    }
    const comms = state.filteredComments.length > 0 ? state.filteredComments : state.commentsData.comments;
    const title = state.commentsData.video_id || 'comments';
    downloadBlob(buildCommExcelHtml(comms, state.commentsData), `TubeMetrix_Comments_${title}.xls`, 'application/vnd.ms-excel');
  }

  function buildCommTxtText(commentsList, metaData) {
    const comms = Array.isArray(commentsList) ? commentsList : [];
    const title = (metaData && metaData.video_id) ? metaData.video_id : 'comments';
    const lines = [
      `================================================================================`,
      ` TubeMetrix — YOUTUBE VIDEO COMMENTS EXPORT`,
      ` Video: ${(metaData && metaData.title) || title} (${title})`,
      ` Total Comments: ${comms.length}`,
      ` Generated: ${new Date().toLocaleString()}`,
      `================================================================================`,
      ''
    ];
    comms.forEach(c => {
      lines.push(`[#${c.idx}] [${c.published_time}] ${c.author} (Likes: ${c.likes_display || c.likes}, Replies: ${c.reply_count}):`);
      lines.push(`${c.text}`);
      lines.push('--------------------------------------------------------------------------------');
    });
    return lines.join('\n');
  }

  function exportCommToTxt() {
    if (!state.commentsData) return;
    const comms = state.filteredComments.length > 0 ? state.filteredComments : state.commentsData.comments;
    const title = state.commentsData.video_id || 'comments';
    downloadBlob(buildCommTxtText(comms, state.commentsData), `TubeMetrix_Comments_${title}.txt`, 'text/plain;charset=utf-8');
  }

  function buildCommCsvText(commentsList) {
    const comms = Array.isArray(commentsList) ? commentsList : [];
    const csv = ['Count,Author,ChannelID,PublishedTime,Likes,Replies,Text,VideoID'];
    comms.forEach(c => {
      csv.push([
        c.idx,
        `"${(c.author || '').replace(/"/g, '""')}"`,
        c.author_id,
        `"${(c.published_time || '').replace(/"/g, '""')}"`,
        c.likes,
        c.reply_count,
        `"${(c.text || '').replace(/"/g, '""')}"`,
        c.video_id
      ].join(','));
    });
    return csv.join('\n');
  }

  function exportCommToCsv() {
    if (!state.commentsData) return;
    const comms = state.filteredComments.length > 0 ? state.filteredComments : state.commentsData.comments;
    const title = state.commentsData.video_id || 'comments';
    downloadBlob(buildCommCsvText(comms), `TubeMetrix_Comments_${title}.csv`, 'text/csv;charset=utf-8');
  }

  function exportCommToJson() {
    if (!state.commentsData) return;
    downloadBlob(JSON.stringify(state.commentsData, null, 2), `TubeMetrix_Comments_${state.commentsData.video_id || 'export'}.json`, 'application/json');
  }

  // Strictly builds 4-format ZIP bundle entries using ONLY unlocked items (zero lockedTail leakage)
  function buildChatOrCommentsBundleFiles(reportData, isComments = false, title = '') {
    if (!reportData) return null;
    if (isComments) {
      const comms = Array.isArray(reportData.comments) ? reportData.comments : [];
      if (!comms.length) return null;
      const safeReport = {
        ...reportData,
        title: title || reportData.title || `Video [${reportData.video_id || 'Comments'}]`,
        comments: comms,
        total_comments: comms.length,
      };
      return [
        { name: 'TubeMetrix_Comments_Report.json', content: JSON.stringify(safeReport, null, 2) },
        { name: 'TubeMetrix_Comments_Report.xls', content: buildCommExcelHtml(comms, safeReport) },
        { name: 'TubeMetrix_Comments_Log.txt', content: buildCommTxtText(comms, safeReport) },
        { name: 'TubeMetrix_Comments_Data.csv', content: buildCommCsvText(comms) },
      ];
    }
    const msgs = Array.isArray(reportData.messages) ? reportData.messages : [];
    if (!msgs.length) return null;
    const safeReport = {
      ...reportData,
      title: title || reportData.title || `Stream [${reportData.stream_id || 'Chat'}]`,
      messages: msgs,
      total_messages: msgs.length,
    };
    return [
      { name: 'TubeMetrix_LiveChat_Report.json', content: JSON.stringify(safeReport, null, 2) },
      { name: 'TubeMetrix_LiveChat_Report.xls', content: buildChatExcelHtml(msgs, safeReport) },
      { name: 'TubeMetrix_LiveChat_Log.txt', content: buildChatTxtText(msgs, safeReport) },
      { name: 'TubeMetrix_LiveChat_Data.csv', content: buildChatCsvText(msgs) },
    ];
  }

  // ─────────────────────────────────────────────
  // 10. CLIENT-SIDE JSON LINES PARSER (.live_chat.json)
  // ─────────────────────────────────────────────
  function clientSideParseAllChat(lines, vid) {
    const messages = [];
    const seenIds = new Set();
    const userMsgCounts = {};
    const uniqueChatters = new Set();
    let scCount = 0, memCount = 0, jewelCount = 0;

    function extractText(obj) {
      if (!obj) return '';
      if (typeof obj === 'string') return obj.trim();
      if (obj.simpleText) return String(obj.simpleText).trim();
      if (Array.isArray(obj.runs)) {
        return obj.runs.map(r => r.text || (r.emoji ? (r.emoji.shortcuts ? r.emoji.shortcuts[0] : 'emoji') : '')).join('').trim();
      }
      return '';
    }

    function extractBadges(badges) {
      const res = [];
      if (!Array.isArray(badges)) return res;
      badges.forEach(b => {
        const ren = b.liveChatAuthorBadgeRenderer;
        if (!ren) return;
        const tt = (ren.tooltip || '').toLowerCase();
        const icon = (ren.icon ? ren.icon.iconType : '').toLowerCase();
        if (tt.includes('moderator') || icon.includes('moderator')) res.push('MODERATOR');
        else if (tt.includes('member') || ren.customThumbnail) res.push('MEMBER');
        else if (tt.includes('owner') || icon.includes('owner')) res.push('OWNER');
        else if (tt.includes('verified')) res.push('VERIFIED');
        else if (ren.tooltip) res.push(ren.tooltip);
      });
      return res;
    }

    function walk(obj, timeOffset = '') {
      if (!obj || typeof obj !== 'object') return;

      if (obj.replayChatItemAction) {
        const act = obj.replayChatItemAction;
        let t = timeOffset;
        if (act.videoOffsetTimeMsec && !t) {
          const secs = Math.floor(parseInt(act.videoOffsetTimeMsec, 10) / 1000);
          const s = secs % 60;
          const m = Math.floor(secs / 60) % 60;
          const h = Math.floor(secs / 3600);
          t = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
        }
        if (Array.isArray(act.actions)) {
          act.actions.forEach(a => walk(a, t));
        }
        return;
      }

      if (obj.addChatItemAction && obj.addChatItemAction.item) {
        processItem(obj.addChatItemAction.item, timeOffset);
        return;
      }

      const keys = ['liveChatTextMessageRenderer', 'liveChatPaidMessageRenderer', 'liveChatPaidStickerRenderer', 'liveChatMembershipItemRenderer', 'liveChatSponsorshipsGiftPurchaseAnnouncementRenderer', 'giftMessageViewModel'];
      for (const k of keys) {
        if (obj[k]) {
          processItem({ [k]: obj[k] }, timeOffset);
          return;
        }
      }

      if (Array.isArray(obj)) {
        obj.forEach(x => walk(x, timeOffset));
      } else {
        Object.values(obj).forEach(x => walk(x, timeOffset));
      }
    }

    function processItem(item, timeOffset) {
      if (item.liveChatTextMessageRenderer) {
        const r = item.liveChatTextMessageRenderer;
        const id = r.id || `msg_${messages.length + 1}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const author = extractText(r.authorName) || 'Viewer';
        const msg = extractText(r.message);
        const t = extractText(r.timestampText) || timeOffset;
        const badges = extractBadges(r.authorBadges);

        userMsgCounts[author] = (userMsgCounts[author] || 0) + 1;
        uniqueChatters.add(author);

        messages.push({
          idx: messages.length + 1,
          id, time: t, author,
          author_id: r.authorExternalChannelId || '',
          badges,
          event_type: 'CHAT',
          badge_label: badges[0] || '',
          amount: 0, currency: '', details: '',
          message: msg, stream_id: vid
        });
      } else if (item.liveChatPaidMessageRenderer) {
        const r = item.liveChatPaidMessageRenderer;
        const id = r.id || `sc_${messages.length + 1}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const author = extractText(r.authorName) || 'Super Chatter';
        const amt = extractText(r.purchaseAmountText);
        const msg = extractText(r.message);
        const t = extractText(r.timestampText) || timeOffset;
        const badges = extractBadges(r.authorBadges);

        scCount++;
        userMsgCounts[author] = (userMsgCounts[author] || 0) + 1;
        uniqueChatters.add(author);

        messages.push({
          idx: messages.length + 1,
          id, time: t, author,
          author_id: r.authorExternalChannelId || '',
          badges,
          event_type: 'SUPERCHAT',
          badge_label: `Super Chat ${amt}`,
          amount: amt, currency: '', details: amt,
          message: msg || '[Super Chat]', stream_id: vid
        });
      } else if (item.liveChatPaidStickerRenderer) {
        const r = item.liveChatPaidStickerRenderer;
        const id = r.id || `st_${messages.length + 1}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const author = extractText(r.authorName) || 'Super Chatter';
        const amt = extractText(r.purchaseAmountText);
        const t = extractText(r.timestampText) || timeOffset;
        const badges = extractBadges(r.authorBadges);

        scCount++;
        userMsgCounts[author] = (userMsgCounts[author] || 0) + 1;
        uniqueChatters.add(author);

        messages.push({
          idx: messages.length + 1,
          id, time: t, author,
          author_id: r.authorExternalChannelId || '',
          badges,
          event_type: 'STICKER',
          badge_label: `Super Sticker ${amt}`,
          amount: amt, currency: '', details: amt,
          message: '[Super Sticker]', stream_id: vid
        });
      } else if (item.liveChatMembershipItemRenderer) {
        const r = item.liveChatMembershipItemRenderer;
        const id = r.id || `mem_${messages.length + 1}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const author = extractText(r.authorName) || 'Member';
        const sub = extractText(r.headerSubtext);
        const pri = extractText(r.headerPrimaryText);
        const msg = extractText(r.message);
        const t = extractText(r.timestampText) || timeOffset;
        const badges = extractBadges(r.authorBadges);
        const tier = sub || pri || 'Member';

        memCount++;
        userMsgCounts[author] = (userMsgCounts[author] || 0) + 1;
        uniqueChatters.add(author);

        messages.push({
          idx: messages.length + 1,
          id, time: t, author,
          author_id: r.authorExternalChannelId || '',
          badges,
          event_type: 'MEMBERSHIP',
          badge_label: `Member: ${tier}`,
          amount: 0, currency: '', details: tier,
          message: msg || `Joined / Renewed (${tier})`, stream_id: vid
        });
      } else if (item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer) {
        const r = item.liveChatSponsorshipsGiftPurchaseAnnouncementRenderer;
        const id = r.id || `gift_${messages.length + 1}`;
        if (seenIds.has(id)) return;
        seenIds.add(id);

        const header = (r.header && r.header.liveChatSponsorshipsHeaderRenderer) || {};
        const author = extractText(header.authorName) || 'Gifter';
        const pri = extractText(header.primaryText);

        memCount++;
        userMsgCounts[author] = (userMsgCounts[author] || 0) + 1;
        uniqueChatters.add(author);

        messages.push({
          idx: messages.length + 1,
          id, time: timeOffset, author,
          author_id: r.authorExternalChannelId || '',
          badges: ['GIFT_SPONSOR'],
          event_type: 'GIFT',
          badge_label: '🎁 Gift Memberships',
          amount: 0, currency: '', details: pri,
          message: pri, stream_id: vid
        });
      } else if (item.giftMessageViewModel) {
        const r = item.giftMessageViewModel;
        const text = extractText(r.text);
        jewelCount++;

        messages.push({
          idx: messages.length + 1,
          id: `jewel_${messages.length + 1}`,
          time: timeOffset, author: 'Gift Supporter',
          author_id: '',
          badges: ['JEWELS'],
          event_type: 'JEWELS',
          badge_label: '💎 YouTube Jewels',
          amount: 0, currency: '', details: text,
          message: text, stream_id: vid
        });
      }
    }

    lines.forEach(line => {
      if (!line || !line.trim()) return;
      try {
        const parsed = JSON.parse(line);
        walk(parsed);
      } catch (e) { }
    });

    const topChatters = Object.entries(userMsgCounts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    return {
      stream_id: vid,
      total_messages: messages.length,
      unique_chatters: uniqueChatters.size,
      superchats_count: scCount,
      memberships_count: memCount,
      jewels_count: jewelCount,
      events_count: scCount + memCount + jewelCount,
      top_chatters: topChatters,
      messages
    };
  }

  // ─────────────────────────────────────────────
  // 11. DEMO SAMPLE CHAT GENERATOR
  // ─────────────────────────────────────────────
  function generateSampleLiveChatData() {
    const rawSample = [
      { time: '00:01:10', author: 'Stream Host', badges: ['OWNER'], event: 'CHAT', text: 'Welcome everyone to today’s BGMI Finals stream! Drop a like!' },
      { time: '00:01:25', author: 'GamerRohit_99', badges: ['MODERATOR'], event: 'CHAT', text: 'Please maintain chat decorum guys, no spamming or links!' },
      { time: '00:02:14', author: 'Rahul Sharma', badges: ['MEMBER'], event: 'CHAT', text: 'Bro big fan, match 1 clutch was insane! 🔥' },
      { time: '00:03:00', author: 'ViperGaming', badges: [], event: 'SUPERCHAT', amount: '₹100.00', text: 'Chai paani for the stream! Keep grinding brother!' },
      { time: '00:04:15', author: 'Pooja Verma', badges: [], event: 'MEMBERSHIP', details: 'VIP Club', text: 'Joined VIP Club membership! Excited for the tournament!' },
      { time: '00:05:30', author: 'ProClutcher_IND', badges: [], event: 'CHAT', text: 'Sens setup video kab aayegi bro?' },
      { time: '00:06:45', author: 'Aryan OP', badges: [], event: 'SUPERCHAT', amount: '₹500.00', text: 'Bhai shoutout de do please, birthday today!' },
      { time: '00:07:20', author: 'Stream Host', badges: ['OWNER'], event: 'CHAT', text: 'Happy Birthday Aryan bhai! God bless you!' },
      { time: '00:08:10', author: 'MortalFanClub', badges: ['VERIFIED'], event: 'CHAT', text: 'Good luck host, kill count 20 cross karo aaj!' },
      { time: '00:09:50', author: 'Simran Kaur', badges: ['MEMBER'], event: 'JEWELS', details: '100 Jewels', text: 'Sent 100 YouTube Jewels gift!' },
      { time: '00:11:30', author: 'GamerRohit_99', badges: ['MODERATOR'], event: 'CHAT', text: 'Use code STREAM in store guys for discounts!' },
      { time: '00:13:05', author: 'Soham Esports', badges: [], event: 'SUPERCHAT', amount: '₹2,000.00', text: 'For the next chicken dinner! Best team in finals!' },
      { time: '00:14:40', author: 'Karan Mehra', badges: [], event: 'GIFT', details: '5 Memberships', text: 'Gifted 5 VIP Club Memberships to community!' },
      { time: '00:16:15', author: 'Aman Deep', badges: [], event: 'CHAT', text: 'OP gameplay! Zone shift favours your drop!' },
      { time: '00:18:22', author: 'Neha Gupta', badges: ['MEMBER'], event: 'CHAT', text: 'Nice spray transfer through the smoke!' },
      { time: '00:20:00', author: 'SpeedyKing', badges: [], event: 'SUPERCHAT', amount: '₹40.00', text: 'OP bolte public!' },
      { time: '00:22:45', author: 'Rohan Joshi', badges: [], event: 'CHAT', text: 'Watch the flank from left ridge!' },
      { time: '00:25:30', author: 'TechieGamer', badges: ['MODERATOR'], event: 'CHAT', text: 'Top 3 alive! Let us get that chicken dinner!' },
      { time: '00:27:10', author: 'Aditya Raj', badges: [], event: 'SUPERCHAT', amount: '₹1,000.00', text: 'WHAT A GRENADE! That was legendary!' },
      { time: '00:29:40', author: 'Stream Host', badges: ['OWNER'], event: 'CHAT', text: 'GGs in the chat! Thank you everyone for 15k live!' }
    ];

    const messages = rawSample.map((m, idx) => ({
      idx: idx + 1,
      id: `sample_${idx + 1}`,
      time: m.time,
      author: m.author,
      author_id: `auth_${idx + 1}`,
      badges: m.badges,
      event_type: m.event,
      badge_label: m.amount || m.details || (m.badges[0] || 'Chat'),
      amount: m.amount || 0,
      currency: m.amount ? 'INR' : '',
      details: m.details || m.amount || '',
      message: m.text,
      stream_id: 'xwh2fzKm7Kk'
    }));

    return {
      stream_id: 'xwh2fzKm7Kk',
      title: 'BGMI Finals Live Stream',
      total_messages: messages.length,
      unique_chatters: 16,
      superchats_count: 5,
      memberships_count: 2,
      jewels_count: 1,
      events_count: 8,
      top_chatters: [
        { author: 'Stream Host', count: 3 },
        { author: 'GamerRohit_99', count: 3 },
        { author: 'Rahul Sharma', count: 1 }
      ],
      messages
    };
  }

  // ─────────────────────────────────────────────
  // 12. GENERAL HELPERS
  // ─────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function parseTimestampToSeconds(tStr) {
    if (!tStr) return null;
    const clean = String(tStr).trim();
    if (!clean) return null;
    const parts = clean.split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  function extractNumericAmount(amtStr) {
    if (!amtStr) return 0;
    if (typeof amtStr === 'number') return amtStr;
    const m = String(amtStr).replace(/,/g, '').match(/[\d]+(?:\.[\d]+)?/);
    return m ? parseFloat(m[0]) : 0;
  }

  // ─────────────────────────────────────────────
  // INITIALIZE ON DOM READY
  // ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initMobileScrollHints();
    initTheme();
    initCurrency();
    initModeTabs();
    initChatViewer();
    initFilterAndExports();

    if (el.pauseChatBatchBtn) {
      el.pauseChatBatchBtn.addEventListener('click', () => {
        activeChatPauseRequested = true;
        updateChatLiveCreditBar(true, 'Finishing current stream safely before pausing...');
      });
    }

    if (el.commentsLimitSelect) {
      el.commentsLimitSelect.addEventListener('change', () => updateCommentsCostPreview());
    }
    updateCommentsCostPreview();

    window.addEventListener('tubemetrix:auth-updated', (e) => {
      updateMultiChatQueueUI();
      updateCommentsCostPreview();
      if (isChatExtractionRunning) {
        updateChatLiveCreditBar(true);
        return;
      }
      if (!currentChatCheckpoint || (!e?.detail?.user && !currentChatCheckpoint?.allowGuest)) {
        if (window.TubeMetrixAuth?.whenReady) {
          restoreSavedChatCheckpoint();
        }
      }
      renderChatLimitAndResumeBanners();
    });

    if (window.TubeMetrixAuth?.whenReady) {
      window.TubeMetrixAuth.whenReady().then(() => {
        restoreSavedChatCheckpoint();
        updateMultiChatQueueUI();
        updateCommentsCostPreview();
      });
    } else {
      setTimeout(() => restoreSavedChatCheckpoint(), 500);
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
