/**
 * TubeMetrix - Global Language Translator Engine
 * Seamlessly integrates Google Translate with a custom glassmorphic dropdown UI.
 * Remembers user language preference in cookies & localStorage across all pages.
 */

(function () {
  'use strict';

  // Supported Popular Creator Languages
  const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
    { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
    { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'tl', name: 'Filipino', native: 'Tagalog', flag: '🇵🇭' },
    { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    { code: 'zh-CN', name: 'Chinese', native: '简体中文', flag: '🇨🇳' },
    { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polish', native: 'Polski', flag: '🇵🇱' },
    { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
    { code: 'uk', name: 'Ukrainian', native: 'Українська', flag: '🇺🇦' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
    { code: 'ur', name: 'Urdu', native: 'اردو', flag: '🇵🇰' }
  ];

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  function setCookie(name, val) {
    document.cookie = `${name}=${val}; path=/;`;
    const host = window.location.hostname;
    if (host.includes('.')) {
      document.cookie = `${name}=${val}; path=/; domain=.${host};`;
      if (host.endsWith('tubemetrix.net')) {
        document.cookie = `${name}=${val}; path=/; domain=.tubemetrix.net;`;
      }
    }
  }

  function deleteCookie(name) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    const host = window.location.hostname;
    document.cookie = `${name}=; path=/; domain=.${host}; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    if (host.endsWith('tubemetrix.net')) {
      document.cookie = `${name}=; path=/; domain=.tubemetrix.net; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
    }
  }

  function getCurrentLang() {
    const rawCookie = getCookie('googtrans');
    if (rawCookie) {
      const parts = rawCookie.split('/');
      if (parts.length >= 3 && parts[2]) {
        return parts[2];
      }
    }
    return localStorage.getItem('tm_user_lang') || 'en';
  }

  // Insert Hidden Google Translate Element
  function initGoogleScript() {
    if (!document.getElementById('google_translate_element')) {
      const gdiv = document.createElement('div');
      gdiv.id = 'google_translate_element';
      document.body.appendChild(gdiv);
    }

    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        autoDisplay: false
      }, 'google_translate_element');
    };

    if (!document.getElementById('google-translate-script')) {
      const s = document.createElement('script');
      s.id = 'google-translate-script';
      s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      s.async = true;
      document.head.appendChild(s);
    }
  }

  // Mount Custom Glassmorphic Language Selector
  function mountLanguageSelector() {
    let container = document.getElementById('langNavContainer');
    if (!container) {
      const themeBtn = document.getElementById('themeToggleBtn');
      if (themeBtn && themeBtn.parentNode) {
        container = document.createElement('div');
        container.id = 'langNavContainer';
        container.className = 'lang-nav-container';
        themeBtn.parentNode.insertBefore(container, themeBtn);
      } else {
        return;
      }
    }

    const currentCode = getCurrentLang();
    const currentLangObj = LANGUAGES.find(l => l.code === currentCode) || LANGUAGES[0];

    container.innerHTML = `
      <button class="lang-selector-btn" id="langSelectorBtn" type="button" aria-haspopup="true" aria-expanded="false" title="Translate Website / Select Language">
        <span class="lang-btn-globe">${currentLangObj.flag}</span>
        <span class="lang-btn-text">
          <span class="lang-btn-text-full">${currentLangObj.native}</span>
          <span class="lang-btn-text-short" style="display:none;">${currentLangObj.code.toUpperCase()}</span>
        </span>
        <svg class="lang-btn-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="lang-dropdown-menu" id="langDropdownMenu" role="menu">
        <div class="lang-search-box">
          <svg class="lang-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="lang-search-input" id="langSearchInput" placeholder="Search language..." autocomplete="off">
        </div>
        <div class="lang-items-list" id="langItemsList">
          ${renderLangItems(currentCode)}
        </div>
      </div>
    `;

    const btn = document.getElementById('langSelectorBtn');
    const menu = document.getElementById('langDropdownMenu');
    const searchInput = document.getElementById('langSearchInput');

    function toggleMenu(show) {
      const willShow = show !== undefined ? show : !menu.classList.contains('active');
      if (willShow) {
        menu.classList.add('active');
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        setTimeout(() => searchInput.focus(), 80);
      } else {
        menu.classList.remove('active');
        btn.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        searchInput.value = '';
        filterLangItems('');
      }
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    menu.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      if (menu.classList.contains('active')) {
        toggleMenu(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('active')) {
        toggleMenu(false);
        btn.focus();
      }
    });

    searchInput.addEventListener('input', (e) => {
      filterLangItems(e.target.value.trim().toLowerCase());
    });

    const list = document.getElementById('langItemsList');
    list.addEventListener('click', (e) => {
      const itemBtn = e.target.closest('.lang-item-btn');
      if (!itemBtn) return;
      const code = itemBtn.getAttribute('data-lang');
      applyLanguage(code);
      toggleMenu(false);
    });
  }

  function renderLangItems(currentCode) {
    return LANGUAGES.map(l => {
      const isActive = l.code === currentCode;
      return `
        <button class="lang-item-btn ${isActive ? 'active' : ''}" data-lang="${l.code}" type="button">
          <div class="lang-item-left">
            <span class="lang-item-flag">${l.flag}</span>
            <div>
              <span class="lang-item-name">${l.native}</span>
              ${l.name !== l.native ? `<span class="lang-item-native"> (${l.name})</span>` : ''}
            </div>
          </div>
          <span class="lang-item-check">✓</span>
        </button>
      `;
    }).join('');
  }

  function filterLangItems(query) {
    const list = document.getElementById('langItemsList');
    if (!list) return;
    const items = list.querySelectorAll('.lang-item-btn');
    let visibleCount = 0;

    items.forEach(btn => {
      const code = btn.getAttribute('data-lang');
      const langObj = LANGUAGES.find(l => l.code === code);
      if (!langObj) return;

      const match = !query ||
        langObj.name.toLowerCase().includes(query) ||
        langObj.native.toLowerCase().includes(query) ||
        langObj.code.toLowerCase().includes(query);

      if (match) {
        btn.style.display = 'flex';
        visibleCount++;
      } else {
        btn.style.display = 'none';
      }
    });

    let noMatch = document.getElementById('langNoMatch');
    if (visibleCount === 0) {
      if (!noMatch) {
        noMatch = document.createElement('div');
        noMatch.id = 'langNoMatch';
        noMatch.className = 'lang-no-match';
        noMatch.textContent = 'No language found matching search.';
        list.appendChild(noMatch);
      }
      noMatch.style.display = 'block';
    } else if (noMatch) {
      noMatch.style.display = 'none';
    }
  }

  function applyLanguage(langCode) {
    if (langCode === 'en') {
      deleteCookie('googtrans');
      localStorage.removeItem('tm_user_lang');
      window.location.reload();
      return;
    }

    setCookie('googtrans', `/en/${langCode}`);
    localStorage.setItem('tm_user_lang', langCode);

    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = langCode;
      combo.dispatchEvent(new Event('change'));
      updateButtonUI(langCode);
    } else {
      window.location.reload();
    }
  }

  function updateButtonUI(langCode) {
    const langObj = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
    const globe = document.querySelector('.lang-btn-globe');
    const textFull = document.querySelector('.lang-btn-text-full');
    if (globe) globe.textContent = langObj.flag;
    if (textFull) textFull.textContent = langObj.native;

    const list = document.getElementById('langItemsList');
    if (list) {
      list.querySelectorAll('.lang-item-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === langCode) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initGoogleScript();
      mountLanguageSelector();
    });
  } else {
    initGoogleScript();
    mountLanguageSelector();
  }

})();
