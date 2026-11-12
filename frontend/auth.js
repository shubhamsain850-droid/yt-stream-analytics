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

  const PACK_TIER_KEY = 'TubeMetrix_pack_tier';

  const CREDIT_PACK_CATALOG = [
    {
      id: 'credits_10',
      featured: false,
      variants: {
        USD: {
          volume: {
            packId: 'credits_200',
            name: 'Starter Pack',
            ribbon: '',
            credits: 200,
            chatsAllowance: '200,000 chats or comments',
            symbol: '$',
            amount: '19.99',
            badge: '',
            sub: '$0.10 per 1k chats • Never expires',
            desc: 'Great for high-volume creators, giveaways &amp; bulk stream audits.',
            extra1: '✓ Never Expire • Use Any Time',
            extra2: '✓ Single, Custom URL Batch &amp; Date Range',
          },
          mini: {
            packId: 'usd_10',
            name: 'Starter Mini',
            ribbon: '',
            credits: 10,
            chatsAllowance: '10,000 chats or comments',
            symbol: '$',
            amount: '2.99',
            badge: '',
            sub: '$0.30 per 1k chats • Quick trial pack',
            desc: 'Quick entry pack for occasional stream audits or comment exports.',
            extra1: '✓ Never Expire • Use Any Time',
            extra2: '✓ Single, Custom URL Batch &amp; Date Range',
          },
        },
        INR: {
          mini: {
            packId: 'in_10',
            name: 'Starter Mini',
            ribbon: '',
            credits: 10,
            chatsAllowance: '10,000 chats/comments',
            symbol: '₹',
            amount: '49',
            badge: '',
            sub: '₹4.90 / 1k chats • India UPI &amp; Cards',
            desc: 'Great for occasional streams, comment exports &amp; creator checks.',
            extra1: '✓ Never Expire • Use Any Time',
            extra2: '✓ Single, Custom URL Batch &amp; Date Range',
          },
          volume: {
            packId: 'in_200',
            name: 'Starter Volume',
            ribbon: '',
            credits: 200,
            chatsAllowance: '200,000 chats/comments',
            symbol: '₹',
            amount: '799',
            badge: '🇮🇳 2× VS ₹499',
            sub: '₹4.00 / 1k chats • Save 20% per 1k',
            desc: 'Double the credits of ₹499 for regular creators &amp; multi-stream audits.',
            extra1: '✓ Never Expire • Use Any Time',
            extra2: '✓ Single, Custom URL Batch &amp; Date Range',
          },
        },
      },
    },
    {
      id: 'credits_30',
      featured: true,
      variants: {
        USD: {
          volume: {
            packId: 'credits_500',
            name: 'Growth Pack',
            ribbon: 'MOST POPULAR',
            credits: 500,
            chatsAllowance: '500,000 chats or comments',
            symbol: '$',
            amount: '29',
            badge: '',
            sub: '$0.058 per 1k chats (Save 42%) • Never expires',
            desc: 'Best value for regular live streamers, editors &amp; channel audits.',
            extra1: '✓ Custom URL Batch &amp; Full Channel History',
            extra2: '✓ 100% Ad-Free + Priority Throughput',
          },
          mini: {
            packId: 'usd_30',
            name: 'Creator Mini',
            ribbon: 'POPULAR MINI',
            credits: 30,
            chatsAllowance: '30,000 chats or comments',
            symbol: '$',
            amount: '6.99',
            badge: '',
            sub: '$0.23 per 1k chats (Save 23%) • Never expires',
            desc: 'Balanced mini pack for weekly batch streams and YouTube comments.',
            extra1: '✓ Custom URL Batch &amp; Full Channel History',
            extra2: '✓ 100% Ad-Free + Priority Throughput',
          },
        },
        INR: {
          mini: {
            packId: 'in_30',
            name: 'Creator Mini',
            ribbon: 'MOST POPULAR',
            credits: 30,
            chatsAllowance: '30,000 chats/comments',
            symbol: '₹',
            amount: '149',
            badge: '',
            sub: '₹4.97 / 1k chats • India UPI &amp; Cards',
            desc: 'Best starter value for regular live streamers, editors &amp; channel audits.',
            extra1: '✓ Custom URL Batch &amp; Full Channel History',
            extra2: '✓ 100% Ad-Free + Never Expiring Credits',
          },
          volume: {
            packId: 'in_500',
            name: 'Growth Volume',
            ribbon: 'MOST POPULAR',
            credits: 500,
            chatsAllowance: '500,000 chats/comments',
            symbol: '₹',
            amount: '1,299',
            badge: '🇮🇳 SAVE 48%',
            sub: '₹2.60 / 1k chats • Massive Creator Savings',
            desc: 'High-volume pack for busy channels, editors &amp; full-month archives.',
            extra1: '✓ Custom URL Batch &amp; Full Channel History',
            extra2: '✓ 100% Ad-Free + Priority Throughput',
          },
        },
      },
    },
    {
      id: 'credits_100',
      featured: false,
      variants: {
        USD: {
          volume: {
            packId: 'credits_1000',
            name: 'Agency Pack',
            ribbon: 'BEST VALUE',
            credits: 1000,
            chatsAllowance: '1,000,000 chats or comments',
            symbol: '$',
            amount: '49',
            badge: '',
            sub: '$0.049 per 1k chats (Save 51%) • Never expires',
            desc: 'Massive million-chat volume for MCNs, agencies &amp; researchers.',
            extra1: '✓ Bulk Parallel Batch Engine &amp; Exports',
            extra2: '✓ 100% Ad-Free + VIP Queue Speed',
          },
          mini: {
            packId: 'credits_200',
            name: 'Starter Volume',
            ribbon: '6.6× UPGRADE',
            credits: 200,
            chatsAllowance: '200,000 chats or comments',
            symbol: '$',
            amount: '19.99',
            badge: 'BEST UPGRADE',
            sub: '$0.10 per 1k chats (Save 66% vs Mini)',
            desc: 'Get 200,000 chats instead of 30k for only $13 more — massive value.',
            extra1: '✓ Single, Custom URL Batch &amp; Date Range',
            extra2: '✓ 100% Ad-Free + All Export Formats',
          },
        },
        INR: {
          mini: {
            packId: 'in_100',
            name: 'Agency Mini',
            ribbon: '100K PACK',
            credits: 100,
            chatsAllowance: '100,000 chats/comments',
            symbol: '₹',
            amount: '499',
            badge: '',
            sub: '₹4.99 / 1k chats • India UPI &amp; Cards',
            desc: 'Solid 1 Lakh chats/comments pack for growing channels &amp; researchers.',
            extra1: '✓ Parallel Batch Engine &amp; All Exports',
            extra2: '✓ 100% Ad-Free + Priority Throughput',
          },
          volume: {
            packId: 'in_1000',
            name: 'Agency Volume',
            ribbon: 'BEST VALUE',
            credits: 1000,
            chatsAllowance: '1,000,000 chats/comments',
            symbol: '₹',
            amount: '1,799',
            badge: '🇮🇳 ₹1.80 / 1k',
            sub: '₹1.80 / 1k chats (Save 64%) • Never expires',
            desc: 'Massive 10 Lakh (1M) chat/comment volume for agencies &amp; MCNs.',
            extra1: '✓ Bulk Parallel Batch Engine &amp; Exports',
            extra2: '✓ 100% Ad-Free + VIP Queue Speed',
          },
        },
      },
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

  let currentPackTier = 'volume';
  let userOverrodeTier = false;
  try {
    const savedTier = localStorage.getItem(PACK_TIER_KEY);
    if (savedTier === 'mini' || savedTier === 'volume') {
      currentPackTier = savedTier;
      userOverrodeTier = true;
    } else if (currentPricingRegion === 'INR') {
      currentPackTier = 'mini';
    }
  } catch {
    if (currentPricingRegion === 'INR') currentPackTier = 'mini';
  }

  let regionState = {
    country: null,
    isIndia: null,
    indiaFirstPurchaseEligible: null,
  };

  function getPackDisplayPricing(packSlot, tierOverride = null) {
    const regKey = currentPricingRegion === 'INR' ? 'INR' : 'USD';
    const tierKey = (tierOverride || currentPackTier) === 'mini' ? 'mini' : 'volume';
    const v = packSlot?.variants?.[regKey]?.[tierKey] || packSlot?.variants?.USD?.volume;
    const creditsText = Number(v.credits || 0).toLocaleString('en-US');
    const isIndia = regKey === 'INR';
    return {
      packId: v.packId,
      name: v.name,
      ribbon: v.ribbon || '',
      credits: v.credits,
      creditsHeadline: `💎 ${creditsText} Credits`,
      chatsBulletHtml: `✓ <strong>${creditsText} Credits</strong> (= ${v.chatsAllowance})`,
      desc: v.desc,
      extra1: v.extra1,
      extra2: v.extra2,
      extraFeatures: [v.extra1, v.extra2],
      symbol: v.symbol,
      amount: v.amount,
      strikeAmount: '',
      badge: v.badge || '',
      sub: v.sub,
      cta: `Buy ${creditsText} Credits (${v.symbol}${v.amount}${isIndia ? ' UPI' : ''})`,
    };
  }

  function applyRegionPricing(root = document) {
    const firstSlot = getPackDisplayPricing(CREDIT_PACK_CATALOG[0]);
    const isIndia = currentPricingRegion === 'INR';
    const isMini = currentPackTier === 'mini';
    const minEntry = isIndia
      ? { symbol: '₹', amount: isMini ? '49' : '799', credits: isMini ? 10 : 200 }
      : { symbol: '$', amount: isMini ? '2.99' : '19.99', credits: isMini ? 10 : 200 };
    const bannerLabel = `💎 Buy Credits (From ${firstSlot.symbol}${firstSlot.amount} • ${firstSlot.credits} CR)`;

    root.querySelectorAll('[data-tm-price-target="banner-credits"]').forEach((node) => {
      node.textContent = bannerLabel;
    });

    root.querySelectorAll('[data-tm-price-target="pricing-footnote"]').forEach((node) => {
      node.textContent = isIndia
        ? '1 Credit = 1,000 chats/comments • India UPI Mini (₹49–₹499) & Bulk Volume (₹799–₹1,799) packs • Credits never expire.'
        : '1 Credit = 1,000 chats/comments • Global Volume ($19.99–$49) & Mini ($2.99–$6.99) packs • Credits never expire.';
    });

    root.querySelectorAll('[data-tm-price-target="modal-sub-default"]').forEach((node) => {
      if (node.dataset.customSub !== 'true') {
        node.textContent = isIndia
          ? `No subscriptions — India UPI prepaid packs from ${minEntry.symbol}${minEntry.amount} (${minEntry.credits} CR). Credits never expire.`
          : `No subscriptions — Global prepaid packs from ${minEntry.symbol}${minEntry.amount} (${minEntry.credits} CR). Credits never expire.`;
      }
    });

    root.querySelectorAll('[data-tm-tier-btn="volume"]').forEach((btn) => {
      btn.textContent = isIndia ? '💎 Volume (₹799–₹1,799)' : '💎 Volume (200k–1M)';
      btn.classList.toggle('active', currentPackTier === 'volume');
    });
    root.querySelectorAll('[data-tm-tier-btn="mini"]').forEach((btn) => {
      btn.textContent = isIndia ? '⚡ Mini (₹49–₹499)' : '⚡ Mini ($2.99–$6.99)';
      btn.classList.toggle('active', currentPackTier === 'mini');
    });

    CREDIT_PACK_CATALOG.forEach((pack) => {
      const p = getPackDisplayPricing(pack);
      root.querySelectorAll(`[data-tm-pack-name="${pack.id}"]`).forEach((n) => {
        n.textContent = p.name;
      });
      root.querySelectorAll(`[data-tm-pack-ribbon="${pack.id}"]`).forEach((n) => {
        n.textContent = p.ribbon;
        n.style.display = p.ribbon ? 'block' : 'none';
      });
      root.querySelectorAll(`[data-tm-pack-credits="${pack.id}"]`).forEach((n) => {
        n.textContent = p.creditsHeadline;
      });
      root.querySelectorAll(`[data-tm-pack-chats-bullet="${pack.id}"]`).forEach((n) => {
        n.innerHTML = p.chatsBulletHtml;
      });
      root.querySelectorAll(`[data-tm-pack-extra1="${pack.id}"]`).forEach((n) => {
        n.innerHTML = p.extra1;
      });
      root.querySelectorAll(`[data-tm-pack-extra2="${pack.id}"]`).forEach((n) => {
        n.innerHTML = p.extra2;
      });
      root.querySelectorAll(`[data-tm-pack-desc="${pack.id}"]`).forEach((n) => {
        n.innerHTML = p.desc;
      });
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
        n.innerHTML = p.sub;
      });
      root.querySelectorAll(`[data-tm-pack-cta="${pack.id}"]`).forEach((n) => {
        n.textContent = p.cta;
        n.dataset.resolvedPack = p.packId;
      });
    });

    root.querySelectorAll('[data-tm-promo-banner]').forEach((node) => {
      if (!isIndia) {
        node.style.display = 'none';
        return;
      }
      node.style.display = 'block';
      node.className = 'tm-india-promo-banner is-active';
      node.innerHTML = isMini
        ? '🇮🇳 <strong>India UPI Mini Packs (10k–100k):</strong> Instant UPI packs from <strong>₹49</strong> — need 200k–1M chats? Switch to <strong>💎 Volume (₹799–₹1,799)</strong> above!'
        : '🇮🇳 <strong>India UPI Volume Packs (200k–1M):</strong> Massive bulk savings from <strong>₹1.80 / 1k chats</strong> (beats competitor PPP) — or switch to <strong>⚡ Mini (₹49–₹499)</strong> above!';
    });

    root.querySelectorAll('[data-tm-region-btn]').forEach((btn) => {
      const r = btn.getAttribute('data-tm-region-btn');
      btn.classList.toggle('active', r === currentPricingRegion);
    });
  }

  function setPricingRegion(region) {
    currentPricingRegion = region === 'INR' ? 'INR' : 'USD';
    userOverrodeRegion = true;
    if (!userOverrodeTier) {
      currentPackTier = currentPricingRegion === 'INR' ? 'mini' : 'volume';
    }
    try {
      localStorage.setItem(CURRENCY_REGION_KEY, currentPricingRegion);
    } catch {}
    applyRegionPricing(document);
  }

  function setPackTier(tier) {
    currentPackTier = tier === 'mini' ? 'mini' : 'volume';
    userOverrodeTier = true;
    try {
      localStorage.setItem(PACK_TIER_KEY, currentPackTier);
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
        if (!userOverrodeTier) {
          currentPackTier = currentPricingRegion === 'INR' ? 'mini' : 'volume';
        }
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
    try {
      window.dispatchEvent(
        new CustomEvent('tubemetrix:auth-updated', {
          detail: {
            user: currentUser ? { ...currentUser } : null,
            quota: { ...quotaState },
            creditsBalance: currentUser ? Math.max(0, Number(currentUser.creditsBalance || 0)) : 0,
          },
        })
      );
    } catch {}
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

    ['tm_checkout', 'payment_id', 'subscription_id', 'session_id', 'status', 'plan', 'pack', 'email'].forEach(
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
          <button class="user-avatar-btn ${credits > 0 ? 'has-credits' : 'no-credits'}" id="userAvatarBtn" type="button" aria-label="Open User Menu" title="Account & Credits (${credits} CR)">
            <img src="${safeAvatar}" alt="${safeName}" class="user-avatar-img">
            <span class="user-credit-chip ${credits > 0 ? 'chip-active' : 'chip-empty'}">
              <span class="user-credit-gem" aria-hidden="true">💎</span>
              <span class="user-tier-badge ${credits > 0 ? 'badge-pro' : 'badge-free'}" id="navCreditBadge">${credits} CR</span>
            </span>
            <svg class="user-menu-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
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
              <span>💎 Buy Credit Packs</span>
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
    await clearAllCheckpoints();
    try {
      const res = await apiRequest('/api/auth/logout', { method: 'POST', body: '{}' });
      if (res.ok) {
        applyServerState(res.data);
        return;
      }
    } catch {}
    currentUser = null;
    applyServerState({ user: null });
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
            <span class="benefit-text"><strong>Prepaid Credit Packs</strong> — Pay-as-you-go volume packs, never expire</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">🇮🇳</span>
            <span class="benefit-text">${currentPricingRegion === 'INR' ? '<strong>India 1st Order Offer</strong> — Starter 10 Credits from ₹49 via UPI' : '<strong>High-Volume Prepaid Packs</strong> — 200k to 1M chats from $19.99'}</span>
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

  const EXPLICIT_CHECKOUT_PACKS = new Set([
    'usd_10',
    'usd_30',
    'credits_200',
    'credits_500',
    'credits_1000',
    'in_10',
    'in_30',
    'in_100',
    'in_200',
    'in_500',
    'in_1000',
  ]);

  async function startDodoCheckout(packId) {
    if (!currentUser) {
      pendingCheckoutPack = packId;
      closeCreditsModal();
      openAuthModal(
        'Sign in with Google first so your purchased credits are linked safely to your account — checkout opens automatically right after.'
      );
      return;
    }

    if (regionState.country !== null) {
      const serverMarket = regionState.isIndia ? 'INR' : 'USD';
      if (currentPricingRegion !== serverMarket) {
        setPricingRegion(serverMarket);
        openCreditsModal();
        setCheckoutStatus(
          regionState.isIndia
            ? '🇮🇳 Switched to India INR pricing (₹49–₹1,799 via UPI) matching your IP billing region. Click Buy again to continue.'
            : '🌍 Switched to Global USD pricing ($2.99–$49) matching your IP billing region. Click Buy again to continue.',
          false
        );
        return;
      }
    }

    let resolvedPackId = packId;
    if (!EXPLICIT_CHECKOUT_PACKS.has(packId)) {
      const slotMatch = CREDIT_PACK_CATALOG.find((p) => p.id === packId);
      if (slotMatch) {
        resolvedPackId = getPackDisplayPricing(slotMatch).packId;
      }
    }

    const buttons = document.querySelectorAll('.btn-checkout-plan[data-pack]');
    const targetBtn =
      document.querySelector(`.btn-checkout-plan[data-resolved-pack="${resolvedPackId}"]`) ||
      document.querySelector(`.btn-checkout-plan[data-pack="${packId}"]`);
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
          packId: resolvedPackId,
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
  function openCreditsModal(customSubtitle = null, options = {}) {
    if (options?.neededCredits > 100 && !userOverrodeTier) {
      currentPackTier = 'volume';
    }

    let backdrop = document.getElementById('tmProModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmProModalBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const currentBal = currentUser ? Math.max(0, Number(currentUser.creditsBalance || 0)) : 0;
    const isIndia = currentPricingRegion === 'INR';
    const defaultSub = isIndia
      ? 'No subscriptions — India UPI Mini (₹49–₹499) & Volume (₹799–₹1,799) packs. Credits never expire.'
      : 'No subscriptions — Global Volume ($19.99–$49) & Mini ($2.99–$6.99) packs. Credits never expire.';

    const cardsHtml = CREDIT_PACK_CATALOG.map((pack) => {
      const p = getPackDisplayPricing(pack);
      return `
        <div class="pricing-card ${pack.featured ? 'card-featured' : ''}">
          <div class="featured-ribbon" data-tm-pack-ribbon="${pack.id}" style="display:${p.ribbon ? 'block' : 'none'};">${p.ribbon}</div>
          <div class="pricing-card-top">
            <div class="pricing-plan-name" data-tm-pack-name="${pack.id}">${p.name}</div>
            <span class="tm-pack-discount-badge" data-tm-pack-badge="${pack.id}" style="display:${p.badge ? 'inline-flex' : 'none'};">${p.badge}</span>
          </div>
          <div class="pricing-credits-headline" data-tm-pack-credits="${pack.id}">${p.creditsHeadline}</div>
          <div class="pricing-price">
            <span class="price-strike" data-tm-pack-strike="${pack.id}" style="display:${p.strikeAmount ? 'inline-block' : 'none'};">${p.strikeAmount}</span>
            <span class="price-symbol" data-tm-pack-symbol="${pack.id}">${p.symbol}</span><span class="price-amount" data-tm-pack-amount="${pack.id}">${p.amount}</span>
            <span class="price-period">/ one-time</span>
            <span class="price-inr" data-tm-pack-sub="${pack.id}">${p.sub}</span>
          </div>
          <p class="pricing-desc" data-tm-pack-desc="${pack.id}">${p.desc}</p>
          <ul class="pricing-features">
            <li data-tm-pack-chats-bullet="${pack.id}">${p.chatsBulletHtml}</li>
            <li data-tm-pack-extra1="${pack.id}">${p.extra1}</li>
            <li data-tm-pack-extra2="${pack.id}">${p.extra2}</li>
          </ul>
          <button class="btn-checkout-plan ${pack.featured ? 'btn-checkout-featured' : ''}" data-pack="${pack.id}" data-resolved-pack="${p.packId}" data-tm-pack-cta="${pack.id}" type="button">${p.cta}</button>
        </div>
      `;
    }).join('');

    backdrop.innerHTML = `
      <div class="tm-modal-card tm-credits-modal-card">
        <button class="tm-modal-close" id="closeProModalBtn" type="button">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-pro-pill">💎 PREPAID CREDITS • ${currentUser ? `BALANCE: ${currentBal} CREDITS` : 'PAY AS YOU GO'}</div>
          <h2 class="tm-modal-title">Buy Never-Expiring Credit Packs</h2>
          <p class="tm-modal-subtitle" data-tm-price-target="modal-sub-default" data-custom-sub="${customSubtitle ? 'true' : 'false'}">${escapeHtml(customSubtitle || defaultSub)}</p>
          <div class="tm-pricing-controls-row">
            <div class="tm-region-toggle" role="group" aria-label="Display currency">
              <button type="button" class="tm-region-btn ${currentPricingRegion === 'USD' ? 'active' : ''}" data-tm-region-btn="USD">🌍 Global (USD)</button>
              <button type="button" class="tm-region-btn ${currentPricingRegion === 'INR' ? 'active' : ''}" data-tm-region-btn="INR">🇮🇳 India (INR)</button>
            </div>
            <div class="tm-pack-tier-toggle" role="group" aria-label="Pack size range">
              <button type="button" class="tm-pack-tier-btn ${currentPackTier === 'volume' ? 'active' : ''}" data-tm-tier-btn="volume">${isIndia ? '💎 Volume (₹799–₹1,799)' : '💎 Volume (200k–1M)'}</button>
              <button type="button" class="tm-pack-tier-btn ${currentPackTier === 'mini' ? 'active' : ''}" data-tm-tier-btn="mini">${isIndia ? '⚡ Mini (₹49–₹499)' : '⚡ Mini ($2.99–$6.99)'}</button>
            </div>
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

    backdrop.querySelectorAll('[data-tm-tier-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        setPackTier(btn.getAttribute('data-tm-tier-btn'));
      });
    });

    document.getElementById('closeProModalBtn').onclick = closeCreditsModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeCreditsModal();
    };

    backdrop.querySelectorAll('.btn-checkout-plan[data-pack]').forEach((btn) => {
      btn.onclick = () => {
        startDodoCheckout(btn.dataset.resolvedPack || btn.dataset.pack);
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
    const silent = Boolean(options?.silent);

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

      if (silent) {
        return false;
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
        const targetTier = needed > 100 ? 'volume' : null;
        const firstPrice = getPackDisplayPricing(CREDIT_PACK_CATALOG[0], targetTier);
        if (res.data?.freeExhausted) {
          openCreditsModal(
            `Weekly Free Single Limit Reached (${FREE_WEEKLY_LIMIT}/${FREE_WEEKLY_LIMIT} used this week). You need ${needed} credit (balance: ${bal}). Grab ${firstPrice.credits} credits from ${firstPrice.symbol}${firstPrice.amount} — never expire!`,
            { neededCredits: needed }
          );
        } else {
          const modeName =
            mode === 'channel'
              ? 'Channel Date Range'
              : mode === 'batch'
                ? 'Custom URL Batch'
                : 'This export';
          openCreditsModal(
            `${modeName} requires ${needed} credit(s) — your current balance is ${bal}. Top up never-expiring credits below!`,
            { neededCredits: needed }
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

  async function unlockRemainingChatCredits({
    streamId = '',
    totalMessages = 0,
    unlockedCount = 0,
    creditsNeeded = 1,
    silent = false,
  } = {}) {
    if (!sessionReady) {
      await syncFromServer();
    }
    if (!currentUser) {
      if (!silent) {
        openAuthModal(
          'Sign in with Google and add Credits to unlock the remaining live chat messages cleanly.'
        );
      }
      return { ok: false, reason: 'auth_required', deducted: 0 };
    }

    const bal = Math.max(0, Number(currentUser.creditsBalance || 0));
    if (bal < 1) {
      if (!silent) {
        const neededDisplay = Math.max(1, Math.floor(Number(creditsNeeded) || 1));
        openCreditsModal(
          `Unlocking remaining chats requires up to ${neededDisplay} credit(s) (1 credit = 1,000 extra chats). Your current balance is 0 CR.`
        );
      }
      return { ok: false, reason: 'credits_required', deducted: 0, creditsRemaining: bal };
    }

    try {
      const res = await apiRequest('/api/credits/settle', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'unlock',
          streamId,
          totalMessages,
          unlockedCount,
          creditsNeeded,
        }),
      });
      if (res.ok && res.data?.user) {
        applyServerState({ user: res.data.user, quota: res.data.quota });
        return res.data;
      }
      if (!silent) {
        showAuthToast(res.data?.error || 'Could not unlock remaining chats. Please try again.');
      }
      return { ok: false, reason: res.data?.error || 'unlock_failed', deducted: 0 };
    } catch {
      if (!silent) {
        showAuthToast('Network error unlocking remaining chats. Please try again.');
      }
      return { ok: false, reason: 'network_error', deducted: 0 };
    }
  }

  // ── User-Scoped Checkpoint Store (IndexedDB + Safe LocalStorage Fallback) ──
  const CKPT_DB_NAME = 'TubeMetrixCheckpointsDB';
  const CKPT_STORE_NAME = 'checkpoints';
  const CKPT_LS_PREFIX = 'tm_ckpt_';
  const CKPT_TTL_MS = 48 * 60 * 60 * 1000;

  function openCheckpointDb() {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(CKPT_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(CKPT_STORE_NAME)) {
            db.createObjectStore(CKPT_STORE_NAME);
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async function saveCheckpoint(key, data, { allowGuest = false } = {}) {
    if (!key || !data || typeof data !== 'object') return false;
    const ownerId = currentUser?.id || null;
    if (!ownerId && !allowGuest) return false;

    const wrapped = {
      ...data,
      __meta: {
        userId: ownerId,
        allowGuest: Boolean(allowGuest),
        savedAt: Date.now(),
      },
    };

    const db = await openCheckpointDb();
    if (db) {
      const ok = await new Promise((resolve) => {
        try {
          const tx = db.transaction(CKPT_STORE_NAME, 'readwrite');
          tx.objectStore(CKPT_STORE_NAME).put(wrapped, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch {
          resolve(false);
        }
      });
      if (ok) {
        try {
          localStorage.removeItem(CKPT_LS_PREFIX + key);
        } catch {}
        return true;
      }
    }

    try {
      const jsonStr = JSON.stringify(wrapped);
      if (jsonStr.length < 1_500_000) {
        localStorage.setItem(CKPT_LS_PREFIX + key, jsonStr);
        return true;
      }
    } catch {}
    return false;
  }

  async function loadCheckpoint(key) {
    if (!key) return null;
    if (!sessionReady) {
      await syncFromServer();
    }

    let record = null;
    const db = await openCheckpointDb();
    if (db) {
      record = await new Promise((resolve) => {
        try {
          const tx = db.transaction(CKPT_STORE_NAME, 'readonly');
          const req = tx.objectStore(CKPT_STORE_NAME).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    if (!record) {
      try {
        const raw = localStorage.getItem(CKPT_LS_PREFIX + key);
        if (raw) record = JSON.parse(raw);
      } catch {}
    }

    if (!record || typeof record !== 'object') return null;

    const meta = record.__meta || {};
    if (!meta.savedAt || Date.now() - Number(meta.savedAt) > CKPT_TTL_MS) {
      await clearCheckpoint(key);
      return null;
    }

    const ownerId = meta.userId || null;
    const activeId = currentUser?.id || null;
    if (ownerId) {
      if (!activeId || activeId !== ownerId) {
        return null;
      }
    } else if (!meta.allowGuest) {
      return null;
    }

    const clean = { ...record };
    delete clean.__meta;
    return clean;
  }

  async function clearCheckpoint(key) {
    if (!key) return;
    try {
      localStorage.removeItem(CKPT_LS_PREFIX + key);
    } catch {}
    const db = await openCheckpointDb();
    if (db) {
      await new Promise((resolve) => {
        try {
          const tx = db.transaction(CKPT_STORE_NAME, 'readwrite');
          tx.objectStore(CKPT_STORE_NAME).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  }

  async function clearAllCheckpoints() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CKPT_LS_PREFIX)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
    const db = await openCheckpointDb();
    if (db) {
      await new Promise((resolve) => {
        try {
          const tx = db.transaction(CKPT_STORE_NAME, 'readwrite');
          tx.objectStore(CKPT_STORE_NAME).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
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
    whenReady: () => (sessionReady ? Promise.resolve() : syncFromServer()),
    getCreditsBalance: () => (currentUser ? Math.max(0, Number(currentUser.creditsBalance || 0)) : 0),
    hasCredits: () => Boolean(currentUser && Number(currentUser.creditsBalance || 0) > 0),
    isPro: () => Boolean(currentUser && Number(currentUser.creditsBalance || 0) > 0),
    getRemainingStreams,
    getLastRunAuth: () => (lastRunAuth ? { ...lastRunAuth } : null),
    settleChatVolumeCredits,
    unlockRemainingChatCredits,
    checkpoints: {
      save: saveCheckpoint,
      load: loadCheckpoint,
      clear: clearCheckpoint,
      clearAll: clearAllCheckpoints,
    },
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
    getPackTier: () => currentPackTier,
    setPackTier,
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
