/**
 * TubeMetrix — Server-Verified Google Auth, Quota & Dodo Payments Engine (v2.0)
 * Zero client-trusted tier/quota state; all sessions, daily limits & PRO unlocks
 * are verified server-side via Cloudflare Pages Functions + Cloudflare D1.
 */

(function () {
  'use strict';

  const GOOGLE_CLIENT_ID =
    window.TUBEMETRIX_GOOGLE_CLIENT_ID ||
    '83599777834-drdbj74ur8o1q5isch9avpltjs6a7qj2.apps.googleusercontent.com';

  const GUEST_DAILY_LIMIT = 2;
  const FREE_DAILY_LIMIT = 5;
  const CURRENCY_REGION_KEY = 'TubeMetrix_currency_region';

  const PRICING_PLANS = {
    USD: {
      region: 'USD',
      dayPass: {
        symbol: '$',
        amount: '0.99',
        sub: 'One-time 24h access • Global USD',
        cta: 'Get 24h Pass ($0.99)',
      },
      monthlyPro: {
        symbol: '$',
        amount: '8.99',
        period: '/ month',
        sub: 'Global creator plan • Cards & Apple Pay',
        ctaModal: 'Subscribe for $8.99 / mo',
        ctaPublic: 'Upgrade to PRO ($8.99/mo)',
      },
      bannerLabel: '⚡ Unlock with Day Pass ($0.99)',
      limitHint: '$0.99 Day Pass',
    },
    INR: {
      region: 'INR',
      dayPass: {
        symbol: '₹',
        amount: '49',
        sub: 'India localized price • Instant UPI',
        cta: 'Get 24h Pass (₹49)',
      },
      monthlyPro: {
        symbol: '₹',
        amount: '299',
        period: '/ month',
        sub: 'India creator plan • Instant UPI',
        ctaModal: 'Subscribe for ₹299 / mo',
        ctaPublic: 'Upgrade to PRO (₹299/mo)',
      },
      bannerLabel: '⚡ Unlock with Day Pass (₹49)',
      limitHint: '₹49 Day Pass',
    },
  };

  function detectDefaultRegion() {
    try {
      const saved = localStorage.getItem(CURRENCY_REGION_KEY);
      if (saved === 'INR' || saved === 'USD') return saved;
    } catch {}
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'INR';
    } catch {}
    try {
      const lang = (navigator.language || '').toLowerCase();
      if (lang.endsWith('-in') || lang === 'hi' || lang.startsWith('hi-')) return 'INR';
    } catch {}
    return 'USD';
  }

  let currentPricingRegion = detectDefaultRegion();

  function getPlanSpec(region = currentPricingRegion) {
    return PRICING_PLANS[region === 'INR' ? 'INR' : 'USD'];
  }

  function applyRegionPricing(root = document) {
    const spec = getPlanSpec();
    const map = {
      'day-symbol': spec.dayPass.symbol,
      'day-amount': spec.dayPass.amount,
      'day-sub': spec.dayPass.sub,
      'day-cta': spec.dayPass.cta,
      'pro-symbol': spec.monthlyPro.symbol,
      'pro-amount': spec.monthlyPro.amount,
      'pro-period': spec.monthlyPro.period,
      'pro-sub': spec.monthlyPro.sub,
      'pro-cta-public': spec.monthlyPro.ctaPublic,
      'pro-cta-modal': spec.monthlyPro.ctaModal,
      'banner-daypass': spec.bannerLabel,
    };

    root.querySelectorAll('[data-tm-price-target]').forEach((node) => {
      const key = node.getAttribute('data-tm-price-target');
      if (key && Object.prototype.hasOwnProperty.call(map, key)) {
        node.textContent = map[key];
      }
    });

    root.querySelectorAll('[data-tm-region-btn]').forEach((btn) => {
      const r = btn.getAttribute('data-tm-region-btn');
      btn.classList.toggle('active', r === spec.region);
    });
  }

  function setPricingRegion(region) {
    currentPricingRegion = region === 'INR' ? 'INR' : 'USD';
    try {
      localStorage.setItem(CURRENCY_REGION_KEY, currentPricingRegion);
    } catch {}
    applyRegionPricing(document);
  }

  // Legacy client-storage keys purged on boot so old test unlocks cannot linger
  const LEGACY_KEYS = [
    'TubeMetrix_auth_user',
    'TubeMetrix_auth_token',
    'TubeMetrix_usage_quota',
  ];

  // ── Private Server-Backed State (not writable via localStorage) ──
  let currentUser = null;
  let quotaState = {
    date: new Date().toISOString().slice(0, 10),
    guestUsed: 0,
    userUsed: 0,
    guestLimit: GUEST_DAILY_LIMIT,
    freeLimit: FREE_DAILY_LIMIT,
  };
  let paymentMeta = {
    provider: 'dodo',
    configured: false,
  };
  let sessionReady = false;
  let sessionSyncPromise = null;
  let pendingCheckoutPlan = null;

  function purgeLegacyStorage() {
    try {
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function apiRequest(path, options = {}) {
    const resp = await fetch(path, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    let data = {};
    try {
      data = await resp.json();
    } catch {
      data = {};
    }
    return { ok: resp.ok, status: resp.status, data };
  }

  function applyServerState(payload) {
    if (!payload || typeof payload !== 'object') return;
    if ('user' in payload) {
      currentUser = payload.user || null;
    }
    if (payload.quota && typeof payload.quota === 'object') {
      quotaState = {
        ...quotaState,
        ...payload.quota,
      };
    }
    if (payload.payments && typeof payload.payments === 'object') {
      paymentMeta = {
        ...paymentMeta,
        ...payload.payments,
      };
    }
    renderAuthNav();
  }

  async function syncFromServer() {
    if (sessionSyncPromise) return sessionSyncPromise;
    sessionSyncPromise = (async () => {
      try {
        const res = await apiRequest('/api/auth/me', { method: 'GET' });
        if (res.ok) {
          applyServerState(res.data);
        }
      } catch (e) {
        console.warn('Session sync warning:', e);
      } finally {
        sessionReady = true;
        sessionSyncPromise = null;
      }
    })();
    return sessionSyncPromise;
  }

  // ── Handle Post-Checkout Return (?tm_checkout=return) ──
  async function handleCheckoutReturnIfNeeded() {
    const url = new URL(window.location.href);
    if (url.searchParams.get('tm_checkout') !== 'return') return;

    const paymentId = url.searchParams.get('payment_id') || '';
    const subscriptionId = url.searchParams.get('subscription_id') || '';
    const sessionId = url.searchParams.get('session_id') || '';
    const plan = url.searchParams.get('plan') || '';

    // Clean URL params immediately so refresh doesn't re-trigger
    ['tm_checkout', 'payment_id', 'subscription_id', 'session_id', 'status', 'plan'].forEach((p) =>
      url.searchParams.delete(p)
    );
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);

    showAuthToast('Verifying your payment with Dodo Payments...');
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await apiRequest('/api/checkout/verify', {
          method: 'POST',
          body: JSON.stringify({ paymentId, subscriptionId, sessionId, plan }),
        });
        if (res.ok && res.data?.verified) {
          applyServerState({ user: res.data.user });
          showAuthToast('👑 Welcome to TubeMetrix PRO! Unlimited audits & zero ads unlocked!');
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1800));
    }

    await syncFromServer();
    if (currentUser?.tier === 'pro') {
      showAuthToast('👑 TubeMetrix PRO is active on your account!');
    } else {
      showAuthToast('Payment received — PRO activates automatically once confirmed by Dodo webhook.');
    }
  }

  // ── Google Credential Callback ──
  window.handleGoogleCredentialResponse = async function (response) {
    if (!response || !response.credential) return;

    try {
      const res = await apiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!res.ok || !res.data?.ok) {
        showAuthToast(res.data?.error || 'Google Sign-In verification failed. Please try again.');
        return;
      }

      applyServerState(res.data);
      closeAuthModal();

      if (pendingCheckoutPlan) {
        const planToLaunch = pendingCheckoutPlan;
        pendingCheckoutPlan = null;
        openProModal();
        await startDodoCheckout(planToLaunch);
        return;
      }

      closeProModal();
      const firstName = res.data.user?.givenName || 'Creator';
      const tierMsg =
        res.data.user?.tier === 'pro'
          ? 'PRO Unlimited Active 👑'
          : '5 Free Streams/Day Active';
      showAuthToast(`Welcome back, ${firstName}! (${tierMsg})`);
    } catch (err) {
      showAuthToast('Unable to reach auth server. Please check connection and retry.');
    }
  };

  // ── Initialize Google Identity Services (GIS) ──
  function initGoogleIdentity() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      setTimeout(initGoogleIdentity, 250);
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: window.handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      });

      if (!currentUser && GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE')) {
        google.accounts.id.prompt(() => {});
      }
    } catch (err) {
      console.warn('Google Identity Init Notice:', err);
    }
  }

  function formatProExpiryLabel(user) {
    if (!user?.proExpiresAt) return 'PRO Member (Unlimited)';
    const ms = Date.parse(user.proExpiresAt);
    if (Number.isNaN(ms)) return 'PRO Member (Unlimited)';
    if (user.proPlan === 'day_pass') {
      const hrs = Math.max(1, Math.ceil((ms - Date.now()) / 3600000));
      return `24h Day Pass (${hrs}h left)`;
    }
    return 'Monthly PRO (Unlimited)';
  }

  // ── Render Top Navbar Auth UI ──
  function renderAuthNav() {
    const container = document.getElementById('authNavContainer');
    if (!container) return;

    if (!currentUser) {
      const used = Number(quotaState.guestUsed || 0);
      const rem = Math.max(0, GUEST_DAILY_LIMIT - used);
      container.innerHTML = `
        <div class="auth-guest-group">
          <span class="guest-quota-pill" title="Daily Guest Audits Remaining">${rem}/${GUEST_DAILY_LIMIT} Free Left</span>
          <button class="btn-auth-signin" id="navSignInBtn" type="button" title="Sign in with Google">
            <svg class="google-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Sign In</span>
          </button>
        </div>
      `;

      const signInBtn = document.getElementById('navSignInBtn');
      if (signInBtn) {
        signInBtn.addEventListener('click', () => {
          pendingCheckoutPlan = null;
          openAuthModal('Sign in to TubeMetrix to get 5 free daily stream audits and link your PRO pass securely.');
        });
      }
    } else {
      const isPro = currentUser.tier === 'pro';
      const used = Number(quotaState.userUsed || 0);
      const pct = isPro ? 100 : Math.min(100, Math.round((used / FREE_DAILY_LIMIT) * 100));
      const safeName = escapeHtml(currentUser.name || 'Creator');
      const safeEmail = escapeHtml(currentUser.email || '');
      const rawAvatar =
        currentUser.picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Creator')}&background=ff0033&color=fff&rounded=true`;
      const safeAvatar = escapeHtml(rawAvatar);
      const proLabel = escapeHtml(formatProExpiryLabel(currentUser));

      container.innerHTML = `
        <div class="user-profile-menu" id="userProfileMenu">
          <button class="user-avatar-btn" id="userAvatarBtn" type="button" aria-label="Open User Menu">
            <img src="${safeAvatar}" alt="${safeName}" class="user-avatar-img">
            <span class="user-tier-badge ${isPro ? 'badge-pro' : 'badge-free'}">${isPro ? 'PRO' : 'FREE'}</span>
          </button>

          <div class="user-dropdown-card" id="userDropdownCard" style="display: none;">
            <div class="user-dropdown-header">
              <img src="${safeAvatar}" alt="${safeName}" class="dropdown-avatar-img">
              <div class="dropdown-user-info">
                <span class="user-display-name">${safeName}</span>
                <span class="user-display-email">${safeEmail}</span>
              </div>
            </div>

            <div class="dropdown-tier-status">
              <span class="tier-label">Current Tier:</span>
              <span class="tier-val ${isPro ? 'text-gold' : 'text-cyan'}">${isPro ? '👑 ' + proLabel : 'Standard Free Plan'}</span>
            </div>

            ${
              !isPro
                ? `
              <div class="user-quota-box">
                <div class="quota-row">
                  <span>Today's Audits:</span>
                  <strong>${used} / ${FREE_DAILY_LIMIT} Used</strong>
                </div>
                <div class="quota-bar-track">
                  <div class="quota-bar-fill" style="width: ${pct}%;"></div>
                </div>
              </div>

              <button class="btn-upgrade-pro-menu" id="dropdownUpgradeBtn" type="button">
                <span>👑 Upgrade to PRO</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            `
                : `
              <div class="pro-perks-box">
                <span>⚡ Unlimited Audits Active</span>
                <span>💎 100% Ad-Free Fast Lane</span>
              </div>
            `
            }

            <div class="dropdown-divider"></div>

            <button class="btn-dropdown-signout" id="dropdownSignOutBtn" type="button">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      `;

      const avatarBtn = document.getElementById('userAvatarBtn');
      const dropdownCard = document.getElementById('userDropdownCard');
      if (avatarBtn && dropdownCard) {
        avatarBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const isShown = dropdownCard.style.display === 'block';
          dropdownCard.style.display = isShown ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
          dropdownCard.style.display = 'none';
        });

        dropdownCard.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }

      const upgradeBtn = document.getElementById('dropdownUpgradeBtn');
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
          dropdownCard.style.display = 'none';
          openProModal();
        });
      }

      const signOutBtn = document.getElementById('dropdownSignOutBtn');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
          await signOutUser();
          showAuthToast('Signed out successfully.');
        });
      }
    }

    checkAdSuppression();
    updateProLocks();
  }

  async function signOutUser() {
    try {
      const res = await apiRequest('/api/auth/logout', { method: 'POST', body: '{}' });
      if (res.ok) {
        applyServerState(res.data);
        return;
      }
    } catch {}
    currentUser = null;
    renderAuthNav();
  }

  function checkAdSuppression() {
    if (currentUser && currentUser.tier === 'pro') {
      const adScript = document.querySelector('script[src*="bauval.org"]');
      if (adScript) adScript.remove();
      const adElements = document.querySelectorAll(
        'iframe[src*="bauval"], div[id*="at-cv-lightbox"], div[class*="adsterra"], div[class*="social-bar"]'
      );
      adElements.forEach((el) => el.remove());
    }
  }

  // ── Auth Modal (Google Sign-In Only) ──
  function openAuthModal(subtitle = null) {
    let backdrop = document.getElementById('tmAuthModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmAuthModalBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const defaultSub =
      "You've reached your daily free guest limit (2 streams). Sign in with Google to get 5 free streams daily and secure cloud sync!";

    backdrop.innerHTML = `
      <div class="tm-modal-card">
        <button class="tm-modal-close" id="closeAuthModalBtn" type="button">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-brand-pill">TubeMetrix Auth</div>
          <h2 class="tm-modal-title">Sign in to TubeMetrix</h2>
          <p class="tm-modal-subtitle">${escapeHtml(subtitle || defaultSub)}</p>
        </div>

        <div class="tm-benefits-list">
          <div class="benefit-item">
            <span class="benefit-icon">🎁</span>
            <span class="benefit-text"><strong>5 Free Stream Audits Daily</strong> (Instead of 2 guest streams)</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🔒</span>
            <span class="benefit-text"><strong>Verified PRO Sync</strong> across Desktop &amp; Mobile devices</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📊</span>
            <span class="benefit-text"><strong>Multi-Currency Reports</strong> &amp; One-Click CSV/Excel Exports</span>
          </div>
        </div>

        <div class="google-button-wrapper" id="modalGoogleBtnWrap">
          <button class="btn-google-action" id="triggerGoogleSignInBtn" type="button">
            <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div class="tm-modal-footer">
          <span>By continuing, you agree to TubeMetrix <a href="/terms" style="color:inherit;text-decoration:underline;">Terms</a> &amp; <a href="/privacy" style="color:inherit;text-decoration:underline;">Privacy Policy</a>.</span>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';

    document.getElementById('closeAuthModalBtn').onclick = () => {
      pendingCheckoutPlan = null;
      closeAuthModal();
    };
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        pendingCheckoutPlan = null;
        closeAuthModal();
      }
    };

    const googleBtnWrap = document.getElementById('modalGoogleBtnWrap');
    if (googleBtnWrap && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      try {
        google.accounts.id.renderButton(googleBtnWrap, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
        });
      } catch (e) {
        console.warn('Could not render official Google button:', e);
      }
    } else {
      const googleBtn = document.getElementById('triggerGoogleSignInBtn');
      if (googleBtn) {
        googleBtn.onclick = () => {
          if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.prompt();
          } else {
            showAuthToast('Connecting to Google Sign-In... Please allow third-party sign-in prompts.');
          }
        };
      }
    }
  }

  function closeAuthModal() {
    const backdrop = document.getElementById('tmAuthModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  function setProCheckoutStatus(message, isError = false) {
    const box = document.getElementById('tmCheckoutStatus');
    if (!box) return;
    if (!message) {
      box.style.display = 'none';
      box.textContent = '';
      return;
    }
    box.style.display = 'block';
    box.className = `tm-checkout-status ${isError ? 'is-error' : 'is-info'}`;
    box.textContent = message;
  }

  async function startDodoCheckout(plan) {
    if (!currentUser) {
      pendingCheckoutPlan = plan;
      closeProModal();
      openAuthModal(
        'Sign in with Google first so your PRO pass is safely tied to your account — checkout opens automatically right after.'
      );
      return;
    }

    const buttons = document.querySelectorAll('.btn-checkout-plan');
    const targetBtn = document.querySelector(`.btn-checkout-plan[data-plan="${plan}"]`);
    const origText = targetBtn ? targetBtn.textContent : '';

    buttons.forEach((b) => {
      b.disabled = true;
    });
    if (targetBtn) {
      targetBtn.textContent = 'Opening Secure Checkout...';
    }
    setProCheckoutStatus('');

    try {
      const res = await apiRequest('/api/checkout/create', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          returnPath: window.location.pathname || '/',
        }),
      });

      if (res.ok && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }

      if (res.status === 401 || res.data?.error === 'auth_required') {
        pendingCheckoutPlan = plan;
        closeProModal();
        openAuthModal('Please sign in with Google to continue to checkout.');
        return;
      }

      if (res.status === 503 || res.data?.setupRequired) {
        setProCheckoutStatus(
          'Checkout is wired for Dodo Payments — live keys & Product IDs are pending setup by the site admin.',
          false
        );
      } else {
        setProCheckoutStatus(res.data?.error || 'Could not start checkout. Please try again.', true);
      }
    } catch (err) {
      setProCheckoutStatus('Network error reaching payment server. Please retry.', true);
    } finally {
      buttons.forEach((b) => {
        b.disabled = false;
      });
      if (targetBtn && origText) {
        targetBtn.textContent = origText;
      }
    }
  }

  // ── Pro Pricing Modal ──
  function openProModal(customSubtitle = null) {
    let backdrop = document.getElementById('tmProModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmProModalBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const defaultSub =
      'Audit hundreds of streams simultaneously, unlock full channel histories, and enjoy 100% ad-free processing.';
    const spec = getPlanSpec();

    backdrop.innerHTML = `
      <div class="tm-modal-card tm-pro-card">
        <button class="tm-modal-close" id="closeProModalBtn" type="button">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-pro-pill">👑 PRO MEMBERSHIP</div>
          <h2 class="tm-modal-title">Unlock Unlimited Stream Audits</h2>
          <p class="tm-modal-subtitle">${escapeHtml(customSubtitle || defaultSub)}</p>
          <div class="tm-region-toggle" role="group" aria-label="Display currency">
            <button type="button" class="tm-region-btn ${spec.region === 'USD' ? 'active' : ''}" data-tm-region-btn="USD">🌍 Global (USD)</button>
            <button type="button" class="tm-region-btn ${spec.region === 'INR' ? 'active' : ''}" data-tm-region-btn="INR">🇮🇳 India (INR)</button>
          </div>
        </div>

        <div id="tmCheckoutStatus" class="tm-checkout-status" style="display: none;"></div>

        <div class="pro-pricing-grid">
          <!-- 24-Hour Day Pass -->
          <div class="pricing-card">
            <div class="pricing-plan-name">24-Hour Day Pass</div>
            <div class="pricing-price">
              <span class="price-symbol" data-tm-price-target="day-symbol">${spec.dayPass.symbol}</span><span class="price-amount" data-tm-price-target="day-amount">${spec.dayPass.amount}</span>
              <span class="price-inr" data-tm-price-target="day-sub">${spec.dayPass.sub}</span>
            </div>
            <p class="pricing-desc">Perfect for a single audit session or weekly stream review.</p>
            <ul class="pricing-features">
              <li>✓ 24 Hours Unlimited Streams</li>
              <li>✓ Channel &amp; Date Range Full Audit</li>
              <li>✓ Excel &amp; CSV Full Exports</li>
              <li>✓ Zero Ads Guaranteed</li>
            </ul>
            <button class="btn-checkout-plan" data-plan="day_pass" data-tm-price-target="day-cta" type="button">${spec.dayPass.cta}</button>
          </div>

          <!-- Monthly Pro (Featured) -->
          <div class="pricing-card card-featured">
            <div class="featured-ribbon">MOST POPULAR</div>
            <div class="pricing-plan-name">Monthly Creator Pro</div>
            <div class="pricing-price">
              <span class="price-symbol" data-tm-price-target="pro-symbol">${spec.monthlyPro.symbol}</span><span class="price-amount" data-tm-price-target="pro-amount">${spec.monthlyPro.amount}</span>
              <span class="price-period" data-tm-price-target="pro-period">${spec.monthlyPro.period}</span>
              <span class="price-inr" data-tm-price-target="pro-sub">${spec.monthlyPro.sub}</span>
            </div>
            <p class="pricing-desc">For active creators, editors &amp; esports team managers.</p>
            <ul class="pricing-features">
              <li>✓ <strong>Unlimited</strong> Streams Every Day</li>
              <li>✓ 3x Parallel Safe Workers (Fastest)</li>
              <li>✓ YouTube Jewels &amp; Tiers Breakdown</li>
              <li>✓ VIP Priority Support</li>
            </ul>
            <button class="btn-checkout-plan btn-checkout-featured" data-plan="monthly_pro" data-tm-price-target="pro-cta-modal" type="button">${spec.monthlyPro.ctaModal}</button>
          </div>
        </div>

        <div class="tm-guarantee-note">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Instant Activation • Final &amp; Non-Refundable Digital Access • Cards, Apple Pay &amp; India UPI</span>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';

    backdrop.querySelectorAll('[data-tm-region-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setPricingRegion(btn.getAttribute('data-tm-region-btn'));
      });
    });

    document.getElementById('closeProModalBtn').onclick = closeProModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeProModal();
    };

    backdrop.querySelectorAll('.btn-checkout-plan').forEach((btn) => {
      btn.onclick = () => {
        startDodoCheckout(btn.dataset.plan);
      };
    });
  }

  function closeProModal() {
    const backdrop = document.getElementById('tmProModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  // ── Toast Notification ──
  function showAuthToast(msg) {
    let toast = document.getElementById('tmAuthToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'tmAuthToast';
      toast.className = 'tm-auth-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 4500);
  }

  // ── Server-Side Gatekeeper (Async Authoritative Check & Atomic Consume) ──
  async function authorizeRun(streamCount = 1, options = {}) {
    const requirePro = Boolean(options?.requirePro);
    if (!sessionReady) {
      await syncFromServer();
    }

    try {
      const res = await apiRequest('/api/quota/consume', {
        method: 'POST',
        body: JSON.stringify({
          count: Math.max(0, Math.floor(Number(streamCount) || 0)),
          requirePro,
        }),
      });

      if (res.data) {
        applyServerState({ user: res.data.user, quota: res.data.quota });
      }

      if (res.ok && res.data?.allowed) {
        return true;
      }

      const reason = res.data?.reason;
      if (reason === 'pro_required') {
        openProModal();
        return false;
      }
      if (reason === 'guest_limit') {
        const used = res.data?.quota?.guestUsed ?? quotaState.guestUsed;
        openAuthModal(
          `Daily Guest Limit Reached (${used}/${GUEST_DAILY_LIMIT} streams used). Sign in with Google to get ${FREE_DAILY_LIMIT} free audits today!`
        );
        return false;
      }
      if (reason === 'free_limit') {
        openProModal(
          `Daily Free Limit Reached (${FREE_DAILY_LIMIT}/${FREE_DAILY_LIMIT} audits used today). Upgrade to PRO or get a ${getPlanSpec().limitHint} for unlimited streams!`
        );
        return false;
      }

      showAuthToast(res.data?.error || 'Unable to verify daily quota. Please try again.');
      return false;
    } catch (err) {
      showAuthToast('Network error verifying quota. Please check your connection.');
      return false;
    }
  }

  // Synchronous UI pre-check (actual execution goes through authorizeRun)
  function checkQuotaAndGate(streamCount = 1) {
    if (currentUser && currentUser.tier === 'pro') return true;
    if (!currentUser) {
      const used = Number(quotaState.guestUsed || 0);
      if (used + streamCount > GUEST_DAILY_LIMIT) {
        openAuthModal(
          `Daily Guest Limit Reached (${used}/${GUEST_DAILY_LIMIT} streams). Sign in with Google for ${FREE_DAILY_LIMIT} free audits/day!`
        );
        return false;
      }
      return true;
    }
    const used = Number(quotaState.userUsed || 0);
    if (used + streamCount > FREE_DAILY_LIMIT) {
      openProModal();
      return false;
    }
    return true;
  }

  function getRemainingStreams() {
    if (currentUser && currentUser.tier === 'pro') return Infinity;
    if (!currentUser) {
      return Math.max(0, GUEST_DAILY_LIMIT - Number(quotaState.guestUsed || 0));
    }
    return Math.max(0, FREE_DAILY_LIMIT - Number(quotaState.userUsed || 0));
  }

  // Server already consumes quota atomically in authorizeRun; kept as safe UI refresh no-op
  function incrementUsage() {}

  // ── Pro Feature Locks for Bulk Channel Audits ──
  function updateProLocks() {
    const isPro = Boolean(currentUser && currentUser.tier === 'pro');

    const pills = [
      document.getElementById('channelTabProPill'),
      document.getElementById('channelChatTabProPill'),
    ];
    pills.forEach((pill) => {
      if (pill) {
        if (isPro) {
          pill.className = 'tab-pro-pill unlocked';
          pill.innerHTML = '👑 UNLOCKED';
        } else {
          pill.className = 'tab-pro-pill';
          pill.innerHTML = '👑 PRO';
        }
      }
    });

    const lockBanners = [
      document.getElementById('channelProLock'),
      document.getElementById('channelChatProLock'),
    ];
    const formControls = [
      document.getElementById('channelFormControls'),
      document.getElementById('channelChatFormControls'),
    ];

    lockBanners.forEach((banner) => {
      if (banner) banner.style.display = isPro ? 'none' : 'block';
    });

    formControls.forEach((ctrl) => {
      if (ctrl) {
        ctrl.classList.toggle('panel-pro-locked', !isPro);
      }
    });

    const unlockBtns = [
      document.getElementById('unlockChannelProBtn'),
      document.getElementById('unlockChatChannelProBtn'),
    ];
    unlockBtns.forEach((btn) => {
      if (btn && !btn.dataset.wired) {
        btn.dataset.wired = 'true';
        btn.addEventListener('click', () => {
          openProModal();
        });
      }
    });

    const switchBtns = [
      document.getElementById('switchSingleStreamBtn'),
      document.getElementById('switchChatSingleStreamBtn'),
    ];
    switchBtns.forEach((btn) => {
      if (btn && !btn.dataset.wired) {
        btn.dataset.wired = 'true';
        btn.addEventListener('click', () => {
          const singleTab = document.querySelector('.tab-btn[data-mode="single"]');
          if (singleTab) singleTab.click();
        });
      }
    });

    if (typeof window.refreshMultiBatchUI === 'function') {
      try {
        window.refreshMultiBatchUI();
      } catch {}
    }
  }

  // ── Public Global API ──
  window.TubeMetrixAuth = {
    getUser: () => (currentUser ? { ...currentUser } : null),
    isLoggedIn: () => Boolean(currentUser),
    isPro: () => Boolean(currentUser && currentUser.tier === 'pro'),
    getRemainingStreams,
    checkQuota: checkQuotaAndGate,
    authorizeRun,
    incrementUsage,
    refreshSession: syncFromServer,
    openAuthModal,
    openProModal,
    startCheckout: startDodoCheckout,
    signOut: signOutUser,
    updateProLocks,
    getPricingRegion: () => currentPricingRegion,
    setPricingRegion,
    getDayPassHint: () => getPlanSpec().limitHint,
  };

  // ── Init on DOM Ready ──
  document.addEventListener('DOMContentLoaded', async () => {
    purgeLegacyStorage();
    applyRegionPricing(document);
    renderAuthNav();
    updateProLocks();
    await syncFromServer();
    await handleCheckoutReturnIfNeeded();
    initGoogleIdentity();
  });
})();
