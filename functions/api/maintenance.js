import { jsonResponse } from '../_shared/security.js';
import { resolveRequestIdentity } from '../_shared/context.js';

const ADMIN_EMAILS = new Set([
  'shubhamsain850@gmail.com',
  'support@tubemetrix.net',
]);

const MASTER_ADMIN_PIN = 'tubemetrix2026';

export async function onRequestGet({ env }) {
  try {
    if (!env.DB) {
      return jsonResponse({ enabled: false, reason: 'Database unconfigured' });
    }

    const row = await env.DB.prepare(
      "SELECT value, updated_at FROM app_settings WHERE key = 'maintenance_mode'"
    ).first();

    if (!row || !row.value) {
      return jsonResponse({ enabled: false });
    }

    let config = {};
    try {
      config = JSON.parse(row.value);
    } catch {
      return jsonResponse({ enabled: false });
    }

    const now = Date.now();
    let isEnabled = Boolean(config.enabled);
    let remainingSeconds = 0;

    if (isEnabled && config.endTime) {
      const endMs = new Date(config.endTime).getTime();
      if (!isNaN(endMs)) {
        if (now >= endMs) {
          // Maintenance time has elapsed; auto-disable
          isEnabled = false;
        } else {
          remainingSeconds = Math.max(0, Math.floor((endMs - now) / 1000));
        }
      }
    }

    return jsonResponse({
      enabled: isEnabled,
      endTime: config.endTime || null,
      durationMinutes: config.durationMinutes || 60,
      remainingSeconds,
      reason: config.reason || 'We are performing scheduled maintenance and performance upgrades. We will be back online shortly!',
      updatedAt: row.updated_at,
    });
  } catch (err) {
    return jsonResponse({ enabled: false, error: err.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      return jsonResponse({ error: 'db_unavailable' }, 500);
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400);
    }

    const { enabled, durationMinutes, customEndTime, reason, adminPin } = body;

    // Check authorization: Either Master PIN matches OR caller is logged in as Admin
    let isAuthorized = false;
    let actorEmail = 'admin';

    if (adminPin && String(adminPin).trim() === MASTER_ADMIN_PIN) {
      isAuthorized = true;
      actorEmail = 'master_pin_admin';
    } else {
      try {
        const { user } = await resolveRequestIdentity(request, env);
        if (user && user.email && ADMIN_EMAILS.has(user.email.toLowerCase())) {
          isAuthorized = true;
          actorEmail = user.email;
        }
      } catch {
        // Guest or unconfigured session secret
      }
    }

    if (!isAuthorized) {
      return jsonResponse({ error: 'unauthorized', message: 'Admin PIN (tubemetrix2026) or Owner session required.' }, 401);
    }

    const targetEnabled = Boolean(enabled);
    let finalEndTime = null;
    const durMins = Math.max(1, Number(durationMinutes) || 60);

    if (targetEnabled) {
      if (customEndTime) {
        finalEndTime = new Date(customEndTime).toISOString();
      } else {
        finalEndTime = new Date(Date.now() + durMins * 60 * 1000).toISOString();
      }
    }

    const newConfig = {
      enabled: targetEnabled,
      durationMinutes: durMins,
      endTime: finalEndTime,
      reason: reason?.trim() || 'We are performing scheduled maintenance and rolling out new features. We will be back online shortly!',
      updatedBy: actorEmail,
      updatedAt: new Date().toISOString(),
    };

    await env.DB.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('maintenance_mode', ?1, datetime('now'))"
    )
      .bind(JSON.stringify(newConfig))
      .run();

    return jsonResponse({
      success: true,
      config: newConfig,
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
