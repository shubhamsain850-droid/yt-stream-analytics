/**
 * StreamVault — YouTube Live Stream Earning, Super Chat, Memberships & Jewels Analytics
 * Connected to live FastAPI backend on Hugging Face: https://shubhamsain858-kickcuttr-api.hf.space
 */

// ── Configuration ──
const API_BASE = "https://shubhamsain858-kickcuttr-api.hf.space/api/youtube";

// ── Application State ──
const state = {
  currentCurrency: 'INR',
  currencyRate: 86.5, // 1 USD ~ 86.5 INR
  activeMode: 'single',
  activeView: 'overview',
  multiUrlQueue: [],
  processing: false,
  metrics: {
    total: 0,
    success: 0,
    failed: 0,
    noChat: 0
  },
  tierPrices: {
    "Duggu’s world 🐥": 59,
    "Duggu's World 🐥": 59,
    "Special Fam 🩵": 799,
    "Special Fam ♜": 799,
    "Sweet Army 🩵": 59,
    "Wink Army 🙂": 299,
    "Shinning Fam ✨": 479,
    "Super Sponsors 🔥": 3999,
    "Level 1": 59,
    "Level 2": 159,
    "Level 3": 299,
    "Level 4": 799,
    "Level 5": 3999
  },
  discoveredTiers: new Set(),
  results: null
};

// ── YouTube Jewels Economics ──
// Creator Revenue Rate: 1 Ruby = $0.01 USD (~Rs. 0.84 INR).
// Viewers spend ~2 Jewels per Ruby => Net Creator Earnings = ~Rs. 0.42 per Jewel (NOT Rs. 1.20!).
const INR_PER_JEWEL = 0.42;

const CURRENCY_RATES = {
  "INR": 1.0, "₹": 1.0, "Rs": 1.0,
  "USD": 86.5, "$": 86.5, "US$": 86.5,
  "EUR": 93.0, "€": 93.0, "GBP": 110.0, "£": 110.0,
  "CAD": 63.5, "AUD": 56.0, "AED": 23.5, "SGD": 64.5
};

// ── DOM Elements ──
const elements = {
  currBtns: document.querySelectorAll('.curr-btn'),
  tabBtns: document.querySelectorAll('.mode-tabs .tab-btn'),
  modePanels: document.querySelectorAll('.mode-panel'),
  multiTabBadge: document.getElementById('multiTabBadge'),

  // Single Mode
  singleUrlInput: document.getElementById('singleUrlInput'),
  pasteSingleBtn: document.getElementById('pasteSingleBtn'),
  startSingleBtn: document.getElementById('startSingleBtn'),
  exampleChips: document.querySelectorAll('.example-chip'),

  // Channel Mode
  channelUrlInput: document.getElementById('channelUrlInput'),
  fromDateInput: document.getElementById('fromDateInput'),
  toDateInput: document.getElementById('toDateInput'),
  presetChips: document.querySelectorAll('.preset-chip'),
  startChannelBtn: document.getElementById('startChannelBtn'),

  // Multi Mode
  multiUrlInput: document.getElementById('multiUrlInput'),
  addUrlBtn: document.getElementById('addUrlBtn'),
  queueCount: document.getElementById('queueCount'),
  clearAllUrlsBtn: document.getElementById('clearAllUrlsBtn'),
  urlQueueList: document.getElementById('urlQueueList'),
  startMultiBtn: document.getElementById('startMultiBtn'),

  // Upload Mode
  fileUploadInput: document.getElementById('fileUploadInput'),
  dropZone: document.getElementById('dropZone'),

  // Processing Card
  processingCard: document.getElementById('processingCard'),
  statusTitle: document.getElementById('statusTitle'),
  progressPercent: document.getElementById('progressPercent'),
  progressBarFill: document.getElementById('progressBarFill'),
  statusTicker: document.getElementById('statusTicker'),
  countTotal: document.getElementById('countTotal'),
  countSuccess: document.getElementById('countSuccess'),
  countFailed: document.getElementById('countFailed'),
  countNoChat: document.getElementById('countNoChat'),

  // Results Section
  resultsSection: document.getElementById('resultsSection'),
  kpiGrossTotal: document.getElementById('kpiGrossTotal'),
  kpiNetTotal: document.getElementById('kpiNetTotal'),
  kpiSuperchat: document.getElementById('kpiSuperchat'),
  kpiSuperchatCount: document.getElementById('kpiSuperchatCount'),
  kpiJewels: document.getElementById('kpiJewels'),
  kpiJewelsCount: document.getElementById('kpiJewelsCount'),
  kpiMemberships: document.getElementById('kpiMemberships'),
  kpiMemberCount: document.getElementById('kpiMemberCount'),
  kpiUniqueDonors: document.getElementById('kpiUniqueDonors'),
  kpiUniqueChatters: document.getElementById('kpiUniqueChatters'),

  // Tiers Bar
  tiersBar: document.getElementById('tiersBar'),
  tiersList: document.getElementById('tiersList'),

  // Results Tabs
  resTabBtns: document.querySelectorAll('.res-tab-btn'),
  viewPanels: document.querySelectorAll('.view-panel'),
  badgeScTab: document.getElementById('badgeScTab'),
  badgeMemTab: document.getElementById('badgeMemTab'),
  badgeJewelTab: document.getElementById('badgeJewelTab'),

  // Tables
  streamsTableBody: document.getElementById('streamsTableBody'),
  superchatTableBody: document.getElementById('superchatTableBody'),
  membershipsTableBody: document.getElementById('membershipsTableBody'),
  jewelsTableBody: document.getElementById('jewelsTableBody'),

  // Search & Export
  tableSearchInput: document.getElementById('tableSearchInput'),
  sortSelect: document.getElementById('sortSelect'),
  exportAllCsvBtn: document.getElementById('exportAllCsvBtn'),
  exportJsonBtn: document.getElementById('exportJsonBtn')
};

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
  setupCurrencySwitcher();
  setupModeTabs();
  setupSingleMode();
  setupChannelMode();
  setupMultiMode();
  setupUploadMode();
  setupResultsTabs();
  setupSearchAndSort();
  setupExports();
});

