/**
 * StreamVault — YouTube Live Stream Earning & Chat Analytics
 * Frontend Controller & Engine
 */

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
  results: null // Stored parsed data
};

// ── Jewels Reference Table (From memberv4.py) ──
const JEWEL_MAP = {
  "Panipuri": 2, "Samosa": 2, "Star": 2, "Namaste": 2, "Sparkles": 2,
  "Kem cho?": 5, "Macha": 5, "Arre yaar!": 5, "Chili": 6,
  "Cricket": 10, "All izz well": 10, "Gold coin": 10,
  "Party hat": 20, "GGEZ": 20, "Six seven": 67, "Clock it": 80,
  "Chai toast": 100, "Vada pav": 100, "Vibe hai": 100, "Sunshine": 200,
  "Clapping seal": 250, "Laughing disco": 250, "Finger heart": 350,
  "Mic drop": 600, "Soccer trophy": 500, "Let em cook": 750,
  "Guitar": 1000, "Trophy cake": 1000, "Bubble heart": 1500,
  "Biscuit tin": 5000, "Sports car": 9500, "Castle": 18000, "Racing game": 20000
};
const INR_PER_JEWEL = 1.20;

// ── DOM Elements ──
const elements = {
  // Navigation & Currency
  currBtns: document.querySelectorAll('.curr-btn'),
  
  // Mode Tabs & Panels
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
  setupResultsTabs();
  setupSearchAndSort();
  setupExports();
});

// ── 1. Currency Switching ──
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

// ── 2. Mode Switching (Option A, B, C) ──
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

// ── 3. Option A (Single URL) ──
function setupSingleMode() {
  // Paste button
  elements.pasteSingleBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) elements.singleUrlInput.value = text.trim();
    } catch {
      elements.singleUrlInput.focus();
    }
  });

  // Example chips
  elements.exampleChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.singleUrlInput.value = chip.dataset.url;
    });
  });

  // Start Analysis
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

// ── 4. Option B (Channel & Date Range) ──
function setupChannelMode() {
  // Date Presets
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

  elements.startChannelBtn.addEventListener('click', () => {
    const channel = elements.channelUrlInput.value.trim();
    if (!channel) {
      alert('Please enter a YouTube Channel URL, handle (@username), or stream tab URL.');
      elements.channelUrlInput.focus();
      return;
    }

    // Mock 6 channel streams for demonstration
    const sampleStreams = [
      `https://www.youtube.com/watch?v=GBiPHQ42WjE`,
      `https://www.youtube.com/watch?v=kYJvM9lOQ11`,
      `https://www.youtube.com/watch?v=mZ7vE1w9B44`,
      `https://www.youtube.com/watch?v=vX1cM8pW231`,
      `https://www.youtube.com/watch?v=tY8vB42Wq10`,
      `https://www.youtube.com/watch?v=aZ1vL9oW877`
    ];
    startProcessing(sampleStreams, `Channel: ${channel}`);
  });
}

// ── 5. Option C (Multi-URL Batch) ──
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

    // Attach remove listeners
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

// ── 6. Processing Engine & Real-time Live Counters ──
async function startProcessing(urls, label = null) {
  state.processing = true;
  elements.processingCard.style.display = 'block';
  elements.resultsSection.style.display = 'none';

  // Smooth scroll to status card
  elements.processingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Reset counters
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

  // Processing Simulation & Stream Parsing
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
    const pct = Math.round(((i + 0.3) / urls.length) * 100);

    elements.progressBarFill.style.width = `${pct}%`;
    elements.progressPercent.textContent = `${pct}%`;
    elements.statusTicker.textContent = `[${i + 1}/${urls.length}] Downloading chat replay for ID: ${vid}...`;

    await new Promise(r => setTimeout(r, 600));

    // Determine status (mocking 85% success, 10% no chat, 5% error)
    const rand = Math.random();
    if (rand < 0.08 && urls.length > 2) {
      state.metrics.noChat++;
      elements.statusTicker.textContent = `[WARN] Chat replay unavailable or disabled for: ${vid}`;
    } else if (rand > 0.94 && urls.length > 3) {
      state.metrics.failed++;
      elements.statusTicker.textContent = `[ERROR] Stream private / region locked: ${vid}`;
    } else {
      state.metrics.success++;
      const streamData = generateStreamData(vid, i + 1);
      resultsAccumulator.streams.push(streamData.summary);
      resultsAccumulator.superchats.push(...streamData.superchats);
      resultsAccumulator.memberships.push(...streamData.memberships);
      resultsAccumulator.jewels.push(...streamData.jewels);
      streamData.donors.forEach(d => resultsAccumulator.uniqueDonors.add(d));
      streamData.chatters.forEach(c => resultsAccumulator.uniqueChatters.add(c));
    }

    updateMetricsDisplay();
  }

  // Final 100%
  elements.progressBarFill.style.width = '100%';
  elements.progressPercent.textContent = '100%';
  elements.statusTicker.textContent = `Analysis Complete! Processed ${state.metrics.success} streams with active chat data.`;
  elements.statusTitle.textContent = 'Audit Finished Successfully';

  await new Promise(r => setTimeout(r, 400));

  state.processing = false;
  state.results = resultsAccumulator;

  renderAllResults(resultsAccumulator);
  elements.resultsSection.style.display = 'block';
  elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateMetricsDisplay() {
  elements.countTotal.textContent = state.metrics.total;
  elements.countSuccess.textContent = state.metrics.success;
  elements.countFailed.textContent = state.metrics.failed;
  elements.countNoChat.textContent = state.metrics.noChat;
}

