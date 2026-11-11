import { jsonResponse } from '../../_shared/security.js';
import { recordPendingCheckout } from '../../_shared/db.js';
import { createDodoCheckoutSession, getDodoConfig } from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

function buildSafeReturnUrl(requestUrl, rawReturnPath, plan) {
  const origin = new URL(requestUrl).origin;
  let path = typeof rawReturnPath === 'string' ? rawReturnPath.trim() : '/';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    path = '/';
  }
  const url = new URL(path, origin);
  url.searchParams.set('tm_checkout', 'return');
  url.searchParams.set('plan', plan);
  return url.toString();
}

export async function onRequestPost({ request, env }) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse(
        {
          error: 'auth_required',
          message: 'Please sign in with Google first so your PRO membership is securely linked to your account.',
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

    const plan = body?.plan === 'monthly_pro' ? 'monthly_pro' : null;
    if (!plan) {
      return jsonResponse({ error: 'Invalid plan selected.' }, 400);
    }

    const cfg = getDodoConfig(env);
    if (!cfg.apiKey || !cfg.products[plan]) {
      return jsonResponse(
        {
          error: 'payment_not_configured',
          setupRequired: true,
          plan,
          message:
            'Dodo Payments checkout is ready on backend, waiting for live API Key & Product IDs configuration.',
        },
        503
      );
    }

    const returnUrl = buildSafeReturnUrl(request.url, body?.returnPath || '/', plan);
    const session = await createDodoCheckoutSession(env, { user, plan, returnUrl });

    if (session?.session_id) {
      await recordPendingCheckout(env.DB, {
        sessionId: session.session_id,
        userId: user.id,
        email: user.email,
        plan,
      });
    }

    return jsonResponse({
      ok: true,
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

