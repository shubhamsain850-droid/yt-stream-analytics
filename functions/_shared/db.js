/**
 * Cloudflare D1 Persistence Layer for Users, Quota & Payments
 */

import { FREE_DAILY_LIMIT, GUEST_DAILY_LIMIT, getTodayUtc } from './security.js';

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    givenName: row.given_name,
    picture: row.picture || null,
    tier: row.tier === 'pro' ? 'pro' : 'free',
    proPlan: row.pro_plan || null,
    proExpiresAt: row.pro_expires_at || null,
  };
}

/**
 * Loads user and automatically expires time-limited passes (e.g., 24h Day Pass) when past pro_expires_at.
 */
export async function resolveActiveUser(db, userId) {
  if (!userId) return null;
  const row = await db.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first();
  if (!row) return null;

  if (row.tier === 'pro' && row.pro_expires_at) {
    const expMs = Date.parse(row.pro_expires_at);
    if (!Number.isNaN(expMs) && expMs <= Date.now()) {
      const nowIso = new Date().toISOString();
      await db
        .prepare(
          "UPDATE users SET tier = 'free', pro_plan = NULL, pro_expires_at = NULL, updated_at = ?1 WHERE id = ?2"
        )
        .bind(nowIso, row.id)
        .run();
      row.tier = 'free';
      row.pro_plan = null;
      row.pro_expires_at = null;
      row.updated_at = nowIso;
    }
  }

  return serializeUser(row);
}

export async function findUserByEmail(db, email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const row = await db
    .prepare('SELECT * FROM users WHERE LOWER(email) = ?1')
    .bind(normalized)
    .first();
  return row ? resolveActiveUser(db, row.id) : null;
}

/**
 * Inserts or updates Google user profile without resetting active PRO tier or expiry.
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

export async function getSubjectUsageCount(db, subjectKey, dateKey = getTodayUtc()) {
  const row = await db
    .prepare('SELECT used_count FROM daily_usage WHERE subject_key = ?1 AND usage_date = ?2')
    .bind(subjectKey, dateKey)
    .first();
  return row ? Number(row.used_count || 0) : 0;
}

/**
 * Atomically checks and consumes `amount` audits up to `limit` for a subject on `dateKey`.
 */