function extractVideoId(url) {
  const m = url.match(/(?:v=|\/|be\/|shorts\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
}

// ── 7. Realistic Data Generator (Based on memberv4.py schema) ──
function generateStreamData(vid, index) {
  const donorsList = ["Aryan Gamer", "Deepak Sharma", "Rohit Gaming", "Pooja_Live", "Vikram Rathore", "Kunal OP", "Simran_vlogs", "Aditya Bhai"];
  const jewelItems = ["Panipuri", "Samosa", "Mic drop", "Chai toast", "Castle", "Guitar", "Sports car", "Vada pav"];
  const memTiers = ["Duggu's World 🐥", "Wink Army 🙂", "Shinning Fam ✨", "Special Fam ♜", "Super Sponsors 🔥"];
  const tierPrices = [59, 299, 479, 799, 3999];

  const streamSc = [];
  const streamJewels = [];
  const streamMems = [];
  const chatters = new Set();
  const donors = new Set();

  let totalScInr = 0;
  let totalJewelsCount = 0;
  let totalJewelsInr = 0;
  let totalMemInr = 0;

  // Generate 4 - 9 Superchats
  const scCount = Math.floor(Math.random() * 6) + 4;
  for (let s = 0; s < scCount; s++) {
    const author = donorsList[Math.floor(Math.random() * donorsList.length)];
    const amounts = [40, 100, 200, 500, 1000, 2000];
    const amt = amounts[Math.floor(Math.random() * amounts.length)];
    totalScInr += amt;
    donors.add(author);
    chatters.add(author);

    streamSc.push({
      author,
      amount: amt,
      currency: "INR",
      message: amt > 500 ? "Love from Delhi! Keep grinding bro ❤️🔥" : "OP gameplay bhai!",
      streamId: vid,
      timestamp: "01:24:12"
    });
  }

  // Generate 2 - 5 Jewels Gifts
  const jCount = Math.floor(Math.random() * 4) + 2;
  for (let j = 0; j < jCount; j++) {
    const author = donorsList[Math.floor(Math.random() * donorsList.length)];
    const item = jewelItems[Math.floor(Math.random() * jewelItems.length)];
    const count = JEWEL_MAP[item] || 10;
    const qty = Math.floor(Math.random() * 3) + 1;
    const totalJ = count * qty;
    const inrVal = totalJ * INR_PER_JEWEL;

    totalJewelsCount += totalJ;
    totalJewelsInr += inrVal;
    donors.add(author);
    chatters.add(author);

    streamJewels.push({
      giftName: item,
      author,
      quantity: qty,
      totalJewels: totalJ,
      inrValue: inrVal,
      streamId: vid
    });
  }

  // Generate 1 - 3 Memberships
  const mCount = Math.floor(Math.random() * 3) + 1;
  for (let m = 0; m < mCount; m++) {
    const author = donorsList[Math.floor(Math.random() * donorsList.length)];
    const tIdx = Math.floor(Math.random() * memTiers.length);
    const tier = memTiers[tIdx];
    const price = tierPrices[tIdx];

    totalMemInr += price;
    donors.add(author);
    chatters.add(author);

    streamMems.push({
      author,
      type: "New Member Join",
      tier,
      price,
      streamId: vid
    });
  }

  const gross = totalScInr + totalJewelsInr + totalMemInr;

  return {
    summary: {
      vid,
      title: `Grand Live Stream #${index} [Championship Finale]`,
      date: new Date(Date.now() - index * 86400000).toISOString().split('T')[0],
      superchatsInr: totalScInr,
      jewelsInr: totalJewelsInr,
      jewelsCount: totalJewelsCount,
      membershipsInr: totalMemInr,
      grossInr: gross,
      scCount: streamSc.length
    },
    superchats: streamSc,
    jewels: streamJewels,
    memberships: streamMems,
    donors: Array.from(donors),
    chatters: Array.from(chatters)
  };
}

// ── 8. Render All Results & KPI Cards ──
function renderAllResults(data) {
  // Aggregate KPIs
  let totalGrossInr = 0;
  let totalScInr = 0;
  let totalJewelsInr = 0;
  let totalJewelsCount = 0;
  let totalMemInr = 0;

  data.streams.forEach(s => {
    totalGrossInr += s.grossInr;
    totalScInr += s.superchatsInr;
    totalJewelsInr += s.jewelsInr;
    totalJewelsCount += s.jewelsCount;
    totalMemInr += s.membershipsInr;
  });

  const netTakeInr = totalGrossInr * 0.70; // 70% creator share

  // Update KPI Cards
  elements.kpiGrossTotal.textContent = formatCurrency(totalGrossInr);
  elements.kpiNetTotal.textContent = `Net Creator Take (~70%): ${formatCurrency(netTakeInr)}`;
  elements.kpiSuperchat.textContent = formatCurrency(totalScInr);
  elements.kpiSuperchatCount.textContent = `${data.superchats.length} Superchats recorded`;
  elements.kpiJewels.textContent = formatCurrency(totalJewelsInr);
  elements.kpiJewelsCount.textContent = `${totalJewelsCount.toLocaleString()} Jewels (₹1.20/jewel)`;
  elements.kpiMemberships.textContent = formatCurrency(totalMemInr);
  elements.kpiMemberCount.textContent = `${data.memberships.length} Member joins & gifts`;
  elements.kpiUniqueDonors.textContent = data.uniqueDonors.size.toString();
  elements.kpiUniqueChatters.textContent = `${(data.uniqueChatters.size + data.uniqueDonors.size * 3)} Active Chatters`;

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
  // Sort descending by default
  const sorted = [...superchats].sort((a, b) => b.amount - a.amount);

  elements.superchatTableBody.innerHTML = sorted.map((sc, idx) => {
    let rankClass = '';
    if (idx === 0) rankClass = 'top-1';
    else if (idx === 1) rankClass = 'top-2';
    else if (idx === 2) rankClass = 'top-3';

    return `
      <tr>
        <td class="rank-badge ${rankClass}">#${idx + 1}</td>
        <td><strong>${sc.author}</strong></td>
        <td class="amount-badge">${formatCurrency(sc.amount)}</td>
        <td><span class="pill-badge pill-red">${sc.currency}</span></td>
        <td><em>"${sc.message}"</em></td>
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
      <td>${m.tier}</td>
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

// ── 9. Results Sub-Tabs Switching ──
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

// ── 10. Real-time Search & Sort ──
function setupSearchAndSort() {
  elements.tableSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!state.results) return;

    // Filter Superchats
    const filteredSc = state.results.superchats.filter(sc => 
      sc.author.toLowerCase().includes(query) ||
      sc.message.toLowerCase().includes(query) ||
      sc.streamId.toLowerCase().includes(query)
    );
    renderSuperchatTable(filteredSc);

    // Filter Streams
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
      state.results.superchats.sort((a, b) => b.amount - a.amount);
    } else if (val === 'amount-asc') {
      state.results.superchats.sort((a, b) => a.amount - b.amount);
    } else if (val === 'name-asc') {
      state.results.superchats.sort((a, b) => a.author.localeCompare(b.author));
    }
    renderSuperchatTable(state.results.superchats);
  });
}

// ── 11. Client-Side Clean CSV & JSON Export ──
function setupExports() {
  elements.exportAllCsvBtn.addEventListener('click', () => {
    if (!state.results) return;

    let csv = "Category,Donor/Author,Amount (INR),Details,Stream ID\n";
    
    // Superchats
    state.results.superchats.forEach(s => {
      csv += `Superchat,"${s.author.replace(/"/g, '""')}",${s.amount},"${s.message.replace(/"/g, '""')}",${s.streamId}\n`;
    });

    // Jewels
    state.results.jewels.forEach(j => {
      csv += `Jewel Gift,"${j.author.replace(/"/g, '""')}",${j.inrValue},"${j.giftName} (x${j.quantity})",${j.streamId}\n`;
    });

    // Memberships
    state.results.memberships.forEach(m => {
      csv += `Membership,"${m.author.replace(/"/g, '""')}",${m.price},"${m.tier}",${m.streamId}\n`;
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