// ── Currency Switching ──
function setupCurrencySwitcher() {
  elements.currBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.currBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentCurrency = btn.dataset.curr;
      if (state.results) {
        renderAllResults(state.results);
      }
    });
  });
}

function formatCurrency(amountINR) {
  if (state.currentCurrency === 'USD') {
    const usd = amountINR / state.currencyRate;
    return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${Math.round(amountINR).toLocaleString('en-IN')}`;
}

// ── Mode Switching ──
function setupModeTabs() {
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.tabBtns.forEach(b => b.classList.remove('active'));
      elements.modePanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const mode = btn.dataset.mode;
      state.activeMode = mode;
      document.getElementById(`panel-${mode}`).classList.add('active');
    });
  });
}

// ── Option A (Single URL) ──
function setupSingleMode() {
  elements.pasteSingleBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) elements.singleUrlInput.value = text.trim();
    } catch {
      elements.singleUrlInput.focus();
    }
  });

  elements.exampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.singleUrlInput.value = chip.dataset.url;
    });
  });

  elements.startSingleBtn.addEventListener('click', () => {
    const url = elements.singleUrlInput.value.trim();
    if (!url) {
      alert('Please enter or paste a valid YouTube stream URL or video ID.');
      elements.singleUrlInput.focus();
      return;
    }
    startProcessing([url]);
  });
}

// ── Option B (Channel & Date Range) ──
function setupChannelMode() {
  elements.presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.presetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const preset = chip.dataset.preset;
      const today = new Date();
      elements.toDateInput.value = today.toISOString().split('T')[0];

      if (preset === '7d') {
        const d = new Date();
        d.setDate(today.getDate() - 7);
        elements.fromDateInput.value = d.toISOString().split('T')[0];
      } else if (preset === '30d') {
        const d = new Date();
        d.setDate(today.getDate() - 30);
        elements.fromDateInput.value = d.toISOString().split('T')[0];
      } else if (preset === '90d') {
        const d = new Date();
        d.setDate(today.getDate() - 90);
        elements.fromDateInput.value = d.toISOString().split('T')[0];
      } else {
        elements.fromDateInput.value = '';
        elements.toDateInput.value = '';
      }
    });
  });

  elements.startChannelBtn.addEventListener('click', async () => {
    const channel = elements.channelUrlInput.value.trim();
    if (!channel) {
      alert('Please enter a YouTube Channel URL, handle (@username), or stream tab URL.');
      elements.channelUrlInput.focus();
      return;
    }

    elements.startChannelBtn.disabled = true;
    elements.startChannelBtn.innerHTML = `<span>Fetching Channel Streams...</span>`;

    const fromDate = elements.fromDateInput.value || null;
    const toDate = elements.toDateInput.value || null;

    try {
      const resp = await fetch(`${API_BASE}/channel-streams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_url: channel,
          from_date: fromDate,
          to_date: toDate,
          max_results: 30
        })
      });

      const resJson = await resp.json();
      if (resJson.success && resJson.streams && resJson.streams.length > 0) {
        const urls = resJson.streams.map(s => s.url);
        startProcessing(urls, `Channel: ${channel} (${urls.length} Streams Found)`);
        return;
      } else {
        alert("No streams found matching the specified date range on this channel.");
      }
    } catch (e) {
      alert(`Error connecting to stream fetcher: ${e.message}`);
    } finally {
      elements.startChannelBtn.disabled = false;
      elements.startChannelBtn.innerHTML = `<span>Fetch Channel Streams &amp; Analyze</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    }
  });
}

// ── Option C (Multi-URL Batch) ──
function setupMultiMode() {
  function updateMultiBadgeAndUI() {
    const count = state.multiUrlQueue.length;
    elements.multiTabBadge.textContent = `${count} Added`;
    elements.queueCount.textContent = count;
    elements.startMultiBtn.disabled = count === 0;
    elements.clearAllUrlsBtn.style.display = count > 0 ? 'inline-block' : 'none';

    if (count === 0) {
      elements.urlQueueList.innerHTML = `
        <div class="empty-queue-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>No streams added yet. Paste a YouTube URL above and click <strong>"Add Stream"</strong>.</span>
        </div>`;
      return;
    }

    elements.urlQueueList.innerHTML = state.multiUrlQueue.map((item, idx) => `
      <div class="queue-item">
        <div class="queue-item-info">
          <span class="queue-item-num">#${idx + 1}</span>
          <span class="queue-item-url" title="${item}">${item}</span>
        </div>
        <button class="queue-item-remove" data-index="${idx}" title="Remove stream">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `).join('');

    document.querySelectorAll('.queue-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(btn.dataset.index, 10);
        state.multiUrlQueue.splice(i, 1);
        updateMultiBadgeAndUI();
      });
    });
  }

  function addCurrentUrl() {
    const val = elements.multiUrlInput.value.trim();
    if (!val) return;
    if (state.multiUrlQueue.includes(val)) {
      alert('This stream URL is already in your batch list.');
      return;
    }
    state.multiUrlQueue.push(val);
    elements.multiUrlInput.value = '';
    elements.multiUrlInput.focus();
    updateMultiBadgeAndUI();
  }

  elements.addUrlBtn.addEventListener('click', addCurrentUrl);
  elements.multiUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addCurrentUrl();
  });

  elements.clearAllUrlsBtn.addEventListener('click', () => {
    if (confirm('Clear all added streams from this batch?')) {
      state.multiUrlQueue = [];
      updateMultiBadgeAndUI();
    }
  });

  elements.startMultiBtn.addEventListener('click', () => {
    if (state.multiUrlQueue.length === 0) return;
    startProcessing([...state.multiUrlQueue]);
  });
}

// ── Option D: Direct JSON File Upload & Instant Parser ──
function setupUploadMode() {
  elements.fileUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleJsonFile(file);
  });

  elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.style.borderColor = '#ff3355';
  });

  elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.style.borderColor = 'rgba(255, 0, 51, 0.35)';
  });

  elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.style.borderColor = 'rgba(255, 0, 51, 0.35)';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleJsonFile(e.dataTransfer.files[0]);
    }
  });
}

function handleJsonFile(file) {
  // ── Session Isolation Reset (Zero cross-file pollution) ──
  state.discoveredTiers.clear();
  state.results = null;
  if (elements.streamsTableBody) elements.streamsTableBody.innerHTML = '';
  if (elements.superchatTableBody) elements.superchatTableBody.innerHTML = '';
  if (elements.membershipsTableBody) elements.membershipsTableBody.innerHTML = '';
  if (elements.jewelsTableBody) elements.jewelsTableBody.innerHTML = '';
  if (elements.tiersBar) elements.tiersBar.style.display = 'none';

  elements.processingCard.style.display = 'block';
  elements.resultsSection.style.display = 'none';
  elements.statusTitle.textContent = `Parsing ${file.name}...`;
  elements.statusTicker.textContent = 'Reading JSON file into memory...';
  elements.progressBarFill.style.width = '30%';
  elements.progressPercent.textContent = '30%';

  const reader = new FileReader();
  reader.onload = function(evt) {
    elements.progressBarFill.style.width = '60%';
    elements.progressPercent.textContent = '60%';
    elements.statusTicker.textContent = 'Extracting Superchats, Memberships & Jewels...';

    const text = evt.target.result;
    const lines = text.split(/\r?\n/);
    const vid = extractVideoId(file.name) || file.name.replace('.live_chat.json', '').replace('.json', '');
    const cleanTitle = file.name.replace('.live_chat.json', '').replace('.json', '');

    const parsed = parseClientSideJson(lines, vid);

    elements.progressBarFill.style.width = '100%';
    elements.progressPercent.textContent = '100%';
    elements.statusTitle.textContent = `Completed: ${file.name}`;
    elements.statusTicker.textContent = `Done! Found ${parsed.superchats.length} Superchats and ${parsed.memberships.length} Memberships.`;

    state.metrics = {
      total: 1,
      success: 1,
      failed: 0,
      noChat: 0
    };
    updateMetricsDisplay();

    const accumulator = {
      streams: [{
        vid: vid,
        title: cleanTitle,
        date: new Date().toISOString().split('T')[0],
        superchatsInr: parsed.totals.superchat_inr,
        jewelsInr: parsed.totals.jewels_inr,
        jewelsCount: parsed.totals.jewels_count,
        membershipsInr: parsed.totals.memberships_inr,
        grossInr: parsed.totals.gross_inr,
        scCount: parsed.totals.superchat_count
      }],
      superchats: parsed.superchats,
      memberships: parsed.memberships,
      jewels: parsed.jewels,
      uniqueDonors: new Set(parsed.unique_donors),
      uniqueChatters: new Set(parsed.unique_donors)
    };

    state.results = accumulator;
    renderAllResults(accumulator);
    renderTiersBar();
    elements.resultsSection.style.display = 'block';
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  reader.readAsText(file);
}

// ── Safe Text Extractor Helper ──
function extractText(field) {
  if (!field) return "";
  if (typeof field === "string") return field.trim();
  if (typeof field === "object") {
    if (field.simpleText) return String(field.simpleText).trim();
    if (field.content) return String(field.content).trim();
    if (Array.isArray(field.runs)) {
      return field.runs.map(r => r.text || "").join("").trim();
    }
  }
  return "";
}

// ── High Performance Client-Side Parser ──
function parseClientSideJson(lines, vid) {
  const seenIds = new Set();
  const superchats = [];
  const memberships = [];
  const jewels = [];
  const uniqueDonors = new Set();

  let totalScInr = 0;
  let totalJewelsCount = 0;
  let totalJewelsInr = 0;
  let totalMemInr = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Fast check for Superchats & Super Stickers
    if (line.includes('purchaseAmountText')) {
      try {
        const obj = JSON.parse(line);
        walkJson(obj, (item) => {
          if (item.purchaseAmountText) {
            const scId = item.id;
            if (scId && seenIds.has(scId)) return;
            if (scId) seenIds.add(scId);

            const author = extractText(item.authorName) || "Unknown";
            const amtStr = extractText(item.purchaseAmountText) || "0";
            const parsedAmt = parseAmountStr(amtStr);
            const rate = CURRENCY_RATES[parsedAmt.currency] || 1.0;
            const amtInr = parsedAmt.amount * rate;

            let msg = "";
            if (item.message) {
              msg = extractText(item.message);
            } else {
              msg = "[Super Sticker]";
            }

            superchats.push({
              author,
              amount: parsedAmt.amount,
              currency: parsedAmt.currency,
              amount_inr: amtInr,
              message: msg,
              streamId: vid,
              timestamp: extractText(item.timestampText)
            });
            totalScInr += amtInr;
            uniqueDonors.add(author);
          }
        });
      } catch (e) {}
    }

    // Fast check for Memberships (New Joins & Milestones)
    if (line.includes('liveChatMembershipItemRenderer')) {
      try {
        const obj = JSON.parse(line);
        walkJson(obj, (item) => {
          if (item.headerSubtext || item.headerPrimaryText) {
            const mId = item.id;
            if (mId && seenIds.has(mId)) return;
            if (mId) seenIds.add(mId);

            const author = extractText(item.authorName) || "Unknown";
            const subText = extractText(item.headerSubtext);
            const priText = extractText(item.headerPrimaryText);

            let tier = "General Member";
            let type = "Member";
            let tenure = "";
            let price = 59;

            if (subText.toLowerCase().includes('welcome to')) {
              tier = subText.replace(/welcome to/i, '').replace(/!/g, '').trim();
              type = "New Join";
              state.discoveredTiers.add(tier);
            } else if (subText.toLowerCase().includes('upgraded')) {
              tier = subText.replace(/upgraded.*?to/i, '').replace(/!/g, '').trim();
              type = "Upgrade";
              state.discoveredTiers.add(tier);
              price = 299;
            } else if (subText) {
              // Milestone: subText contains the clean custom tier e.g. "Duggu’s world 🐥"
              tier = subText.trim();
              tenure = priText;
              type = "Milestone / Renewal";
              state.discoveredTiers.add(tier);
            } else if (priText) {
              tier = "General Member";
              tenure = priText;
              type = `Milestone (${priText})`;
            }

            price = state.tierPrices[tier] || price;
            memberships.push({
              author,
              type,
              tier,
              tenure,
              price,
              streamId: vid
            });
            totalMemInr += price;
            uniqueDonors.add(author);
          }
        });
      } catch (e) {}
    }

    // Fast check for Gifted Memberships Purchase
    if (line.includes('liveChatSponsorshipsGiftPurchaseAnnouncementRenderer')) {
      try {
        const obj = JSON.parse(line);
        walkJson(obj, (item) => {
          if (item.header && item.header.liveChatSponsorshipsHeaderRenderer) {
            const gId = item.id;
            if (gId && seenIds.has(gId)) return;
            if (gId) seenIds.add(gId);

            const h = item.header.liveChatSponsorshipsHeaderRenderer;
            const author = extractText(h.authorName) || "Unknown";
            const pri = extractText(h.primaryText);
            let count = 1;
            const m = pri.match(/\b(\d+)\b/);
            if (m) count = parseInt(m[1]);
            const estVal = count * 59;

            memberships.push({
              author,
              type: `Gifted (${count})`,
              tier: `${count} Memberships Gifted`,
              tenure: pri,
              price: estVal,
              streamId: vid
            });
            totalMemInr += estVal;
            uniqueDonors.add(author);
          }
        });
      } catch (e) {}
    }

    // Fast check for YouTube Jewels
    if (line.includes('giftMessageViewModel')) {
      try {
        const obj = JSON.parse(line);
        walkJson(obj, (item) => {
          const content = extractText(item.text);
          if (content) {
            const match = content.match(/comboed x(\d+) (.+?) for (\d+) Jewels/);
            if (match) {
              const qty = parseInt(match[1]);
              const gname = match[2].trim();
              const jAmt = parseInt(match[3]);
              const author = extractText(item.authorName) || "Unknown";
              const inrVal = jAmt * INR_PER_JEWEL;

              jewels.push({
                giftName: gname,
                author,
                quantity: qty,
                totalJewels: jAmt,
                inrValue: inrVal,
                streamId: vid
              });
              totalJewelsCount += jAmt;
              totalJewelsInr += inrVal;
              uniqueDonors.add(author);
            }
          }
        });
      } catch (e) {}
    }
  }

  const grossInr = totalScInr + totalJewelsInr + totalMemInr;
  return {
    superchats,
    memberships,
    jewels,
    unique_donors: Array.from(uniqueDonors),
    totals: {
      gross_inr: grossInr,
      superchat_inr: totalScInr,
      superchat_count: superchats.length,
      jewels_inr: totalJewelsInr,
      jewels_count: totalJewelsCount,
      memberships_inr: totalMemInr,
      memberships_count: memberships.length
    }
  };
}

function walkJson(obj, callback) {
  if (typeof obj !== 'object' || obj === null) return;
  callback(obj);
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) walkJson(obj[i], callback);
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) walkJson(obj[key], callback);
    }
  }
}

function parseAmountStr(text) {
  let curr = "INR";
  for (const s in CURRENCY_RATES) {
    if (text.includes(s)) {
      curr = s === '₹' || s === 'Rs' ? 'INR' : s;
      break;
    }
  }
  const clean = text.replace(/[^\d.]/g, '');
  const val = parseFloat(clean) || 0;
  return { amount: val, currency: curr };
}

// ── 6. Processing Engine (ZERO FAKE DATA) ──
async function startProcessing(urls, label = null) {
  // ── Session Isolation Reset (Zero cross-stream pollution) ──
  state.discoveredTiers.clear();
  state.results = null;
  if (elements.streamsTableBody) elements.streamsTableBody.innerHTML = '';
  if (elements.superchatTableBody) elements.superchatTableBody.innerHTML = '';
  if (elements.membershipsTableBody) elements.membershipsTableBody.innerHTML = '';
  if (elements.jewelsTableBody) elements.jewelsTableBody.innerHTML = '';
  if (elements.tiersBar) elements.tiersBar.style.display = 'none';

  state.processing = true;
  elements.processingCard.style.display = 'block';
  elements.resultsSection.style.display = 'none';

  elements.processingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

  state.metrics = {
    total: urls.length,
    success: 0,
    failed: 0,
    noChat: 0
  };
  updateMetricsDisplay();

  elements.statusTitle.textContent = label || `Processing ${urls.length} Stream(s)...`;
  elements.progressBarFill.style.width = '0%';
  elements.progressPercent.textContent = '0%';
  elements.statusTicker.textContent = 'Connecting to YouTube streaming sockets...';

  const resultsAccumulator = {
    streams: [],
    superchats: [],
    memberships: [],
    jewels: [],
    uniqueDonors: new Set(),
    uniqueChatters: new Set()
  };

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const vid = extractVideoId(url) || `VID_${i + 1}`;
    const pct = Math.round(((i + 0.1) / urls.length) * 100);

    elements.progressBarFill.style.width = `${pct}%`;
    elements.progressPercent.textContent = `${pct}%`;
    elements.statusTicker.textContent = `[${i + 1}/${urls.length}] Downloading & analyzing live chat for ID: ${vid}...`;

    try {
      const resp = await fetch(`${API_BASE}/analyze-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      });

      const resData = await resp.json();

      if (resData.success && resData.data) {
        state.metrics.success++;
        const p = resData.data;

        if (p.custom_tiers) {
          p.custom_tiers.forEach(t => state.discoveredTiers.add(t));
        }

        resultsAccumulator.streams.push({
          vid: p.stream_id,
          title: resData.title || `Live Stream [${p.stream_id}]`,
          date: p.upload_date || new Date().toISOString().split('T')[0],
          superchatsInr: p.totals.superchat_inr,
          jewelsInr: p.totals.jewels_inr,
          jewelsCount: p.totals.jewels_count,
          membershipsInr: p.totals.memberships_inr,
          grossInr: p.totals.gross_inr,
          scCount: p.totals.superchat_count
        });

        resultsAccumulator.superchats.push(...p.superchats.map(s => ({
          author: s.author,
          amount: s.amount,
          currency: s.currency,
          amount_inr: s.amount_inr,
          message: s.message,
          streamId: s.stream_id,
          timestamp: s.time
        })));

        resultsAccumulator.memberships.push(...p.memberships.map(m => ({
          author: m.author,
          type: m.type,
          tier: m.tier,
          tenure: m.tenure || '',
          price: state.tierPrices[m.tier] || m.price_inr,
          streamId: m.stream_id
        })));

        resultsAccumulator.jewels.push(...p.jewels.map(j => ({
          giftName: j.gift_name,
          author: j.author,
          quantity: j.quantity,
          totalJewels: j.jewels,
          inrValue: j.inr_value,
          streamId: j.stream_id
        })));

        p.unique_donors.forEach(d => resultsAccumulator.uniqueDonors.add(d));
      } else if (resData.error === "NO_CHAT_AVAILABLE") {
        state.metrics.noChat++;
        elements.statusTicker.textContent = `[NO CHAT] Live chat replay was disabled or not available for: ${resData.title || vid}`;
      } else {
        state.metrics.failed++;
        elements.statusTicker.textContent = `[FAILED] ${resData.message || 'Stream unavailable'}`;
      }
    } catch (netErr) {
      state.metrics.failed++;
      elements.statusTicker.textContent = `[ERROR] Network timeout or connection error for ${vid}`;
    }

    updateMetricsDisplay();
  }

  // 100% Complete
  elements.progressBarFill.style.width = '100%';
  elements.progressPercent.textContent = '100%';

  state.processing = false;
  state.results = resultsAccumulator;

  if (state.metrics.success > 0) {
    elements.statusTicker.textContent = `Audit Complete! Successfully parsed ${state.metrics.success} stream(s).`;
    elements.statusTitle.textContent = 'Audit Finished';
    renderAllResults(resultsAccumulator);
    renderTiersBar();
    elements.resultsSection.style.display = 'block';
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    elements.statusTitle.textContent = 'Audit Result: No Live Chat Available';
    elements.statusTicker.innerHTML = `⚠️ YouTube live chat could not be retrieved from the URL directly because chat replay was disabled or restricted by YouTube. <br><br>💡 <strong>Tip:</strong> If you have the <code>.live_chat.json</code> file, switch to <strong>Option D: Upload JSON</strong> above for instant 100% audit!`;
  }
}

