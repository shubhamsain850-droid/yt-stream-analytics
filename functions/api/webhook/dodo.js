import { jsonResponse } from '../../_shared/security.js';
import {
  grantCreditPurchase,
  markWebhookProcessed,
  revokeCreditPurchase,
} from '../../_shared/db.js';
import {
  getCreditPack,
  resolvePackFromProductId,
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
    const sessionId = data?.checkout_session_id || data?.session_id || null;
    const productId =
      data?.product_id ||
      (Array.isArray(data?.product_cart) ? data.product_cart[0]?.product_id : null);

    if (eventType === 'payment.succeeded') {
      let pendingPlan = '';
      if (sessionId) {
        try {
          const pendingRow = await env.DB
            .prepare('SELECT plan FROM payments WHERE session_id = ?1 LIMIT 1')
            .bind(sessionId)
            .first();
          pendingPlan = pendingRow?.plan ? String(pendingRow.plan) : '';
        } catch {}
      }
      const fromMeta = metadata?.pack_id ? String(metadata.pack_id) : metadata?.plan ? String(metadata.plan) : '';
      const resolved = resolvePackFromProductId(env, productId, {
        metaPack: fromMeta,
        pendingPlan,
        payment: data,
      });
      const packId =
        resolved || (getCreditPack(fromMeta) ? fromMeta : 'in_10');

      await grantCreditPurchase(env.DB, {
        userId,
        email,
        packId,
        paymentId,
        sessionId,
        customerId,
        rawEventType: eventType,
      });
    } else if (
      eventType === 'refund.succeeded' ||
      eventType === 'dispute.opened'
    ) {
      await revokeCreditPurchase(env.DB, {
        userId,
        paymentId,
        sessionId,
        email,
        status: eventType.startsWith('refund') ? 'refunded' : 'disputed',
        rawEventType: eventType,
      });
    }

    return jsonResponse({ ok: true, received: eventType });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Webhook processing error.' }, 500);
  }
}
