import { jsonResponse } from '../../_shared/security.js';
import {
  buildQuotaSnapshot,
  consumeUserCredits,
  resolveActiveUser,
} from '../../_shared/db.js';
import { CREDIT_UNIT_MESSAGES } from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

/**
 * Post-stream credit settlement for credit-paid chat exports exceeding 1,000 messages.
 * Strictly skipped for weekly free runs on client and requires authenticated session.
 */
export async function onRequestPost({ request, env }) {
  try {
    const { user, guestSubjectKey } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse({ error: 'auth_required' }, 401);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }

    const totalMessages = Math.max(0, Math.floor(Number(body?.totalMessages || 0)));
    const streamId = typeof body?.streamId === 'string' ? body.streamId.slice(0, 32) : '';

    // 1 base credit already covers first 1,000 messages
    const requiredCredits = Math.max(1, Math.ceil(totalMessages / CREDIT_UNIT_MESSAGES));
    const extraCredits = Math.min(50, Math.max(0, requiredCredits - 1));

    if (extraCredits === 0) {
      const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
      return jsonResponse({ ok: true, deducted: 0, user, quota });
    }

    const deductRes = await consumeUserCredits(env.DB, user.id, extraCredits, {
      reason: 'chat_volume_settlement',
      clampToBalance: true,
      meta: { streamId, totalMessages, extraCredits },
    });

    const refreshedUser = await resolveActiveUser(env.DB, user.id);
    const quota = await buildQuotaSnapshot(env.DB, refreshedUser, guestSubjectKey);

    return jsonResponse({
      ok: true,
      deducted: deductRes.deducted,
      user: refreshedUser,
      quota,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Credit settlement failed.' }, 500);
  }
}

