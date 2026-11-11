/**
 * Cloudflare D1 Persistence Layer for Users, Weekly Free Quota, Credits & Payments
 */

import { FREE_WEEKLY_LIMIT, GUEST_WEEKLY_LIMIT, getWeekKeyUtc } from './security.js';
import { getCreditPack } from './dodo.js';

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    givenName: row.given_name,
    picture: row.picture || null,
    creditsBalance: Math.max(0, Number(row.credits_balance || 0)),
    totalPurchasedCredits: Math.max(0, Number(row.total_purchased_credits || 0)),
  };
}

export async function resolveActiveUser(db, userId) {
  if (!userId) return null;
  const row = await db.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first();
  return row ? serializeUser(row) : null;
}

export async function findUserByEmail(db, email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const row = await db
    .prepare('SELECT * FROM users WHERE LOWER(email) = ?1')
    .bind(normalized)
    .first();
  return row ? serializeUser(row) : null;
}

/**
 * Inserts or updates Google user profile without touching existing credit balance.
 */
export async function upsertGoogleUser(db, claims) {
  const nowIso = new Date().toISOString();
  const id = String(claims.sub);
  const email = String(claims.email).trim().toLowerCase();
  const name = claims.name || email.split('@')[0];
  const givenName = claims.given_name || name.split(' ')[0] || 'Creator';
  const picture = claims.picture || null;

  await db
    .prepare(
      `INSERT INTO users (id, email, name, given_name, picture, tier, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'free', ?6, ?6)
       ON CONFLICT(id) DO UPDATE SET
         email = excluded.email,
         name = excluded.name,
         given_name = excluded.given_name,
         picture = excluded.picture,
         updated_at = excluded.updated_at`
    )
    .bind(id, email, name, givenName, picture, nowIso)
    .run();

  return resolveActiveUser(db, id);
}

export async function hasCompletedPurchase(db, userId) {
  if (!userId) return false;
  const uRow = await db
    .prepare('SELECT total_purchased_credits FROM users WHERE id = ?1')
    .bind(userId)
    .first();
  if (Number(uRow?.total_purchased_credits || 0) > 0) {
    return true;
  }
  const pRow = await db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM payments WHERE user_id = ?1 AND status IN ('succeeded', 'active', 'completed')"
    )
    .bind(userId)
    .first();
  return Number(pRow?.cnt || 0) > 0;
}

export async function isIndiaFirstPurchaseEligible(db, user, countryCode) {
  if (String(countryCode || '').toUpperCase() !== 'IN') {
    return false;
  }
  if (!user?.id) {
    return true;
  }
  const prior = await hasCompletedPurchase(db, user.id);
  return !prior;
}

export async function getSubjectUsageCount(db, subjectKey, weekKey = getWeekKeyUtc()) {
  const row = await db
    .prepare('SELECT used_count FROM daily_usage WHERE subject_key = ?1 AND usage_date = ?2')
    .bind(subjectKey, weekKey)
    .first();
  return row ? Number(row.used_count || 0) : 0;
}

/**
 * Atomically checks and consumes `amount` single-stream weekly runs up to `limit` for `weekKey`.
 */
