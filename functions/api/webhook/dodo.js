import { jsonResponse } from '../../_shared/security.js';
import {
  grantProAccess,
  markWebhookProcessed,
  revokeProAccess,
} from '../../_shared/db.js';
import {
  resolvePlanFromProductId,
  verifyDodoWebhookSignature,
} from '../../_shared/dodo.js';
import { assertServerConfigured } from '../../_shared/context.js';

export async function onRequestPost({ request, env }) {
  try {
    assertServerConfigured(env);

    const webhookSecret = (env.DODO_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      return jsonResponse({ error: 'DODO_WEBHOOK_SECRET not configured.' }, 503);
    }

    const rawBody = await request.text();
    const isValidSig = await verifyDodoWebhookSignature(
      webhookSecret,
      request.headers,
      rawBody
    );

    if (!isValidSig) {
      return jsonResponse({ error: 'Invalid webhook signature.' }, 401);
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return jsonResponse({ error: 'Malformed JSON webhook body.' }, 400);
    }

    const webhookId = request.headers.get('webhook-id') || '';
    const eventType = String(event?.type || '').trim();
    const data = event?.data || event || {};

    const isFirstDelivery = await markWebhookProcessed(env.DB, webhookId, eventType);
    if (!isFirstDelivery) {
      return jsonResponse({ ok: true, duplicate: true });
    }

    const metadata = data?.metadata || {};
    const userId = metadata?.user_id ? String(metadata.user_id) : null;
    const email =
      (metadata?.email || data?.customer?.email || data?.customer_email || '')
        .trim()
        .toLowerCase() || null;
    const customerId = data?.customer?.customer_id || data?.customer_id || null;
    const paymentId = data?.payment_id || null;
    const subscriptionId = data?.subscription_id || null;
    const sessionId = data?.checkout_session_id || data?.session_id || null;
    const productId =
      data?.product_id ||
      (Array.isArray(data?.product_cart) ? data.product_cart[0]?.product_id : null);

    if (
      eventType === 'payment.succeeded' ||
      eventType === 'subscription.active' ||
      eventType === 'subscription.renewed'
    ) {
      let plan = metadata?.plan || resolvePlanFromProductId(env, productId);
      if (eventType.startsWith('subscription.') || subscriptionId) {
        plan = 'monthly_pro';
      }

      await grantProAccess(env.DB, {
        userId,
        email,
        plan,
        paymentId,
        sessionId,
        subscriptionId,
        customerId,
        rawEventType: eventType,
      });
    } else if (
      eventType === 'subscription.cancelled' ||
      eventType === 'subscription.expired' ||
      eventType === 'subscription.failed' ||
      eventType === 'refund.succeeded' ||
      eventType === 'dispute.opened'
    ) {
      const keepUntilIso =
        eventType === 'subscription.cancelled' && data?.cancel_at_next_billing_date
          ? data?.next_billing_date || null
          : null;

      await revokeProAccess(env.DB, {
        userId,
        subscriptionId,
        email,
        status: eventType.split('.')[0] === 'refund' ? 'refunded' : 'cancelled',
        rawEventType: eventType,
        keepUntilIso,
      });
    }

    return jsonResponse({ ok: true, received: eventType });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Webhook processing error.' }, 500);
  }
}

