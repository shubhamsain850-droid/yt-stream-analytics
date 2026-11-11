import { getRequestCountry, jsonResponse } from '../../_shared/security.js';
import {
  getLatestCheckoutForUser,
  grantCreditPurchase,
  isIndiaFirstPurchaseEligible,
} from '../../_shared/db.js';
import {
  getCreditPack,
  getDodoConfig,
  resolvePackFromProductId,
  retrieveDodoCheckoutSession,
  retrieveDodoPayment,
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

function resolvePackId(env, productId, metaPack, pendingPack, bodyPack, payment = null) {
  const fromProd = resolvePackFromProductId(env, productId, {
    metaPack,
    pendingPlan: pendingPack,
    payment,
  });
  if (fromProd) return fromProd;
  for (const candidate of [pendingPack, metaPack, bodyPack]) {
    if (getCreditPack(candidate)) return candidate;
  }
  return 'in_10';
}

export async function onRequestPost({ request, env }) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse({ error: 'auth_required', message: 'Sign in required.' }, 401);
    }

    const country = getRequestCountry(request);
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
    let sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
    const requestedPack = typeof (body?.packId || body?.plan) === 'string' ? String(body?.packId || body?.plan).trim() : '';

    const latestCheckout = await getLatestCheckoutForUser(env.DB, user.id);
    if (!sessionId && latestCheckout?.session_id && latestCheckout?.status === 'pending') {
      sessionId = latestCheckout.session_id;
    }

    // 1. Check checkout session directly via GET /checkouts/{id}
    if (sessionId) {
      try {
        const sess = await retrieveDodoCheckoutSession(env, sessionId);
        if (sess?.payment_id && !paymentId) paymentId = sess.payment_id;
        const sessStatus = String(sess?.payment_status || sess?.status || '').toLowerCase();
        if (sessStatus === 'succeeded' && (matchesUser(sess, user) || latestCheckout?.user_id === user.id)) {
          const prodId = sess?.product_cart?.[0]?.product_id || sess?.product_id;
          const packId = resolvePackId(
            env,
            prodId,
            sess?.metadata?.pack_id,
            latestCheckout?.plan,
            requestedPack,
            sess
          );
          const granted = await grantCreditPurchase(env.DB, {
            userId: user.id,
            email: user.email,
            packId,
            paymentId: paymentId || null,
            sessionId,
            customerId: sess?.customer?.customer_id || null,
            rawEventType: 'checkout.verify_session',
          });
          const updatedUser = granted?.user || user;
          const indiaFirstPurchaseEligible = await isIndiaFirstPurchaseEligible(
            env.DB,
            updatedUser,
            country
          );
          return jsonResponse({
            ok: true,
            verified: true,
            creditsAdded: granted?.creditsAdded || 0,
            user: updatedUser,
            region: { country, isIndia: country === 'IN', indiaFirstPurchaseEligible },
          });
        }
      } catch {
        // Fall through to payment verification
      }
    }

    // 2. Verify payment directly via GET /payments/{id}
    if (paymentId) {
      const payment = await retrieveDodoPayment(env, paymentId);
      const status = String(payment?.status || '').toLowerCase();
      if (status === 'succeeded' && (matchesUser(payment, user) || latestCheckout?.user_id === user.id)) {
        const prodId = payment?.product_cart?.[0]?.product_id || payment?.product_id;
        const packId = resolvePackId(
          env,
          prodId,
          payment?.metadata?.pack_id,
          latestCheckout?.plan,
          requestedPack,
          payment
        );
        const granted = await grantCreditPurchase(env.DB, {
          userId: user.id,
          email: user.email,
          packId,
          paymentId,
          sessionId: sessionId || payment?.checkout_session_id || null,
          customerId: payment?.customer?.customer_id || null,
          rawEventType: 'checkout.verify_payment',
        });
        const updatedUser = granted?.user || user;
        const indiaFirstPurchaseEligible = await isIndiaFirstPurchaseEligible(
          env.DB,
          updatedUser,
          country
        );
        return jsonResponse({
          ok: true,
          verified: true,
          creditsAdded: granted?.creditsAdded || 0,
          user: updatedUser,
          region: { country, isIndia: country === 'IN', indiaFirstPurchaseEligible },
        });
      }
    }

    const indiaFirstPurchaseEligible = await isIndiaFirstPurchaseEligible(env.DB, user, country);
    return jsonResponse({
      ok: true,
      verified: false,
      pending: true,
      user,
      region: { country, isIndia: country === 'IN', indiaFirstPurchaseEligible },
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Verification failed.' }, 500);
  }
}