export async function consumeSubjectQuota(db, subjectKey, weekKey, amount, limit) {
  const count = Math.max(0, Math.floor(Number(amount) || 0));
  if (count === 0) {
    const used = await getSubjectUsageCount(db, subjectKey, weekKey);
    return {
      allowed: used <= limit,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  const nowIso = new Date().toISOString();
  await db
    .prepare(
      'INSERT OR IGNORE INTO daily_usage (subject_key, usage_date, used_count, updated_at) VALUES (?1, ?2, 0, ?3)'
    )
    .bind(subjectKey, weekKey, nowIso)
    .run();

  const updated = await db
    .prepare(
      `UPDATE daily_usage
       SET used_count = used_count + ?4, updated_at = ?3
       WHERE subject_key = ?1 AND usage_date = ?2 AND (used_count + ?4) <= ?5
       RETURNING used_count`
    )
    .bind(subjectKey, weekKey, nowIso, count, limit)
    .first();

  if (updated) {
    const used = Number(updated.used_count || 0);
    return {
      allowed: true,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  }

  const currentUsed = await getSubjectUsageCount(db, subjectKey, weekKey);
  return {
    allowed: false,
    used: currentUsed,
    limit,
    remaining: Math.max(0, limit - currentUsed),
  };
}

export async function buildQuotaSnapshot(db, user, guestSubjectKey) {
  const weekKey = getWeekKeyUtc();
  if (!user) {
    const guestUsed = await getSubjectUsageCount(db, guestSubjectKey, weekKey);
    return {
      period: 'weekly',
      week: weekKey,
      guestUsed,
      userUsed: 0,
      guestLimit: GUEST_WEEKLY_LIMIT,
      freeLimit: FREE_WEEKLY_LIMIT,
      remaining: Math.max(0, GUEST_WEEKLY_LIMIT - guestUsed),
    };
  }

  const userUsed = await getSubjectUsageCount(db, `user:${user.id}`, weekKey);
  return {
    period: 'weekly',
    week: weekKey,
    guestUsed: 0,
    userUsed,
    guestLimit: GUEST_WEEKLY_LIMIT,
    freeLimit: FREE_WEEKLY_LIMIT,
    remaining: Math.max(0, FREE_WEEKLY_LIMIT - userUsed),
  };
}

/**
 * Atomically deducts credits from a signed-in user and writes an audit row in credit_ledger.
 */
export async function consumeUserCredits(
  db,
  userId,
  creditsNeeded,
  { reason = 'run_consume', meta = null, clampToBalance = false, refId = null } = {}
) {
  const amount = Math.max(0, Math.floor(Number(creditsNeeded) || 0));
  if (!userId) {
    return { allowed: false, deducted: 0, balance: 0 };
  }

  const row = await db
    .prepare('SELECT credits_balance FROM users WHERE id = ?1')
    .bind(userId)
    .first();
  if (!row) {
    return { allowed: false, deducted: 0, balance: 0 };
  }

  const currentBalance = Math.max(0, Number(row.credits_balance || 0));
  if (amount === 0) {
    return { allowed: true, deducted: 0, balance: currentBalance };
  }

  const toDeduct = clampToBalance ? Math.min(amount, currentBalance) : amount;
  if (toDeduct === 0) {
    return {
      allowed: Boolean(clampToBalance),
      deducted: 0,
      balance: currentBalance,
    };
  }

  const nowIso = new Date().toISOString();
  const updated = await db
    .prepare(
      `UPDATE users
       SET credits_balance = credits_balance - ?2, updated_at = ?3
       WHERE id = ?1 AND credits_balance >= ?2
       RETURNING credits_balance`
    )
    .bind(userId, toDeduct, nowIso)
    .first();

  if (!updated) {
    const latest = await db
      .prepare('SELECT credits_balance FROM users WHERE id = ?1')
      .bind(userId)
      .first();
    return {
      allowed: false,
      deducted: 0,
      balance: Math.max(0, Number(latest?.credits_balance || 0)),
    };
  }

  await db
    .prepare(
      `INSERT INTO credit_ledger (id, user_id, delta, reason, ref_id, meta_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(
      crypto.randomUUID(),
      userId,
      -toDeduct,
      reason,
      refId || null,
      meta ? JSON.stringify(meta) : null,
      nowIso
    )
    .run();

  return {
    allowed: true,
    deducted: toDeduct,
    balance: Math.max(0, Number(updated.credits_balance || 0)),
  };
}

export async function recordPendingCheckout(db, { sessionId, userId, email, packId }) {
  const nowIso = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO payments (id, user_id, email, plan, provider, session_id, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 'dodo', ?1, 'pending', ?5, ?5)
       ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`
    )
    .bind(sessionId, userId, email || null, packId, nowIso)
    .run();
}

export async function getLatestCheckoutForUser(db, userId) {
  return db
    .prepare(
      "SELECT * FROM payments WHERE user_id = ?1 AND provider = 'dodo' ORDER BY created_at DESC LIMIT 1"
    )
    .bind(userId)
    .first();
}

/**
 * Idempotently grants prepaid credits for a verified Dodo purchase.
 */
export async function grantCreditPurchase(
  db,
  { userId, email, packId, paymentId, sessionId, customerId, rawEventType }
) {
  const pack = getCreditPack(packId);
  if (!pack) {
    throw new Error('Invalid or unknown credit pack.');
  }

  const nowIso = new Date().toISOString();
  let resolvedUser = userId
    ? await db.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first()
    : null;

  if (!resolvedUser && sessionId) {
    const pRow = await db
      .prepare('SELECT user_id FROM payments WHERE session_id = ?1 LIMIT 1')
      .bind(sessionId)
      .first();
    if (pRow?.user_id) {
      resolvedUser = await db.prepare('SELECT * FROM users WHERE id = ?1').bind(pRow.user_id).first();
    }
  }
  if (!resolvedUser && email) {
    resolvedUser = await db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ?1')
      .bind(email.trim().toLowerCase())
      .first();
  }

  if (!resolvedUser) {
    return null;
  }

  // Prevent duplicate crediting across paymentId / sessionId / webhook+verify race
  if (paymentId) {
    const paidByPay = await db
      .prepare("SELECT id FROM payments WHERE payment_id = ?1 AND status = 'succeeded' LIMIT 1")
      .bind(paymentId)
      .first();
    if (paidByPay) {
      return {
        alreadyGranted: true,
        creditsAdded: 0,
        user: await resolveActiveUser(db, resolvedUser.id),
      };
    }
  }
  if (sessionId) {
    const paidBySess = await db
      .prepare("SELECT id FROM payments WHERE session_id = ?1 AND status = 'succeeded' LIMIT 1")
      .bind(sessionId)
      .first();
    if (paidBySess) {
      return {
        alreadyGranted: true,
        creditsAdded: 0,
        user: await resolveActiveUser(db, resolvedUser.id),
      };
    }
  }

  const payRef = paymentId ? `pay:${paymentId}` : null;
  const sessRef = sessionId ? `sess:${sessionId}` : null;
  const primaryRef = payRef || sessRef || `evt:${crypto.randomUUID()}`;

  if (payRef && sessRef) {
    const existingLedger = await db
      .prepare('SELECT id FROM credit_ledger WHERE ref_id = ?1 OR ref_id = ?2 LIMIT 1')
      .bind(payRef, sessRef)
      .first();
    if (existingLedger) {
      return {
        alreadyGranted: true,
        creditsAdded: 0,
        user: await resolveActiveUser(db, resolvedUser.id),
      };
    }
  }

  const ledgerRes = await db
    .prepare(
      `INSERT OR IGNORE INTO credit_ledger (id, user_id, delta, reason, ref_id, meta_json, created_at)
       VALUES (?1, ?2, ?3, 'purchase', ?4, ?5, ?6)`
    )
    .bind(
      crypto.randomUUID(),
      resolvedUser.id,
      pack.credits,
      primaryRef,
      JSON.stringify({ packId: pack.id, paymentId: paymentId || null, sessionId: sessionId || null }),
      nowIso
    )
    .run();

  const inserted = Boolean(ledgerRes?.meta?.changes && ledgerRes.meta.changes > 0);
  if (!inserted) {
    return {
      alreadyGranted: true,
      creditsAdded: 0,
      user: await resolveActiveUser(db, resolvedUser.id),
    };
  }

  await db
    .prepare(
      `UPDATE users
       SET credits_balance = credits_balance + ?1,
           total_purchased_credits = total_purchased_credits + ?1,
           dodo_customer_id = COALESCE(?2, dodo_customer_id),
           updated_at = ?3
       WHERE id = ?4`
    )
    .bind(pack.credits, customerId || null, nowIso, resolvedUser.id)
    .run();

  const recordId = paymentId || sessionId || `dodo_${Date.now()}`;
  await db
    .prepare(
      `INSERT INTO payments (
         id, user_id, email, plan, provider, session_id, payment_id, subscription_id, status, raw_event_type, created_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, 'dodo', ?5, ?6, NULL, 'succeeded', ?7, ?8, ?8)
       ON CONFLICT(id) DO UPDATE SET
         plan = excluded.plan,
         status = 'succeeded',
         session_id = COALESCE(excluded.session_id, payments.session_id),
         payment_id = COALESCE(excluded.payment_id, payments.payment_id),
         raw_event_type = excluded.raw_event_type,
         updated_at = excluded.updated_at`
    )
    .bind(
      recordId,
      resolvedUser.id,
      email || resolvedUser.email,
      pack.id,
      sessionId || null,
      paymentId || null,
      rawEventType || 'payment.succeeded',
      nowIso
    )
    .run();

  if (sessionId && sessionId !== recordId) {
    await db
      .prepare(
        `UPDATE payments
         SET status = 'succeeded',
             payment_id = COALESCE(?1, payment_id),
             plan = ?2,
             raw_event_type = ?3,
             updated_at = ?4
         WHERE session_id = ?5`
      )
      .bind(paymentId || null, pack.id, rawEventType || 'payment.succeeded', nowIso, sessionId)
      .run();
  }

  return {
    alreadyGranted: false,
    creditsAdded: pack.credits,
    user: await resolveActiveUser(db, resolvedUser.id),
  };
}

/**
 * Reverses credits idempotently on Dodo refund.succeeded or dispute.opened events.
 */
export async function revokeCreditPurchase(
  db,
  { userId, paymentId, sessionId, email, status = 'refunded', rawEventType }
) {
  const nowIso = new Date().toISOString();

  let paymentRow = null;
  if (paymentId) {
    paymentRow = await db
      .prepare('SELECT * FROM payments WHERE payment_id = ?1 LIMIT 1')
      .bind(paymentId)
      .first();
  }
  if (!paymentRow && sessionId) {
    paymentRow = await db
      .prepare('SELECT * FROM payments WHERE session_id = ?1 LIMIT 1')
      .bind(sessionId)
      .first();
  }

  let target = userId
    ? await db.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first()
    : null;
  if (!target && paymentRow?.user_id) {
    target = await db.prepare('SELECT * FROM users WHERE id = ?1').bind(paymentRow.user_id).first();
  }
  if (!target && email) {
    target = await db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ?1')
      .bind(email.trim().toLowerCase())
      .first();
  }
  if (!target) return null;

  const ledgerKeys = [];
  if (paymentId) ledgerKeys.push(`purchase:${paymentId}`);
  if (sessionId) ledgerKeys.push(`purchase:${sessionId}`);
  if (paymentRow?.payment_id) ledgerKeys.push(`purchase:${paymentRow.payment_id}`);
  if (paymentRow?.session_id) ledgerKeys.push(`purchase:${paymentRow.session_id}`);

  let grantedLedgerDelta = 0;
  for (const refKey of ledgerKeys) {
    const row = await db
      .prepare('SELECT delta FROM credit_ledger WHERE ref_id = ?1 AND delta > 0 LIMIT 1')
      .bind(refKey)
      .first();
    if (row && Number(row.delta) > 0) {
      grantedLedgerDelta = Number(row.delta);
      break;
    }
  }

  const pack = getCreditPack(paymentRow?.plan || 'in_10');
  const clawbackCredits = grantedLedgerDelta > 0 ? grantedLedgerDelta : pack ? pack.credits : 10;
  const refundRef = `refund:${paymentId || sessionId || crypto.randomUUID()}`;

  const ledgerRes = await db
    .prepare(
      `INSERT OR IGNORE INTO credit_ledger (id, user_id, delta, reason, ref_id, meta_json, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(
      crypto.randomUUID(),
      target.id,
      -clawbackCredits,
      status,
      refundRef,
      JSON.stringify({ paymentId: paymentId || null, sessionId: sessionId || null, rawEventType }),
      nowIso
    )
    .run();

  if (ledgerRes?.meta?.changes && ledgerRes.meta.changes > 0) {
    await db
      .prepare(
        `UPDATE users
         SET credits_balance = MAX(0, credits_balance - ?1),
             updated_at = ?2
         WHERE id = ?3`
      )
      .bind(clawbackCredits, nowIso, target.id)
      .run();
  }

  if (paymentId) {
    await db
      .prepare(
        'UPDATE payments SET status = ?1, raw_event_type = ?2, updated_at = ?3 WHERE payment_id = ?4'
      )
      .bind(status, rawEventType || status, nowIso, paymentId)
      .run();
  } else if (sessionId) {
    await db
      .prepare(
        'UPDATE payments SET status = ?1, raw_event_type = ?2, updated_at = ?3 WHERE session_id = ?4'
      )
      .bind(status, rawEventType || status, nowIso, sessionId)
      .run();
  }

  return resolveActiveUser(db, target.id);
}

export async function markWebhookProcessed(db, webhookId, eventType) {
  if (!webhookId) return true;
  const nowIso = new Date().toISOString();
  const res = await db
    .prepare(
      'INSERT OR IGNORE INTO webhook_events (webhook_id, event_type, processed_at) VALUES (?1, ?2, ?3)'
    )
    .bind(webhookId, eventType || 'unknown', nowIso)
    .run();
  return Boolean(res?.meta?.changes && res.meta.changes > 0);
}
