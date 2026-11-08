/**
 * StreamVault — YouTube Views & AdSense Revenue Calculator Engine
 * 100% Client-Side Pure AdSense Financial Modeling
 * Factoring:
 * - Creator 55% Net Take vs Gross Advertiser Spend
 * - Watch-time Mid-roll Multipliers (Shorts vs <8m vs 8-15m vs 15m+)
 * - 15 Industry Niche CPM Benchmarks
 * - Geographic Country Tiers (Tier 1 vs Tier 2 vs Tier 3)
 * - Seasonality (Q4 Holiday Surge vs Q1 Dip)
 */

(function () {
  'use strict';

  const API_BASE = 'https://shubhamsain858-kickcuttr-api.hf.space/api/youtube';

  // ─────────────────────────────────────────────
  // FINANCIAL BENCHMARKS & CONVERSIONS
  // ─────────────────────────────────────────────

  const USD_TO_INR = 86.85;

  const CURRENCY_RATES_TO_INR = {
    "INR": 1.0,
    "USD": 86.85,
    "EUR": 94.20,
    "GBP": 110.50,
    "CAD": 63.80,
    "AUD": 56.50,
    "SGD": 64.80,
    "AED": 23.65,
    "SAR": 23.15,
    "BRL": 15.20,
    "JPY": 0.58,
    "KRW": 0.063,
    "NZD": 51.50,
    "HKD": 11.15,
    "TWD": 2.70,
    "PHP": 1.50,
    "PKR": 0.31,
    "BDT": 0.72,
    "RUB": 0.90,
    "TRY": 2.50,
    "PLN": 21.80,
    "MXN": 4.30,
    "IDR": 0.0055,
    "THB": 2.45,
    "VND": 0.0034
  };

  const CURRENCY_METADATA = {
    "INR": { name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", decimals: 0 },
    "USD": { name: "US Dollar", symbol: "$", flag: "🇺🇸", decimals: 2 },
    "EUR": { name: "Euro", symbol: "€", flag: "🇪🇺", decimals: 2 },
    "GBP": { name: "British Pound", symbol: "£", flag: "🇬🇧", decimals: 2 },
    "CAD": { name: "Canadian Dollar", symbol: "C$", flag: "🇨🇦", decimals: 2 },
    "AUD": { name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", decimals: 2 },
    "SGD": { name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", decimals: 2 },
    "AED": { name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", decimals: 2 },
    "SAR": { name: "Saudi Riyal", symbol: "SR", flag: "🇸🇦", decimals: 2 },
    "BRL": { name: "Brazilian Real", symbol: "R$", flag: "🇧🇷", decimals: 2 },
    "JPY": { name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", decimals: 0 },
    "KRW": { name: "South Korean Won", symbol: "₩", flag: "🇰🇷", decimals: 0 },
    "PHP": { name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", decimals: 2 },
    "PKR": { name: "Pakistani Rupee", symbol: "Rs", flag: "🇵🇰", decimals: 0 },
    "BDT": { name: "Bangladeshi Taka", symbol: "৳", flag: "🇧🇩", decimals: 0 },
    "RUB": { name: "Russian Ruble", symbol: "₽", flag: "🇷🇺", decimals: 0 },
    "TRY": { name: "Turkish Lira", symbol: "₺", flag: "🇹🇷", decimals: 2 },
    "PLN": { name: "Polish Zloty", symbol: "zł", flag: "🇵🇱", decimals: 2 },
    "MXN": { name: "Mexican Peso", symbol: "Mex$", flag: "🇲🇽", decimals: 2 },
    "IDR": { name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩", decimals: 0 },
    "THB": { name: "Thai Baht", symbol: "฿", flag: "🇹🇭", decimals: 2 },
    "VND": { name: "Vietnamese Dong", symbol: "₫", flag: "🇻🇳", decimals: 0 }
  };

  /**
   * Base Long-Form RPM Matrix (USD per 1,000 views) for standard <8m video.
   * Grounded in YouTube AdSense empirical creator data.
   */
  const NICHE_MATRIX = {
    finance: {
      name: "Finance, Investing & Crypto",
      icon: "💰",
      tier1: 18.50,
      tier2: 7.50,
      tier3: 1.80,
      global: 7.00
    },
    business: {
      name: "Business, SaaS & Marketing",
      icon: "💼",
      tier1: 14.00,
      tier2: 6.00,
      tier3: 1.40,
      global: 5.50
    },
    real_estate: {
      name: "Real Estate & Architecture",
      icon: "🏢",
      tier1: 12.50,
      tier2: 5.50,
      tier3: 1.20,
      global: 5.00
    },
    tech: {
      name: "Technology, AI & Software",
      icon: "💻",
      tier1: 9.50,
      tier2: 4.20,
      tier3: 1.10,
      global: 4.00
    },
    education: {
      name: "Education, Science & Tutorials",
      icon: "🎓",
      tier1: 6.50,
      tier2: 3.00,
      tier3: 0.80,
      global: 2.80
    },
    automotive: {
      name: "Automotive & Cars",
      icon: "🏎️",
      tier1: 7.00,
      tier2: 3.20,
      tier3: 0.85,
      global: 3.00
    },
    fitness: {
      name: "Health, Fitness & Medical",
      icon: "🏋️",
      tier1: 5.50,
      tier2: 2.60,
      tier3: 0.70,
      global: 2.40
    },
    travel: {
      name: "Travel & Tourism",
      icon: "✈️",
      tier1: 5.00,
      tier2: 2.40,
      tier3: 0.65,
      global: 2.20
    },
    beauty: {
      name: "Beauty, Fashion & Makeup",
      icon: "💄",
      tier1: 4.50,
      tier2: 2.20,
      tier3: 0.60,
      global: 2.00
    },
    food: {
      name: "Food & Cooking",
      icon: "🍳",
      tier1: 4.00,
      tier2: 2.00,
      tier3: 0.55,
      global: 1.80
    },
    gaming: {
      name: "Gaming & Esports",
      icon: "🎮",
      tier1: 3.20,
      tier2: 1.60,
      tier3: 0.45,
      global: 1.40
    },
    entertainment: {
      name: "Entertainment & Comedy",
      icon: "🎭",
      tier1: 2.80,
      tier2: 1.40,
      tier3: 0.40,
      global: 1.20
    },
    vlogs: {
      name: "Vlogs & Daily Life",
      icon: "📸",
      tier1: 2.60,
      tier2: 1.30,
      tier3: 0.35,
      global: 1.10
    },
    music: {
      name: "Music & Songs",
      icon: "🎵",
      tier1: 1.40,
      tier2: 0.70,
      tier3: 0.22,
      global: 0.65
    },
    kids: {
      name: "Kids & Animation (COPPA)",
      icon: "🧸",
      tier1: 0.90,
      tier2: 0.45,
      tier3: 0.18,
      global: 0.40
    }
  };

  /**
   * YouTube Shorts Creator Pool RPMs (USD per 1,000 views)
   */
  const SHORTS_RPM_MATRIX = {
    tier1: 0.050, // $50 per 1M views
    tier2: 0.032, // $32 per 1M views
    tier3: 0.015, // $15 per 1M views (~Rs. 1,300 per 1M views)
    global: 0.028 // $28 per 1M views
  };

  /**
   * Duration & Format Multipliers (vs standard <8m baseline)
   */
  const FORMAT_MULTIPLIERS = {
    shorts: 1.0,           // Uses SHORTS_RPM_MATRIX
    under_8m: 1.0,         // Baseline (pre-roll / post-roll only)
    midroll_8_15m: 1.55,   // +55% from 2-3 mid-roll ads
    extended_15_30m: 2.15, // +115% from 3-5 mid-roll ads
    stream_30m_plus: 2.60  // +160% from continuous stream/podcast ad breaks
  };

  /**
   * Seasonality Adjustments
   */
  const SEASONALITY_MULTIPLIERS = {
    standard: 1.0, // Q2, Q3
    q4: 1.40,     // Q4 Holiday peak (+40% ad competition)
    q1: 0.80      // Q1 Post-holiday dip (-20% ad spending)
  };

  // ─────────────────────────────────────────────
  // APPLICATION STATE
  // ─────────────────────────────────────────────

  const state = {
    activeMode: 'video', // 'video' or 'channel'
    currency: localStorage.getItem('streamvault_currency') || 'INR',
    theme: localStorage.getItem('theme') || 'dark',

    // Video Mode State
    video: {
      views: 100000,
      format: 'midroll_8_15m',
      niche: 'gaming',
      tier: 'tier3',
      season: 'standard',
      fetchedData: null,
      autoDetectedNiche: null
    },

    // Channel Mode State
    channel: {
      monthlyViews: 1000000,
      shortsRatio: 30, // 30% Shorts, 70% Long-form
      niche: 'gaming',
      tier: 'tier3',
      fetchedData: null,
      autoDetectedNiche: null
    },

    // Current Active Calculation Output
    currentCalc: null
  };

  // ─────────────────────────────────────────────
  // DOM ELEMENTS
  // ─────────────────────────────────────────────

  const el = {
    // Theme & Currency
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    themeText: document.getElementById('themeText'),
    currBtns: document.querySelectorAll('.curr-btn[data-curr]'),
    moreCurrencySelect: document.getElementById('moreCurrencySelect'),

    // Mode Tabs & Panels
    tabVideoMode: document.getElementById('tabVideoMode'),
    tabChannelMode: document.getElementById('tabChannelMode'),
    panelVideo: document.getElementById('panel-video'),
    panelChannel: document.getElementById('panel-channel'),
    modeBannerTitle: document.getElementById('modeBannerTitle'),
    modeBannerDesc: document.getElementById('modeBannerDesc'),
    modeBannerIcon: document.getElementById('modeBannerIcon'),

    // Video Mode Inputs
    videoUrlInput: document.getElementById('videoUrlInput'),
    pasteVideoBtn: document.getElementById('pasteVideoBtn'),
    fetchVideoBtn: document.getElementById('fetchVideoBtn'),
    videoErrorMsg: document.getElementById('videoErrorMsg'),
    fetchedVideoCard: document.getElementById('fetchedVideoCard'),
    videoThumbImg: document.getElementById('videoThumbImg'),
    videoDurationBadge: document.getElementById('videoDurationBadge'),
    videoTitleDisplay: document.getElementById('videoTitleDisplay'),
    videoChannelDisplay: document.getElementById('videoChannelDisplay'),
    videoSubsDisplay: document.getElementById('videoSubsDisplay'),
    videoViewsDisplay: document.getElementById('videoViewsDisplay'),
    videoAutoNicheBadge: document.getElementById('videoAutoNicheBadge'),
    videoFormatBadge: document.getElementById('videoFormatBadge'),
    autoNicheTag: document.getElementById('autoNicheTag'),

    viewsInput: document.getElementById('viewsInput'),
    viewsSlider: document.getElementById('viewsSlider'),
    formatBtns: document.querySelectorAll('.format-btn[data-format]'),
    formatMultiplierHint: document.getElementById('formatMultiplierHint'),
    nicheSelect: document.getElementById('nicheSelect'),
    tierSelect: document.getElementById('tierSelect'),
    seasonSelect: document.getElementById('seasonSelect'),
    videoPresetPills: document.querySelectorAll('.preset-pill:not(.channel-preset)'),

    // Channel Mode Inputs
    channelInput: document.getElementById('channelInput'),
    pasteChannelBtn: document.getElementById('pasteChannelBtn'),
    fetchChannelBtn: document.getElementById('fetchChannelBtn'),
    channelErrorMsg: document.getElementById('channelErrorMsg'),
    fetchedChannelCard: document.getElementById('fetchedChannelCard'),
    channelAvatarImg: document.getElementById('channelAvatarImg'),
    channelTitleDisplay: document.getElementById('channelTitleDisplay'),
    channelHandleDisplay: document.getElementById('channelHandleDisplay'),
    channelAutoNicheBadge: document.getElementById('channelAutoNicheBadge'),
    channelSubsDisplay: document.getElementById('channelSubsDisplay'),
    channelLifetimeViewsDisplay: document.getElementById('channelLifetimeViewsDisplay'),
    channelVideosDisplay: document.getElementById('channelVideosDisplay'),
    channelJoinedDisplay: document.getElementById('channelJoinedDisplay'),

    channelMonthlyViewsInput: document.getElementById('channelMonthlyViewsInput'),
    channelMonthlyViewsSlider: document.getElementById('channelMonthlyViewsSlider'),
    shortsRatioSlider: document.getElementById('shortsRatioSlider'),
    ratioBarShorts: document.getElementById('ratioBarShorts'),
    ratioBarLong: document.getElementById('ratioBarLong'),
    ratioHint: document.getElementById('ratioHint'),
    channelNicheSelect: document.getElementById('channelNicheSelect'),
    channelTierSelect: document.getElementById('channelTierSelect'),
    channelPresetPills: document.querySelectorAll('.channel-preset'),

    // Results KPI Cards
    resultsHeadingText: document.getElementById('resultsHeadingText'),
    kpiNetVal: document.getElementById('kpiNetVal'),
    kpiNetSub: document.getElementById('kpiNetSub'),
    kpiGrossVal: document.getElementById('kpiGrossVal'),
    kpiGrossSub: document.getElementById('kpiGrossSub'),
    kpiRpmVal: document.getElementById('kpiRpmVal'),
    kpiRpmSub: document.getElementById('kpiRpmSub'),
    kpiCpmVal: document.getElementById('kpiCpmVal'),
    kpiCpmSub: document.getElementById('kpiCpmSub'),

    // Channel Projections
    channelProjectionsCard: document.getElementById('channelProjectionsCard'),
    projMonthlyViewsBadge: document.getElementById('projMonthlyViewsBadge'),
    projDailyVal: document.getElementById('projDailyVal'),
    projMonthlyVal: document.getElementById('projMonthlyVal'),
    projYearlyVal: document.getElementById('projYearlyVal'),
    projLifetimeVal: document.getElementById('projLifetimeVal'),
    projLifetimeSub: document.getElementById('projLifetimeSub'),

    // Scenarios
    scenarioLowVal: document.getElementById('scenarioLowVal'),
    scenarioLowRpm: document.getElementById('scenarioLowRpm'),
    scenarioBaseVal: document.getElementById('scenarioBaseVal'),
    scenarioBaseRpm: document.getElementById('scenarioBaseRpm'),
    scenarioHighVal: document.getElementById('scenarioHighVal'),
    scenarioHighRpm: document.getElementById('scenarioHighRpm'),

    // Insights
    monetizedViewsNum: document.getElementById('monetizedViewsNum'),
    nonMonetizedViewsNum: document.getElementById('nonMonetizedViewsNum'),
    leverageBoostVal: document.getElementById('leverageBoostVal'),
    leverageBoostLbl: document.getElementById('leverageBoostLbl'),
    leverageExplainText: document.getElementById('leverageExplainText'),

    // Exporters & Toast
    btnExportExcel: document.getElementById('btnExportExcel'),
    btnExportTxt: document.getElementById('btnExportTxt'),
    btnCopySummary: document.getElementById('btnCopySummary'),
    toast: document.getElementById('toast')
  };

  // ─────────────────────────────────────────────
  // FINANCIAL CALCULATION CORE
  // ─────────────────────────────────────────────

  /**
   * Converts USD to Selected Target Currency.
   */
  function convertUsdToSelected(amountUsd) {
    if (!amountUsd || isNaN(amountUsd)) return 0;
    const curr = state.currency || 'INR';
    // 1. USD to INR
    const inr = amountUsd * USD_TO_INR;
    // 2. INR to Target Currency
    const targetRate = CURRENCY_RATES_TO_INR[curr] || 1.0;
    return inr / targetRate;
  }

  /**
   * Formats a monetary number in the active currency with its native symbol.
   */
  function formatMoney(amountUsd, forceDecimals = null) {
    const converted = convertUsdToSelected(amountUsd);
    const curr = state.currency || 'INR';
    const meta = CURRENCY_METADATA[curr] || { symbol: curr + ' ', decimals: 2 };
    
    let decimals = forceDecimals !== null ? forceDecimals : meta.decimals;
    if (converted >= 100000 && decimals > 0) decimals = 0; // Clean integer for large figures

    const formattedNum = converted.toLocaleString(curr === 'INR' ? 'en-IN' : 'en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return `${meta.symbol}${formattedNum}`;
  }

  /**
   * Formats pure numeric view counts (e.g. 100,000 or 1.2M)
   */
  function formatViews(n) {
    if (!n || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US');
  }

  /**
   * Parses formatted view string e.g. "100,000" or "1.5M" to number.
   */
  function parseViewsString(str) {
    if (!str) return 0;
    const clean = String(str).trim();
    const m = clean.match(/([\d,]+(?:\.\d+)?)\s*([kKmMbB])?/);
    if (!m) return 0;
    const base = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(base)) return 0;
    const unit = (m[2] || '').toUpperCase();
    if (unit === 'B') return Math.round(base * 1000000000);
    if (unit === 'M') return Math.round(base * 1000000);
    if (unit === 'K') return Math.round(base * 1000);
    return Math.round(base);
  }

  /**
   * Calculates Single Video AdSense Financials
   */
  function calculateVideoRevenue() {
    const v = state.video;
    const views = Math.max(1, v.views);
    const isShorts = v.format === 'shorts';
    const nicheData = NICHE_MATRIX[v.niche] || NICHE_MATRIX.gaming;
    const seasonMult = SEASONALITY_MULTIPLIERS[v.season] || 1.0;

    let baseRpmUsd = 0;
    let formatMult = 1.0;
    let effectiveRpmUsd = 0;

    if (isShorts) {
      // Shorts use Creator Pool model
      baseRpmUsd = SHORTS_RPM_MATRIX[v.tier] || SHORTS_RPM_MATRIX.tier3;
      formatMult = 1.0;
      effectiveRpmUsd = baseRpmUsd * seasonMult;
    } else {
      // Long-Form auction CPM model
      baseRpmUsd = nicheData[v.tier] || nicheData.tier3;
      formatMult = FORMAT_MULTIPLIERS[v.format] || 1.0;
      effectiveRpmUsd = baseRpmUsd * formatMult * seasonMult;
    }

    // Net Creator Revenue (Take-Home)
    const netRevenueUsd = (views / 1000) * effectiveRpmUsd;

    // Gross Advertiser Spend:
    // Long-Form: YouTube takes 45% -> Creator receives 55% -> Gross = Net / 0.55
    // Shorts: Creator Pool receives 45% -> Gross = Net / 0.45
    const creatorCutRatio = isShorts ? 0.45 : 0.55;
    const grossSpendUsd = netRevenueUsd / creatorCutRatio;

    // Monetization Fill Rate (~52% average for standard long-form, ~65% for Shorts)
    const fillRate = isShorts ? 0.65 : 0.52;
    const monetizedViews = Math.round(views * fillRate);
    const nonMonetizedViews = views - monetizedViews;

    // Effective Gross CPM = (Gross Spend / Monetized Views) * 1000
    const grossCpmUsd = (grossSpendUsd / monetizedViews) * 1000;

    // 3 Scenarios
    // Bear: -28% lower fill & retention
    // Base: 1.0x
    // Bull: +38% peak Q4 & high retention
    const bearNetUsd = netRevenueUsd * 0.72;
    const bearRpmUsd = effectiveRpmUsd * 0.72;
    const bullNetUsd = netRevenueUsd * 1.38;
    const bullRpmUsd = effectiveRpmUsd * 1.38;

    return {
      mode: 'video',
      views: views,
      isShorts: isShorts,
      format: v.format,
      niche: v.niche,
      nicheName: nicheData.name,
      tier: v.tier,
      season: v.season,
      netRevenueUsd: netRevenueUsd,
      grossSpendUsd: grossSpendUsd,
      effectiveRpmUsd: effectiveRpmUsd,
      grossCpmUsd: grossCpmUsd,
      monetizedViews: monetizedViews,
      nonMonetizedViews: nonMonetizedViews,
      formatMult: formatMult,
      scenarios: {
        bearNetUsd,
        bearRpmUsd,
        baseNetUsd: netRevenueUsd,
        baseRpmUsd: effectiveRpmUsd,
        bullNetUsd,
        bullRpmUsd
      }
    };
  }

  /**
   * Calculates Full Channel AdSense Financials
   */
  function calculateChannelRevenue() {
    const c = state.channel;
    const monthlyViews = Math.max(1000, c.monthlyViews);
    const shortsPct = Math.min(100, Math.max(0, c.shortsRatio)) / 100;
    const longPct = 1 - shortsPct;

    const nicheData = NICHE_MATRIX[c.niche] || NICHE_MATRIX.gaming;
    const longBaseRpmUsd = (nicheData[c.tier] || nicheData.tier3) * 1.65; // Avg channel long video has ~1.65x midroll weight
    const shortsRpmUsd = SHORTS_RPM_MATRIX[c.tier] || SHORTS_RPM_MATRIX.tier3;

    // Weighted Blended Channel RPM
    const blendedRpmUsd = (shortsPct * shortsRpmUsd) + (longPct * longBaseRpmUsd);

    // Monthly & Daily Projections
    const monthlyNetUsd = (monthlyViews / 1000) * blendedRpmUsd;
    const dailyNetUsd = monthlyNetUsd / 30.416;
    const yearlyNetUsd = monthlyNetUsd * 12;

    // Gross Spend
    const grossSpendUsd = monthlyNetUsd / 0.54; // blended split ~54%

    // Effective CPM
    const monetizedViews = Math.round(monthlyViews * 0.55);
    const grossCpmUsd = (grossSpendUsd / monetizedViews) * 1000;

    // Lifetime Channel Revenue calculation if lifetime views available
    let lifetimeNetUsd = 0;
    let lifetimeViews = 0;
    if (c.fetchedData && c.fetchedData.total_views_count) {
      lifetimeViews = c.fetchedData.total_views_count;
      // Historical weighted RPM (conservative baseline across channel history)
      const histRpmUsd = Math.max(0.5, blendedRpmUsd * 0.85);
      lifetimeNetUsd = (lifetimeViews / 1000) * histRpmUsd;
    }

    // Scenarios
    const bearNetUsd = monthlyNetUsd * 0.72;
    const bearRpmUsd = blendedRpmUsd * 0.72;
    const bullNetUsd = monthlyNetUsd * 1.38;
    const bullRpmUsd = blendedRpmUsd * 1.38;

    return {
      mode: 'channel',
      monthlyViews: monthlyViews,
      shortsPct: Math.round(shortsPct * 100),
      longPct: Math.round(longPct * 100),
      niche: c.niche,
      nicheName: nicheData.name,
      tier: c.tier,
      dailyNetUsd,
      monthlyNetUsd,
      yearlyNetUsd,
      lifetimeNetUsd,
      lifetimeViews,
      grossSpendUsd,
      effectiveRpmUsd: blendedRpmUsd,
      grossCpmUsd,
      monetizedViews,
      scenarios: {
        bearNetUsd,
        bearRpmUsd,
        baseNetUsd: monthlyNetUsd,
        baseRpmUsd: blendedRpmUsd,
        bullNetUsd,
        bullRpmUsd
      }
    };
  }

  // ─────────────────────────────────────────────
  // UI RENDER ENGINE
  // ─────────────────────────────────────────────

  function renderResults() {
    const isChannel = state.activeMode === 'channel';
    const calc = isChannel ? calculateChannelRevenue() : calculateVideoRevenue();
    state.currentCalc = calc;

    // 1. Header and Subtitles
    if (isChannel) {
      el.resultsHeadingText.textContent = 'Projected Channel AdSense Trajectory & Earnings';
      el.kpiNetSub.textContent = 'Your estimated monthly in-pocket AdSense earnings';
      el.kpiGrossSub.textContent = 'Estimated monthly gross brand spend across your channel';
      el.channelProjectionsCard.style.display = 'block';

      // Monthly KPI Card
      el.kpiNetVal.textContent = formatMoney(calc.monthlyNetUsd);
      el.kpiGrossVal.textContent = formatMoney(calc.grossSpendUsd);
      el.kpiRpmVal.textContent = `${formatMoney(calc.effectiveRpmUsd, 2)} / 1K`;
      el.kpiCpmVal.textContent = `${formatMoney(calc.grossCpmUsd, 2)} CPM`;

      // Channel Projections Box
      el.projMonthlyViewsBadge.textContent = formatViews(calc.monthlyViews);
      el.projDailyVal.textContent = formatMoney(calc.dailyNetUsd);
      el.projMonthlyVal.textContent = formatMoney(calc.monthlyNetUsd);
      el.projYearlyVal.textContent = formatMoney(calc.yearlyNetUsd);

      if (calc.lifetimeViews > 0) {
        el.projLifetimeVal.textContent = formatMoney(calc.lifetimeNetUsd);
        el.projLifetimeSub.textContent = `From ${formatViews(calc.lifetimeViews)} lifetime views`;
      } else {
        el.projLifetimeVal.textContent = formatMoney(calc.yearlyNetUsd * 2.5);
        el.projLifetimeSub.textContent = `Estimated multi-year projection`;
      }

    } else {
      el.resultsHeadingText.textContent = 'Estimated Video AdSense Revenue & Analytics';
      el.kpiNetSub.textContent = "Your estimated in-pocket earnings after YouTube's cut";
      el.kpiGrossSub.textContent = 'Total money paid by advertisers to Google';
      el.channelProjectionsCard.style.display = 'none';

      // Single Video KPI Cards
      el.kpiNetVal.textContent = formatMoney(calc.netRevenueUsd);
      el.kpiGrossVal.textContent = formatMoney(calc.grossSpendUsd);
      el.kpiRpmVal.textContent = `${formatMoney(calc.effectiveRpmUsd, 2)} / 1K`;
      el.kpiCpmVal.textContent = `${formatMoney(calc.grossCpmUsd, 2)} CPM`;
    }

    // 2. Scenarios (Low / Base / High)
    el.scenarioLowVal.textContent = formatMoney(calc.scenarios.bearNetUsd);
    el.scenarioLowRpm.textContent = `${formatMoney(calc.scenarios.bearRpmUsd, 2)}`;

    el.scenarioBaseVal.textContent = formatMoney(calc.scenarios.baseNetUsd);
    el.scenarioBaseRpm.textContent = `${formatMoney(calc.scenarios.baseRpmUsd, 2)}`;

    el.scenarioHighVal.textContent = formatMoney(calc.scenarios.bullNetUsd);
    el.scenarioHighRpm.textContent = `${formatMoney(calc.scenarios.bullRpmUsd, 2)}`;

    // 3. Monetization Fill Rate Breakdown
    const totalViews = isChannel ? calc.monthlyViews : calc.views;
    const monViews = calc.monetizedViews;
    const nonMonViews = Math.max(0, totalViews - monViews);
    el.monetizedViewsNum.textContent = `${formatViews(monViews)} views`;
    el.nonMonetizedViewsNum.textContent = `${formatViews(nonMonViews)} views`;

    // 4. Format Leverage / Mid-Roll Boost
    if (isChannel) {
      el.leverageBoostVal.textContent = `${calc.longPct}% Long / ${calc.shortsPct}% Shorts`;
      el.leverageBoostLbl.textContent = 'Channel Views Ratio';
      el.leverageExplainText.textContent = `Long-form views generate full AdSense RPM (${formatMoney(calc.effectiveRpmUsd * 1.4, 2)}/1K), while Shorts views earn from the Creator Pool (~$0.02 - $0.05/1K).`;
    } else {
      if (calc.isShorts) {
        el.leverageBoostVal.textContent = 'Creator Pool';
        el.leverageBoostVal.className = 'leverage-val text-muted';
        el.leverageBoostLbl.textContent = 'Shorts Revenue Model';
        el.leverageExplainText.textContent = 'YouTube Shorts revenue is distributed from the Creator Pool based on your share of total platform views, rather than per-video auction CPM.';
      } else {
        const boostPct = Math.round((calc.formatMult - 1.0) * 100);
        if (boostPct > 0) {
          el.leverageBoostVal.textContent = `+${boostPct}%`;
          el.leverageBoostVal.className = 'leverage-val text-success';
          el.leverageBoostLbl.textContent = 'Extra Revenue from Mid-Roll Ads';
          el.leverageExplainText.textContent = 'Videos 8 minutes or longer allow multiple mid-roll ad breaks, dramatically increasing total ad impressions per viewer.';
        } else {
          el.leverageBoostVal.textContent = 'Baseline (1.0x)';
          el.leverageBoostVal.className = 'leverage-val';
          el.leverageBoostLbl.textContent = 'Pre & Post-Roll Only';
          el.leverageExplainText.textContent = 'Videos under 8 minutes are restricted to pre-roll and post-roll ads. Extend your videos past 8 minutes to unlock mid-rolls!';
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // AUTO-NICHE DETECTION (Client Heuristics)
  // ─────────────────────────────────────────────

  function detectNicheFromText(text) {
    if (!text) return 'gaming';
    const s = String(text).toLowerCase();

    if (/crypto|bitcoin|stocks|trading|invest|mutual fund|sip|share market|finance|options trading|money management|forex|wealth/.test(s)) {
      return 'finance';
    }
    if (/business|saas|marketing|entrepreneur|dropshipping|ecommerce|startup|sales|agency|freelancing|digital marketing/.test(s)) {
      return 'business';
    }
    if (/real estate|luxury home|mansion|property|house tour|apartment tour|mortgage|architecture/.test(s)) {
      return 'real_estate';
    }
    if (/tech|iphone|samsung|gadget|software|coding|python|javascript|ai |artificial intelligence|chatgpt|machine learning|unboxing|laptop|pc build/.test(s)) {
      return 'tech';
    }
    if (/tutorial|course|learn|how to|study|lecture|upsc|history|science|documentary|math|physics|lesson/.test(s)) {
      return 'education';
    }
    if (/workout|fitness|gym|bodybuilding|diet|protein|weight loss|fat loss|muscle|health|exercise/.test(s)) {
      return 'fitness';
    }
    if (/cars|supercars|bmw|mercedes|audi|porsche|automobile|bike|tuning|drag race|exhaust|superbike/.test(s)) {
      return 'automotive';
    }
    if (/travel|tourism|hotel review|flight|resort|explore|backpacking|vacation|trip/.test(s)) {
      return 'travel';
    }
    if (/recipe|cooking|street food|restaurant|food review|chef|baking|cake|mukbang|kitchen/.test(s)) {
      return 'food';
    }
    if (/makeup|skincare|beauty|fashion|outfit|haul|cosmetics|lipstick|haircare|styling/.test(s)) {
      return 'beauty';
    }
    if (/gaming|gameplay|bgmi|gta|minecraft|free fire|roblox|valorant|pubg|fortnite|streamer|esports/.test(s)) {
      return 'gaming';
    }
    if (/entertainment|comedy|prank|roast|skit|funny|react|standup/.test(s)) {
      return 'entertainment';
    }
    if (/daily vlog|vlog|family vlog|lifestyle|routine|my day|challenge/.test(s)) {
      return 'vlogs';
    }
    if (/music|official song|official audio|lyrics|cover song|music video|album|remix/.test(s)) {
      return 'music';
    }
    if (/kids|nursery rhymes|cocomelon|cartoon|toys|children|baby song/.test(s)) {
      return 'kids';
    }

    return 'entertainment';
  }

  // ─────────────────────────────────────────────
  // URL METADATA FETCHING (Dual-Engine: API + oEmbed)
  // ─────────────────────────────────────────────

  async function fetchVideoMetadata(inputUrl) {
    el.videoErrorMsg.style.display = 'none';
    el.fetchVideoBtn.disabled = true;
    el.fetchVideoBtn.querySelector('.btn-text').textContent = 'Fetching...';

    const vidMatch = inputUrl.match(/(?:v=|\/shorts\/|youtu\.be\/|\/live\/)([A-Za-z0-9_-]{11})/);
    const videoId = vidMatch ? vidMatch[1] : (inputUrl.length === 11 ? inputUrl : null);

    if (!videoId) {
      showError(el.videoErrorMsg, 'Please enter a valid YouTube video URL or 11-character video ID.');
      resetVideoBtn();
      return;
    }

    const isShortsUrl = inputUrl.includes('/shorts/');

    try {
      // 1. Try backend API endpoint first
      let data = null;
      try {
        const resp = await fetch(`${API_BASE}/video-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputUrl })
        });
        if (resp.ok) {
          data = await resp.json();
        }
      } catch (e) {
        console.warn('Backend API unavailable, falling back to oEmbed...', e);
      }

      // 2. Client-side oEmbed Fallback if API is offline
      if (!data || !data.success) {
        const oEmbedResp = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (!oEmbedResp.ok) throw new Error('Video not found or is private.');
        const oEmbedData = await oEmbedResp.json();

        const detected = detectNicheFromText(oEmbedData.title + ' ' + oEmbedData.author_name);
        data = {
          success: true,
          video_id: videoId,
          title: oEmbedData.title,
          thumbnail_url: oEmbedData.thumbnail_url,
          channel_title: oEmbedData.author_name,
          subscriber_count: 0,
          view_count: 100000,
          is_short: isShortsUrl,
          duration_formatted: isShortsUrl ? '0:50' : '10:00',
          format_type: isShortsUrl ? 'shorts' : 'midroll_8_15m',
          detected_niche: detected
        };
      }

      // Populate UI with fetched data
      state.video.fetchedData = data;
      el.fetchedVideoCard.style.display = 'flex';
      el.videoThumbImg.src = data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      el.videoDurationBadge.textContent = data.duration_formatted || (data.is_short ? 'Shorts' : '--:--');
      el.videoTitleDisplay.textContent = data.title;
      el.videoChannelDisplay.textContent = data.channel_title;
      el.videoSubsDisplay.textContent = data.subscriber_count ? `${formatViews(data.subscriber_count)} subscribers` : 'Creator';
      el.videoViewsDisplay.textContent = data.view_count ? `${formatViews(data.view_count)} views` : 'Active';

      // Niche auto-detection
      const niche = data.detected_niche || detectNicheFromText(data.title);
      state.video.niche = niche;
      el.nicheSelect.value = niche;
      const nicheName = NICHE_MATRIX[niche] ? NICHE_MATRIX[niche].name : niche;
      el.videoAutoNicheBadge.textContent = `✨ Auto-Detected: ${nicheName.split(',')[0]}`;
      el.autoNicheTag.style.display = 'inline-block';

      // Views input & slider sync
      const viewsToSet = data.view_count > 0 ? data.view_count : 100000;
      state.video.views = viewsToSet;
      el.viewsInput.value = formatViews(viewsToSet);
      el.viewsSlider.value = Math.min(10000000, viewsToSet);

      // Format selector sync
      const fmt = data.is_short ? 'shorts' : (data.format_type || 'midroll_8_15m');
      setFormat(fmt);

      showToast(`✨ Successfully imported video: "${data.title.substring(0, 35)}..."`);
      renderResults();

    } catch (err) {
      showError(el.videoErrorMsg, `Could not fetch video: ${err.message || 'Please check the URL.'}`);
    } finally {
      resetVideoBtn();
    }
  }

  function resetVideoBtn() {
    el.fetchVideoBtn.disabled = false;
    el.fetchVideoBtn.querySelector('.btn-text').textContent = 'Fetch & Auto-Fill';
  }

  async function fetchChannelMetadata(inputChannel) {
    el.channelErrorMsg.style.display = 'none';
    el.fetchChannelBtn.disabled = true;
    el.fetchChannelBtn.querySelector('.btn-text').textContent = 'Fetching...';

    if (!inputChannel.trim()) {
      showError(el.channelErrorMsg, 'Please enter a YouTube channel URL or @handle.');
      resetChannelBtn();
      return;
    }

    try {
      let data = null;
      try {
        const resp = await fetch(`${API_BASE}/channel-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: inputChannel })
        });
        if (resp.ok) {
          data = await resp.json();
        }
      } catch (e) {
        console.warn('Backend channel API unavailable...', e);
      }

      if (!data || !data.success) {
        throw new Error(data && data.error ? data.error : 'Could not fetch channel details. Please verify the handle/URL.');
      }

      state.channel.fetchedData = data;
      el.fetchedChannelCard.style.display = 'flex';
      el.channelAvatarImg.src = data.avatar_url || 'https://www.gstatic.com/youtube/img/creator/avatar/default_avatar.png';
      el.channelTitleDisplay.textContent = data.title;
      el.channelHandleDisplay.textContent = data.handle;
      el.channelSubsDisplay.textContent = data.subscribers_text || `${formatViews(data.subscribers_count)} subs`;
      el.channelLifetimeViewsDisplay.textContent = data.total_views_text || `${formatViews(data.total_views_count)} views`;
      el.channelVideosDisplay.textContent = data.videos_text || `${formatViews(data.videos_count)} uploads`;
      el.channelJoinedDisplay.textContent = data.joined_date || 'Active';

      // Niche
      const niche = data.detected_niche || detectNicheFromText(data.title + ' ' + (data.description || ''));
      state.channel.niche = niche;
      el.channelNicheSelect.value = niche;
      const nicheName = NICHE_MATRIX[niche] ? NICHE_MATRIX[niche].name : niche;
      el.channelAutoNicheBadge.textContent = `✨ Auto-Detected: ${nicheName.split(',')[0]}`;

      // Monthly views
      const estMonthly = data.estimated_monthly_views || 1000000;
      state.channel.monthlyViews = estMonthly;
      el.channelMonthlyViewsInput.value = formatViews(estMonthly);
      el.channelMonthlyViewsSlider.value = Math.min(50000000, estMonthly);

      showToast(`✨ Channel stats loaded for ${data.title}!`);
      renderResults();

    } catch (err) {
      showError(el.channelErrorMsg, `${err.message || 'Error fetching channel.'}`);
    } finally {
      resetChannelBtn();
    }
  }

  function resetChannelBtn() {
    el.fetchChannelBtn.disabled = false;
    el.fetchChannelBtn.querySelector('.btn-text').textContent = 'Fetch Channel Stats';
  }

  function showError(element, msg) {
    element.textContent = msg;
    element.style.display = 'block';
  }

  // ─────────────────────────────────────────────
  // EVENT LISTENERS & INTERACTION
  // ─────────────────────────────────────────────

  function setMode(mode) {
    state.activeMode = mode;
    if (mode === 'video') {
      el.tabVideoMode.classList.add('active');
      el.tabChannelMode.classList.remove('active');
      el.panelVideo.classList.add('active');
      el.panelChannel.classList.remove('active');
      el.modeBannerTitle.textContent = 'Single Video Mode:';
      el.modeBannerDesc.textContent = 'Enter a YouTube video URL or enter views manually to calculate take-home creator earnings, RPM, and gross advertiser spend based on duration and format.';
      el.modeBannerIcon.textContent = '📹';
    } else {
      el.tabChannelMode.classList.add('active');
      el.tabVideoMode.classList.remove('active');
      el.panelChannel.classList.add('active');
      el.panelVideo.classList.remove('active');
      el.modeBannerTitle.textContent = 'Full Channel Mode:';
      el.modeBannerDesc.textContent = 'Enter a YouTube channel link or @handle to estimate daily, monthly, yearly, and lifetime AdSense earnings with Shorts vs Long-form view ratios.';
      el.modeBannerIcon.textContent = '📊';
    }
    renderResults();
  }

  function setFormat(fmt) {
    state.video.format = fmt;
    el.formatBtns.forEach(btn => {
      if (btn.dataset.format === fmt) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const hints = {
      shorts: 'Creator Pool Model (~$0.02 – $0.06 RPM)',
      under_8m: 'Standard pre/post roll ads only (1.0x baseline)',
      midroll_8_15m: 'Mid-Rolls enabled! (+55% RPM boost)',
      extended_15_30m: '3–5 Mid-Rolls enabled! (+115% RPM boost)',
      stream_30m_plus: 'Continuous Stream/Podcast ads! (2.6x RPM boost)'
    };
    el.formatMultiplierHint.textContent = hints[fmt] || '';
    renderResults();
  }

  function bindEvents() {
    // Mode tabs
    el.tabVideoMode.addEventListener('click', () => setMode('video'));
    el.tabChannelMode.addEventListener('click', () => setMode('channel'));

    // Video Mode Controls
    el.pasteVideoBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          el.videoUrlInput.value = text.trim();
          fetchVideoMetadata(el.videoUrlInput.value);
        }
      } catch (e) {
        showToast('Clipboard access was denied. Please paste manually (Ctrl+V).');
      }
    });

    el.fetchVideoBtn.addEventListener('click', () => {
      fetchVideoMetadata(el.videoUrlInput.value);
    });

    el.videoUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fetchVideoMetadata(el.videoUrlInput.value);
    });

    // Views Slider & Direct Input Sync
    el.viewsSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.video.views = val;
      el.viewsInput.value = formatViews(val);
      updatePresetPills(val, el.videoPresetPills);
      renderResults();
    });

    el.viewsInput.addEventListener('input', (e) => {
      const parsed = parseViewsString(e.target.value);
      if (parsed > 0) {
        state.video.views = parsed;
        el.viewsSlider.value = Math.min(10000000, parsed);
        updatePresetPills(parsed, el.videoPresetPills);
        renderResults();
      }
    });

    el.viewsInput.addEventListener('blur', () => {
      el.viewsInput.value = formatViews(state.video.views);
    });

    // Preset Pills
    el.videoPresetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const val = parseInt(pill.dataset.val, 10);
        state.video.views = val;
        el.viewsInput.value = formatViews(val);
        el.viewsSlider.value = Math.min(10000000, val);
        updatePresetPills(val, el.videoPresetPills);
        renderResults();
      });
    });

    // Format buttons
    el.formatBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setFormat(btn.dataset.format);
      });
    });

    // Niche, Tier, Season Selects
    el.nicheSelect.addEventListener('change', (e) => {
      state.video.niche = e.target.value;
      renderResults();
    });

    el.tierSelect.addEventListener('change', (e) => {
      state.video.tier = e.target.value;
      renderResults();
    });

    el.seasonSelect.addEventListener('change', (e) => {
      state.video.season = e.target.value;
      renderResults();
    });

    // Channel Mode Controls
    el.pasteChannelBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          el.channelInput.value = text.trim();
          fetchChannelMetadata(el.channelInput.value);
        }
      } catch (e) {
        showToast('Clipboard access was denied. Please paste manually (Ctrl+V).');
      }
    });

    el.fetchChannelBtn.addEventListener('click', () => {
      fetchChannelMetadata(el.channelInput.value);
    });

    el.channelInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') fetchChannelMetadata(el.channelInput.value);
    });

    el.channelMonthlyViewsSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.channel.monthlyViews = val;
      el.channelMonthlyViewsInput.value = formatViews(val);
      updatePresetPills(val, el.channelPresetPills);
      renderResults();
    });

    el.channelMonthlyViewsInput.addEventListener('input', (e) => {
      const parsed = parseViewsString(e.target.value);
      if (parsed > 0) {
        state.channel.monthlyViews = parsed;
        el.channelMonthlyViewsSlider.value = Math.min(50000000, parsed);
        updatePresetPills(parsed, el.channelPresetPills);
        renderResults();
      }
    });

    el.channelMonthlyViewsInput.addEventListener('blur', () => {
      el.channelMonthlyViewsInput.value = formatViews(state.channel.monthlyViews);
    });

    el.channelPresetPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const val = parseInt(pill.dataset.val, 10);
        state.channel.monthlyViews = val;
        el.channelMonthlyViewsInput.value = formatViews(val);
        el.channelMonthlyViewsSlider.value = Math.min(50000000, val);
        updatePresetPills(val, el.channelPresetPills);
        renderResults();
      });
    });

    // Shorts vs Long-Form Ratio Slider
    el.shortsRatioSlider.addEventListener('input', (e) => {
      const shortsVal = parseInt(e.target.value, 10);
      const longVal = 100 - shortsVal;
      state.channel.shortsRatio = shortsVal;

      el.ratioBarShorts.style.width = `${shortsVal}%`;
      el.ratioBarShorts.querySelector('span').textContent = `${shortsVal}% Shorts`;
      el.ratioBarLong.style.width = `${longVal}%`;
      el.ratioBarLong.querySelector('span').textContent = `${longVal}% Long Videos`;
      el.ratioHint.textContent = `${shortsVal}% Shorts / ${longVal}% Long-Form`;

      renderResults();
    });

    el.channelNicheSelect.addEventListener('change', (e) => {
      state.channel.niche = e.target.value;
      renderResults();
    });

    el.channelTierSelect.addEventListener('change', (e) => {
      state.channel.tier = e.target.value;
      renderResults();
    });

    // Currency Switcher
    el.currBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setCurrency(btn.dataset.curr);
      });
    });

    el.moreCurrencySelect.addEventListener('change', (e) => {
      if (e.target.value) {
        setCurrency(e.target.value);
      }
    });

    // Theme Toggle
    el.themeToggleBtn.addEventListener('click', toggleTheme);

    // Export Buttons
    el.btnExportExcel.addEventListener('click', exportExcel);
    el.btnExportTxt.addEventListener('click', exportTxt);
    el.btnCopySummary.addEventListener('click', copySummary);
  }

  function updatePresetPills(currentVal, pillsList) {
    pillsList.forEach(p => {
      if (parseInt(p.dataset.val, 10) === currentVal) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  function setCurrency(curr) {
    state.currency = curr;
    localStorage.setItem('streamvault_currency', curr);

    // Update active currency button style
    el.currBtns.forEach(b => {
      if (b.dataset.curr === curr) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    const isTopThree = ['INR', 'USD', 'EUR'].includes(curr);
    if (!isTopThree) {
      el.moreCurrencySelect.value = curr;
    } else {
      el.moreCurrencySelect.selectedIndex = 0;
    }

    renderResults();
    showToast(`Currency changed to ${curr} (${CURRENCY_METADATA[curr]?.symbol || curr})`);
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', state.theme);
    applyTheme();
  }

  function applyTheme() {
    if (state.theme === 'light') {
      document.body.classList.add('light-mode');
      el.sunIcon.style.display = 'none';
      el.moonIcon.style.display = 'inline-block';
      el.themeText.textContent = 'Dark';
    } else {
      document.body.classList.remove('light-mode');
      el.sunIcon.style.display = 'inline-block';
      el.moonIcon.style.display = 'none';
      el.themeText.textContent = 'Light';
    }
  }

  function showToast(msg) {
    if (!el.toast) return;
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(el.toast._timer);
    el.toast._timer = setTimeout(() => {
      el.toast.classList.remove('show');
    }, 3200);
  }

  // ─────────────────────────────────────────────
  // EXPORT REPORTS SUITE
  // ─────────────────────────────────────────────

  function exportExcel() {
    const calc = state.currentCalc || calculateVideoRevenue();
    const isChannel = state.activeMode === 'channel';
    const dateStr = new Date().toISOString().split('T')[0];

    let content = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#E50914" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Title"><Font ss:Bold="1" ss:Size="14"/></Style>
  <Style ss:ID="Highlight"><Font ss:Bold="1" ss:Color="#00875A"/></Style>
 </Styles>
 <Worksheet ss:Name="AdSense Revenue Projection">
  <Table>
   <Row><Cell ss:StyleID="Title"><Data ss:Type="String">StreamVault YouTube AdSense Financial Projection</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Generated: ${dateStr}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Calculation Mode: ${isChannel ? 'Full Channel AdSense' : 'Single Video Revenue'}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Niche / Category: ${calc.nicheName}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Audience Tier: ${calc.tier.toUpperCase()}</Data></Cell></Row>
   <Row></Row>
   <Row ss:StyleID="Header">
    <Cell><Data ss:Type="String">Metric Description</Data></Cell>
    <Cell><Data ss:Type="String">Value</Data></Cell>
    <Cell><Data ss:Type="String">Currency / Unit</Data></Cell>
   </Row>`;

    if (isChannel) {
      content += `
   <Row><Cell><Data ss:Type="String">Monthly Channel Views</Data></Cell><Cell><Data ss:Type="Number">${calc.monthlyViews}</Data></Cell><Cell><Data ss:Type="String">views/mo</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Shorts Views Share</Data></Cell><Cell><Data ss:Type="String">${calc.shortsPct}%</Data></Cell><Cell><Data ss:Type="String">Share</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Long-Form Views Share</Data></Cell><Cell><Data ss:Type="String">${calc.longPct}%</Data></Cell><Cell><Data ss:Type="String">Share</Data></Cell></Row>
   <Row ss:StyleID="Highlight"><Cell><Data ss:Type="String">Estimated Monthly Creator Take (55%)</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.monthlyNetUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>
   <Row ss:StyleID="Highlight"><Cell><Data ss:Type="String">Estimated Yearly Creator Revenue</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.yearlyNetUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Estimated Daily Creator Earnings</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.dailyNetUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Effective Channel RPM</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.effectiveRpmUsd, 2)}</Data></Cell><Cell><Data ss:Type="String">per 1K views</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Gross Advertiser Spend</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.grossSpendUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Conservative Scenario (Bear)</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.scenarios.bearNetUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}/mo</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Optimistic Scenario (Peak Q4)</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.scenarios.bullNetUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}/mo</Data></Cell></Row>`;
    } else {
      content += `
   <Row><Cell><Data ss:Type="String">Total Video Views</Data></Cell><Cell><Data ss:Type="Number">${calc.views}</Data></Cell><Cell><Data ss:Type="String">views</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Video Format</Data></Cell><Cell><Data ss:Type="String">${calc.format}</Data></Cell><Cell><Data ss:Type="String">Type</Data></Cell></Row>
   <Row ss:StyleID="Highlight"><Cell><Data ss:Type="String">Estimated Net Creator Take (55%)</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.netRevenueUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Effective RPM</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.effectiveRpmUsd, 2)}</Data></Cell><Cell><Data ss:Type="String">per 1K views</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Effective CPM</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.grossCpmUsd, 2)}</Data></Cell><Cell><Data ss:Type="String">per 1K ad views</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Gross Advertiser Spend (100%)</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.grossSpendUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Monetized Playbacks (~52%)</Data></Cell><Cell><Data ss:Type="Number">${calc.monetizedViews}</Data></Cell><Cell><Data ss:Type="String">impressions</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Conservative Scenario (Low)</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.scenarios.bearNetUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>
   <Row><Cell><Data ss:Type="String">Optimistic Scenario (Q4 Surge)</Data></Cell><Cell><Data ss:Type="String">${formatMoney(calc.scenarios.bullNetUsd)}</Data></Cell><Cell><Data ss:Type="String">${state.currency}</Data></Cell></Row>`;
    }

    content += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YouTube_AdSense_Revenue_${dateStr}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📊 Excel financial projection downloaded!');
  }

  function exportTxt() {
    const calc = state.currentCalc || calculateVideoRevenue();
    const isChannel = state.activeMode === 'channel';
    const dateStr = new Date().toISOString().split('T')[0];

    let txt = `========================================================\n`;
    txt += `  STREAMVAULT YOUTUBE ADSENSE REVENUE REPORT\n`;
    txt += `  Date: ${dateStr}\n`;
    txt += `  Mode: ${isChannel ? 'Full Channel AdSense Projection' : 'Single Video Revenue'}\n`;
    txt += `  Niche: ${calc.nicheName}\n`;
    txt += `  Audience Geography: ${calc.tier.toUpperCase()}\n`;
    txt += `========================================================\n\n`;

    if (isChannel) {
      txt += `MONTHLY METRICS:\n`;
      txt += `  - Monthly Views: ${formatViews(calc.monthlyViews)}\n`;
      txt += `  - Shorts / Long Ratio: ${calc.shortsPct}% Shorts / ${calc.longPct}% Long-form\n`;
      txt += `  - Estimated Net Monthly Revenue: ${formatMoney(calc.monthlyNetUsd)}\n`;
      txt += `  - Estimated Net Daily Revenue: ${formatMoney(calc.dailyNetUsd)}\n`;
      txt += `  - Projected Yearly Revenue: ${formatMoney(calc.yearlyNetUsd)}\n`;
      txt += `  - Effective Channel RPM: ${formatMoney(calc.effectiveRpmUsd, 2)} per 1K views\n`;
      txt += `  - Gross Advertiser Spend: ${formatMoney(calc.grossSpendUsd)}\n\n`;
      txt += `SCENARIOS (LOW / BASE / HIGH):\n`;
      txt += `  - Conservative (Bear): ${formatMoney(calc.scenarios.bearNetUsd)} / mo\n`;
      txt += `  - Realistic (Base):    ${formatMoney(calc.scenarios.baseNetUsd)} / mo\n`;
      txt += `  - Optimistic (Peak):   ${formatMoney(calc.scenarios.bullNetUsd)} / mo\n`;
    } else {
      txt += `VIDEO METRICS:\n`;
      txt += `  - Total Video Views: ${formatViews(calc.views)}\n`;
      txt += `  - Format: ${calc.format} (${calc.isShorts ? 'Creator Pool' : 'Mid-roll Auction'})\n`;
      txt += `  - Estimated Net Creator Take (55%): ${formatMoney(calc.netRevenueUsd)}\n`;
      txt += `  - Gross Advertiser Spend (100%):   ${formatMoney(calc.grossSpendUsd)}\n`;
      txt += `  - Effective RPM:                   ${formatMoney(calc.effectiveRpmUsd, 2)} per 1K views\n`;
      txt += `  - Effective Gross CPM:             ${formatMoney(calc.grossCpmUsd, 2)} per 1K ad views\n`;
      txt += `  - Monetized Playbacks (~52%):      ${formatViews(calc.monetizedViews)}\n\n`;
      txt += `SCENARIOS:\n`;
      txt += `  - Conservative (Bear): ${formatMoney(calc.scenarios.bearNetUsd)}\n`;
      txt += `  - Realistic (Base):    ${formatMoney(calc.scenarios.baseNetUsd)}\n`;
      txt += `  - Optimistic (Bull):   ${formatMoney(calc.scenarios.bullNetUsd)}\n`;
    }

    txt += `\n========================================================\n`;
    txt += `Generated via StreamVault AdSense Intelligence Engine\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `YouTube_AdSense_Revenue_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📝 Notepad report downloaded!');
  }

  function copySummary() {
    const calc = state.currentCalc || calculateVideoRevenue();
    const isChannel = state.activeMode === 'channel';

    let md = '';
    if (isChannel) {
      md = `📊 **YouTube Channel AdSense Projection** (${calc.nicheName})\n` +
           `• **Monthly Views:** ${formatViews(calc.monthlyViews)} (${calc.shortsPct}% Shorts / ${calc.longPct}% Long-form)\n` +
           `• **Estimated Monthly Net Take:** ${formatMoney(calc.monthlyNetUsd)}\n` +
           `• **Projected Yearly Net:** ${formatMoney(calc.yearlyNetUsd)}\n` +
           `• **Effective Channel RPM:** ${formatMoney(calc.effectiveRpmUsd, 2)} / 1K views\n` +
           `• **Gross Brand Spend:** ${formatMoney(calc.grossSpendUsd)}\n` +
           `• **Scenarios:** Low ${formatMoney(calc.scenarios.bearNetUsd)} | Base ${formatMoney(calc.scenarios.baseNetUsd)} | Peak Q4 ${formatMoney(calc.scenarios.bullNetUsd)}`;
    } else {
      md = `📹 **YouTube Video AdSense Revenue Estimate**\n` +
           `• **Views:** ${formatViews(calc.views)} | **Niche:** ${calc.nicheName}\n` +
           `• **Estimated Net Creator Take (55%):** ${formatMoney(calc.netRevenueUsd)}\n` +
           `• **Gross Brand Spend:** ${formatMoney(calc.grossSpendUsd)}\n` +
           `• **Effective RPM:** ${formatMoney(calc.effectiveRpmUsd, 2)} per 1K views\n` +
           `• **Effective CPM:** ${formatMoney(calc.grossCpmUsd, 2)}\n` +
           `• **Range:** Low ${formatMoney(calc.scenarios.bearNetUsd)} | Realistic ${formatMoney(calc.scenarios.baseNetUsd)} | Bull ${formatMoney(calc.scenarios.bullNetUsd)}`;
    }

    navigator.clipboard.writeText(md).then(() => {
      showToast('📋 Summary copied to clipboard!');
    }).catch(() => {
      showToast('Could not access clipboard.');
    });
  }

  // ─────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────

  function init() {
    applyTheme();
    setCurrency(state.currency);
    bindEvents();
    renderResults();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
