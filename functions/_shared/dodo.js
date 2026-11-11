/**
 * Dodo Payments REST API, Credit Pack Catalog & Standard Webhooks Helper
 * Runs natively on Cloudflare Pages Functions (fetch + Web Crypto API).
 */

import { timingSafeEqualBytes } from './security.js';

export const CREDIT_UNIT_MESSAGES = 1000; // 1 Credit = 1,000 chats/comments ($0.30/1k = $0.60 per 2,000 chats)

export const CREDIT_PACKS = {
  credits_10: {
    id: 'credits_10',
    name: 'Starter Pack',
    credits: 10,
    chatsAllowance: 10000,
    usdPrice: 2.99,
    usdLabel: '$2.99',
    per2kUsd: '$0.60 / 2k chats',
    inrRegular: 99,
    inrFirst: 49,
    inrDiscountBadge: '50% OFF 1st Order',
  },
  credits_30: {
    id: 'credits_30',
    name: 'Creator Pack',
    credits: 30,
    chatsAllowance: 30000,
    usdPrice: 6.99,
    usdLabel: '$6.99',
    per2kUsd: '$0.47 / 2k chats',
    inrRegular: 249,
    inrFirst: 149,
    inrDiscountBadge: '40% OFF 1st Order',
  },
  credits_100: {
    id: 'credits_100',
    name: 'Agency Pack',
    credits: 100,
    chatsAllowance: 100000,
    usdPrice: 19.99,
    usdLabel: '$19.99',
    per2kUsd: '$0.40 / 2k chats',
    inrRegular: 699,
    inrFirst: 499,
    inrDiscountBadge: '29% OFF 1st Order',
  },
};

export function getCreditPack(packId) {
  return packId && CREDIT_PACKS[packId] ? CREDIT_PACKS[packId] : null;
}

export function getDodoConfig(env) {
  const apiKey = (env.DODO_PAYMENTS_API_KEY || '').trim();
  const webhookSecret = (env.DODO_WEBHOOK_SECRET || '').trim();
  const envMode = (env.DODO_ENV || 'live').trim().toLowerCase() === 'test' ? 'test' : 'live';
  const baseUrl =
    envMode === 'test' ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

  const products = {
    credits_10: (env.DODO_PRODUCT_CREDITS_10 || '').trim(),
    credits_30: (env.DODO_PRODUCT_CREDITS_30 || '').trim(),
    credits_100: (env.DODO_PRODUCT_CREDITS_100 || '').trim(),
  };

  // Optional dedicated India 1st-purchase product IDs OR Dodo promo codes
  const indiaFirstProducts = {
    credits_10: (env.DODO_PRODUCT_IN_FIRST_10 || '').trim(),
    credits_30: (env.DODO_PRODUCT_IN_FIRST_30 || '').trim(),
    credits_100: (env.DODO_PRODUCT_IN_FIRST_100 || '').trim(),
  };

  const sharedFirstCode = (env.DODO_INDIA_FIRST_DISCOUNT_CODE || '').trim();
  const indiaFirstDiscountCodes = {
    credits_10: (env.DODO_INDIA_FIRST_CODE_10 || sharedFirstCode).trim(),
    credits_30: (env.DODO_INDIA_FIRST_CODE_30 || sharedFirstCode).trim(),
    credits_100: (env.DODO_INDIA_FIRST_CODE_100 || sharedFirstCode).trim(),
  };

  const configured = Boolean(
    apiKey && (products.credits_10 || products.credits_30 || products.credits_100)
  );

  return {
    envMode,
    baseUrl,
    apiKey,
    webhookSecret,
    products,
    indiaFirstProducts,
    indiaFirstDiscountCodes,
    configured,
  };
}

export function resolvePackFromProductId(env, productId) {
  if (!productId) return null;
  const cfg = getDodoConfig(env);
  for (const packId of Object.keys(CREDIT_PACKS)) {
    if (cfg.products[packId] && cfg.products[packId] === productId) {
      return packId;
    }
    if (cfg.indiaFirstProducts[packId] && cfg.indiaFirstProducts[packId] === productId) {
      return packId;
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

  const dedicatedInProduct = indiaFirstPurchase ? cfg.indiaFirstProducts[packId] : '';
  const productId = dedicatedInProduct || cfg.products[packId];

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
      india_first_purchase: indiaFirstPurchase ? 'true' : 'false',
      country: String(countryCode || 'XX'),
    },
    return_url: returnUrl,
  };

  if (indiaFirstPurchase && !dedicatedInProduct && cfg.indiaFirstDiscountCodes[packId]) {
    payload.discount_codes = [cfg.indiaFirstDiscountCodes[packId]];
    payload.billing_currency = 'INR';
  } else if (countryCode === 'IN' && dedicatedInProduct) {
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
