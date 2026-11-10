/**
 * TubeMetrix — Google Identity Services (GIS) & Subscription Quota Engine
 * Handles Google One-Tap, User Session, Daily Freemium Quota & Pro Gating
 */

(function () {
  'use strict';

  // ── Configuration ──
  // Replace with your Google Cloud Console OAuth Client ID
  // e.g. "123456789-abcdefg.apps.googleusercontent.com"
  const GOOGLE_CLIENT_ID = window.TUBEMETRIX_GOOGLE_CLIENT_ID || "83599777834-drdbj74ur8o1q5isch9avpltjs6a7qj2.apps.googleusercontent.com";

  const GUEST_DAILY_LIMIT = 2;
  const FREE_DAILY_LIMIT = 5;

  const STORAGE_KEYS = {
    USER: 'TubeMetrix_auth_user',
    TOKEN: 'TubeMetrix_auth_token',
    QUOTA: 'TubeMetrix_usage_quota'
  };

  // ── State ──
  let currentUser = null;

  // ── Helper: Get Today's Date String (YYYY-MM-DD) ──
  function getTodayKey() {
    return new Date().toISOString().split('T')[0];
  }

  // ── Load / Save User Session ──
  function loadUserSession() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER);
      if (stored) {
        currentUser = JSON.parse(stored);
      }
    } catch (e) {
      currentUser = null;
    }
  }

  function saveUserSession(user, token) {
    currentUser = user;
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      if (token) localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch (e) {
      console.warn("Could not save session to localStorage:", e);
    }
    renderAuthNav();
  }

  function clearUserSession() {
    currentUser = null;
    try {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch (e) {}
    renderAuthNav();
  }

  // ── Quota Management (Reset Daily at 00:00) ──
  function getUsageQuota() {
    const today = getTodayKey();
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.QUOTA);
      if (stored) {
        const q = JSON.parse(stored);
        if (q.date === today) {
          return q;
        }
      }
    } catch (e) {}
    // Reset for new day
    const newQuota = { date: today, guestUsed: 0, userUsed: 0 };
    saveUsageQuota(newQuota);
    return newQuota;
  }

  function saveUsageQuota(quota) {
    try {
      localStorage.setItem(STORAGE_KEYS.QUOTA, JSON.stringify(quota));
    } catch (e) {}
  }

  function incrementUsage(count = 1) {
    const q = getUsageQuota();
    if (currentUser) {
      q.userUsed = (q.userUsed || 0) + count;
    } else {
      q.guestUsed = (q.guestUsed || 0) + count;
    }
    saveUsageQuota(q);
    renderAuthNav();
  }

  function getRemainingStreams() {
    const q = getUsageQuota();
    if (!currentUser) {
      return Math.max(0, GUEST_DAILY_LIMIT - (q.guestUsed || 0));
    }
    if (currentUser.tier === 'pro') {
      return Infinity;
    }
    return Math.max(0, FREE_DAILY_LIMIT - (q.userUsed || 0));
  }

  // ── Parse Google JWT (OpenID Connect Credential) ──
  function decodeGoogleJwt(jwt) {
    try {
      const base64Url = jwt.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Failed to decode Google JWT:", e);
      return null;
    }
  }

  // ── Handle Google Credential Response ──
  window.handleGoogleCredentialResponse = function (response) {
    if (!response || !response.credential) return;

    const payload = decodeGoogleJwt(response.credential);
    if (!payload || !payload.email) {
      alert("Google Sign-In failed. Please try again.");
      return;
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      givenName: payload.given_name || payload.name || "Creator",
      picture: payload.picture || null,
      tier: 'free', // 'free' or 'pro'
      createdAt: new Date().toISOString()
    };

    saveUserSession(user, response.credential);

    // Close any open auth modals
    closeAuthModal();
    closeProModal();

    // Trigger subtle success notification
    showAuthToast(`Welcome back, ${user.givenName}! (5 Free Streams/Day Active)`);
  };

  // ── Initialize Google Identity Services (GIS) ──
  function initGoogleIdentity() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
      // Retry in 250ms if GIS library still downloading
      setTimeout(initGoogleIdentity, 250);
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: window.handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true
      });

      // Show Google One Tap if user is not logged in
      if (!currentUser && GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE")) {
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // One Tap dismissed or unsupported in current view
          }
        });
      }
    } catch (err) {
      console.warn("Google Identity Init Notice:", err);
    }
  }

  // ── Render Top Navbar Auth UI ──
  function renderAuthNav() {
    const container = document.getElementById('authNavContainer');
    if (!container) return;

    const q = getUsageQuota();

    if (!currentUser) {
      // GUEST STATE
      const rem = Math.max(0, GUEST_DAILY_LIMIT - (q.guestUsed || 0));
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
          openAuthModal("Sign in to TubeMetrix to get 5 free daily stream audits and save your history.");
        });
      }
    } else {
      // LOGGED IN STATE
      const isPro = currentUser.tier === 'pro';
      const used = q.userUsed || 0;
      const limit = isPro ? '∞' : FREE_DAILY_LIMIT;
      const pct = isPro ? 100 : Math.min(100, Math.round((used / FREE_DAILY_LIMIT) * 100));
      const avatarSrc = currentUser.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=ff0033&color=fff&rounded=true`;

      container.innerHTML = `
        <div class="user-profile-menu" id="userProfileMenu">
          <button class="user-avatar-btn" id="userAvatarBtn" type="button" aria-label="Open User Menu">
            <img src="${avatarSrc}" alt="${currentUser.name}" class="user-avatar-img">
            <span class="user-tier-badge ${isPro ? 'badge-pro' : 'badge-free'}">${isPro ? 'PRO' : 'FREE'}</span>
          </button>

          <!-- Dropdown Card -->
          <div class="user-dropdown-card" id="userDropdownCard" style="display: none;">
            <div class="user-dropdown-header">
              <img src="${avatarSrc}" alt="${currentUser.name}" class="dropdown-avatar-img">
              <div class="dropdown-user-info">
                <span class="user-display-name">${currentUser.name}</span>
                <span class="user-display-email">${currentUser.email}</span>
              </div>
            </div>

            <div class="dropdown-tier-status">
              <span class="tier-label">Current Tier:</span>
              <span class="tier-val ${isPro ? 'text-gold' : 'text-cyan'}">${isPro ? '👑 PRO Member (Unlimited)' : 'Standard Free Plan'}</span>
            </div>

            ${!isPro ? `
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
            ` : `
              <div class="pro-perks-box">
                <span>⚡ Unlimited Audits Active</span>
                <span>💎 100% Ad-Free Fast Lane</span>
              </div>
            `}

            <div class="dropdown-divider"></div>

            <button class="btn-dropdown-signout" id="dropdownSignOutBtn" type="button">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      `;

      // Dropdown toggle
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

      // Upgrade button in menu
      const upgradeBtn = document.getElementById('dropdownUpgradeBtn');
      if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
          dropdownCard.style.display = 'none';
          openProModal();
        });
      }

      // Sign out button
      const signOutBtn = document.getElementById('dropdownSignOutBtn');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
          clearUserSession();
          showAuthToast("Signed out successfully.");
        });
      }
    }

    // Ad Suppression for PRO Members
    checkAdSuppression();
  }

  function checkAdSuppression() {
    if (currentUser && currentUser.tier === 'pro') {
      const adScript = document.querySelector('script[src*="bauval.org"]');
      if (adScript) adScript.remove();
      const adElements = document.querySelectorAll('iframe[src*="bauval"], div[id*="at-cv-lightbox"], div[class*="adsterra"], div[class*="social-bar"]');
      adElements.forEach(el => el.remove());
    }
  }

  // ── Auth Modal (Guest Limit Reached / Sign In) ──
  function openAuthModal(subtitle = null) {
    let backdrop = document.getElementById('tmAuthModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmAuthModalBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    const defaultSub = "You've reached your daily free guest limit (2 streams). Sign in with Google to get 5 more free streams today + save audit history!";

    backdrop.innerHTML = `
      <div class="tm-modal-card">
        <button class="tm-modal-close" id="closeAuthModalBtn">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-brand-pill">TubeMetrix Auth</div>
          <h2 class="tm-modal-title">Sign in to TubeMetrix</h2>
          <p class="tm-modal-subtitle">${subtitle || defaultSub}</p>
        </div>

        <div class="tm-benefits-list">
          <div class="benefit-item">
            <span class="benefit-icon">🎁</span>
            <span class="benefit-text"><strong>5 Free Stream Audits Daily</strong> (Instead of 2 guest streams)</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">⚡</span>
            <span class="benefit-text"><strong>Custom URL Batch Export</strong> (Queue up to 50 streams)</span>
          </div>
          <div class="benefit-item">
            <span class="benefit-icon">📊</span>
            <span class="benefit-text"><strong>Saved Session Reports</strong> &amp; One-Click Excel Exports</span>
          </div>
        </div>

        <!-- Google Official Button Container -->
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

        <!-- Dev / Test Sandbox Trigger -->
        <div class="auth-test-sandbox">
          <span class="sandbox-hint">Developer Test Mode:</span>
          <button class="btn-test-login" id="testFreeLoginBtn" type="button">Test as Free User</button>
          <button class="btn-test-login btn-test-pro" id="testProLoginBtn" type="button">Test as PRO Member 👑</button>
        </div>

        <div class="tm-modal-footer">
          <span>By continuing, you agree to TubeMetrix Terms &amp; Privacy Policy.</span>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';

    // Close listeners
    document.getElementById('closeAuthModalBtn').onclick = closeAuthModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeAuthModal();
    };

    // Google Sign in trigger & official button render
    const googleBtnWrap = document.getElementById('modalGoogleBtnWrap');
    if (googleBtnWrap && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      try {
        google.accounts.id.renderButton(googleBtnWrap, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320
        });
      } catch (e) {
        console.warn("Could not render official Google button:", e);
      }
    } else {
      const googleBtn = document.getElementById('triggerGoogleSignInBtn');
      if (googleBtn) {
        googleBtn.onclick = () => {
          if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.prompt();
          } else {
            alert("Connecting to Google Identity Services. Please make sure pop-ups are allowed.");
          }
        };
      }
    }

    // Developer Test buttons for instant verification
    const testFree = document.getElementById('testFreeLoginBtn');
    if (testFree) {
      testFree.onclick = () => {
        saveUserSession({
          id: 'test_user_free_123',
          name: 'Demo Creator',
          givenName: 'Demo',
          email: 'creator@demo.com',
          picture: null,
          tier: 'free'
        }, 'mock_token');
        closeAuthModal();
        showAuthToast('Signed in as Free Creator (5 Free Streams/Day)!');
      };
    }

    const testPro = document.getElementById('testProLoginBtn');
    if (testPro) {
      testPro.onclick = () => {
        saveUserSession({
          id: 'test_user_pro_999',
          name: 'Pro Streamer',
          givenName: 'VIP',
          email: 'vip@creator.pro',
          picture: null,
          tier: 'pro'
        }, 'mock_pro_token');
        closeAuthModal();
        showAuthToast('Signed in as PRO Member (Unlimited Audits & Zero Ads)! 👑');
      };
    }
  }

  function closeAuthModal() {
    const backdrop = document.getElementById('tmAuthModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  }

  // ── Pro Pricing Modal (Free Limit Reached / Upgrade) ──
  function openProModal() {
    let backdrop = document.getElementById('tmProModalBackdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'tmProModalBackdrop';
      backdrop.className = 'tm-modal-backdrop';
      document.body.appendChild(backdrop);
    }

    backdrop.innerHTML = `
      <div class="tm-modal-card tm-pro-card">
        <button class="tm-modal-close" id="closeProModalBtn">&times;</button>
        <div class="tm-modal-header">
          <div class="tm-pro-pill">👑 PRO MEMBERSHIP</div>
          <h2 class="tm-modal-title">Unlock Unlimited Stream Audits</h2>
          <p class="tm-modal-subtitle">Audit hundreds of streams simultaneously, unlock full channel histories, and enjoy 100% ad-free processing.</p>
        </div>

        <div class="pro-pricing-grid">
          <!-- 24-Hour Day Pass -->
          <div class="pricing-card">
            <div class="pricing-plan-name">24-Hour Day Pass</div>
            <div class="pricing-price">
              <span class="price-symbol">$</span><span class="price-amount">0.99</span>
              <span class="price-inr">/ ₹49 INR</span>
            </div>
            <p class="pricing-desc">Perfect for a single audit session or weekly stream review.</p>
            <ul class="pricing-features">
              <li>✓ 24 Hours Unlimited Streams</li>
              <li>✓ Channel &amp; Date Range Full Audit</li>
              <li>✓ Excel &amp; CSV Full Exports</li>
              <li>✓ Zero Ads Guaranteed</li>
            </ul>
            <button class="btn-checkout-plan" data-plan="day_pass" type="button">Get 24h Pass ($0.99)</button>
          </div>

          <!-- Monthly Pro (Featured) -->
          <div class="pricing-card card-featured">
            <div class="featured-ribbon">MOST POPULAR</div>
            <div class="pricing-plan-name">Monthly Creator Pro</div>
            <div class="pricing-price">
              <span class="price-symbol">$</span><span class="price-amount">4.99</span>
              <span class="price-period">/ month</span>
              <span class="price-inr">/ ₹299 INR</span>
            </div>
            <p class="pricing-desc">For active creators, editors &amp; esports team managers.</p>
            <ul class="pricing-features">
              <li>✓ <strong>Unlimited</strong> Streams Every Day</li>
              <li>✓ 3x Parallel Safe Workers (Fastest)</li>
              <li>✓ YouTube Jewels &amp; Tiers Breakdown</li>
              <li>✓ VIP Priority Support</li>
            </ul>
            <button class="btn-checkout-plan btn-checkout-featured" data-plan="monthly_pro" type="button">Subscribe for $4.99 / mo</button>
          </div>
        </div>

        <div class="tm-guarantee-note">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <span>Instant Activation • Cancel Anytime with 1-Click • Powered by Lemon Squeezy &amp; Stripe</span>
        </div>
      </div>
    `;

    backdrop.style.display = 'flex';

    document.getElementById('closeProModalBtn').onclick = closeProModal;
    backdrop.onclick = (e) => {
      if (e.target === backdrop) closeProModal();
    };

    // Checkout buttons handler
    backdrop.querySelectorAll('.btn-checkout-plan').forEach(btn => {
      btn.onclick = () => {
        const plan = btn.dataset.plan;
        alert(`Redirecting to secure Lemon Squeezy checkout for [${plan}]. Integration will be activated once payment keys are configured.`);
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
    }, 4000);
  }

  // ── Gatekeeper: Check Quota Before Any Processing ──
  function checkQuotaAndGate(streamCount = 1) {
    // Pro users are always unlimited
    if (currentUser && currentUser.tier === 'pro') {
      return true;
    }

    const q = getUsageQuota();

    if (!currentUser) {
      // Guest Check (Max 2 streams/day)
      const used = q.guestUsed || 0;
      if (used + streamCount > GUEST_DAILY_LIMIT) {
        openAuthModal(`Daily Guest Limit Reached! You have used ${used} of ${GUEST_DAILY_LIMIT} free streams today. Sign in with Google to get 5 more free audits!`);
        return false;
      }
      return true;
    }

    // Logged-in Free User Check (Max 5 streams/day)
    const used = q.userUsed || 0;
    if (used + streamCount > FREE_DAILY_LIMIT) {
      openProModal();
      return false;
    }
    return true;
  }

  // ── Public Global API ──
  window.TubeMetrixAuth = {
    getUser: () => currentUser,
    isLoggedIn: () => !!currentUser,
    isPro: () => !!(currentUser && currentUser.tier === 'pro'),
    getRemainingStreams: getRemainingStreams,
    checkQuota: checkQuotaAndGate,
    incrementUsage: incrementUsage,
    openAuthModal: openAuthModal,
    openProModal: openProModal,
    signOut: clearUserSession
  };

  // ── Init on DOM Ready ──
  document.addEventListener('DOMContentLoaded', () => {
    loadUserSession();
    renderAuthNav();
    initGoogleIdentity();
  });

})();