function updateMetricsDisplay() {
  elements.countTotal.textContent = state.metrics.total;
  elements.countSuccess.textContent = state.metrics.success;
  elements.countFailed.textContent = state.metrics.failed;
  elements.countNoChat.textContent = state.metrics.noChat;
}

function extractVideoId(url) {
  const m = url.match(/(?:v=|\/|be\/|shorts\/|live\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
}

// ── Render Tiers Bar & Interactive Price Editor ──
function renderTiersBar() {
  if (state.discoveredTiers.size === 0) {
    elements.tiersBar.style.display = 'none';
    return;
  }

  elements.tiersBar.style.display = 'block';
  elements.tiersList.innerHTML = Array.from(state.discoveredTiers).map(tier => {
    const price = state.tierPrices[tier] || 59;
    return `
      <div class="tier-chip" data-tier="${tier}" title="Click to edit price for ${tier}">
        <span>${tier}</span>
        <strong style="color: #10b981;">₹${price}</strong>
        <span style="font-size: 0.72rem;">✏️</span>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.tier-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tier = chip.dataset.tier;
      const currentPrice = state.tierPrices[tier] || 59;
      const newPriceStr = prompt(`Enter custom monthly price in INR for tier: "${tier}"`, currentPrice);
      if (newPriceStr !== null) {
        const newPrice = parseFloat(newPriceStr);
        if (!isNaN(newPrice) && newPrice > 0) {
          state.tierPrices[tier] = newPrice;
          
          if (state.results) {
            state.results.memberships.forEach(m => {
              if (m.tier === tier) m.price = newPrice;
            });
            renderAllResults(state.results);
            renderTiersBar();
          }
        }
      }
    });
  });
}

// ── 7. Render All Results & KPI Cards ──
function renderAllResults(data) {
  let totalGrossInr = 0;
  let totalScInr = 0;
  let totalJewelsInr = 0;
  let totalJewelsCount = 0;
  let totalMemInr = 0;

  data.streams.forEach(s => {
    totalScInr += s.superchatsInr;
    totalJewelsInr += s.jewelsInr;
    totalJewelsCount += s.jewelsCount;
    totalMemInr += s.membershipsInr;
  });

  totalGrossInr = totalScInr + totalJewelsInr + totalMemInr;
  const netTakeInr = totalGrossInr * 0.70;

  // Update KPI Cards
  elements.kpiGrossTotal.textContent = formatCurrency(totalGrossInr);
  elements.kpiNetTotal.textContent = `Net Creator Take (~70%): ${formatCurrency(netTakeInr)}`;
  elements.kpiSuperchat.textContent = formatCurrency(totalScInr);
  elements.kpiSuperchatCount.textContent = `${data.superchats.length} Superchats recorded`;
  elements.kpiJewels.textContent = formatCurrency(totalJewelsInr);
  elements.kpiJewelsCount.textContent = `${totalJewelsCount.toLocaleString()} Jewels (₹0.42/jewel creator rate)`;
  elements.kpiMemberships.textContent = formatCurrency(totalMemInr);
  elements.kpiMemberCount.textContent = `${data.memberships.length} Member joins & gifts`;
  elements.kpiUniqueDonors.textContent = data.uniqueDonors.size.toString();
  elements.kpiUniqueChatters.textContent = `${data.uniqueDonors.size} Active Donors`;

  // Update Tab Badges
  elements.badgeScTab.textContent = data.superchats.length;
  elements.badgeMemTab.textContent = data.memberships.length;
  elements.badgeJewelTab.textContent = data.jewels.length;

  // Render 4 Tables
  renderStreamsTable(data.streams);
  renderSuperchatTable(data.superchats);
  renderMembershipsTable(data.memberships);
  renderJewelsTable(data.jewels);
}

function renderStreamsTable(streams) {
  elements.streamsTableBody.innerHTML = streams.map(s => `
    <tr>
      <td>
        <div class="stream-cell">
          <span class="stream-title-text" title="${s.title}">${s.title}</span>
          <span class="stream-vid-badge">${s.vid}</span>
        </div>
      </td>
      <td>${s.date}</td>
      <td class="amount-badge">${formatCurrency(s.superchatsInr)} <small>(${s.scCount})</small></td>
      <td class="amount-badge">${formatCurrency(s.jewelsInr)}</td>
      <td class="amount-badge">${formatCurrency(s.membershipsInr)}</td>
      <td class="amount-badge gross">${formatCurrency(s.grossInr)}</td>
      <td>
        <a href="https://www.youtube.com/watch?v=${s.vid}" target="_blank" class="example-chip">Watch ↗</a>
      </td>
    </tr>
  `).join('');
}

function renderSuperchatTable(superchats) {
  const sorted = [...superchats].sort((a, b) => (b.amount_inr || b.amount) - (a.amount_inr || a.amount));

  elements.superchatTableBody.innerHTML = sorted.map((sc, idx) => {
    let rankClass = '';
    if (idx === 0) rankClass = 'top-1';
    else if (idx === 1) rankClass = 'top-2';
    else if (idx === 2) rankClass = 'top-3';

    return `
      <tr>
        <td class="rank-badge ${rankClass}">#${idx + 1}</td>
        <td><strong>${sc.author}</strong></td>
        <td class="amount-badge">${formatCurrency(sc.amount_inr || sc.amount)}</td>
        <td><span class="pill-badge pill-red">${sc.currency}</span></td>
        <td><em>"${sc.message || '-'}"</em></td>
        <td><span class="stream-vid-badge">${sc.streamId}</span></td>
      </tr>
    `;
  }).join('');
}

function renderMembershipsTable(mems) {
  elements.membershipsTableBody.innerHTML = mems.map(m => `
    <tr>
      <td><strong>${m.author}</strong></td>
      <td><span class="pill-badge pill-purple">${m.type}</span></td>
      <td>
        <strong>${m.tier}</strong>
        ${m.tenure ? `<div style="font-size:0.75rem; color:#9ca3af; margin-top:2px;">${m.tenure}</div>` : ''}
      </td>
      <td class="amount-badge">${formatCurrency(m.price)}</td>
      <td><span class="stream-vid-badge">${m.streamId}</span></td>
    </tr>
  `).join('');
}

function renderJewelsTable(jewels) {
  elements.jewelsTableBody.innerHTML = jewels.map(j => `
    <tr>
      <td><strong>🎁 ${j.giftName}</strong></td>
      <td>${j.author}</td>
      <td>x${j.quantity}</td>
      <td><span class="pill-badge pill-amber">${j.totalJewels} Jewels</span></td>
      <td class="amount-badge">${formatCurrency(j.inrValue)}</td>
      <td><span class="stream-vid-badge">${j.streamId}</span></td>
    </tr>
  `).join('');
}

// ── Results Sub-Tabs Switching ──
function setupResultsTabs() {
  elements.resTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.resTabBtns.forEach(b => b.classList.remove('active'));
      elements.viewPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const view = btn.dataset.view;
      state.activeView = view;
      document.getElementById(`view-${view}`).classList.add('active');
    });
  });
}

// ── Search & Sort ──
function setupSearchAndSort() {
  elements.tableSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!state.results) return;

    const filteredSc = state.results.superchats.filter(sc => 
      sc.author.toLowerCase().includes(query) ||
      sc.message.toLowerCase().includes(query) ||
      sc.streamId.toLowerCase().includes(query)
    );
    renderSuperchatTable(filteredSc);

    const filteredStreams = state.results.streams.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.vid.toLowerCase().includes(query)
    );
    renderStreamsTable(filteredStreams);
  });

  elements.sortSelect.addEventListener('change', (e) => {
    if (!state.results) return;
    const val = e.target.value;

    if (val === 'amount-desc') {
      state.results.superchats.sort((a, b) => (b.amount_inr || b.amount) - (a.amount_inr || a.amount));
    } else if (val === 'amount-asc') {
      state.results.superchats.sort((a, b) => (a.amount_inr || a.amount) - (b.amount_inr || b.amount));
    } else if (val === 'name-asc') {
      state.results.superchats.sort((a, b) => a.author.localeCompare(b.author));
    }
    renderSuperchatTable(state.results.superchats);
  });
}

// ── CSV & JSON Export ──
function setupExports() {
  elements.exportAllCsvBtn.addEventListener('click', () => {
    if (!state.results) return;

    let csv = "Category,Donor/Author,Amount (INR),Details,Stream ID\n";
    state.results.superchats.forEach(s => {
      csv += `Superchat,"${s.author.replace(/"/g, '""')}",${s.amount_inr || s.amount},"${(s.message || '').replace(/"/g, '""')}",${s.streamId}\n`;
    });
    state.results.jewels.forEach(j => {
      csv += `Jewel Gift,"${j.author.replace(/"/g, '""')}",${j.inrValue},"${j.giftName} (x${j.quantity})",${j.streamId}\n`;
    });
    state.results.memberships.forEach(m => {
      csv += `Membership,"${m.author.replace(/"/g, '""')}",${m.price},"${m.tier} (${m.tenure || ''})",${m.streamId}\n`;
    });

    downloadFile(csv, `YouTube_Stream_Earnings_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  });

  elements.exportJsonBtn.addEventListener('click', () => {
    if (!state.results) return;
    const jsonStr = JSON.stringify(state.results, null, 2);
    downloadFile(jsonStr, `YouTube_Stream_Earnings_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  });
}

function downloadFile(content, fileName, contentType) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}
