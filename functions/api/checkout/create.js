import { getRequestCountry, jsonResponse } from '../../_shared/security.js';
import { isIndiaFirstPurchaseEligible, recordPendingCheckout } from '../../_shared/db.js';
import {
  createDodoCheckoutSession,
  getCreditPack,
  getDodoConfig,
} from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

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

    const rawPack = String(body?.packId || body?.plan || '').trim();
    const pack = getCreditPack(rawPack);
    if (!pack) {
      return jsonResponse({ error: 'Invalid credit pack selected.' }, 400);
    }

    const countryCode = getRequestCountry(request);
    const indiaFirstPurchase = await isIndiaFirstPurchaseEligible(env.DB, user, countryCode);

    const cfg = getDodoConfig(env);
    const targetProductId =
      (indiaFirstPurchase && cfg.indiaFirstProducts[pack.id]) || cfg.products[pack.id];

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
