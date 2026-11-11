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

    const mode = body?.mode === 'unlock' ? 'unlock' : 'volume';
    const totalMessages = Math.max(0, Math.floor(Number(body?.totalMessages || 0)));
    const unlockedCount = Math.max(0, Math.floor(Number(body?.unlockedCount || 0)));
    const streamId = typeof body?.streamId === 'string' ? body.streamId.slice(0, 32) : '';

    let targetCredits = 0;
    if (mode === 'unlock') {
      const requested = Math.max(0, Math.floor(Number(body?.creditsNeeded || 0)));
      const remainingMessages = Math.max(0, totalMessages - unlockedCount);
      const maxForRemaining = totalMessages > 0
        ? Math.ceil(remainingMessages / CREDIT_UNIT_MESSAGES)
        : requested;
      targetCredits = Math.min(500, Math.max(0, Math.min(requested, maxForRemaining)));
    } else {
      // 1 base credit (or 1,000-chat free cap) already covers first 1,000 messages
      const requiredCredits = Math.max(1, Math.ceil(totalMessages / CREDIT_UNIT_MESSAGES));
      targetCredits = Math.min(500, Math.max(0, requiredCredits - 1));
    }

    if (targetCredits === 0) {
      const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
      return jsonResponse({
        ok: true,
        mode,
        deducted: 0,
        requiredExtraCredits: 0,
        shortfall: 0,
        addedMessageAllowance: 0,
        creditsRemaining: user.creditsBalance || 0,
        user,
        quota,
      });
    }

    const deductRes = await consumeUserCredits(env.DB, user.id, targetCredits, {
      reason: mode === 'unlock' ? 'chat_unlock_remaining' : 'chat_volume_settlement',
      clampToBalance: true,
      meta: { mode, streamId, totalMessages, unlockedCount, targetCredits },
    });

    const refreshedUser = await resolveActiveUser(env.DB, user.id);
    const quota = await buildQuotaSnapshot(env.DB, refreshedUser, guestSubjectKey);

    return jsonResponse({
      ok: true,
      mode,
      deducted: deductRes.deducted,
      requiredExtraCredits: targetCredits,
      shortfall: Math.max(0, targetCredits - deductRes.deducted),
      addedMessageAllowance: deductRes.deducted * CREDIT_UNIT_MESSAGES,
      creditsRemaining: refreshedUser?.creditsBalance ?? deductRes.balance,
      user: refreshedUser,
      quota,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Credit settlement failed.' }, 500);
  }
}

