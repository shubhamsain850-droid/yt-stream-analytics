import {
  FREE_DAILY_LIMIT,
  GUEST_DAILY_LIMIT,
  getTodayUtc,
  jsonResponse,
} from '../../_shared/security.js';
import { buildQuotaSnapshot, consumeSubjectQuota } from '../../_shared/db.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

export async function onRequestPost({ request, env }) {
  try {
    const { user, guestSubjectKey } = await resolveRequestIdentity(request, env);

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const requirePro = Boolean(body?.requirePro);
    const rawCount = Number(body?.count ?? 1);
    const count = Number.isFinite(rawCount) ? Math.max(0, Math.min(500, Math.floor(rawCount))) : 1;

    // 1. Server-side PRO Feature Gate (Bulk Channel Audit, Unlimited Queue, etc.)
    if (requirePro && (!user || user.tier !== 'pro')) {
      const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
      return jsonResponse(
        {
          allowed: false,
          reason: 'pro_required',
          user,
          quota,
          message: 'Active PRO membership required for this feature.',
        },
        403
      );
    }

    // 2. Verified PRO users have unlimited daily audits
    if (user && user.tier === 'pro') {
      const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
      return jsonResponse({
        allowed: true,
        reason: 'pro',
        user,
        quota,
      });
    }

    // 3. Enforce atomic daily quota in D1 for Guests (2/day) & Free accounts (5/day)
    const isLoggedIn = Boolean(user);
    const subjectKey = isLoggedIn ? `user:${user.id}` : guestSubjectKey;
    const limit = isLoggedIn ? FREE_DAILY_LIMIT : GUEST_DAILY_LIMIT;
    const dateKey = getTodayUtc();

    const result = await consumeSubjectQuota(env.DB, subjectKey, dateKey, count, limit);
    const quota = {
      date: dateKey,
      guestUsed: isLoggedIn ? 0 : result.used,
      userUsed: isLoggedIn ? result.used : 0,
      guestLimit: GUEST_DAILY_LIMIT,
      freeLimit: FREE_DAILY_LIMIT,
      remaining: result.remaining,
    };

    if (!result.allowed) {
      return jsonResponse(
        {
          allowed: false,
          reason: isLoggedIn ? 'free_limit' : 'guest_limit',
          user,
          quota,
          requested: count,
        },
        403
      );
    }

    return jsonResponse({
      allowed: true,
      reason: isLoggedIn ? 'free' : 'guest',
      user,
      quota,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Quota verification failed.' }, 500);
  }
}

