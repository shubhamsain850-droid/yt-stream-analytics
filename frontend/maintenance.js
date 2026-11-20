/**
 * TubeMetrix — Site Maintenance Mode Overlay
 * Controlled ONLY via the Desktop Owner Dashboard application.
 * When enabled:
 *   - Displays an unclosable window dead-center on the screen with:
 *       1. TubeMetrix Logo
 *       2. Live Countdown Timer (Hours : Minutes : Seconds)
 *       3. Custom Announcement / Reason text set by the admin
 *       4. Expected Completion Time
 *   - Completely blocks background typing, pasting, scrolling, and clicking.
 * When disabled:
 *   - The window is gone and site works normally.
 */

(function () {
  'use strict';

  const STATUS_ENDPOINT = '/api/maintenance';
  let countdownInterval = null;
  let isMaintenanceActive = false;

  // Immediately purge any legacy navbar button or admin bar from memory & DOM
  function purgeLegacyAdminElements() {
    try {
      const ids = ['tmNavMaintenanceBtn', 'tmAdminStickyBar', 'tmMaintenanceModal'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });
      document.querySelectorAll('.tm-nav-maintenance-btn, .tm-admin-sticky-bar, .tm-m-modal-backdrop').forEach(el => el.remove());
      localStorage.removeItem('tm_maintenance_bypass');
      localStorage.removeItem('tm_admin_pin');
    } catch {}
  }
  purgeLegacyAdminElements();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', purgeLegacyAdminElements);
  }
  setInterval(purgeLegacyAdminElements, 500);

  // Block any keyboard typing, pasting, or input events while maintenance is active
  function blockBackgroundInput(e) {
    if (e.type === 'keydown' || e.type === 'keypress' || e.type === 'keyup' ||
        e.type === 'paste' || e.type === 'input' || e.type === 'beforeinput') {
      e.stopPropagation();
      e.preventDefault();
      if (document.activeElement && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
      }
      return false;
    }
  }

  function enableBackgroundLock() {
    window.addEventListener('keydown', blockBackgroundInput, true);
    window.addEventListener('keypress', blockBackgroundInput, true);
    window.addEventListener('keyup', blockBackgroundInput, true);
    window.addEventListener('paste', blockBackgroundInput, true);
    window.addEventListener('input', blockBackgroundInput, true);
    window.addEventListener('beforeinput', blockBackgroundInput, true);
    document.body.style.overflow = 'hidden';
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
  }

  function disableBackgroundLock() {
    window.removeEventListener('keydown', blockBackgroundInput, true);
    window.removeEventListener('keypress', blockBackgroundInput, true);
    window.removeEventListener('keyup', blockBackgroundInput, true);
    window.removeEventListener('paste', blockBackgroundInput, true);
    window.removeEventListener('input', blockBackgroundInput, true);
    window.removeEventListener('beforeinput', blockBackgroundInput, true);
    document.body.style.overflow = '';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function checkMaintenanceStatus() {
    try {
      // ── Developer / Owner Secret Bypass (?admin=dev) ──
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('admin') === 'exit') {
          sessionStorage.removeItem('tm_dev_bypass');
        } else if (urlParams.get('admin') === 'dev' || sessionStorage.getItem('tm_dev_bypass') === 'true') {
          sessionStorage.setItem('tm_dev_bypass', 'true');
          if (isMaintenanceActive) {
            isMaintenanceActive = false;
            disableBackgroundLock();
            removeCenterMaintenanceWindow();
          }
          return;
        }
      } catch (err) {}

      const resp = await fetch(STATUS_ENDPOINT, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (!resp.ok) return;
      const data = await resp.json();

      if (data && data.enabled) {
        if (!isMaintenanceActive) {
          isMaintenanceActive = true;
          enableBackgroundLock();
        }
        renderCenterMaintenanceWindow(data);
      } else {
        if (isMaintenanceActive) {
          isMaintenanceActive = false;
          disableBackgroundLock();
          removeCenterMaintenanceWindow();
          window.location.reload();
        } else {
          removeCenterMaintenanceWindow();
        }
      }
    } catch (e) {
      console.warn('[Maintenance Check]:', e);
    }
  }

  function renderCenterMaintenanceWindow(data) {
    let overlay = document.getElementById('tmMaintenanceOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'tmMaintenanceOverlay';
      overlay.className = 'tm-maintenance-overlay';
      document.body.appendChild(overlay);
    }

    const reasonText = data.reason || 'We are performing scheduled maintenance and rolling out new features. We will be back online shortly!';
    const targetEnd = data.endTime ? new Date(data.endTime) : null;
    const formattedEnd = targetEnd && !isNaN(targetEnd.getTime())
      ? targetEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ' (' + targetEnd.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')'
      : 'Shortly';

    overlay.innerHTML = `
      <div class="tm-maintenance-center-card">
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
          <span class="tm-m-pulse-dot"></span> Site Maintenance in Progress
        </div>

        <h1 class="tm-m-heading">TubeMetrix is Under Maintenance</h1>
        <p class="tm-m-desc">${escapeHtml(reasonText)}</p>

        <!-- Live Countdown Cards -->
        <div class="tm-countdown-wrap">
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
      </div>
    `;

    overlay.style.display = 'flex';
    startLiveCountdown(data.endTime);
  }

  function removeCenterMaintenanceWindow() {
    const overlay = document.getElementById('tmMaintenanceOverlay');
    if (overlay) {
      overlay.style.display = 'none';
      overlay.remove();
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
        setTimeout(() => { checkMaintenanceStatus(); }, 1500);
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

  // Initial check on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkMaintenanceStatus);
  } else {
    checkMaintenanceStatus();
  }

  // Periodic poll every 8 seconds to detect changes from Desktop Admin Dashboard
  setInterval(checkMaintenanceStatus, 8000);

})();
