/**
 * Dodo Payments REST API, Credit Pack Catalog & Standard Webhooks Helper
 * Runs natively on Cloudflare Pages Functions (fetch + Web Crypto API).
 */

import { timingSafeEqualBytes } from './security.js';

export const CREDIT_UNIT_MESSAGES = 1000; // 1 Credit = 1,000 chats/comments

export const CREDIT_PACKS = {
  // Global USD Volume Packs ($19.99 / 200k • $29 / 500k • $49 / 1M)
  credits_200: {
    id: 'credits_200',
    tier: 'starter',
    tierGroup: 'volume',
    market: 'USD',
    name: 'Starter Pack',
    credits: 200,
    chatsAllowance: 200000,
    usdPrice: 19.99,
    usdLabel: '$19.99',
    unitLabel: '$0.10 / 1k chats',
    minUsdCents: 1500,
  },
  credits_500: {
    id: 'credits_500',
    tier: 'growth',
    tierGroup: 'volume',
    market: 'USD',
    name: 'Growth Pack',
    credits: 500,
    chatsAllowance: 500000,
    usdPrice: 29.0,
    usdLabel: '$29.00',
    unitLabel: '$0.058 / 1k chats',
    minUsdCents: 2400,
  },
  credits_1000: {
    id: 'credits_1000',
    tier: 'agency',
    tierGroup: 'volume',
    market: 'USD',
    name: 'Agency Pack',
    credits: 1000,
    chatsAllowance: 1000000,
    usdPrice: 49.0,
    usdLabel: '$49.00',
    unitLabel: '$0.049 / 1k chats',
    minUsdCents: 4000,
  },
  // Global USD Mini Packs ($2.99 / 10k • $6.99 / 30k)
  usd_10: {
    id: 'usd_10',
    tier: 'mini_starter',
    tierGroup: 'mini',
    market: 'USD',
    name: 'Starter Mini Pack',
    credits: 10,
    chatsAllowance: 10000,
    usdPrice: 2.99,
    usdLabel: '$2.99',
    unitLabel: '$0.30 / 1k chats',
    minUsdCents: 200,
  },
  usd_30: {
    id: 'usd_30',
    tier: 'mini_growth',
    tierGroup: 'mini',
    market: 'USD',
    name: 'Creator Mini Pack',
    credits: 30,
    chatsAllowance: 30000,
    usdPrice: 6.99,
    usdLabel: '$6.99',
    unitLabel: '$0.23 / 1k chats',
    minUsdCents: 500,
  },
  // India INR Mini Packs (₹49 / 10k • ₹149 / 30k • ₹499 / 100k)
  in_10: {
    id: 'in_10',
    tier: 'mini_starter',
    tierGroup: 'mini',
    market: 'INR',
    name: 'Starter Mini Pack (India)',
    credits: 10,
    chatsAllowance: 10000,
    inrRegular: 49,
    inrFirst: 49,
    unitLabel: '₹4.90 / 1k chats',
  },
  in_30: {
    id: 'in_30',
    tier: 'mini_growth',
    tierGroup: 'mini',
    market: 'INR',
    name: 'Creator Mini Pack (India)',
    credits: 30,
    chatsAllowance: 30000,
    inrRegular: 149,
    inrFirst: 149,
    unitLabel: '₹4.97 / 1k chats',
  },
  in_100: {
    id: 'in_100',
    tier: 'mini_agency',
    tierGroup: 'mini',
    market: 'INR',
    name: 'Agency Mini Pack (India)',
    credits: 100,
    chatsAllowance: 100000,
    inrRegular: 499,
    inrFirst: 499,
    unitLabel: '₹4.99 / 1k chats',
  },
  // India INR Volume Packs (₹799 / 200k • ₹1,299 / 500k • ₹1,799 / 1M)
  in_200: {
    id: 'in_200',
    tier: 'starter',
    tierGroup: 'volume',
    market: 'INR',
    name: 'Starter Volume Pack (India)',
    credits: 200,
    chatsAllowance: 200000,
    inrRegular: 799,
    inrFirst: 799,
    unitLabel: '₹4.00 / 1k chats',
  },
  in_500: {
    id: 'in_500',
    tier: 'growth',
    tierGroup: 'volume',
    market: 'INR',
    name: 'Growth Volume Pack (India)',
    credits: 500,
    chatsAllowance: 500000,
    inrRegular: 1299,
    inrFirst: 1299,
    unitLabel: '₹2.60 / 1k chats',
  },
  in_1000: {
    id: 'in_1000',
    tier: 'agency',
    tierGroup: 'volume',
    market: 'INR',
    name: 'Agency Volume Pack (India)',
    credits: 1000,
    chatsAllowance: 1000000,
    inrRegular: 1799,
    inrFirst: 1799,
    unitLabel: '₹1.80 / 1k chats',
  },
  // Backward-compatible keys for legacy payment records
  credits_10: {
    id: 'credits_10',
    tier: 'mini_starter',
    tierGroup: 'mini',
    market: 'USD',
    name: 'Starter Mini Pack',
    credits: 10,
    chatsAllowance: 10000,
    inrRegular: 49,
    inrFirst: 49,
    usdPrice: 2.99,
    usdLabel: '$2.99',
  },
  credits_30: {
    id: 'credits_30',
    tier: 'mini_growth',
    tierGroup: 'mini',
    market: 'USD',
    name: 'Creator Mini Pack',
    credits: 30,
    chatsAllowance: 30000,
    inrRegular: 149,
    inrFirst: 149,
    usdPrice: 6.99,
    usdLabel: '$6.99',
  },
  credits_100: {
    id: 'credits_100',
    tier: 'mini_agency',
    tierGroup: 'mini',
    market: 'INR',
    name: 'Agency Mini Pack',
    credits: 100,
    chatsAllowance: 100000,
    inrRegular: 499,
    inrFirst: 499,
    usdPrice: 19.99,
    usdLabel: '$19.99',
  },
};