export async function consumeSubjectQuota(db, subjectKey, dateKey, amount, limit) {
  const count = Math.max(0, Math.floor(Number(amount) || 0));
  if (count === 0) {
    const used = await getSubjectUsageCount(db, subjectKey, dateKey);
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
    .bind(subjectKey, dateKey, nowIso)
    .run();

  const updated = await db
    .prepare(
      `UPDATE daily_usage
       SET used_count = used_count + ?4, updated_at = ?3
       WHERE subject_key = ?1 AND usage_date = ?2 AND (used_count + ?4) <= ?5
       RETURNING used_count`
    )
    .bind(subjectKey, dateKey, nowIso, count, limit)
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

  const currentUsed = await getSubjectUsageCount(db, subjectKey, dateKey);
  return {
    allowed: false,
    used: currentUsed,
    limit,
    remaining: Math.max(0, limit - currentUsed),
  };
}

export async function buildQuotaSnapshot(db, user, guestSubjectKey) {
  const dateKey = getTodayUtc();
  if (!user) {
    const guestUsed = await getSubjectUsageCount(db, guestSubjectKey, dateKey);
    return {
      date: dateKey,
      guestUsed,
      userUsed: 0,
      guestLimit: GUEST_DAILY_LIMIT,
      freeLimit: FREE_DAILY_LIMIT,
      remaining: Math.max(0, GUEST_DAILY_LIMIT - guestUsed),
    };
  }

  if (user.tier === 'pro') {
    return {
      date: dateKey,
      guestUsed: 0,
      userUsed: 0,
      guestLimit: GUEST_DAILY_LIMIT,
      freeLimit: FREE_DAILY_LIMIT,
      remaining: null,
    };
  }

  const userUsed = await getSubjectUsageCount(db, `user:${user.id}`, dateKey);
  return {
    date: dateKey,
    guestUsed: 0,
    userUsed,
    guestLimit: GUEST_DAILY_LIMIT,
    freeLimit: FREE_DAILY_LIMIT,
    remaining: Math.max(0, FREE_DAILY_LIMIT - userUsed),
  };
}

export async function recordPendingCheckout(db, { sessionId, userId, email, plan }) {
  const nowIso = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO payments (id, user_id, email, plan, provider, session_id, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, 'dodo', ?1, 'pending', ?5, ?5)
       ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`
    )
    .bind(sessionId, userId, email || null, plan, nowIso)
    .run();
}

export async function getLatestPendingCheckoutForUser(db, userId) {
  return db
    .prepare(
      "SELECT * FROM payments WHERE user_id = ?1 AND provider = 'dodo' ORDER BY created_at DESC LIMIT 1"
    )
    .bind(userId)
    .first();
}

/**
 * Unlocks PRO access for verified payments/subscriptions in D1.
 */
export async function grantProAccess(
  db,
  { userId, email, plan, paymentId, sessionId, subscriptionId, customerId, expiresAt, rawEventType }
) {
  const nowIso = new Date().toISOString();
  let resolvedUser = userId ? await db.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first() : null;

  if (!resolvedUser && sessionId) {
    const pRow = await db.prepare('SELECT user_id FROM payments WHERE session_id = ?1').bind(sessionId).first();
    if (pRow?.user_id) {
      resolvedUser = await db.prepare('SELECT * FROM users WHERE id = ?1').bind(pRow.user_id).first();
    }
  }
  if (!resolvedUser && subscriptionId) {
    resolvedUser = await db
      .prepare('SELECT * FROM users WHERE dodo_subscription_id = ?1')
      .bind(subscriptionId)
      .first();
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

  const normalizedPlan = plan === 'day_pass' ? 'day_pass' : 'monthly_pro';
  let nextExpiryIso = expiresAt || null;

  if (!nextExpiryIso) {
    const durationMs =
      normalizedPlan === 'day_pass'
        ? 24 * 60 * 60 * 1000
        : 35 * 24 * 60 * 60 * 1000; // 35-day buffer refreshed by recurring webhooks
    const existingMs =
      resolvedUser.tier === 'pro' && resolvedUser.pro_expires_at && normalizedPlan === 'day_pass'
        ? Date.parse(resolvedUser.pro_expires_at)
        : 0;
    const baseMs = !Number.isNaN(existingMs) && existingMs > Date.now() ? existingMs : Date.now();
    nextExpiryIso = new Date(baseMs + durationMs).toISOString();
  }

  await db
    .prepare(
      `UPDATE users
       SET tier = 'pro',
           pro_plan = ?1,
           pro_expires_at = ?2,
           dodo_customer_id = COALESCE(?3, dodo_customer_id),
           dodo_subscription_id = COALESCE(?4, dodo_subscription_id),
           updated_at = ?5
       WHERE id = ?6`
    )
    .bind(
      normalizedPlan,
      nextExpiryIso,
      customerId || null,
      subscriptionId || null,
      nowIso,
      resolvedUser.id
    )
    .run();

  const recordId = paymentId || sessionId || subscriptionId || `dodo_${Date.now()}`;
  await db
    .prepare(
      `INSERT INTO payments (
         id, user_id, email, plan, provider, session_id, payment_id, subscription_id, status, raw_event_type, created_at, updated_at
       ) VALUES (?1, ?2, ?3, ?4, 'dodo', ?5, ?6, ?7, 'succeeded', ?8, ?9, ?9)
       ON CONFLICT(id) DO UPDATE SET
         status = 'succeeded',
         payment_id = COALESCE(excluded.payment_id, payments.payment_id),
         subscription_id = COALESCE(excluded.subscription_id, payments.subscription_id),
         raw_event_type = excluded.raw_event_type,
         updated_at = excluded.updated_at`
    )
    .bind(
      recordId,
      resolvedUser.id,
      email || resolvedUser.email,
      normalizedPlan,
      sessionId || null,
      paymentId || null,
      subscriptionId || null,
      rawEventType || null,
      nowIso
    )
    .run();

  return resolveActiveUser(db, resolvedUser.id);
}

export async function revokeProAccess(
  db,
  { userId, subscriptionId, email, status = 'cancelled', rawEventType, keepUntilIso = null }
) {
  const nowIso = new Date().toISOString();
  let target = userId ? await db.prepare('SELECT * FROM users WHERE id = ?1').bind(userId).first() : null;
  if (!target && subscriptionId) {
    target = await db
      .prepare('SELECT * FROM users WHERE dodo_subscription_id = ?1')
      .bind(subscriptionId)
      .first();
  }
  if (!target && email) {
    target = await db
      .prepare('SELECT * FROM users WHERE LOWER(email) = ?1')
      .bind(email.trim().toLowerCase())
      .first();
  }
  if (!target) return null;

  const keepMs = keepUntilIso ? Date.parse(keepUntilIso) : 0;
  if (keepUntilIso && !Number.isNaN(keepMs) && keepMs > Date.now()) {
    await db
      .prepare('UPDATE users SET pro_expires_at = ?1, updated_at = ?2 WHERE id = ?3')
      .bind(new Date(keepMs).toISOString(), nowIso, target.id)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE users SET tier = 'free', pro_plan = NULL, pro_expires_at = NULL, updated_at = ?1 WHERE id = ?2"
      )
      .bind(nowIso, target.id)
      .run();
  }

  if (subscriptionId) {
    await db
      .prepare(
        `UPDATE payments SET status = ?1, raw_event_type = ?2, updated_at = ?3
         WHERE subscription_id = ?4`
      )
      .bind(status, rawEventType || status, nowIso, subscriptionId)
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

