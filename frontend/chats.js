/**
 * TubeMetrix — YouTube Live Chat & Comments Downloader & Interactive View Engine
 * High-Speed In-Memory Client Engine (100% Client-Side Processing & Offline Viewer)
 */

(function () {
  'use strict';

  const API_BASE = 'https://shubhamsain858-kickcuttr-api.hf.space/api/youtube';
  const MAX_MULTI_STREAMS = 25;

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

    // Progress Card
    processingCard: document.getElementById('processingCard'),
    statusTitle: document.getElementById('statusTitle'),
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

  function updateViewerSessionButton() {}

  // ─────────────────────────────────────────────
  // 3. MULTI-URL BATCH QUEUE
  // ─────────────────────────────────────────────
  function addUrlToChatQueue() {
    const raw = el.chatMultiUrlInput.value.trim();
    if (!raw) return;
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

    if (state.multiUrlQueue.length >= MAX_MULTI_STREAMS) {
      alert(`Maximum batch limit of ${MAX_MULTI_STREAMS} streams reached.`);
      return;
    }

    state.multiUrlQueue.push(vid);
    el.chatMultiUrlInput.value = '';
    updateMultiChatQueueUI();
  }

  function updateMultiChatQueueUI() {
    const count = state.multiUrlQueue.length;
    if (el.chatQueueCount) el.chatQueueCount.textContent = `${count} / ${MAX_MULTI_STREAMS}`;
    if (el.multiTabBadge) el.multiTabBadge.textContent = `${count}/${MAX_MULTI_STREAMS} Added`;
    if (el.startChatMultiBtn) el.startChatMultiBtn.disabled = count === 0;
    if (el.clearAllChatUrlsBtn) el.clearAllChatUrlsBtn.style.display = count > 0 ? 'inline-block' : 'none';

    if (!el.chatUrlQueueList) return;

    if (count === 0) {
      el.chatUrlQueueList.innerHTML = `
        <div class="empty-queue-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>No streams added yet. Paste a YouTube URL above and click <strong>"Add Stream"</strong>.</span>
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

  // ─────────────────────────────────────────────
  // 4. API CALLS & EXTRACTION ENGINES
  // ─────────────────────────────────────────────
  function extractVideoId(urlOrId) {
    if (!urlOrId) return '';
    const clean = urlOrId.trim();
    const m = clean.match(/(?:v=|\/|be\/|shorts\/|live\/)([0-9A-Za-z_-]{11})/);
    return m ? m[1] : (clean.length === 11 ? clean : '');
  }

  function setProgress(percent, title, ticker, extracted = 0, unique = 0, events = 0) {
    if (!el.processingCard) return;
    el.processingCard.style.display = 'block';
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
    if (el.processingCard) el.processingCard.style.display = 'none';
  }

  // Option A: Single Stream Live Chat
  async function startSingleChatExtraction() {
    const raw = el.chatSingleUrlInput.value.trim();
    const vid = extractVideoId(raw);
    if (!vid) {
      alert('Please enter a valid YouTube Live Stream URL or Video ID.');
      return;
    }

    el.startChatSingleBtn.disabled = true;
    if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
    if (el.labelExtracted) el.labelExtracted.textContent = 'Extracted Messages';
    setProgress(15, `Connecting to Stream [${vid}]...`, 'Connecting to YouTube InnerTube streaming engine...');

    try {
      setProgress(40, `Extracting Live Chat Replay...`, 'Streaming in-memory chat replay chunks...');

      const resp = await fetch(`${API_BASE}/fetch-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: vid })
      });

      if (!resp.ok) {
        throw new Error(`API responded with HTTP status ${resp.status}`);
      }

      const res = await resp.json();
      if (!res.success || !res.data) {
        throw new Error(res.message || 'No live chat replay was found or chat is disabled for this stream.');
      }

      if (res.data.messages) {
        res.data.messages.forEach(m => {
          m.stream_id = m.stream_id || vid;
        });
      }
      state.lastExtractionType = 'chats';

      setProgress(100, `Complete!`, `Processed ${res.data.total_messages} messages in ${res.elapsed_sec || 0.5}s`, res.data.total_messages, res.data.unique_chatters, res.data.events_count);

      setTimeout(() => {
        hideProgress();
        renderLiveChatReport(res.data, res.title || `Live Stream [${vid}]`);
        updateViewerSessionButton();
      }, 500);

    } catch (err) {
      hideProgress();
      alert(`Chat Extraction Error: ${err.message}`);
    } finally {
      el.startChatSingleBtn.disabled = false;
    }
  }

  // Option B: Channel Live Streams
  async function startChannelChatExtraction() {
    const channelUrl = el.chatChannelUrlInput.value.trim();
    if (!channelUrl) {
      alert('Please enter a YouTube Channel URL or handle (e.g. @channel or https://www.youtube.com/@channel/streams)');
      return;
    }

    const fromDate = el.chatFromDateInput.value;
    const toDate = el.chatToDateInput.value;

    el.startChatChannelBtn.disabled = true;
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
          max_results: 100
        })
      });

      if (!cResp.ok) throw new Error(`Failed to fetch channel streams (HTTP ${cResp.status})`);
      const cData = await cResp.json();

      if (!cData.success || !cData.streams || cData.streams.length === 0) {
        throw new Error('No live streams found for this channel matching the specified date range.');
      }

      const streams = cData.streams;
      setProgress(25, `Found ${streams.length} Streams`, `Starting batch chat download for ${streams.length} streams...`);

      const aggregatedData = await batchExtractChatMessages(streams.map(s => s.id));
      hideProgress();
      renderLiveChatReport(aggregatedData, `${cData.channel} (${streams.length} Streams Combined)`);
      updateViewerSessionButton();

    } catch (err) {
      hideProgress();
      alert(`Channel Audit Error: ${err.message}`);
    } finally {
      el.startChatChannelBtn.disabled = false;
    }
  }

  // Option C: Multi-URL Batch
  async function startMultiChatExtraction() {
    if (state.multiUrlQueue.length === 0) {
      alert('Please add at least 1 stream to the batch list.');
      return;
    }

    const queue = [...state.multiUrlQueue];
    el.startChatMultiBtn.disabled = true;
    if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
    if (el.labelExtracted) el.labelExtracted.textContent = 'Extracted Messages';

    try {
      const aggregatedData = await batchExtractChatMessages(queue);
      hideProgress();
      renderLiveChatReport(aggregatedData, `Multi-URL Batch (${queue.length} Streams Combined)`);
      updateViewerSessionButton();
    } catch (err) {
      hideProgress();
      alert(`Batch Extraction Error: ${err.message}`);
    } finally {
      el.startChatMultiBtn.disabled = false;
    }
  }

  // Helper: Batch Stream Chat Processor
  async function batchExtractChatMessages(vids) {
    const total = vids.length;
    let allMessages = [];
    const uniqueChatters = new Set();
    const userMsgCounts = {};
    let totalSc = 0, totalMem = 0, totalJewels = 0;

    for (let i = 0; i < total; i++) {
      const vid = vids[i];
      const pct = Math.round(((i + 1) / total) * 100);
      setProgress(pct, `Processing Stream ${i + 1} of ${total} [${vid}]`, `Streaming live chat for ${vid}...`, allMessages.length, uniqueChatters.size, totalSc + totalMem + totalJewels);

      try {
        const resp = await fetch(`${API_BASE}/fetch-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: vid })
        });

        if (resp.ok) {
          const res = await resp.json();
          if (res.success && res.data && res.data.messages) {
            res.data.messages.forEach(m => {
              m.idx = allMessages.length + 1;
              m.stream_id = m.stream_id || vid;
              allMessages.push(m);
              uniqueChatters.add(m.author);
              userMsgCounts[m.author] = (userMsgCounts[m.author] || 0) + 1;
              if (m.event_type === 'SUPERCHAT' || m.event_type === 'STICKER') totalSc++;
              else if (m.event_type === 'MEMBERSHIP' || m.event_type === 'GIFT') totalMem++;
              else if (m.event_type === 'JEWELS') totalJewels++;
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to process stream ${vid}:`, e);
      }
    }

    const topChatters = Object.entries(userMsgCounts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    return {
      stream_id: `batch_${total}`,
      total_messages: allMessages.length,
      unique_chatters: uniqueChatters.size,
      superchats_count: totalSc,
      memberships_count: totalMem,
      jewels_count: totalJewels,
      events_count: totalSc + totalMem + totalJewels,
      top_chatters: topChatters,
      messages: allMessages
    };
  }

  // Option D: Video Comments Downloader
  async function startCommentsDownload() {
    const raw = el.commentsUrlInput.value.trim();
    const vid = extractVideoId(raw);
    if (!vid) {
      alert('Please enter a valid YouTube Video URL or Video ID.');
      return;
    }

    const limit = parseInt(el.commentsLimitSelect.value, 10) || 300;
    el.startCommentsBtn.disabled = true;
    if (el.resultsCommentsSection) el.resultsCommentsSection.style.display = 'none';
    if (el.labelExtracted) el.labelExtracted.textContent = 'Comments Downloaded';
    setProgress(20, `Fetching Video Comments [${vid}]...`, 'Connecting to YouTube InnerTube comments engine...');

    try {
      setProgress(50, `Streaming Comments (Limit: ${limit})...`, 'Extracting comments, author handles, likes & replies...');

      const resp = await fetch(`${API_BASE}/fetch-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: vid, max_comments: limit })
      });

      if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
      const res = await resp.json();

      if (!res.success) {
        throw new Error(res.error || 'Failed to download comments.');
      }

      if (res.comments) {
        res.comments.forEach(c => {
          c.stream_id = c.stream_id || vid;
        });
      }
      state.commentsData = res;
      state.lastExtractionType = 'comments';

      setProgress(100, 'Complete!', `Downloaded ${res.total_comments} comments in ${res.elapsed_sec || 1.5}s`, res.total_comments, res.unique_commenters, 0);

      setTimeout(() => {
        hideProgress();
        renderCommentsReport(res);
      }, 400);

    } catch (err) {
      hideProgress();
      alert(`Comments Error: ${err.message}`);
    } finally {
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
        state.viewer.filters.searchQuery = e.target.value.toLowerCase().trim();
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
        } catch (err) {}

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

    const slice = messages.slice(0, 500);
    el.vmTableBody.innerHTML = slice.map(m => {
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

    const slice = messages.slice(0, 300);
    el.vmFeedStream.innerHTML = slice.map(m => {
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

    const slice = messages.slice(0, 500);
    el.chatFeedTableBody.innerHTML = slice.map(m => {
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

    const slice = comments.slice(0, 500);
    el.commentsTableBody.innerHTML = slice.map(c => {
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

  function exportChatToExcel(messagesList, metaData) {
    if (!messagesList || messagesList.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const msgs = messagesList;
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';

    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <h2>TubeMetrix — YouTube Live Chat Report</h2>
      <p>Stream: ${title} | Total Messages: ${msgs.length}</p>
      <table border="1">
        <tr style="background:#cc0000; color:#fff; font-weight:bold;">
          <th># Count</th><th>Time</th><th>Author</th><th>Badges</th><th>Event Type</th><th>Details</th><th>Message Content</th><th>Stream ID</th>
        </tr>
        ${msgs.map(m => `
          <tr ${m.event_type !== 'CHAT' ? 'style="background:#fffbeb; font-weight:bold;"' : ''}>
            <td>${m.idx}</td>
            <td>${m.time}</td>
            <td>${escapeHtml(m.author)}</td>
            <td>${(m.badges || []).join(', ')}</td>
            <td>${m.event_type}</td>
            <td>${escapeHtml(m.details || '')}</td>
            <td>${escapeHtml(m.message)}</td>
            <td>${m.stream_id || ''}</td>
          </tr>
        `).join('')}
      </table>
    </body></html>`;

    downloadBlob(html, `TubeMetrix_Chat_${title}.xls`, 'application/vnd.ms-excel');
  }

  function exportChatToTxt(messagesList, metaData) {
    if (!messagesList || messagesList.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const msgs = messagesList;
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';

    let lines = [
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

    downloadBlob(lines.join('\n'), `TubeMetrix_Chat_${title}.txt`, 'text/plain;charset=utf-8');
  }

  function exportChatToCsv(messagesList, metaData) {
    if (!messagesList || messagesList.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const msgs = messagesList;
    const title = (metaData && metaData.stream_id) ? metaData.stream_id : 'stream_chat';

    let csv = ['Count,Timestamp,Author,Badges,EventType,Details,Message,StreamID'];
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

    downloadBlob(csv.join('\n'), `TubeMetrix_Chat_${title}.csv`, 'text/csv;charset=utf-8');
  }

  function exportChatToJson(dataObj) {
    if (!dataObj) return;
    const jsonStr = JSON.stringify(dataObj, null, 2);
    downloadBlob(jsonStr, `TubeMetrix_Chat_${dataObj.stream_id || 'export'}.json`, 'application/json');
  }

  function exportCommToExcel() {
    if (!state.commentsData || state.commentsData.comments.length === 0) {
      alert('No comments to export.');
      return;
    }
    const comms = state.filteredComments.length > 0 ? state.filteredComments : state.commentsData.comments;
    const title = state.commentsData.video_id || 'comments';

    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <h2>TubeMetrix — YouTube Video Comments Export</h2>
      <p>Video: ${escapeHtml(state.commentsData.title || title)} | Total Comments: ${comms.length}</p>
      <table border="1">
        <tr style="background:#cc0000; color:#fff; font-weight:bold;">
          <th># Count</th><th>Author</th><th>Channel ID</th><th>Published</th><th>Likes</th><th>Replies</th><th>Comment Text</th>
        </tr>
        ${comms.map(c => `
          <tr>
            <td>${c.idx}</td>
            <td>${escapeHtml(c.author)}</td>
            <td>${c.author_id}</td>
            <td>${escapeHtml(c.published_time)}</td>
            <td>${c.likes}</td>
            <td>${c.reply_count}</td>
            <td>${escapeHtml(c.text)}</td>
          </tr>
        `).join('')}
      </table>
    </body></html>`;

    downloadBlob(html, `TubeMetrix_Comments_${title}.xls`, 'application/vnd.ms-excel');
  }

  function exportCommToTxt() {
    if (!state.commentsData) return;
    const comms = state.filteredComments.length > 0 ? state.filteredComments : state.commentsData.comments;
    const title = state.commentsData.video_id || 'comments';

    let lines = [
      `================================================================================`,
      ` TubeMetrix — YOUTUBE VIDEO COMMENTS EXPORT`,
      ` Video: ${state.commentsData.title || title} (${title})`,
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

    downloadBlob(lines.join('\n'), `TubeMetrix_Comments_${title}.txt`, 'text/plain;charset=utf-8');
  }

  function exportCommToCsv() {
    if (!state.commentsData) return;
    const comms = state.filteredComments.length > 0 ? state.filteredComments : state.commentsData.comments;
    const title = state.commentsData.video_id || 'comments';

    let csv = ['Count,Author,ChannelID,PublishedTime,Likes,Replies,Text,VideoID'];
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

    downloadBlob(csv.join('\n'), `TubeMetrix_Comments_${title}.csv`, 'text/csv;charset=utf-8');
  }

  function exportCommToJson() {
    if (!state.commentsData) return;
    downloadBlob(JSON.stringify(state.commentsData, null, 2), `TubeMetrix_Comments_${state.commentsData.video_id || 'export'}.json`, 'application/json');
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
      } catch (e) {}
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
    initTheme();
    initCurrency();
    initModeTabs();
    initChatViewer();
    initFilterAndExports();
  });

})();