export const PUBLIC_CREDIT_PACKS = {
  USD: {
    mini_starter: CREDIT_PACKS.usd_10,
    mini_growth: CREDIT_PACKS.usd_30,
    starter: CREDIT_PACKS.credits_200,
    growth: CREDIT_PACKS.credits_500,
    agency: CREDIT_PACKS.credits_1000,
  },
  INR: {
    mini_starter: CREDIT_PACKS.in_10,
    mini_growth: CREDIT_PACKS.in_30,
    mini_agency: CREDIT_PACKS.in_100,
    starter: CREDIT_PACKS.in_200,
    growth: CREDIT_PACKS.in_500,
    agency: CREDIT_PACKS.in_1000,
  },
};

export function getCreditPack(packId) {
  return packId && CREDIT_PACKS[packId] ? CREDIT_PACKS[packId] : null;
}

export function normalizePackForCountry(requestedPackId, country) {
  const isIndia = String(country || '').toUpperCase() === 'IN';
  const raw = String(requestedPackId || '').trim().toLowerCase();

  if (isIndia) {
    if (raw === 'in_200' || raw === 'credits_200' || raw === 'vol_starter' || raw === 'starter') {
      return 'in_200';
    }
    if (raw === 'in_500' || raw === 'credits_500' || raw === 'vol_growth' || raw === 'growth' || raw === 'creator') {
      return 'in_500';
    }
    if (raw === 'in_1000' || raw === 'credits_1000' || raw === 'vol_agency' || raw === 'agency') {
      return 'in_1000';
    }
    if (raw === 'in_100' || raw === 'credits_100' || raw === 'mini_agency') {
      return 'in_100';
    }
    if (raw === 'in_30' || raw === 'credits_30' || raw === 'usd_30' || raw === 'mini_growth') {
      return 'in_30';
    }
    return 'in_10';
  }

  // Non-India (Global USD): Mini ($2.99/$6.99) + Volume ($19.99/$29/$49)
  if (raw === 'usd_10' || raw === 'credits_10' || raw === 'in_10' || raw === 'mini_starter') {
    return 'usd_10';
  }
  if (raw === 'usd_30' || raw === 'credits_30' || raw === 'in_30' || raw === 'mini_growth') {
    return 'usd_30';
  }
  if (raw === 'in_500' || raw === 'credits_500' || raw === 'vol_growth' || raw === 'growth' || raw === 'creator') {
    return 'credits_500';
  }
  if (raw === 'in_1000' || raw === 'credits_1000' || raw === 'vol_agency' || raw === 'agency') {
    return 'credits_1000';
  }
  // Note: credits_100 / in_100 / in_200 / credits_200 / starter map to 200 CR ($19.99) outside India
  return 'credits_200';
}

