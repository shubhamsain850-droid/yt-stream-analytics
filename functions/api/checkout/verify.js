import { jsonResponse } from '../../_shared/security.js';
import { getLatestPendingCheckoutForUser, grantProAccess } from '../../_shared/db.js';
import {
  getDodoConfig,
  resolvePlanFromProductId,
  retrieveDodoCheckoutSession,
  retrieveDodoPayment,
  retrieveDodoSubscription,
} from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

function matchesUser(entity, user) {
  const metaUid = entity?.metadata?.user_id ? String(entity.metadata.user_id) : '';
  const custEmail = entity?.customer?.email ? String(entity.customer.email).trim().toLowerCase() : '';
  const topEmail = entity?.customer_email ? String(entity.customer_email).trim().toLowerCase() : '';
  const userEmail = String(user.email || '').trim().toLowerCase();

  if (metaUid && metaUid === String(user.id)) return true;
  if (custEmail && custEmail === userEmail) return true;
  if (topEmail && topEmail === userEmail) return true;
  return false;
}

export async function onRequestPost({ request, env }) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse({ error: 'auth_required', message: 'Sign in required.' }, 401);
    }

    // Already verified active PRO (e.g. webhook already arrived before redirect completed)
    if (user.tier === 'pro') {
      return jsonResponse({ ok: true, verified: true, user });
    }

    const cfg = getDodoConfig(env);
    if (!cfg.apiKey) {
      return jsonResponse({ ok: false, verified: false, user, reason: 'payment_not_configured' });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    let paymentId = typeof body?.paymentId === 'string' ? body.paymentId.trim() : '';
    let subscriptionId = typeof body?.subscriptionId === 'string' ? body.subscriptionId.trim() : '';
    let sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';

    const latestPending = await getLatestPendingCheckoutForUser(env.DB, user.id);
    if (!sessionId && latestPending?.session_id) {
      sessionId = latestPending.session_id;
    }

    // 1. Check checkout session directly if we have one
    if (!paymentId && !subscriptionId && sessionId) {
      try {
        const sess = await retrieveDodoCheckoutSession(env, sessionId);
        if (sess?.payment_id) paymentId = sess.payment_id;
        if (sess?.subscription_id) subscriptionId = sess.subscription_id;
        const sessStatus = String(sess?.payment_status || sess?.status || '').toLowerCase();
        if (sessStatus === 'succeeded' && (matchesUser(sess, user) || latestPending?.user_id === user.id)) {
          const plan =
            sess?.metadata?.plan ||
            latestPending?.plan ||
            body?.plan ||
            'monthly_pro';
          const updatedUser = await grantProAccess(env.DB, {
            userId: user.id,
            email: user.email,
            plan,
            paymentId: paymentId || null,
            sessionId,
            subscriptionId: subscriptionId || null,
            rawEventType: 'checkout.verify_session',
          });
          return jsonResponse({ ok: true, verified: true, user: updatedUser });
        }
      } catch {
        // Fall through to payment/subscription direct verification if IDs provided
      }
    }

    // 2. Verify payment directly via GET /payments/{id}
    if (paymentId) {
      const payment = await retrieveDodoPayment(env, paymentId);
      const status = String(payment?.status || '').toLowerCase();
      if (status === 'succeeded' && (matchesUser(payment, user) || latestPending?.user_id === user.id)) {
        const productId = payment?.product_cart?.[0]?.product_id || payment?.product_id;
        const plan =
          payment?.metadata?.plan ||
          latestPending?.plan ||
          resolvePlanFromProductId(env, productId);
        const updatedUser = await grantProAccess(env.DB, {
          userId: user.id,
          email: user.email,
          plan,
          paymentId,
          sessionId: sessionId || null,
          subscriptionId: payment?.subscription_id || subscriptionId || null,
          customerId: payment?.customer?.customer_id || null,
          rawEventType: 'checkout.verify_payment',
        });
        return jsonResponse({ ok: true, verified: true, user: updatedUser });
      }
    }

    // 3. Verify subscription directly via GET /subscriptions/{id}
    if (subscriptionId) {
      const sub = await retrieveDodoSubscription(env, subscriptionId);
      const status = String(sub?.status || '').toLowerCase();
      if ((status === 'active' || status === 'on_hold') && (matchesUser(sub, user) || latestPending?.user_id === user.id)) {
        if (status === 'active') {
          const updatedUser = await grantProAccess(env.DB, {
            userId: user.id,
            email: user.email,
            plan: 'monthly_pro',
            sessionId: sessionId || null,
            subscriptionId,
            customerId: sub?.customer?.customer_id || null,
            rawEventType: 'checkout.verify_subscription',
          });
          return jsonResponse({ ok: true, verified: true, user: updatedUser });
        }
      }
    }

    return jsonResponse({
      ok: true,
      verified: false,
      pending: true,
      user,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Verification failed.' }, 500);
  }
}

