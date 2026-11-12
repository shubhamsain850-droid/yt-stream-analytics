/**
 * TubeMetrix 14-Day Cloud Backup, All-Formats ZIP Bundle & Cross-Device Resume Client
 * Stores D1 metadata + Cloudflare R2 ZIP/Resume bundles exclusively for users who purchased >= 1 Credit Pack.
 */
(function () {
  'use strict';

  // ── 1. Zero-Dependency Browser ZIP Builder & Reader (DEFLATE-RAW + STORE) ──
  const CRC_TABLE = (() => {
    const tbl = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      tbl[i] = c >>> 0;
    }
    return tbl;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function toDosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    const dosTime =
      ((date.getHours() & 0x1f) << 11) |
      ((date.getMinutes() & 0x3f) << 5) |
      ((date.getSeconds() >> 1) & 0x1f);
    const dosDate =
      (((year - 1980) & 0x7f) << 9) |
      (((date.getMonth() + 1) & 0x0f) << 5) |
      (date.getDate() & 0x1f);
    return { dosTime, dosDate };
  }

  async function deflateRawBytes(rawBytes) {
    if (typeof CompressionStream === 'undefined' || rawBytes.byteLength < 64) {
      return null;
    }
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(rawBytes);
      writer.close();
      const compressed = new Uint8Array(await new Response(cs.readable).arrayBuffer());
      if (compressed.byteLength > 0 && compressed.byteLength < rawBytes.byteLength) {
        return compressed;
      }
    } catch {}
    return null;
  }

  async function inflateRawBytes(compressedBytes) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Browser DecompressionStream is unavailable.');
    }
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }

  async function buildZipBlob(entries) {
    const encoder = new TextEncoder();
    const { dosTime, dosDate } = toDosDateTime();
    const localChunks = [];
    const centralChunks = [];
    let offset = 0;

    for (const entry of entries || []) {
      if (!entry || !entry.name) continue;
      const nameBytes = encoder.encode(String(entry.name));
      const rawBytes =
        entry.content instanceof Uint8Array
          ? entry.content
          : encoder.encode(String(entry.content ?? ''));

      const checksum = crc32(rawBytes);
      const compressed = await deflateRawBytes(rawBytes);
      const method = compressed ? 8 : 0;
      const payload = compressed || rawBytes;

      const localHeader = new ArrayBuffer(30 + nameBytes.length);
      const lhView = new DataView(localHeader);
      lhView.setUint32(0, 0x04034b50, true);
      lhView.setUint16(4, 20, true);
      lhView.setUint16(6, 0x0800, true); // UTF-8 filename flag
      lhView.setUint16(8, method, true);
      lhView.setUint16(10, dosTime, true);
      lhView.setUint16(12, dosDate, true);
      lhView.setUint32(14, checksum, true);
      lhView.setUint32(18, payload.byteLength, true);
      lhView.setUint32(22, rawBytes.byteLength, true);
      lhView.setUint16(26, nameBytes.length, true);
      lhView.setUint16(28, 0, true);
      new Uint8Array(localHeader, 30).set(nameBytes);

      const centralHeader = new ArrayBuffer(46 + nameBytes.length);
      const cdView = new DataView(centralHeader);
      cdView.setUint32(0, 0x02014b50, true);
      cdView.setUint16(4, 20, true);
      cdView.setUint16(6, 20, true);
      cdView.setUint16(8, 0x0800, true);
      cdView.setUint16(10, method, true);
      cdView.setUint16(12, dosTime, true);
      cdView.setUint16(14, dosDate, true);
      cdView.setUint32(16, checksum, true);
      cdView.setUint32(20, payload.byteLength, true);
      cdView.setUint32(24, rawBytes.byteLength, true);
      cdView.setUint16(28, nameBytes.length, true);
      cdView.setUint16(30, 0, true);
      cdView.setUint16(32, 0, true);
      cdView.setUint16(34, 0, true);
      cdView.setUint16(36, 0, true);
      cdView.setUint32(38, 0, true);
      cdView.setUint32(42, offset, true);
      new Uint8Array(centralHeader, 46).set(nameBytes);

      localChunks.push(localHeader, payload);
      centralChunks.push(centralHeader);
      offset += localHeader.byteLength + payload.byteLength;
    }

    const centralSize = centralChunks.reduce((sum, buf) => sum + buf.byteLength, 0);
    const eocd = new ArrayBuffer(22);
    const eocdView = new DataView(eocd);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, centralChunks.length, true);
    eocdView.setUint16(10, centralChunks.length, true);
    eocdView.setUint32(12, centralSize, true);
    eocdView.setUint32(16, offset, true);
    eocdView.setUint16(20, 0, true);

    return new Blob([...localChunks, ...centralChunks, eocd], { type: 'application/zip' });
  }

  async function extractJsonFromZipBuffer(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const decoder = new TextDecoder();

    let eocdOffset = -1;
    const minSearch = Math.max(0, bytes.length - 65557);
    for (let i = bytes.length - 22; i >= minSearch; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset < 0) throw new Error('Invalid ZIP archive (EOCD not found).');

    const entryCount = view.getUint16(eocdOffset + 10, true);
    let cdOffset = view.getUint32(eocdOffset + 16, true);

    for (let i = 0; i < entryCount; i++) {
      if (view.getUint32(cdOffset, true) !== 0x02014b50) break;
      const method = view.getUint16(cdOffset + 10, true);
      const compSize = view.getUint32(cdOffset + 20, true);
      const nameLen = view.getUint16(cdOffset + 28, true);
      const extraLen = view.getUint16(cdOffset + 30, true);
      const commentLen = view.getUint16(cdOffset + 32, true);
      const localOffset = view.getUint32(cdOffset + 42, true);
      const filename = decoder.decode(bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen));

      if (filename.toLowerCase().endsWith('.json')) {
        const lhNameLen = view.getUint16(localOffset + 26, true);
        const lhExtraLen = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + lhNameLen + lhExtraLen;
        const slice = bytes.subarray(dataStart, dataStart + compSize);
        const rawOut = method === 8 ? await inflateRawBytes(slice) : slice;
        return JSON.parse(decoder.decode(rawOut));
      }

      cdOffset += 46 + nameLen + extraLen + commentLen;
    }

    throw new Error('JSON data file not found inside backup ZIP.');
  }

  // ── 2. Cloud Backup State & Serialized Sync Queue ──
  const PENDING_RESTORE_KEY = 'tm_pending_cloud_restore_v1';
  let cachedUserId = null;
  let cachedBackups = [];
  let cachedPremium = false;
  let cachedR2Configured = true;
  let listFetchPromise = null;

  const latestPendingByBackupId = new Map();
  const activeUploadPromiseById = new Map();

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n <= 0) return 'Pending ZIP';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatBackupDateLabel(dateStr) {
    if (!dateStr) return 'Recent';
    const today = new Date().toISOString().slice(0, 10);
    const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return `Today (${dateStr})`;
    if (dateStr === yest) return `Yesterday (${dateStr})`;
    try {
      const dt = new Date(`${dateStr}T00:00:00Z`);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
    } catch {
      return dateStr;
    }
  }

  function formatDaysLeft(expiresAt) {
    if (!expiresAt) return '14d left';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const days = Math.max(1, Math.ceil(diffMs / 86400000));
    return `${days}d left`;
  }

  function isEligible() {
    const u = window.TubeMetrixAuth?.getUser?.();
    if (!u) return false;
    return Boolean(
      u.isPremiumBackupEligible ||
      Number(u.totalPurchasedCredits || 0) > 0 ||
      Number(u.creditsBalance || 0) > 0
    );
  }

  function resetCacheOnAuthChange() {
    const uid = window.TubeMetrixAuth?.getUser?.()?.id || null;
    if (uid !== cachedUserId) {
      cachedUserId = uid;
      cachedBackups = [];
      cachedPremium = isEligible();
      listFetchPromise = null;
    }
  }

  async function listBackups({ force = false } = {}) {
    resetCacheOnAuthChange();
    const u = window.TubeMetrixAuth?.getUser?.();
    if (!u) {
      return { isPremiumEligible: false, r2Configured: true, backups: [] };
    }
    if (!force && cachedBackups.length > 0 && cachedUserId === u.id) {
      return { isPremiumEligible: cachedPremium, r2Configured: cachedR2Configured, backups: cachedBackups };
    }
    if (listFetchPromise && !force) return listFetchPromise;

    listFetchPromise = (async () => {
      try {
        const res = await fetch('/api/backups/list', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { isPremiumEligible: isEligible(), r2Configured: true, backups: cachedBackups };
        }
        cachedUserId = u.id;
        cachedPremium = Boolean(data.isPremiumEligible);
        cachedR2Configured = data.r2Configured !== false;
        cachedBackups = Array.isArray(data.backups) ? data.backups : [];
        return {
          isPremiumEligible: cachedPremium,
          r2Configured: cachedR2Configured,
          retentionDays: data.retentionDays || 14,
          backups: cachedBackups,
        };
      } catch {
        return { isPremiumEligible: isEligible(), r2Configured: cachedR2Configured, backups: cachedBackups };
      } finally {
        listFetchPromise = null;
      }
    })();

    return listFetchPromise;
  }

  async function executeSingleUpload(snapshot) {
    if (!isEligible()) return null;
    const form = new FormData();
    const meta = {
      id: snapshot.id,
      toolKind: snapshot.toolKind || 'earnings',
      mode: snapshot.mode || 'batch',
      title: snapshot.title || 'TubeMetrix Extraction',
      backupDate: snapshot.backupDate || new Date().toISOString().slice(0, 10),
      status: snapshot.status || 'in_progress',
      completedCount: snapshot.completedCount || 0,
      totalCount: snapshot.totalCount || 0,
      itemsCount: snapshot.itemsCount || 0,
      streamKeys: Array.isArray(snapshot.streamKeys) ? snapshot.streamKeys : [],
    };
    form.append('meta', JSON.stringify(meta));

    if (snapshot.resumePayload) {
      const resumeBlob = new Blob([JSON.stringify(snapshot.resumePayload)], {
        type: 'application/json',
      });
      form.append('resume', resumeBlob, 'resume.json');
    }

    if (Array.isArray(snapshot.bundleFiles) && snapshot.bundleFiles.length > 0) {
      const zipBlob = await buildZipBlob(snapshot.bundleFiles);
      form.append('zip', zipBlob, 'bundle.zip');
    }

    const res = await fetch('/api/backups/save', {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.backup) {
      const idx = cachedBackups.findIndex((b) => b.id === data.backup.id);
      if (idx >= 0) cachedBackups[idx] = data.backup;
      else cachedBackups.unshift(data.backup);
      return data.backup;
    }
    return null;
  }

  function queueBackupSave(snapshot, { immediate = false } = {}) {
    if (!snapshot?.id || !isEligible()) return Promise.resolve(null);
    latestPendingByBackupId.set(snapshot.id, snapshot);

    if (activeUploadPromiseById.has(snapshot.id)) {
      return immediate ? activeUploadPromiseById.get(snapshot.id) : activeUploadPromiseById.get(snapshot.id);
    }

    const worker = (async () => {
      let lastSaved = null;
      try {
        while (latestPendingByBackupId.has(snapshot.id)) {
          const nextSnap = latestPendingByBackupId.get(snapshot.id);
          latestPendingByBackupId.delete(snapshot.id);
          lastSaved = await executeSingleUpload(nextSnap);
        }
      } catch (err) {
        console.warn('Cloud backup sync warning:', err);
      } finally {
        activeUploadPromiseById.delete(snapshot.id);
      }
      return lastSaved;
    })();

    activeUploadPromiseById.set(snapshot.id, worker);
    return worker;
  }

  async function flushBackupSave(backupId) {
    if (backupId && activeUploadPromiseById.has(backupId)) {
      await activeUploadPromiseById.get(backupId);
    }
  }

  async function findRecentDuplicates(videoIds, toolKind) {
    if (!isEligible() || !Array.isArray(videoIds) || videoIds.length === 0) return null;
    await listBackups();
    const targetSet = new Set(videoIds.map((v) => String(v || '').trim()).filter(Boolean));
    if (targetSet.size === 0) return null;

    for (const b of cachedBackups) {
      if (b.toolKind !== toolKind) continue;
      if (b.status !== 'completed' && b.completedCount <= 0) continue;
      const keys = Array.isArray(b.streamKeys) ? b.streamKeys : [];
      const matchedIds = keys.filter((k) => targetSet.has(k));
      if (matchedIds.length > 0 && (b.hasZip || b.hasResume)) {
        return { backup: b, matchedIds };
      }
    }
    return null;
  }

  async function downloadZip(backupId, suggestedTitle = 'Backup') {
    const res = await fetch(`/api/backups/download?id=${encodeURIComponent(backupId)}&kind=zip`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not download ZIP bundle.');
    }
    const blob = await res.blob();
    const disp = res.headers.get('Content-Disposition') || '';
    const match = disp.match(/filename="([^"]+)"/);
    const fname = match ? match[1] : `TubeMetrix_${suggestedTitle.replace(/[^a-zA-Z0-9_-]+/g, '_')}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function fetchResumePayload(backupId) {
    const res = await fetch(`/api/backups/download?id=${encodeURIComponent(backupId)}&kind=resume`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not load saved resume data.');
    }
    return res.json();
  }

  async function fetchCompletedJsonPayload(backupId) {
    const res = await fetch(`/api/backups/download?id=${encodeURIComponent(backupId)}&kind=zip`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not load cloud backup bundle.');
    }
    const buf = await res.arrayBuffer();
    return extractJsonFromZipBuffer(buf);
  }

  async function deleteBackup(backupId) {
    const res = await fetch('/api/backups/delete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: backupId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not delete backup.');
    }
    cachedBackups = cachedBackups.filter((b) => b.id !== backupId);
    return true;
  }

  function getToolPagePath(toolKind) {
    return toolKind === 'earnings' ? '/' : '/chats';
  }

  function isOnToolPage(toolKind) {
    const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    return toolKind === 'earnings' ? path === '/' : path === '/chats';
  }

  async function triggerBackupAction(backup, action) {
    if (!backup) return;
    const isCorrectPage = isOnToolPage(backup.toolKind);
    if (!isCorrectPage || typeof window.__tmRestoreCloudBackup !== 'function') {
      sessionStorage.setItem(
        PENDING_RESTORE_KEY,
        JSON.stringify({ id: backup.id, action, backup })
      );
      window.location.href = getToolPagePath(backup.toolKind);
      return;
    }

    let payload;
    if (action === 'resume' && backup.hasResume) {
      payload = await fetchResumePayload(backup.id);
    } else if (backup.hasZip) {
      payload = await fetchCompletedJsonPayload(backup.id);
    } else if (backup.hasResume) {
      payload = await fetchResumePayload(backup.id);
    }
    if (payload) {
      closeBackupsModal();
      await window.__tmRestoreCloudBackup({ action, backup, payload });
    }
  }

  async function consumePendingRestoreIfReady(expectedToolKinds = []) {
    const raw = sessionStorage.getItem(PENDING_RESTORE_KEY);
    if (!raw) return false;
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem(PENDING_RESTORE_KEY);
      return false;
    }
    if (!parsed?.backup || !expectedToolKinds.includes(parsed.backup.toolKind)) {
      return false;
    }
    sessionStorage.removeItem(PENDING_RESTORE_KEY);
    try {
      await triggerBackupAction(parsed.backup, parsed.action || 'open');
      return true;
    } catch (err) {
      console.warn('Pending cloud restore error:', err);
      return false;
    }
  }

  // ── 3. Cloud Backups Modal & Duplicate Prompt Modal ──
  function closeBackupsModal() {
    const bd = document.getElementById('tmBackupsModalBackdrop');
    if (bd) bd.style.display = 'none';
  }

  async function openBackupsModal() {
    let backdrop = document.getElementById('tmBackupsModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmBackupsModalBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const u = window.TubeMetrixAuth?.getUser?.();
    if (!u) {
      window.TubeMetrixAuth?.openAuthModal?.(
        'Sign in with Google and purchase any Credit Pack to unlock 14-Day Cloud Backups, All-Formats ZIP Bundles & Power-Cut Resume.'
      );
      return;
    }

    backdrop.innerHTML = `
      <div class="tm-modal-card tm-backups-modal-card">
        <button class="tm-modal-close" id="closeBackupsModalBtn" type="button">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-brand-pill">☁️ 14-Day Cloud Backups</div>
          <h2 class="tm-modal-title">My Cloud Backups &amp; Recovery</h2>
          <p class="tm-modal-subtitle">Every completed stream saves automatically online for 14 days with CSV, Excel, TXT &amp; JSON combined into one ZIP bundle.</p>
        </div>
        <div id="tmBackupsModalBody" class="tm-backups-body">
          <div class="tm-backups-loading">Loading your 14-day cloud backups...</div>
        </div>
      </div>
    `;
    backdrop.style.display = 'flex';

    document.getElementById('closeBackupsModalBtn').onclick = closeBackupsModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeBackupsModal();
    };

    const bodyEl = document.getElementById('tmBackupsModalBody');
    const data = await listBackups({ force: true });

    if (!data.isPremiumEligible) {
      bodyEl.innerHTML = `
        <div class="tm-backups-locked-box">
          <div class="tm-backups-locked-icon">🔒</div>
          <h3>Unlocked Automatically With Any Credit Pack</h3>
          <p>Purchase even the starter pack (₹49 / $2.99) once to permanently unlock:</p>
          <ul>
            <li>⚡ Per-stream online auto-save (continue seamlessly after power cuts or device switches)</li>
            <li>📦 14-Day date-wise Cloud ZIP Archive (CSV + Excel .xls + Notepad .txt + JSON in one bundle)</li>
            <li>🛡️ Duplicate stream check so you never accidentally spend credits twice</li>
          </ul>
          <button type="button" class="btn-upgrade-pack" id="backupsUnlockBtn">💎 Buy Starter Credit Pack</button>
        </div>
      `;
      document.getElementById('backupsUnlockBtn')?.addEventListener('click', () => {
        closeBackupsModal();
        window.TubeMetrixAuth?.openCreditsModal?.(
          'Unlock 14-Day Cloud Backups, Combined ZIP Bundles & Cross-Device Power-Cut Resume with any Credit Pack!'
        );
      });
      return;
    }

    const r2Notice = !data.r2Configured
      ? `<div class="tm-backups-warn-banner">⚠️ Cloud R2 bucket binding (<code>tubemetrix-backups</code>) pending setup — local checkpoints still active.</div>`
      : '';

    const backups = data.backups || [];
    if (backups.length === 0) {
      bodyEl.innerHTML = `
        ${r2Notice}
        <div class="tm-backups-empty">
          <div style="font-size:2rem;margin-bottom:8px;">☁️</div>
          <strong>No Cloud Backups Saved Yet</strong>
          <p>Run any Earnings Audit, Live Chat Extraction, or Video Comments download — progress auto-saves every stream and full ZIP bundles stay here for 14 days.</p>
        </div>
      `;
      return;
    }

    const groups = new Map();
    backups.forEach((b) => {
      const k = b.backupDate || 'Recent';
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(b);
    });

    const toolLabels = {
      earnings: '💰 Earnings',
      chats: '💬 Live Chat',
      comments: '💭 Comments',
    };

    const groupsHtml = Array.from(groups.entries())
      .map(([dateKey, items]) => {
        const cardsHtml = items
          .map((b) => {
            const statusCls =
              b.status === 'completed' ? 'is-completed' : b.status === 'paused' ? 'is-paused' : 'is-progress';
            const statusLabel =
              b.status === 'completed'
                ? `✅ Completed (${b.completedCount || b.totalCount || 1}/${b.totalCount || b.completedCount || 1})`
                : `⏸ Incomplete (${b.completedCount}/${b.totalCount || '?'})`;
            const timeLabel = b.updatedAt
              ? new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';
            const showResume = Boolean(b.hasResume && b.status !== 'completed');

            return `
              <div class="tm-backup-row" data-backup-id="${escapeHtml(b.id)}">
                <div class="tm-backup-row-main">
                  <div class="tm-backup-badges">
                    <span class="tm-backup-tool-pill">${toolLabels[b.toolKind] || '📊 Audit'}</span>
                    <span class="tm-backup-status-pill ${statusCls}">${statusLabel}</span>
                    <span class="tm-backup-expiry-pill">⏳ ${formatDaysLeft(b.expiresAt)}</span>
                  </div>
                  <div class="tm-backup-title">${escapeHtml(b.title)}</div>
                  <div class="tm-backup-meta">
                    <span>🕒 ${escapeHtml(timeLabel)}</span>
                    <span>📊 ${(b.itemsCount || 0).toLocaleString()} records</span>
                    <span>📦 ${formatBytes(b.zipSizeBytes)}</span>
                  </div>
                </div>
                <div class="tm-backup-row-actions">
                  ${showResume ? `<button type="button" class="btn-backup-resume" data-act="resume" data-id="${escapeHtml(b.id)}">▶ Continue</button>` : ''}
                  ${b.hasZip ? `<button type="button" class="btn-backup-zip" data-act="zip" data-id="${escapeHtml(b.id)}">📦 ZIP</button>` : ''}
                  ${(b.hasZip || b.hasResume) ? `<button type="button" class="btn-backup-open" data-act="open" data-id="${escapeHtml(b.id)}">👁 Open</button>` : ''}
                  <button type="button" class="btn-backup-del" data-act="delete" data-id="${escapeHtml(b.id)}" title="Delete backup">🗑</button>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="tm-backup-date-group">
            <div class="tm-backup-date-header">📅 ${escapeHtml(formatBackupDateLabel(dateKey))}</div>
            ${cardsHtml}
          </div>
        `;
      })
      .join('');

    bodyEl.innerHTML = `${r2Notice}<div class="tm-backups-list">${groupsHtml}</div>`;

    bodyEl.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const act = btn.getAttribute('data-act');
        const id = btn.getAttribute('data-id');
        const target = backups.find((x) => x.id === id);
        if (!target) return;

        btn.disabled = true;
        const prevText = btn.textContent;
        try {
          if (act === 'zip') {
            btn.textContent = '⏳...';
            await downloadZip(id, target.title);
          } else if (act === 'resume' || act === 'open') {
            btn.textContent = '⏳...';
            await triggerBackupAction(target, act);
          } else if (act === 'delete') {
            await deleteBackup(id);
            openBackupsModal();
            return;
          }
        } catch (err) {
          alert(err.message || 'Backup action failed.');
        } finally {
          if (document.body.contains(btn)) {
            btn.disabled = false;
            btn.textContent = prevText;
          }
        }
      });
    });
  }

  function promptDuplicateModal({ backup, matchedIds, onUseBackup, onRefetchFresh }) {
    let backdrop = document.getElementById('tmDupPromptBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmDupPromptBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div class="tm-modal-card" style="max-width:460px;">
        <button class="tm-modal-close" id="closeDupPromptBtn" type="button">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-brand-pill">🛡️ Double-Spend Guard</div>
          <h2 class="tm-modal-title">Already Saved in Cloud Backup</h2>
          <p class="tm-modal-subtitle">
            <strong>${matchedIds.length} stream(s)</strong> match your 14-day backup
            (<strong>${escapeHtml(backup.title)}</strong> on ${escapeHtml(backup.backupDate)}).
            Load from Cloud Backup for <strong>0 Credits</strong> or fetch fresh again?
          </p>
        </div>
        <div class="tm-dup-actions">
          <button type="button" class="btn-upgrade-pack" id="dupLoadCloudBtn">☁️ Open Saved Backup (0 CR)</button>
          <button type="button" class="btn-resume-secondary" id="dupFetchFreshBtn">🔄 Re-fetch Fresh (Uses Credits)</button>
        </div>
      </div>
    `;
    backdrop.style.display = 'flex';

    const close = () => {
      backdrop.style.display = 'none';
    };
    document.getElementById('closeDupPromptBtn').onclick = close;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) close();
    };
    document.getElementById('dupLoadCloudBtn').onclick = async () => {
      close();
      if (typeof onUseBackup === 'function') await onUseBackup(backup);
    };
    document.getElementById('dupFetchFreshBtn').onclick = async () => {
      close();
      if (typeof onRefetchFresh === 'function') await onRefetchFresh();
    };
  }

  // Listen to auth updates & expose clean global API
  window.addEventListener('tubemetrix:auth-updated', () => {
    resetCacheOnAuthChange();
    if (isEligible()) {
      listBackups({ force: true });
    }
  });

  window.TubeMetrixZip = {
    buildZipBlob,
    extractJsonFromZipBuffer,
  };

  window.TubeMetrixBackups = {
    isEligible,
    listBackups,
    queueBackupSave,
    flushBackupSave,
    findRecentDuplicates,
    downloadZip,
    fetchResumePayload,
    fetchCompletedJsonPayload,
    deleteBackup,
    triggerBackupAction,
    consumePendingRestoreIfReady,
    openBackupsModal,
    closeBackupsModal,
    promptDuplicateModal,
  };
})();