export function getDodoConfig(env) {
  const apiKey = (env.DODO_PAYMENTS_API_KEY || '').trim();
  const webhookSecret = (env.DODO_WEBHOOK_SECRET || '').trim();
  const envMode = (env.DODO_ENV || 'live').trim().toLowerCase() === 'test' ? 'test' : 'live';
  const baseUrl =
    envMode === 'test' ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

  const legacyShared = {
    starter: (env.DODO_PRODUCT_CREDITS_10 || '').trim(),
    growth: (env.DODO_PRODUCT_CREDITS_30 || '').trim(),
    agency: (env.DODO_PRODUCT_CREDITS_100 || '').trim(),
  };

  const usdDedicatedProducts = {
    usd_10: (env.DODO_PRODUCT_USD_10 || '').trim(),
    usd_30: (env.DODO_PRODUCT_USD_30 || '').trim(),
    credits_200: (env.DODO_PRODUCT_USD_200 || env.DODO_PRODUCT_CREDITS_200 || '').trim(),
    credits_500: (env.DODO_PRODUCT_USD_500 || env.DODO_PRODUCT_CREDITS_500 || '').trim(),
    credits_1000: (env.DODO_PRODUCT_USD_1000 || env.DODO_PRODUCT_CREDITS_1000 || '').trim(),
  };

  const inrDedicatedProducts = {
    in_10: (env.DODO_PRODUCT_IN_10 || '').trim(),
    in_30: (env.DODO_PRODUCT_IN_30 || '').trim(),
    in_100: (env.DODO_PRODUCT_IN_100 || '').trim(),
    in_200: (env.DODO_PRODUCT_IN_200 || '').trim(),
    in_500: (env.DODO_PRODUCT_IN_500 || '').trim(),
    in_1000: (env.DODO_PRODUCT_IN_1000 || '').trim(),
  };

  const indiaFirstProducts = {
    in_10: (env.DODO_PRODUCT_IN_FIRST_10 || '').trim(),
    in_30: (env.DODO_PRODUCT_IN_FIRST_30 || '').trim(),
    in_100: (env.DODO_PRODUCT_IN_FIRST_100 || '').trim(),
  };

  const usdProducts = {
    usd_10: usdDedicatedProducts.usd_10 || legacyShared.starter,
    usd_30: usdDedicatedProducts.usd_30 || legacyShared.growth,
    credits_200: usdDedicatedProducts.credits_200 || legacyShared.starter,
    credits_500: usdDedicatedProducts.credits_500 || legacyShared.growth,
    credits_1000: usdDedicatedProducts.credits_1000 || legacyShared.agency,
  };

  const inrProducts = {
    in_10: inrDedicatedProducts.in_10 || indiaFirstProducts.in_10 || legacyShared.starter,
    in_30: inrDedicatedProducts.in_30 || indiaFirstProducts.in_30 || legacyShared.growth,
    in_100: inrDedicatedProducts.in_100 || indiaFirstProducts.in_100 || legacyShared.agency,
    in_200: inrDedicatedProducts.in_200 || usdDedicatedProducts.credits_200,
    in_500: inrDedicatedProducts.in_500 || usdDedicatedProducts.credits_500,
    in_1000: inrDedicatedProducts.in_1000 || usdDedicatedProducts.credits_1000,
  };

  const sharedFirstCode = (env.DODO_INDIA_FIRST_DISCOUNT_CODE || '').trim();
  const indiaFirstDiscountCodes = {
    in_10: (env.DODO_INDIA_FIRST_CODE_10 || sharedFirstCode).trim(),
    in_30: (env.DODO_INDIA_FIRST_CODE_30 || sharedFirstCode).trim(),
    in_100: (env.DODO_INDIA_FIRST_CODE_100 || sharedFirstCode).trim(),
  };

  const products = {
    ...usdProducts,
    ...inrProducts,
    credits_10: usdProducts.usd_10 || legacyShared.starter,
    credits_30: usdProducts.usd_30 || legacyShared.growth,
    credits_100: legacyShared.agency,
  };

  const configured = Boolean(
    apiKey &&
      (usdProducts.credits_200 ||
        usdProducts.credits_500 ||
        usdProducts.credits_1000 ||
        inrProducts.in_10)
  );

  return {
    envMode,
    baseUrl,
    apiKey,
    webhookSecret,
    legacyShared,
    usdProducts,
    usdDedicatedProducts,
    inrProducts,
    inrDedicatedProducts,
    products,
    indiaFirstProducts,
    indiaFirstDiscountCodes,
    configured,
  };
}

