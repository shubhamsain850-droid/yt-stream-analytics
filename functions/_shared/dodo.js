/**
 * Dodo Payments REST API & Standard Webhooks Helper
 * Uses native fetch() + crypto.subtle (zero npm dependencies required).
 */

import { timingSafeEqualBytes } from './security.js';

export function getDodoConfig(env) {
  const apiKey = (env.DODO_PAYMENTS_API_KEY || '').trim();
  const webhookSecret = (env.DODO_WEBHOOK_SECRET || '').trim();
  const dayPassProductId = (env.DODO_PRODUCT_DAY_PASS || '').trim();
  const monthlyProProductId = (env.DODO_PRODUCT_MONTHLY_PRO || '').trim();
  const envMode = (env.DODO_ENV || 'live').trim().toLowerCase() === 'test' ? 'test' : 'live';
  const baseUrl =
    envMode === 'test' ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

  return {
    envMode,
    baseUrl,
    apiKey,
    webhookSecret,
    products: {
      day_pass: dayPassProductId,
      monthly_pro: monthlyProProductId,
    },
    configured: Boolean(apiKey && (dayPassProductId || monthlyProProductId)),
  };
}

export function resolvePlanFromProductId(env, productId) {
  const cfg = getDodoConfig(env);
  if (productId && cfg.products.day_pass && productId === cfg.products.day_pass) {
    return 'day_pass';
  }
  if (productId && cfg.products.monthly_pro && productId === cfg.products.monthly_pro) {
    return 'monthly_pro';
  }
  return 'monthly_pro';
}

export async function createDodoCheckoutSession(env, { user, plan, returnUrl }) {
  const cfg = getDodoConfig(env);
  const productId = cfg.products[plan];
  if (!cfg.apiKey || !productId) {
    throw new Error('Dodo Payments credentials or Product ID not configured.');
  }

  const resp = await fetch(`${cfg.baseUrl}/checkouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: user.email,
        name: user.name,
      },
      metadata: {
        user_id: String(user.id),
        email: String(user.email),
        plan: String(plan),
      },
      return_url: returnUrl,
    }),
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

export async function retrieveDodoSubscription(env, subscriptionId) {
  return dodoGet(env, `/subscriptions/${encodeURIComponent(subscriptionId)}`);
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

