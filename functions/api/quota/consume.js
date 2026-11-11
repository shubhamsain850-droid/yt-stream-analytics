import {
  FREE_WEEKLY_LIMIT,
  GUEST_WEEKLY_LIMIT,
  getWeekKeyUtc,
  jsonResponse,
} from '../../_shared/security.js';
import {
  buildQuotaSnapshot,
  consumeSubjectQuota,
  consumeUserCredits,
  resolveActiveUser,
} from '../../_shared/db.js';
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

    const rawMode = String(body?.mode || '').trim().toLowerCase();
    const requireProLegacy = Boolean(body?.requirePro);
    const mode =
      rawMode === 'channel' || rawMode === 'batch' || rawMode === 'comments' || rawMode === 'single'
        ? rawMode
        : requireProLegacy
          ? 'channel'
          : 'single';

    const rawCount = Number(body?.count ?? 1);
    const count = Number.isFinite(rawCount) ? Math.max(0, Math.min(2000, Math.floor(rawCount))) : 1;
    const rawCredits = Number(body?.credits ?? Math.max(1, count));
    const creditsNeeded = Number.isFinite(rawCredits)
      ? Math.max(1, Math.min(2000, Math.floor(rawCredits)))
      : Math.max(1, count || 1);
    const checkOnly = Boolean(body?.checkOnly);

    // ── Mode B/C/High-Volume Comments: Credits-Only, ZERO Weekly Free ──
    if (mode === 'channel' || mode === 'batch' || mode === 'comments') {
      if (!user) {
        const quota = await buildQuotaSnapshot(env.DB, null, guestSubjectKey);
        return jsonResponse(
          {
            allowed: false,
            reason: 'auth_required',
            mode,
            creditsNeeded,
            user: null,
            quota,
            message: 'Sign in with Google and use Credits for Bulk & High-Volume modes.',
          },
          403
        );
      }

      if (checkOnly) {
        const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
        if (user.creditsBalance < creditsNeeded) {
          return jsonResponse(
            {
              allowed: false,
              reason: 'credits_required',
              mode,
              creditsNeeded,
              creditsBalance: user.creditsBalance,
              user,
              quota,
              message: `Need ${creditsNeeded} credit(s) (balance: ${user.creditsBalance}).`,
            },
            403
          );
        }
        return jsonResponse({
          allowed: true,
          reason: 'credits_preview',
          mode,
          creditsNeeded,
          creditsDeducted: 0,
          user,
          quota,
        });
      }

      const deductRes = await consumeUserCredits(env.DB, user.id, creditsNeeded, {
        reason:
          mode === 'channel'
            ? 'channel_date_range'
            : mode === 'comments'
              ? 'video_comments_base'
              : 'custom_url_batch',
        meta: { count, creditsNeeded },
      });

      const refreshedUser = await resolveActiveUser(env.DB, user.id);
      const quota = await buildQuotaSnapshot(env.DB, refreshedUser, guestSubjectKey);

      if (!deductRes.allowed) {
        return jsonResponse(
          {
            allowed: false,
            reason: 'credits_required',
            mode,
            creditsNeeded,
            creditsBalance: deductRes.balance,
            user: refreshedUser,
            quota,
          },
          403
        );
      }

      return jsonResponse({
        allowed: true,
        reason: 'credits',
        mode,
        creditsDeducted: deductRes.deducted,
        user: refreshedUser,
        quota,
      });
    }

    // ── Mode A/D: Single Stream / Single Video Comments ──
    // Multi-credit single video downloads (e.g. >1,000 comments -> 2+ credits) always use Credits.
    const isLoggedIn = Boolean(user);
    if (creditsNeeded > 1) {
      if (!user) {
        const quota = await buildQuotaSnapshot(env.DB, null, guestSubjectKey);
        return jsonResponse(
          {
            allowed: false,
            reason: 'auth_required',
            mode: 'single',
            creditsNeeded,
            user: null,
            quota,
          },
          403
        );
      }
      if (checkOnly) {
        const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
        if (user.creditsBalance < creditsNeeded) {
          return jsonResponse(
            {
              allowed: false,
              reason: 'credits_required',
              mode: 'single',
              creditsNeeded,
              creditsBalance: user.creditsBalance,
              user,
              quota,
            },
            403
          );
        }
        return jsonResponse({
          allowed: true,
          reason: 'credits_preview',
          mode: 'single',
          creditsNeeded,
          creditsDeducted: 0,
          user,
          quota,
        });
      }
      const deductRes = await consumeUserCredits(env.DB, user.id, creditsNeeded, {
        reason: 'single_high_volume',
        meta: { count, creditsNeeded },
      });
      const refreshedUser = await resolveActiveUser(env.DB, user.id);
      const quota = await buildQuotaSnapshot(env.DB, refreshedUser, guestSubjectKey);
      if (!deductRes.allowed) {
        return jsonResponse(
          {
            allowed: false,
            reason: 'credits_required',
            mode: 'single',
            creditsNeeded,
            creditsBalance: deductRes.balance,
            user: refreshedUser,
            quota,
          },
          403
        );
      }
      return jsonResponse({
        allowed: true,
        reason: 'credits',
        mode: 'single',
        creditsDeducted: deductRes.deducted,
        user: refreshedUser,
        quota,
      });
    }

    // Standard single stream: Weekly Free Allowance first (2/wk Guest, 3/wk Signed-In)
    const subjectKey = isLoggedIn ? `user:${user.id}` : guestSubjectKey;
    const limit = isLoggedIn ? FREE_WEEKLY_LIMIT : GUEST_WEEKLY_LIMIT;
    const weekKey = getWeekKeyUtc();
    const runCount = Math.max(1, count || 1);

    if (checkOnly) {
      const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
      const hasFree = quota.remaining >= runCount;
      const hasCredits = isLoggedIn && user.creditsBalance >= creditsNeeded;
      if (!hasFree && !hasCredits) {
        return jsonResponse(
          {
            allowed: false,
            reason: isLoggedIn ? 'credits_required' : 'guest_limit',
            mode: 'single',
            freeExhausted: true,
            creditsNeeded: 1,
            creditsBalance: user?.creditsBalance || 0,
            user,
            quota,
          },
          403
        );
      }
      return jsonResponse({
        allowed: true,
        reason: hasFree ? (isLoggedIn ? 'free' : 'guest') : 'credits_preview',
        mode: 'single',
        creditsDeducted: 0,
        user,
        quota,
      });
    }

    const freeResult = await consumeSubjectQuota(env.DB, subjectKey, weekKey, runCount, limit);
    const freeQuota = {
      period: 'weekly',
      week: weekKey,
      guestUsed: isLoggedIn ? 0 : freeResult.used,
      userUsed: isLoggedIn ? freeResult.used : 0,
      guestLimit: GUEST_WEEKLY_LIMIT,
      freeLimit: FREE_WEEKLY_LIMIT,
      remaining: freeResult.remaining,
    };

    if (freeResult.allowed) {
      return jsonResponse({
        allowed: true,
        reason: isLoggedIn ? 'free' : 'guest',
        mode: 'single',
        creditsDeducted: 0,
        user,
        quota: freeQuota,
      });
    }

    // Weekly free allowance exhausted -> Guest must sign in; Signed-in falls back to Credits
    if (!isLoggedIn) {
      return jsonResponse(
        {
          allowed: false,
          reason: 'guest_limit',
          mode: 'single',
          user: null,
          quota: freeQuota,
          requested: runCount,
        },
        403
      );
    }

    const creditRes = await consumeUserCredits(env.DB, user.id, 1, {
      reason: 'single_after_weekly_free',
      meta: { weekKey },
    });
    const refreshedUser = await resolveActiveUser(env.DB, user.id);

    if (!creditRes.allowed) {
      return jsonResponse(
        {
          allowed: false,
          reason: 'credits_required',
          mode: 'single',
          freeExhausted: true,
          creditsNeeded: 1,
          creditsBalance: creditRes.balance,
          user: refreshedUser,
          quota: freeQuota,
        },
        403
      );
    }

    return jsonResponse({
      allowed: true,
      reason: 'credits',
      mode: 'single',
      creditsDeducted: creditRes.deducted,
      user: refreshedUser,
      quota: freeQuota,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Quota verification failed.' }, 500);
  }
}