export function resolvePackFromProductId(env, productId, context = {}) {
  const cfg = getDodoConfig(env);
  const { metaPack = '', pendingPlan = '', payment = null } = context || {};

  if (productId) {
    // 1. Dedicated India INR products (₹49 / ₹149 / ₹499 / ₹799 / ₹1,299 / ₹1,799) -> exact CR
    for (const inPackId of ['in_10', 'in_30', 'in_100', 'in_200', 'in_500', 'in_1000']) {
      if (
        (cfg.inrDedicatedProducts[inPackId] && cfg.inrDedicatedProducts[inPackId] === productId) ||
        (cfg.indiaFirstProducts[inPackId] && cfg.indiaFirstProducts[inPackId] === productId)
      ) {
        return inPackId;
      }
    }

    // 2. Dedicated Global USD products ($2.99 / $6.99 / $19.99 / $29 / $49) -> exact CR
    for (const usdPackId of ['usd_10', 'usd_30', 'credits_200', 'credits_500', 'credits_1000']) {
      if (cfg.usdDedicatedProducts[usdPackId] && cfg.usdDedicatedProducts[usdPackId] === productId) {
        return usdPackId;
      }
    }

    // 3. Shared DODO_PRODUCT_CREDITS_{10,30,100}: guard against INR/low-amount arbitrage
    const tierPair =
      productId === cfg.legacyShared.starter
        ? { inPack: 'in_10', usdPack: 'credits_200' }
        : productId === cfg.legacyShared.growth
          ? { inPack: 'in_30', usdPack: 'credits_500' }
          : productId === cfg.legacyShared.agency
            ? { inPack: 'in_100', usdPack: 'credits_1000' }
            : null;

    if (tierPair) {
      const payCurrency = String(payment?.currency || '').toUpperCase();
      const rawTotal = payment?.total_amount ?? payment?.settlement_amount;
      const totalAmount = rawTotal !== undefined && rawTotal !== null ? Number(rawTotal) : null;

      if (payCurrency === 'INR' && (totalAmount === null || totalAmount < 120000)) {
        return tierPair.inPack;
      }

      const candidate = [pendingPlan, metaPack].find((c) => getCreditPack(c));
      if (candidate === tierPair.usdPack) {
        const minCents = CREDIT_PACKS[tierPair.usdPack].minUsdCents || 1500;
        if (cfg.envMode === 'live' && totalAmount !== null && payCurrency === 'USD' && totalAmount < minCents) {
          return tierPair.inPack;
        }
        return tierPair.usdPack;
      }

      if (candidate === 'usd_10' || candidate === 'usd_30') {
        return candidate;
      }

      if (
        candidate === tierPair.inPack ||
        candidate === 'credits_10' ||
        candidate === 'credits_30' ||
        candidate === 'credits_100'
      ) {
        return tierPair.inPack;
      }

      return payCurrency === 'INR' ? tierPair.inPack : tierPair.usdPack;
    }
  }

  const payCurrency = String(payment?.currency || '').toUpperCase();
  const rawTotal = payment?.total_amount ?? payment?.settlement_amount;
  const totalAmount = rawTotal !== undefined && rawTotal !== null ? Number(rawTotal) : null;

  for (const fallback of [pendingPlan, metaPack]) {
    if (getCreditPack(fallback)) {
      if (payCurrency === 'INR' && (totalAmount === null || totalAmount < 70000)) {
        // Low INR payment (< ₹700) can only correspond to 10/30/100 CR India mini packs
        return fallback === 'in_30' || fallback === 'in_100' ? fallback : 'in_10';
      }
      return fallback;
    }
  }
  return null;
}

