import { getRequestCountry, jsonResponse } from '../../_shared/security.js';
import { isIndiaFirstPurchaseEligible, recordPendingCheckout } from '../../_shared/db.js';
import {
  createDodoCheckoutSession,
  getCreditPack,
  getDodoConfig,
  normalizePackForCountry,
} from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

const ALLOWED_PACK_INPUTS = new Set([
  'credits_10',
  'credits_30',
  'credits_100',
  'credits_200',
  'credits_500',
  'credits_1000',
  'in_10',
  'in_30',
  'in_100',
  'starter',
  'growth',
  'creator',
  'agency',
]);

function buildSafeReturnUrl(requestUrl, rawReturnPath, packId) {
  const origin = new URL(requestUrl).origin;
  let path = typeof rawReturnPath === 'string' ? rawReturnPath.trim() : '/';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    path = '/';
  }
  const url = new URL(path, origin);
  url.searchParams.set('tm_checkout', 'return');
  url.searchParams.set('pack', packId);
  return url.toString();
}

export async function onRequestPost({ request, env }) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse(
        {
          error: 'auth_required',
          message: 'Please sign in with Google first so your purchased credits are securely linked to your account.',
        },
        401
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }

    const rawPack = String(body?.packId || body?.plan || '').trim().toLowerCase();
    if (!ALLOWED_PACK_INPUTS.has(rawPack)) {
      return jsonResponse({ error: 'Invalid credit pack selected.' }, 400);
    }

    const countryCode = getRequestCountry(request);
    // Strict server-side geo enforcement: India uses 10/30/100 INR packs, Global uses 200/500/1,000 USD packs
    const canonicalPackId = normalizePackForCountry(rawPack, countryCode);
    const pack = getCreditPack(canonicalPackId);
    if (!pack) {
      return jsonResponse({ error: 'Invalid credit pack selected.' }, 400);
    }

    const indiaFirstPurchase = await isIndiaFirstPurchaseEligible(env.DB, user, countryCode);

    const cfg = getDodoConfig(env);
    const targetProductId =
      (indiaFirstPurchase && cfg.indiaFirstProducts[pack.id]) ||
      (countryCode === 'IN' ? cfg.inrDedicatedProducts[pack.id] : cfg.usdDedicatedProducts[pack.id]) ||
      cfg.products[pack.id];

    if (!cfg.apiKey || !targetProductId) {
      return jsonResponse(
        {
          error: 'payment_not_configured',
          setupRequired: true,
          packId: pack.id,
          indiaFirstPurchase,
          country: countryCode,
          message:
            'Dodo Payments checkout is ready on backend, waiting for Credit Pack Product IDs & API Key configuration.',
        },
        503
      );
    }

    const returnUrl = buildSafeReturnUrl(request.url, body?.returnPath || '/', pack.id);
    const session = await createDodoCheckoutSession(env, {
      user,
      packId: pack.id,
      returnUrl,
      indiaFirstPurchase,
      countryCode,
    });

    if (session?.session_id) {
      await recordPendingCheckout(env.DB, {
        sessionId: session.session_id,
        userId: user.id,
        email: user.email,
        packId: pack.id,
      });
    }

    return jsonResponse({
      ok: true,
      packId: pack.id,
      credits: pack.credits,
      indiaFirstPurchase,
      sessionId: session.session_id,
      checkoutUrl: session.checkout_url,
    });
  } catch (err) {
    return jsonResponse(
      { error: err.message || 'Unable to start payment checkout.' },
      500
    );
  }
}
