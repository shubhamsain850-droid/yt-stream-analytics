/**
 * StreamVault — YouTube Live Chat & Comments Downloader Controller
 * Clean, fast, in-memory client engine
 */

(function () {
  'use strict';

  // Hugging Face API Base URL
  const API_BASE = 'https://shubhamsain858-kickcuttr-api.hf.space/api/youtube';
  const MAX_MULTI_STREAMS = 25;

  // Application State
  const state = {
    activeMode: 'single', // 'single', 'channel', 'multi', 'comments'
    multiUrlQueue: [],
    liveChatData: null,
    filteredMessages: [],
    activeChatFilter: 'all',
    activeChatSort: 'time-asc',
    commentsData: null,
    filteredComments: [],
    activeCommSort: 'likes-desc',
    theme: localStorage.getItem('theme') || 'dark'
  };

  // Cached DOM Elements
  const el = {
    // Theme
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
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

    // Live Chat Results Section
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
        localStorage.setItem('theme', state.theme);
        applyTheme(state.theme);
      });
    }
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'light') {
      if (el.sunIcon) el.sunIcon.style.display = 'none';
      if (el.moonIcon) el.moonIcon.style.display = 'inline-block';
      if (el.themeText) el.themeText.textContent = 'Dark';
    } else {
      if (el.sunIcon) el.sunIcon.style.display = 'inline-block';
      if (el.moonIcon) el.moonIcon.style.display = 'none';
      if (el.themeText) el.themeText.textContent = 'Light';
    }
  }

  // ─────────────────────────────────────────────
  // 2. MODE TABS CONTROLLER (Single, Channel, Multi, Comments)
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
  }

  function switchMode(mode) {
    state.activeMode = mode;

    el.tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    Object.keys(el.panels).forEach(k => {
      if (el.panels[k]) el.panels[k].classList.toggle('active', k === mode);
    });

    // Manage results visibility depending on tool mode
    if (mode === 'comments') {
      if (el.resultsChatSection) el.resultsChatSection.style.display = 'none';
      if (state.commentsData && el.resultsCommentsSection) el.resultsCommentsSection.style.display = 'block';
    } else {
      if (el.resultsCommentsSection) el.resultsCommentsSection.style.display = 'none';
      if (state.liveChatData && el.resultsChatSection) el.resultsChatSection.style.display = 'block';
    }
  }

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

      setProgress(100, `Complete!`, `Processed ${res.data.total_messages} messages in ${res.elapsed_sec || 0.5}s`, res.data.total_messages, res.data.unique_chatters, res.data.events_count);

      setTimeout(() => {
        hideProgress();
        renderLiveChatReport(res.data, res.title || `Live Stream [${vid}]`);
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
      alert('Please enter a YouTube Channel URL or handle (e.g. @CarryMinati or https://www.youtube.com/@Aashiislive/streams)');
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
  // 5. RENDER LIVE CHAT REPORT & FEED TABLE
  // ─────────────────────────────────────────────
  function renderLiveChatReport(data, streamTitle) {
    state.liveChatData = data;
    if (el.resultsChatSection) {
      el.resultsChatSection.style.display = 'block';
      el.resultsChatSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Populate KPIs
    if (el.kpiChatTotal) el.kpiChatTotal.textContent = data.total_messages.toLocaleString();
    if (el.kpiChatStreamInfo) el.kpiChatStreamInfo.textContent = streamTitle || `Stream [${data.stream_id}]`;
    if (el.kpiChatUnique) el.kpiChatUnique.textContent = data.unique_chatters.toLocaleString();
    if (el.kpiChatSuperchat) el.kpiChatSuperchat.textContent = `${data.superchats_count} Recorded`;
    if (el.kpiChatMemberships) el.kpiChatMemberships.textContent = `${data.memberships_count} Sponsors`;
    if (el.kpiChatJewels) el.kpiChatJewels.textContent = `${data.jewels_count} Gifts`;

    // Leaderboard
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

    // Tab badges
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
      // Category filter
      if (filter === 'SUPERCHAT' && m.event_type !== 'SUPERCHAT' && m.event_type !== 'STICKER') return false;
      if (filter === 'MEMBERSHIP' && m.event_type !== 'MEMBERSHIP' && m.event_type !== 'GIFT') return false;
      if (filter === 'JEWELS' && m.event_type !== 'JEWELS') return false;
      if (filter === 'MODERATOR' && (!m.badges || (!m.badges.includes('MODERATOR') && !m.badges.includes('MEMBER')))) return false;

      // Text query
      if (query) {
        const inAuthor = (m.author || '').toLowerCase().includes(query);
        const inMsg = (m.message || '').toLowerCase().includes(query);
        const inDetails = (m.details || '').toLowerCase().includes(query);
        return inAuthor || inMsg || inDetails;
      }
      return true;
    });

    // Sorting
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
            No chat messages found matching your active filter or search query.
          </td>
        </tr>
      `;
      return;
    }

    // Render up to 500 rows for smooth DOM performance
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

      // Badges
      let authorBadgesHtml = '';
      if (m.badges && m.badges.length > 0) {
        if (m.badges.includes('OWNER')) authorBadgesHtml += `<span class="author-badge-icon badge-owner" title="Streamer / Channel Owner">👑</span>`;
        if (m.badges.includes('MODERATOR')) authorBadgesHtml += `<span class="author-badge-icon badge-mod" title="Chat Moderator">🛡️</span>`;
        if (m.badges.includes('MEMBER')) authorBadgesHtml += `<span class="author-badge-icon badge-member" title="Channel Member">💎</span>`;
        if (m.badges.includes('VERIFIED')) authorBadgesHtml += `<span class="author-badge-icon badge-verified" title="Verified">✓</span>`;
      }

      // Clickable timestamp
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
  // 6. RENDER VIDEO COMMENTS REPORT & TABLE
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
            No comments found matching your active filter.
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
  // 7. FILTER & EXPORT EVENT LISTENERS
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
    if (el.exportChatExcelBtn) el.exportChatExcelBtn.addEventListener('click', exportChatToExcel);
    if (el.exportChatTxtBtn) el.exportChatTxtBtn.addEventListener('click', exportChatToTxt);
    if (el.exportChatCsvBtn) el.exportChatCsvBtn.addEventListener('click', exportChatToCsv);
    if (el.exportChatJsonBtn) el.exportChatJsonBtn.addEventListener('click', exportChatToJson);

    // Comments exports
    if (el.exportCommExcelBtn) el.exportCommExcelBtn.addEventListener('click', exportCommToExcel);
    if (el.exportCommTxtBtn) el.exportCommTxtBtn.addEventListener('click', exportCommToTxt);
    if (el.exportCommCsvBtn) el.exportCommCsvBtn.addEventListener('click', exportCommToCsv);
    if (el.exportCommJsonBtn) el.exportCommJsonBtn.addEventListener('click', exportCommToJson);
  }

  // ─────────────────────────────────────────────
  // 8. EXPORT SUITE IMPLEMENTATIONS
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

  function exportChatToExcel() {
    if (!state.liveChatData || state.liveChatData.messages.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const msgs = state.filteredMessages.length > 0 ? state.filteredMessages : state.liveChatData.messages;
    const title = state.liveChatData.stream_id || 'stream_chat';

    let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"></head>
    <body>
      <h2>StreamVault — YouTube Live Chat Report</h2>
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
            <td>${m.stream_id}</td>
          </tr>
        `).join('')}
      </table>
    </body></html>`;

    downloadBlob(html, `StreamVault_Chat_${title}.xls`, 'application/vnd.ms-excel');
  }

  function exportChatToTxt() {
    if (!state.liveChatData || state.liveChatData.messages.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const msgs = state.filteredMessages.length > 0 ? state.filteredMessages : state.liveChatData.messages;
    const title = state.liveChatData.stream_id || 'stream_chat';

    let lines = [
      `================================================================================`,
      ` STREAMVAULT — YOUTUBE LIVE CHAT REPLAY EXPORT`,
      ` Stream ID: ${title} | Total Exported Messages: ${msgs.length}`,
      ` Generated: ${new Date().toLocaleString()}`,
      `================================================================================`,
      ''
    ];

    msgs.forEach(m => {
      const prefix = m.event_type !== 'CHAT' ? `[${m.event_type}: ${m.badge_label || m.details}] ` : '';
      lines.push(`[${m.time || '0:00'}] [${m.author}] ${prefix}${m.message}`);
    });

    downloadBlob(lines.join('\n'), `StreamVault_Chat_${title}.txt`, 'text/plain;charset=utf-8');
  }

  function exportChatToCsv() {
    if (!state.liveChatData || state.liveChatData.messages.length === 0) {
      alert('No chat messages to export.');
      return;
    }
    const msgs = state.filteredMessages.length > 0 ? state.filteredMessages : state.liveChatData.messages;
    const title = state.liveChatData.stream_id || 'stream_chat';

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
        m.stream_id
      ];
      csv.push(row.join(','));
    });

    downloadBlob(csv.join('\n'), `StreamVault_Chat_${title}.csv`, 'text/csv;charset=utf-8');
  }

  function exportChatToJson() {
    if (!state.liveChatData) return;
    const jsonStr = JSON.stringify(state.liveChatData, null, 2);
    downloadBlob(jsonStr, `StreamVault_Chat_${state.liveChatData.stream_id || 'export'}.json`, 'application/json');
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
      <h2>StreamVault — YouTube Video Comments Export</h2>
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

    downloadBlob(html, `StreamVault_Comments_${title}.xls`, 'application/vnd.ms-excel');
  }

  function exportCommToTxt() {
    if (!state.commentsData) return;
    const comms = state.filteredComments.length > 0 ? state.filteredComments : state.commentsData.comments;
    const title = state.commentsData.video_id || 'comments';

    let lines = [
      `================================================================================`,
      ` STREAMVAULT — YOUTUBE VIDEO COMMENTS EXPORT`,
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

    downloadBlob(lines.join('\n'), `StreamVault_Comments_${title}.txt`, 'text/plain;charset=utf-8');
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

    downloadBlob(csv.join('\n'), `StreamVault_Comments_${title}.csv`, 'text/csv;charset=utf-8');
  }

  function exportCommToJson() {
    if (!state.commentsData) return;
    downloadBlob(JSON.stringify(state.commentsData, null, 2), `StreamVault_Comments_${state.commentsData.video_id || 'export'}.json`, 'application/json');
  }

  // ── HELPERS ──
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
    const parts = String(tStr).split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  // ─────────────────────────────────────────────
  // INITIALIZE ON DOM READY
  // ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initModeTabs();
    initFilterAndExports();
  });

})();