export async function createDodoCheckoutSession(
  env,
  { user, packId, returnUrl, indiaFirstPurchase = false, countryCode = 'XX' }
) {
  const cfg = getDodoConfig(env);
  const pack = getCreditPack(packId);
  if (!pack) {
    throw new Error('Unknown credit pack.');
  }

  const isIndia = countryCode === 'IN';
  const dedicatedIn = isIndia ? cfg.inrDedicatedProducts[packId] : '';
  const dedicatedFirstIn = isIndia && indiaFirstPurchase ? cfg.indiaFirstProducts[packId] : '';
  const dedicatedUsd = !isIndia ? cfg.usdDedicatedProducts[packId] : '';
  const productId = dedicatedIn || dedicatedFirstIn || dedicatedUsd || cfg.products[packId];

  if (!cfg.apiKey || !productId) {
    throw new Error('Dodo Payments credentials or Credit Pack Product ID not configured.');
  }

  const payload = {
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: {
      email: user.email,
      name: user.name,
    },
    metadata: {
      user_id: String(user.id),
      email: String(user.email),
      pack_id: String(pack.id),
      credits: String(pack.credits),
      market: String(pack.market || (isIndia ? 'INR' : 'USD')),
      india_first_purchase: indiaFirstPurchase ? 'true' : 'false',
      country: String(countryCode || 'XX'),
    },
    return_url: returnUrl,
  };

  if (isIndia) {
    payload.billing_currency = 'INR';
  }

  const resp = await fetch(`${cfg.baseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await resp.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!resp.ok || !data?.checkout_url) {
    throw new Error(data?.message || data?.error || `Dodo checkout failed (HTTP ${resp.status})`);
  }

  return data;
}

async function dodoGet(env, path) {
  const cfg = getDodoConfig(env);
  if (!cfg.apiKey) {
    throw new Error('DODO_PAYMENTS_API_KEY missing');
  }
  const resp = await fetch(`${cfg.baseUrl}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      Accept: 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error(`Dodo GET ${path} returned HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function retrieveDodoCheckoutSession(env, sessionId) {
  return dodoGet(env, `/checkouts/${encodeURIComponent(sessionId)}`);
}

export async function retrieveDodoPayment(env, paymentId) {
  return dodoGet(env, `/payments/${encodeURIComponent(paymentId)}`);
}

function decodeBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifies Standard Webhooks HMAC-SHA256 signatures used by Dodo Payments.
 */
export async function verifyDodoWebhookSignature(secret, headers, rawBody) {
  if (!secret) return false;
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatureHeader = headers.get('webhook-signature');

  if (!id || !timestamp || !signatureHeader) return false;

  const tsNum = parseInt(timestamp, 10);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Number.isNaN(tsNum) || Math.abs(nowSec - tsNum) > 300) {
    return false;
  }

  const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBytes;
  try {
    keyBytes = decodeBase64(cleanSecret);
  } catch {
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(signedContent));
  const computedBytes = new Uint8Array(sigBuf);

  const entries = signatureHeader.split(' ').filter(Boolean);
  for (const entry of entries) {
    const commaIdx = entry.indexOf(',');
    if (commaIdx === -1) continue;
    const version = entry.slice(0, commaIdx);
    const sigB64 = entry.slice(commaIdx + 1);
    if (version !== 'v1' || !sigB64) continue;

    try {
      const providedBytes = decodeBase64(sigB64);
      if (timingSafeEqualBytes(computedBytes, providedBytes)) {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}
