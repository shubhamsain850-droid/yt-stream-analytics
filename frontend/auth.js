/**
 * TubeMetrix — Server-Verified Google Auth, Weekly Free Quota, Credits & Dodo Payments Engine (v3.0)
 * Zero client-trusted credit/quota state; all sessions, weekly free runs, credit balances
 * & Dodo purchases are enforced server-side via Cloudflare Pages Functions + Cloudflare D1.
 */

(function () {
  'use strict';

  const GOOGLE_CLIENT_ID =
    window.TUBEMETRIX_GOOGLE_CLIENT_ID ||
    '83599777834-drdbj74ur8o1q5isch9avpltjs6a7qj2.apps.googleusercontent.com';

  const GUEST_WEEKLY_LIMIT = 2;
  const FREE_WEEKLY_LIMIT = 3;
  const CURRENCY_REGION_KEY = 'TubeMetrix_currency_region';

  const CREDIT_PACK_CATALOG = [
    {
      id: 'credits_10',
      name: 'Starter Pack',
      credits: 10,
      chatsAllowance: '10,000 chats/comments',
      featured: false,
      ribbon: '',
      usdSymbol: '$',
      usdAmount: '2.99',
      usdPer2k: '$0.60 per 2k chats',
      inrRegular: '99',
      inrFirst: '49',
      inrBadge: '50% OFF 1st Order',
      desc: 'Great for occasional streams, comment exports & creator checks.',
      features: [
        '✓ <strong>10 Credits</strong> (= 10,000 chats/comments)',
        '✓ Never Expire • Use Any Time',
        '✓ Single, Batch URLs &amp; Date Range',
      ],
    },
    {
      id: 'credits_30',
      name: 'Creator Pack',
      credits: 30,
      chatsAllowance: '30,000 chats/comments',
      featured: true,
      ribbon: 'MOST POPULAR',
      usdSymbol: '$',
      usdAmount: '6.99',
      usdPer2k: '~$0.47 per 2k chats (Save 22%)',
      inrRegular: '249',
      inrFirst: '149',
      inrBadge: '40% OFF 1st Order',
      desc: 'Best value for regular live streamers, editors &amp; channel audits.',
      features: [
        '✓ <strong>30 Credits</strong> (= 30,000 chats/comments)',
        '✓ Custom URL Batch &amp; Full Channel History',
        '✓ 100% Ad-Free + Never Expiring Credits',
      ],
    },
    {
      id: 'credits_100',
      name: 'Agency Pack',
      credits: 100,
      chatsAllowance: '100,000 chats/comments',
      featured: false,
      ribbon: 'BEST VALUE',
      usdSymbol: '$',
      usdAmount: '19.99',
      usdPer2k: '~$0.40 per 2k chats (Save 33%)',
      inrRegular: '699',
      inrFirst: '499',
      inrBadge: '29% OFF 1st Order',
      desc: 'High-volume archive audits for MCNs, agencies &amp; researchers.',
      features: [
        '✓ <strong>100 Credits</strong> (= 100,000 chats/comments)',
        '✓ Parallel Batch Engine &amp; All Exports',
        '✓ 100% Ad-Free + Priority Throughput',
      ],
    },
  ];

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
  let userOverrodeRegion = false;
  try {
    userOverrodeRegion = Boolean(localStorage.getItem(CURRENCY_REGION_KEY));
  } catch {}

  let regionState = {
    country: null,
    isIndia: null,
    indiaFirstPurchaseEligible: null,
  };

  function isIndiaFirstPromoActive() {
    if (currentPricingRegion !== 'INR') return false;
    if (regionState.country === null) {
      // Before server sync resolves, show preview only if client detected India timezone/locale
      return currentPricingRegion === 'INR';
    }
    return Boolean(regionState.isIndia && regionState.indiaFirstPurchaseEligible);
  }

  function getPackDisplayPricing(pack) {
    if (currentPricingRegion === 'INR') {
      const promoActive = isIndiaFirstPromoActive();
      const amount = promoActive ? pack.inrFirst : pack.inrRegular;
      return {
        symbol: '₹',
        amount,
        strikeAmount: promoActive ? `₹${pack.inrRegular}` : '',
        badge: promoActive ? `🇮🇳 ${pack.inrBadge}` : '',
        sub: promoActive
          ? `${pack.chatsAllowance} • 1st India Order Special`
          : `${pack.chatsAllowance} • India UPI Regular`,
        cta: `Buy ${pack.credits} Credits for ₹${amount}`,
      };
    }

    return {
      symbol: '$',
      amount: pack.usdAmount,
      strikeAmount: '',
      badge: '',
      sub: `${pack.usdPer2k} • Never expires`,
      cta: `Buy ${pack.credits} Credits (${pack.usdSymbol}${pack.usdAmount})`,
    };
  }

  function applyRegionPricing(root = document) {
    const firstPack = getPackDisplayPricing(CREDIT_PACK_CATALOG[0]);
    const promoActive = isIndiaFirstPromoActive();
    const bannerLabel = `💎 Buy Credits (${firstPack.symbol}${firstPack.amount} for 10 Credits)`;

    root.querySelectorAll('[data-tm-price-target="banner-credits"]').forEach((node) => {
      node.textContent = bannerLabel;
    });

    CREDIT_PACK_CATALOG.forEach((pack) => {
      const p = getPackDisplayPricing(pack);
      root.querySelectorAll(`[data-tm-pack-symbol="${pack.id}"]`).forEach((n) => {
        n.textContent = p.symbol;
      });
      root.querySelectorAll(`[data-tm-pack-amount="${pack.id}"]`).forEach((n) => {
        n.textContent = p.amount;
      });
      root.querySelectorAll(`[data-tm-pack-strike="${pack.id}"]`).forEach((n) => {
        n.textContent = p.strikeAmount;
        n.style.display = p.strikeAmount ? 'inline-block' : 'none';
      });
      root.querySelectorAll(`[data-tm-pack-badge="${pack.id}"]`).forEach((n) => {
        n.textContent = p.badge;
        n.style.display = p.badge ? 'inline-flex' : 'none';
      });
      root.querySelectorAll(`[data-tm-pack-sub="${pack.id}"]`).forEach((n) => {
        n.textContent = p.sub;
      });
      root.querySelectorAll(`[data-tm-pack-cta="${pack.id}"]`).forEach((n) => {
        n.textContent = p.cta;
      });
    });

    root.querySelectorAll('[data-tm-promo-banner]').forEach((node) => {
      if (currentPricingRegion !== 'INR') {
        node.style.display = 'none';
        return;
      }
      node.style.display = 'block';
      if (promoActive) {
        node.className = 'tm-india-promo-banner is-active';
        node.innerHTML =
          '🇮🇳 <strong>India 1st Purchase Discount Unlocked:</strong> Up to <strong>50% OFF</strong> (₹49 Starter) auto-applied at checkout via UPI!';
      } else if (regionState.isIndia && regionState.indiaFirstPurchaseEligible === false) {
        node.className = 'tm-india-promo-banner is-claimed';
        node.innerHTML =
          '🇮🇳 <strong>India UPI Pricing:</strong> 1st-purchase promo already claimed on this account — standard INR rates active.';
      } else {
        node.className = 'tm-india-promo-banner is-preview';
        node.innerHTML =
          '🇮🇳 <strong>India Pricing Preview:</strong> Special 1st-purchase discount (₹49 / ₹149 / ₹499) is auto-verified for Indian IP orders at checkout.';
      }
    });

    root.querySelectorAll('[data-tm-region-btn]').forEach((btn) => {
      const r = btn.getAttribute('data-tm-region-btn');
      btn.classList.toggle('active', r === currentPricingRegion);
    });
  }

  function setPricingRegion(region) {
    currentPricingRegion = region === 'INR' ? 'INR' : 'USD';
    userOverrodeRegion = true;
    try {
      localStorage.setItem(CURRENCY_REGION_KEY, currentPricingRegion);
    } catch {}
    applyRegionPricing(document);
  }

  const LEGACY_KEYS = [
    'TubeMetrix_auth_user',
    'TubeMetrix_auth_token',
    'TubeMetrix_usage_quota',
  ];

  let currentUser = null;
  let quotaState = {
    period: 'weekly',
    week: '',
    guestUsed: 0,
    userUsed: 0,
    guestLimit: GUEST_WEEKLY_LIMIT,
    freeLimit: FREE_WEEKLY_LIMIT,
  };
  let paymentMeta = {
    provider: 'dodo',
    configured: false,
  };
  let lastRunAuth = null;
  let sessionReady = false;
  let sessionSyncPromise = null;
  let pendingCheckoutPack = null;

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
    if (payload.region && typeof payload.region === 'object') {
      regionState = {
        ...regionState,
        ...payload.region,
      };
      if (!userOverrodeRegion && regionState.country && regionState.country !== 'XX') {
        currentPricingRegion = regionState.isIndia ? 'INR' : 'USD';
      }
    }
    if (payload.payments && typeof payload.payments === 'object') {
      paymentMeta = {
        ...paymentMeta,
        ...payload.payments,
      };
    }
    applyRegionPricing(document);
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
    const sessionId = url.searchParams.get('session_id') || '';
    const packId = url.searchParams.get('pack') || url.searchParams.get('plan') || '';

    ['tm_checkout', 'payment_id', 'subscription_id', 'session_id', 'status', 'plan', 'pack'].forEach(
      (p) => url.searchParams.delete(p)
    );
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : '') + url.hash);

    showAuthToast('Verifying your credit purchase with Dodo Payments...');
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await apiRequest('/api/checkout/verify', {
          method: 'POST',
          body: JSON.stringify({ paymentId, sessionId, packId }),
        });
        if (res.ok && res.data?.verified) {
          applyServerState({ user: res.data.user, region: res.data.region });
          const added = res.data.creditsAdded || 0;
          const bal = res.data.user?.creditsBalance || 0;
          showAuthToast(
            added > 0
              ? `💎 +${added} Credits added! Balance: ${bal} Credits`
              : `💎 Payment confirmed! Balance: ${bal} Credits`
          );
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1800));
    }

    await syncFromServer();
    if (currentUser?.creditsBalance > 0) {
      showAuthToast(`💎 Credits synced! Available Balance: ${currentUser.creditsBalance} Credits`);
    } else {
      showAuthToast('Payment received — credits apply automatically once confirmed by Dodo webhook.');
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

      if (pendingCheckoutPack) {
        const packToLaunch = pendingCheckoutPack;
        pendingCheckoutPack = null;
        openCreditsModal();
        await startDodoCheckout(packToLaunch);
        return;
      }

      closeCreditsModal();
      const firstName = res.data.user?.givenName || 'Creator';
      const credits = Number(res.data.user?.creditsBalance || 0);
      const statusMsg =
        credits > 0
          ? `${credits} Credits Ready 💎`
          : '3 Free Single Streams / Week Active';
      showAuthToast(`Welcome back, ${firstName}! (${statusMsg})`);
    } catch {
      showAuthToast('Unable to reach auth server. Please check connection and retry.');
    }
  };

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

  function renderAuthNav() {
    const container = document.getElementById('authNavContainer');
    if (!container) return;

    if (!currentUser) {
      const used = Number(quotaState.guestUsed || 0);
      const rem = Math.max(0, GUEST_WEEKLY_LIMIT - used);
      container.innerHTML = `
        <div class="auth-guest-group">
          <span class="guest-quota-pill" title="Weekly Free Single-Stream Quota">${rem}/${GUEST_WEEKLY_LIMIT} Free / Wk</span>
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
          pendingCheckoutPack = null;
          openAuthModal(
            'Sign in with Google to get 3 free single streams/week and top up never-expiring credits for bulk batches.'
          );
        });
      }
    } else {
      const credits = Math.max(0, Number(currentUser.creditsBalance || 0));
      const used = Number(quotaState.userUsed || 0);
      const pct = Math.min(100, Math.round((used / FREE_WEEKLY_LIMIT) * 100));
      const safeName = escapeHtml(currentUser.name || 'Creator');
      const safeEmail = escapeHtml(currentUser.email || '');
      const rawAvatar =
        currentUser.picture ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Creator')}&background=ff0033&color=fff&rounded=true`;
      const safeAvatar = escapeHtml(rawAvatar);

      container.innerHTML = `
        <div class="user-profile-menu" id="userProfileMenu">
          <button class="user-avatar-btn" id="userAvatarBtn" type="button" aria-label="Open User Menu">
            <img src="${safeAvatar}" alt="${safeName}" class="user-avatar-img">
            <span class="user-tier-badge ${credits > 0 ? 'badge-pro' : 'badge-free'}" id="navCreditBadge">${credits} CR</span>
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
              <span class="tier-label">Credit Balance:</span>
              <span class="tier-val ${credits > 0 ? 'text-gold' : 'text-cyan'}">💎 ${credits} Credits (${(credits * 1000).toLocaleString()} chats)</span>
            </div>

            <div class="user-quota-box">
              <div class="quota-row">
                <span>Weekly Free (Single):</span>
                <strong>${used} / ${FREE_WEEKLY_LIMIT} Used</strong>
              </div>
              <div class="quota-bar-track">
                <div class="quota-bar-fill" style="width: ${pct}%;"></div>
              </div>
            </div>

            <button class="btn-upgrade-pro-menu" id="dropdownBuyCreditsBtn" type="button">
              <span>💎 Buy Credit Packs ($0.60 / 2k chats)</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>

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

      const buyBtn = document.getElementById('dropdownBuyCreditsBtn');
      if (buyBtn) {
        buyBtn.addEventListener('click', () => {
          dropdownCard.style.display = 'none';
          openCreditsModal();
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
    updateFeatureLocks();
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
    if (
      currentUser &&
      (Number(currentUser.creditsBalance || 0) > 0 || Number(currentUser.totalPurchasedCredits || 0) > 0)
    ) {
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
      "You've reached your weekly free guest limit (2 single streams). Sign in with Google for 3 free single streams every week and never-expiring credits!";

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
            <span class="benefit-text"><strong>3 Free Single Streams / Week</strong> (Up from 2 guest runs)</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">💎</span>
            <span class="benefit-text"><strong>Prepaid Credit Packs</strong> — $0.60 per 2,000 chats, never expire</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🇮🇳</span>
            <span class="benefit-text"><strong>India 1st Order Offer</strong> — Starter 10 Credits from ₹49 via UPI</span>
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
      pendingCheckoutPack = null;
      closeAuthModal();
    };
    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        pendingCheckoutPack = null;
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

  function setCheckoutStatus(message, isError = false) {
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

  async function startDodoCheckout(packId) {
    if (!currentUser) {
      pendingCheckoutPack = packId;
      closeCreditsModal();
      openAuthModal(
        'Sign in with Google first so your purchased credits are linked safely to your account — checkout opens automatically right after.'
      );
      return;
    }

    const buttons = document.querySelectorAll('.btn-checkout-plan[data-pack]');
    const targetBtn = document.querySelector(`.btn-checkout-plan[data-pack="${packId}"]`);
    const origText = targetBtn ? targetBtn.textContent : '';

    buttons.forEach((b) => {
      b.disabled = true;
    });
    if (targetBtn) {
      targetBtn.textContent = 'Opening Secure Checkout...';
    }
    setCheckoutStatus('');

    try {
      const res = await apiRequest('/api/checkout/create', {
        method: 'POST',
        body: JSON.stringify({
          packId,
          returnPath: window.location.pathname || '/',
        }),
      });

      if (res.ok && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }

      if (res.status === 401 || res.data?.error === 'auth_required') {
        pendingCheckoutPack = packId;
        closeCreditsModal();
        openAuthModal('Please sign in with Google to continue to checkout.');
        return;
      }

      if (res.status === 503 || res.data?.setupRequired) {
        setCheckoutStatus(
          'Credit pack checkout is wired for Dodo Payments — Product IDs & API keys are pending final activation.',
          false
        );
      } else {
        setCheckoutStatus(res.data?.error || 'Could not start checkout. Please try again.', true);
      }
    } catch {
      setCheckoutStatus('Network error reaching payment server. Please retry.', true);
    } finally {
      buttons.forEach((b) => {
        b.disabled = false;
      });
      if (targetBtn && origText) {
        targetBtn.textContent = origText;
      }
    }
  }

  // ── Credits Purchase Modal ──
  function openCreditsModal(customSubtitle = null) {
    let backdrop = document.getElementById('tmProModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmProModalBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const currentBal = currentUser ? Math.max(0, Number(currentUser.creditsBalance || 0)) : 0;
    const defaultSub =
      'No subscriptions — buy prepaid credits once and use them any time. 1 Credit = 1,000 chats/comments ($0.60 per 2,000 chats).';

    const cardsHtml = CREDIT_PACK_CATALOG.map((pack) => {
      const p = getPackDisplayPricing(pack);
      return `
        <div class="pricing-card ${pack.featured ? 'card-featured' : ''}">
          ${pack.ribbon ? `<div class="featured-ribbon">${pack.ribbon}</div>` : ''}
          <div class="pricing-card-top">
            <div class="pricing-plan-name">${pack.name}</div>
            <span class="tm-pack-discount-badge" data-tm-pack-badge="${pack.id}" style="display:${p.badge ? 'inline-flex' : 'none'};">${p.badge}</span>
          </div>
          <div class="pricing-credits-headline">💎 ${pack.credits} Credits</div>
          <div class="pricing-price">
            <span class="price-strike" data-tm-pack-strike="${pack.id}" style="display:${p.strikeAmount ? 'inline-block' : 'none'};">${p.strikeAmount}</span>
            <span class="price-symbol" data-tm-pack-symbol="${pack.id}">${p.symbol}</span><span class="price-amount" data-tm-pack-amount="${pack.id}">${p.amount}</span>
            <span class="price-period">/ one-time</span>
            <span class="price-inr" data-tm-pack-sub="${pack.id}">${p.sub}</span>
          </div>
          <p class="pricing-desc">${pack.desc}</p>
          <ul class="pricing-features">
            ${pack.features.map((f) => `<li>${f}</li>`).join('')}
          </ul>
          <button class="btn-checkout-plan ${pack.featured ? 'btn-checkout-featured' : ''}" data-pack="${pack.id}" data-tm-pack-cta="${pack.id}" type="button">${p.cta}</button>
        </div>
      `;
    }).join('');

    backdrop.innerHTML = `
      <div class="tm-modal-card tm-credits-modal-card">
        <button class="tm-modal-close" id="closeProModalBtn" type="button">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-pro-pill">💎 PREPAID CREDITS • ${currentUser ? `BALANCE: ${currentBal} CREDITS` : 'PAY AS YOU GO'}</div>
          <h2 class="tm-modal-title">Buy Never-Expiring Credit Packs</h2>
          <p class="tm-modal-subtitle">${escapeHtml(customSubtitle || defaultSub)}</p>
          <div class="tm-region-toggle" role="group" aria-label="Display currency">
            <button type="button" class="tm-region-btn ${currentPricingRegion === 'USD' ? 'active' : ''}" data-tm-region-btn="USD">🌍 Global (USD)</button>
            <button type="button" class="tm-region-btn ${currentPricingRegion === 'INR' ? 'active' : ''}" data-tm-region-btn="INR">🇮🇳 India (INR)</button>
          </div>
          <div class="tm-india-promo-banner" data-tm-promo-banner style="display:none;"></div>
        </div>

        <div id="tmCheckoutStatus" class="tm-checkout-status" style="display: none;"></div>

        <div class="pro-pricing-grid tm-credits-grid">
          ${cardsHtml}
        </div>

        <div class="tm-guarantee-note">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Instant Credits • Never Expire • Final &amp; Non-Refundable Digital Access • Cards, Apple Pay &amp; India UPI</span>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';
    applyRegionPricing(backdrop);

    backdrop.querySelectorAll('[data-tm-region-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setPricingRegion(btn.getAttribute('data-tm-region-btn'));
      });
    });

    document.getElementById('closeProModalBtn').onclick = closeCreditsModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeCreditsModal();
    };

    backdrop.querySelectorAll('.btn-checkout-plan[data-pack]').forEach((btn) => {
      btn.onclick = () => {
        startDodoCheckout(btn.dataset.pack);
      };
    });
  }

  function closeCreditsModal() {
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

  // ── Server-Side Gatekeeper (Weekly Free Single Stream OR Prepaid Credits) ──
  async function authorizeRun(streamCount = 1, options = {}) {
    if (!sessionReady) {
      await syncFromServer();
    }

    const mode =
      options?.mode ||
      (options?.requirePro ? 'channel' : 'single');
    const count = Math.max(0, Math.floor(Number(streamCount) || 0));
    const credits = Math.max(
      1,
      Math.floor(Number(options?.credits ?? (count || 1)) || 1)
    );
    const checkOnly = Boolean(options?.checkOnly);

    try {
      const res = await apiRequest('/api/quota/consume', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          count,
          credits,
          checkOnly,
        }),
      });

      lastRunAuth = res.data || null;
      if (res.data) {
        applyServerState({ user: res.data.user, quota: res.data.quota });
      }

      if (res.ok && res.data?.allowed) {
        return true;
      }

      const reason = res.data?.reason;
      if (reason === 'auth_required') {
        openAuthModal(
          'Custom URL Batch, Channel Date Range & Credits require a Google account. Sign in to get 3 free single streams/week or buy never-expiring credit packs!'
        );
        return false;
      }
      if (reason === 'guest_limit') {
        const used = res.data?.quota?.guestUsed ?? quotaState.guestUsed;
        openAuthModal(
          `Weekly Guest Limit Reached (${used}/${GUEST_WEEKLY_LIMIT} free single streams used this week). Sign in with Google for ${FREE_WEEKLY_LIMIT} free single streams/week or buy credits!`
        );
        return false;
      }
      if (reason === 'credits_required') {
        const needed = res.data?.creditsNeeded || credits;
        const bal = res.data?.creditsBalance ?? (currentUser?.creditsBalance || 0);
        const firstPrice = getPackDisplayPricing(CREDIT_PACK_CATALOG[0]);
        if (res.data?.freeExhausted) {
          openCreditsModal(
            `Weekly Free Single Limit Reached (${FREE_WEEKLY_LIMIT}/${FREE_WEEKLY_LIMIT} used this week). You need ${needed} credit (balance: ${bal}). Grab 10 credits from ${firstPrice.symbol}${firstPrice.amount} — never expire!`
          );
        } else {
          const modeName =
            mode === 'channel'
              ? 'Channel Date Range'
              : mode === 'batch'
                ? 'Custom URL Batch'
                : 'This export';
          openCreditsModal(
            `${modeName} requires ${needed} credit(s) — your current balance is ${bal}. Top up credits below ($0.60 per 2,000 chats/comments)!`
          );
        }
        return false;
      }

      showAuthToast(res.data?.error || 'Unable to verify quota/credits. Please try again.');
      return false;
    } catch {
      showAuthToast('Network error verifying quota/credits. Please check your connection.');
      return false;
    }
  }

  function checkQuotaAndGate(streamCount = 1, options = {}) {
    const mode = options?.mode || 'single';
    const creditsBal = Number(currentUser?.creditsBalance || 0);
    if (mode === 'channel' || mode === 'batch') {
      if (!currentUser) {
        openAuthModal(
          'Sign in with Google and use Credits for Custom URL Batch & Channel Date Range.'
        );
        return false;
      }
      if (creditsBal < streamCount) {
        openCreditsModal();
        return false;
      }
      return true;
    }
    if (!currentUser) {
      const used = Number(quotaState.guestUsed || 0);
      if (used + streamCount > GUEST_WEEKLY_LIMIT) {
        openAuthModal(
          `Weekly Guest Limit Reached (${used}/${GUEST_WEEKLY_LIMIT} single streams). Sign in with Google for ${FREE_WEEKLY_LIMIT} free single streams/week!`
        );
        return false;
      }
      return true;
    }
    const used = Number(quotaState.userUsed || 0);
    if (used + streamCount <= FREE_WEEKLY_LIMIT) return true;
    if (creditsBal >= streamCount) return true;
    openCreditsModal();
    return false;
  }

  function getRemainingStreams() {
    const creditsBal = Number(currentUser?.creditsBalance || 0);
    if (!currentUser) {
      return Math.max(0, GUEST_WEEKLY_LIMIT - Number(quotaState.guestUsed || 0));
    }
    const freeLeft = Math.max(0, FREE_WEEKLY_LIMIT - Number(quotaState.userUsed || 0));
    return freeLeft + creditsBal;
  }

  async function settleChatVolumeCredits(totalMessages, streamId) {
    if (!currentUser || !totalMessages || totalMessages <= 1000) return null;
    try {
      const res = await apiRequest('/api/credits/settle', {
        method: 'POST',
        body: JSON.stringify({ totalMessages, streamId }),
      });
      if (res.ok && res.data?.user) {
        applyServerState({ user: res.data.user, quota: res.data.quota });
        return res.data;
      }
    } catch {}
    return null;
  }

  function incrementUsage() {}

  // ── Feature Locks for Channel Date Range & Batch Tabs ──
  function updateFeatureLocks() {
    const credits = currentUser ? Math.max(0, Number(currentUser.creditsBalance || 0)) : 0;
    const hasCreditUnlock = Boolean(currentUser && credits > 0);

    const pills = [
      document.getElementById('channelTabProPill'),
      document.getElementById('channelChatTabProPill'),
    ];
    pills.forEach((pill) => {
      if (pill) {
        if (hasCreditUnlock) {
          pill.className = 'tab-pro-pill unlocked';
          pill.innerHTML = `💎 ${credits} CR`;
        } else {
          pill.className = 'tab-pro-pill';
          pill.innerHTML = '💎 CREDITS';
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
      if (banner) banner.style.display = hasCreditUnlock ? 'none' : 'block';
    });

    formControls.forEach((ctrl) => {
      if (ctrl) {
        ctrl.classList.toggle('panel-pro-locked', !hasCreditUnlock);
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
          openCreditsModal();
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
    getCreditsBalance: () => (currentUser ? Math.max(0, Number(currentUser.creditsBalance || 0)) : 0),
    hasCredits: () => Boolean(currentUser && Number(currentUser.creditsBalance || 0) > 0),
    isPro: () => Boolean(currentUser && Number(currentUser.creditsBalance || 0) > 0),
    getRemainingStreams,
    getLastRunAuth: () => (lastRunAuth ? { ...lastRunAuth } : null),
    settleChatVolumeCredits,
    checkQuota: checkQuotaAndGate,
    authorizeRun,
    incrementUsage,
    refreshSession: syncFromServer,
    openAuthModal,
    openCreditsModal,
    openProModal: openCreditsModal,
    startCheckout: startDodoCheckout,
    signOut: signOutUser,
    updateProLocks: updateFeatureLocks,
    updateFeatureLocks,
    getPricingRegion: () => currentPricingRegion,
    setPricingRegion,
  };

  // ── Init on DOM Ready ──
  document.addEventListener('DOMContentLoaded', async () => {
    purgeLegacyStorage();
    applyRegionPricing(document);
    renderAuthNav();
    updateFeatureLocks();
    await syncFromServer();
    await handleCheckoutReturnIfNeeded();
    initGoogleIdentity();
  });
})();
