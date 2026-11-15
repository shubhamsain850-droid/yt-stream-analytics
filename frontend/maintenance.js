/**
 * TubeMetrix — Real-Time Maintenance Mode & Admin Control Engine
 * Supports scheduled countdown timer, live public lockdown, and owner bypass preview.
 */

(function () {
  'use strict';

  const STATUS_ENDPOINT = '/api/maintenance';
  const MASTER_DEFAULT_PIN = 'tubemetrix2026';
  const ADMIN_EMAILS = ['shubhamsain850@gmail.com', 'support@tubemetrix.net'];

  let maintenanceState = {
    enabled: false,
    endTime: null,
    durationMinutes: 60,
    remainingSeconds: 0,
    reason: '',
  };

  let countdownInterval = null;
  let adminBarTimerInterval = null;

  function hasAdminBypass() {
    try {
      if (localStorage.getItem('tm_maintenance_bypass') === 'true') return true;
      const user = window.TubeMetrixAuth?.getUser?.();
      if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
        return true;
      }
    } catch {}
    return false;
  }

  function setAdminBypass(val) {
    try {
      if (val) {
        localStorage.setItem('tm_maintenance_bypass', 'true');
      } else {
        localStorage.removeItem('tm_maintenance_bypass');
      }
    } catch {}
  }

  // ─────────────────────────────────────────────
  // 1. Fetch Maintenance Status
  // ─────────────────────────────────────────────
  async function checkMaintenanceStatus() {
    try {
      const resp = await fetch(STATUS_ENDPOINT, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!resp.ok) return;
      const data = await resp.json();
      maintenanceState = data;

      if (data.enabled) {
        if (hasAdminBypass()) {
          renderAdminStickyBar(data);
          hideMaintenanceOverlay();
        } else {
          showMaintenanceOverlay(data);
          hideAdminStickyBar();
        }
      } else {
        hideMaintenanceOverlay();
        hideAdminStickyBar();
      }
    } catch (e) {
      console.warn('[Maintenance Engine Error]:', e);
    }
  }

  // ─────────────────────────────────────────────
  // 2. Full-Screen Public Maintenance Overlay
  // ─────────────────────────────────────────────
  function showMaintenanceOverlay(data) {
    let overlay = document.getElementById('tmPublicMaintenanceOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tmPublicMaintenanceOverlay';
      overlay.className = 'tm-maintenance-overlay';
      document.body.appendChild(overlay);
    }

    const reasonText = data.reason || 'We are performing scheduled maintenance and rolling out new features. We will be back online shortly!';
    const targetEnd = data.endTime ? new Date(data.endTime) : null;
    const formattedEnd = targetEnd && !isNaN(targetEnd.getTime())
      ? targetEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ' (' + targetEnd.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')'
      : 'Shortly';

    overlay.innerHTML = `
      <div class="tm-maintenance-card">
        <div class="tm-m-logo-wrap">
          <div class="tm-m-logo-glow"></div>
          <svg viewBox="0 0 100 100" fill="none" class="tm-m-logo-svg">
            <defs>
              <linearGradient id="mTmRed" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff1744" />
                <stop offset="50%" stop-color="#ff0033" />
                <stop offset="100%" stop-color="#c40026" />
              </linearGradient>
              <linearGradient id="mCyanArrow" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#00f2fe" />
                <stop offset="100%" stop-color="#4facfe" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="96" height="96" rx="26" fill="url(#mTmRed)" />
            <rect x="18" y="22" width="64" height="15" rx="7.5" fill="#ffffff" />
            <rect x="33.5" y="48" width="9" height="28" rx="4.5" fill="#ffffff" opacity="0.82" />
            <rect x="45.5" y="40" width="9" height="36" rx="4.5" fill="#ffffff" opacity="0.96" />
            <rect x="57.5" y="32" width="9" height="44" rx="4.5" fill="url(#mCyanArrow)" />
            <path d="M 22 74 L 75 24" stroke="url(#mCyanArrow)" stroke-width="5.5" stroke-linecap="round" />
            <path d="M 57 24 L 75 24 L 75 42" fill="none" stroke="url(#mCyanArrow)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <div class="tm-m-badge">
          <span class="tm-m-pulse-dot"></span> Scheduled System Upgrade
        </div>

        <h1 class="tm-m-heading">TubeMetrix is Currently Under Maintenance</h1>
        <p class="tm-m-desc">${escapeHtml(reasonText)}</p>

        <!-- Live Countdown Cards -->
        <div class="tm-countdown-wrap" id="tmCountdownWrap">
          <div class="tm-countdown-card">
            <span class="tm-c-val" id="tmCountHours">00</span>
            <span class="tm-c-lbl">Hours</span>
          </div>
          <span class="tm-c-sep">:</span>
          <div class="tm-countdown-card">
            <span class="tm-c-val" id="tmCountMins">00</span>
            <span class="tm-c-lbl">Minutes</span>
          </div>
          <span class="tm-c-sep">:</span>
          <div class="tm-countdown-card">
            <span class="tm-c-val" id="tmCountSecs">00</span>
            <span class="tm-c-lbl">Seconds</span>
          </div>
        </div>

        <div class="tm-m-estimate-badge">
          <span>🕒 Expected Completion:</span>
          <strong>${formattedEnd}</strong>
        </div>

        <div class="tm-m-safety-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>All user credits, accounts, and saved backup reports are 100% safe.</span>
        </div>

        <div class="tm-m-footer">
          <span>Questions or urgent assistance?</span>
          <a href="mailto:support@tubemetrix.net" class="tm-m-mail-link">support@tubemetrix.net</a>
        </div>

        <div class="tm-m-bypass-link-wrap">
          <button type="button" id="tmOpenBypassPromptBtn" class="tm-m-bypass-link">Owner / Staff Bypass Access ➔</button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Start ticking countdown
    startLiveCountdown(data.endTime);

    // Bind bypass prompt
    const bypassBtn = document.getElementById('tmOpenBypassPromptBtn');
    if (bypassBtn) {
      bypassBtn.addEventListener('click', promptAdminBypass);
    }
  }

  function hideMaintenanceOverlay() {
    const overlay = document.getElementById('tmPublicMaintenanceOverlay');
    if (overlay) {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function startLiveCountdown(endTimeStr) {
    if (countdownInterval) clearInterval(countdownInterval);
    if (!endTimeStr) return;

    const targetMs = new Date(endTimeStr).getTime();
    if (isNaN(targetMs)) return;

    function tick() {
      const diff = Math.max(0, targetMs - Date.now());
      if (diff <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        // Auto-refresh when countdown completes
        setTimeout(() => { window.location.reload(); }, 2000);
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');
      const hEl = document.getElementById('tmCountHours');
      const mEl = document.getElementById('tmCountMins');
      const sEl = document.getElementById('tmCountSecs');
      if (hEl) hEl.textContent = pad(h);
      if (mEl) mEl.textContent = pad(m);
      if (sEl) sEl.textContent = pad(s);
    }

    tick();
    countdownInterval = setInterval(tick, 1000);
  }

  // ─────────────────────────────────────────────
  // 3. Admin Sticky Preview Bar (When Maintenance is ON & Admin Bypass is Active)
  // ─────────────────────────────────────────────
  function renderAdminStickyBar(data) {
    let bar = document.getElementById('tmAdminStickyBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'tmAdminStickyBar';
      bar.className = 'tm-admin-sticky-bar';
      document.body.prepend(bar);
    }

    bar.innerHTML = `
      <div class="tm-as-inner">
        <div class="tm-as-left">
          <span class="tm-as-badge">⚠️ MAINTENANCE MODE ACTIVE</span>
          <span class="tm-as-timer" id="tmAdminBarTimer">Ends in --:--:--</span>
          <span class="tm-as-tag">[Admin Preview - Public Access Locked]</span>
        </div>
        <div class="tm-as-right">
          <button type="button" class="tm-as-btn-settings" id="tmAdminBarSettingsBtn">⚙️ Manage</button>
          <button type="button" class="tm-as-btn-turnoff" id="tmAdminBarTurnOffBtn">Turn OFF</button>
        </div>
      </div>
    `;

    bar.style.display = 'block';

    const settingsBtn = document.getElementById('tmAdminBarSettingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', openMaintenanceModal);

    const offBtn = document.getElementById('tmAdminBarTurnOffBtn');
    if (offBtn) {
      offBtn.addEventListener('click', async () => {
        if (!confirm('Turn OFF Maintenance Mode and make TubeMetrix live for all public visitors?')) return;
        await setMaintenanceMode(false, 0);
      });
    }

    startAdminBarTimer(data.endTime);
  }

  function hideAdminStickyBar() {
    const bar = document.getElementById('tmAdminStickyBar');
    if (bar) bar.style.display = 'none';
    if (adminBarTimerInterval) {
      clearInterval(adminBarTimerInterval);
      adminBarTimerInterval = null;
    }
  }

  function startAdminBarTimer(endTimeStr) {
    if (adminBarTimerInterval) clearInterval(adminBarTimerInterval);
    if (!endTimeStr) return;

    const targetMs = new Date(endTimeStr).getTime();
    if (isNaN(targetMs)) return;

    function tick() {
      const diff = Math.max(0, targetMs - Date.now());
      const timerEl = document.getElementById('tmAdminBarTimer');
      if (diff <= 0) {
        if (timerEl) timerEl.textContent = 'Completed (Ready to Go Live)';
        clearInterval(adminBarTimerInterval);
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const pad = (n) => String(n).padStart(2, '0');
      if (timerEl) timerEl.textContent = `Ends in ${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    tick();
    adminBarTimerInterval = setInterval(tick, 1000);
  }

  // ─────────────────────────────────────────────
  // 4. Admin Maintenance Control Center Modal
  // ─────────────────────────────────────────────
  function openMaintenanceModal() {
    let modal = document.getElementById('tmMaintenanceModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tmMaintenanceModal';
      modal.className = 'tm-m-modal-backdrop';
      document.body.appendChild(modal);
    }

    const isCurrentOn = Boolean(maintenanceState.enabled);
    const currentDur = maintenanceState.durationMinutes || 60;
    const currentReason = maintenanceState.reason || 'We are performing scheduled maintenance and rolling out new features. We will be back online shortly!';
    const savedPin = localStorage.getItem('tm_admin_pin') || '';

    modal.innerHTML = `
      <div class="tm-m-modal-card">
        <div class="tm-mm-header">
          <div class="tm-mm-title">
            <span>🛠️ Maintenance Mode Control Center</span>
            <span class="tm-mm-status-pill ${isCurrentOn ? 'on' : 'off'}">${isCurrentOn ? 'ACTIVE' : 'OFFLINE'}</span>
          </div>
          <button type="button" class="tm-mm-close-btn" id="tmCloseMModalBtn">✕</button>
        </div>

        <div class="tm-mm-body">
          <!-- Toggle Master Switch -->
          <div class="tm-mm-switch-card">
            <div class="tm-mm-switch-info">
              <strong>Maintenance Mode Status</strong>
              <p>When enabled, all public visitors see the scheduled maintenance countdown screen.</p>
            </div>
            <label class="tm-toggle-switch">
              <input type="checkbox" id="tmMaintenanceToggleInput" ${isCurrentOn ? 'checked' : ''}>
              <span class="tm-toggle-slider"></span>
            </label>
          </div>

          <!-- Duration Presets Section -->
          <div class="tm-mm-section" id="tmDurationSettingsWrap" style="${isCurrentOn ? '' : 'opacity: 0.9;'}">
            <label class="tm-mm-label">Duration / Target End Time</label>
            <div class="tm-preset-pills" id="tmPresetPills">
              <button type="button" class="tm-preset-btn ${currentDur === 15 ? 'active' : ''}" data-mins="15">15 Min</button>
              <button type="button" class="tm-preset-btn ${currentDur === 30 ? 'active' : ''}" data-mins="30">30 Min</button>
              <button type="button" class="tm-preset-btn ${currentDur === 60 ? 'active' : ''}" data-mins="60">1 Hour</button>
              <button type="button" class="tm-preset-btn ${currentDur === 120 ? 'active' : ''}" data-mins="120">2 Hours</button>
              <button type="button" class="tm-preset-btn ${currentDur === 240 ? 'active' : ''}" data-mins="240">4 Hours</button>
              <button type="button" class="tm-preset-btn" id="tmCustomDurationBtn">Custom</button>
            </div>

            <div class="tm-custom-duration-row" id="tmCustomDurationRow" style="display: none; margin-top: 10px;">
              <input type="number" id="tmCustomMinsInput" class="tm-mm-input" placeholder="Minutes (e.g. 45)" min="1" max="1440" value="${currentDur}">
              <span style="font-size: 0.85rem; color: var(--text-secondary); align-self: center;">minutes</span>
            </div>

            <div class="tm-mm-time-preview" id="tmCalculatedEndPreview">
              Calculated return time: <strong>Calculating...</strong>
            </div>
          </div>

          <!-- Public Announcement Reason -->
          <div class="tm-mm-section">
            <label class="tm-mm-label" for="tmMaintenanceReasonInput">Public Announcement Message</label>
            <textarea id="tmMaintenanceReasonInput" class="tm-mm-textarea" rows="2" placeholder="Explain the reason for maintenance...">${escapeHtml(currentReason)}</textarea>
          </div>

          <!-- Admin Verification PIN -->
          <div class="tm-mm-section">
            <label class="tm-mm-label" for="tmAdminPinInput">Admin PIN / Passkey</label>
            <input type="password" id="tmAdminPinInput" class="tm-mm-input" placeholder="Enter Admin PIN" value="${escapeHtml(savedPin || MASTER_DEFAULT_PIN)}">
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; display: block;">Default Master PIN: <code>tubemetrix2026</code></span>
          </div>

          <div id="tmModalErrorMsg" style="display: none; color: #ef4444; font-size: 0.84rem; margin-top: 8px;"></div>
        </div>

        <div class="tm-mm-footer">
          <button type="button" class="btn-secondary" id="tmCancelMModalBtn" style="padding: 9px 18px;">Cancel</button>
          <button type="button" class="btn-primary" id="tmSaveMaintenanceBtn" style="padding: 9px 24px;">
            <span>Save &amp; Apply Changes</span>
          </button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';

    // Preset Pill Logic
    let selectedMins = currentDur;
    const pills = modal.querySelectorAll('.tm-preset-btn[data-mins]');
    const customRow = document.getElementById('tmCustomDurationRow');
    const customInput = document.getElementById('tmCustomMinsInput');

    function updateCalculatedPreview(mins) {
      const prevEl = document.getElementById('tmCalculatedEndPreview');
      if (!prevEl) return;
      const target = new Date(Date.now() + mins * 60 * 1000);
      const timeStr = target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
      const dateStr = target.toLocaleDateString([], { month: 'short', day: 'numeric' });
      prevEl.innerHTML = `Calculated return time: <strong>${timeStr} (${dateStr})</strong> • ${mins} minutes from now`;
    }

    updateCalculatedPreview(selectedMins);

    pills.forEach(p => {
      p.addEventListener('click', () => {
        pills.forEach(b => b.classList.remove('active'));
        const customBtn = document.getElementById('tmCustomDurationBtn');
        if (customBtn) customBtn.classList.remove('active');
        if (customRow) customRow.style.display = 'none';

        p.classList.add('active');
        selectedMins = parseInt(p.dataset.mins, 10);
        updateCalculatedPreview(selectedMins);
      });
    });

    const customBtn = document.getElementById('tmCustomDurationBtn');
    if (customBtn) {
      customBtn.addEventListener('click', () => {
        pills.forEach(b => b.classList.remove('active'));
        customBtn.classList.add('active');
        if (customRow) customRow.style.display = 'flex';
        if (customInput) {
          customInput.focus();
          selectedMins = parseInt(customInput.value, 10) || 60;
          updateCalculatedPreview(selectedMins);
        }
      });
    }

    if (customInput) {
      customInput.addEventListener('input', () => {
        selectedMins = Math.max(1, parseInt(customInput.value, 10) || 1);
        updateCalculatedPreview(selectedMins);
      });
    }

    // Modal Close
    const closeBtn = document.getElementById('tmCloseMModalBtn');
    const cancelBtn = document.getElementById('tmCancelMModalBtn');
    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    // Save & Apply
    const saveBtn = document.getElementById('tmSaveMaintenanceBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const toggleInput = document.getElementById('tmMaintenanceToggleInput');
        const reasonInput = document.getElementById('tmMaintenanceReasonInput');
        const pinInput = document.getElementById('tmAdminPinInput');
        const errEl = document.getElementById('tmModalErrorMsg');

        const isEnabled = Boolean(toggleInput && toggleInput.checked);
        const reason = reasonInput ? reasonInput.value.trim() : '';
        const pin = pinInput ? pinInput.value.trim() : '';

        if (pin) localStorage.setItem('tm_admin_pin', pin);

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        if (errEl) errEl.style.display = 'none';

        try {
          const res = await setMaintenanceMode(isEnabled, selectedMins, reason, pin);
          if (res.success) {
            modal.style.display = 'none';
            // Enable bypass for admin so they don't lock themselves out!
            setAdminBypass(true);
            await checkMaintenanceStatus();
          } else {
            if (errEl) {
              errEl.textContent = res.message || res.error || 'Failed to update maintenance mode. Check PIN.';
              errEl.style.display = 'block';
            }
          }
        } catch (err) {
          if (errEl) {
            errEl.textContent = 'Error: ' + err.message;
            errEl.style.display = 'block';
          }
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save & Apply Changes';
        }
      });
    }
  }

  // ─────────────────────────────────────────────
  // 5. API Update Call
  // ─────────────────────────────────────────────
  async function setMaintenanceMode(enabled, durationMinutes, reason = '', adminPin = '') {
    const pin = adminPin || localStorage.getItem('tm_admin_pin') || MASTER_DEFAULT_PIN;
    const resp = await fetch(STATUS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled,
        durationMinutes,
        reason,
        adminPin: pin,
      }),
    });

    const data = await resp.json();
    return data;
  }

  // ─────────────────────────────────────────────
  // 6. Admin Bypass Prompt (for Visitor Screen)
  // ─────────────────────────────────────────────
  function promptAdminBypass() {
    const pin = prompt('Enter Owner / Staff PIN to unlock site preview:');
    if (!pin) return;
    if (pin.trim() === MASTER_DEFAULT_PIN || localStorage.getItem('tm_admin_pin') === pin.trim()) {
      setAdminBypass(true);
      alert('✅ Admin Bypass Active! Loading live preview...');
      window.location.reload();
    } else {
      alert('❌ Invalid PIN. Public maintenance lockdown remains active.');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─────────────────────────────────────────────
  // 7. Inject Maintenance Nav Button (Desktop)
  // ─────────────────────────────────────────────
  function injectNavMaintenanceBtn() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions || document.getElementById('openMaintenanceModalBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'openMaintenanceModalBtn';
    btn.className = 'theme-toggle-btn tm-nav-maintenance-btn';
    btn.type = 'button';
    btn.title = 'Maintenance Mode Control (Owner Settings)';
    btn.innerHTML = `<span style="font-size: 1.1rem;">🛠️</span>`;
    btn.addEventListener('click', openMaintenanceModal);

    const themeToggle = document.getElementById('themeToggleBtn');
    if (themeToggle) {
      navActions.insertBefore(btn, themeToggle);
    } else {
      navActions.appendChild(btn);
    }
  }

  // Initial check on load
  document.addEventListener('DOMContentLoaded', () => {
    injectNavMaintenanceBtn();
    checkMaintenanceStatus();
    // Poll maintenance status every 30 seconds
    setInterval(checkMaintenanceStatus, 30000);
  });

  // Expose on window for programmatic control
  window.TubeMetrixMaintenance = {
    checkStatus: checkMaintenanceStatus,
    openModal: openMaintenanceModal,
    setMode: setMaintenanceMode,
    setBypass: setAdminBypass,
  };

})();
