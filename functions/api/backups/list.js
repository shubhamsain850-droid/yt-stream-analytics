import { jsonResponse } from '../../_shared/security.js';
import { resolveRequestIdentity } from '../../_shared/context.js';
import {
  BACKUP_RETENTION_DAYS,
  isUserPremiumForBackups,
  listUserBackups,
} from '../../_shared/db.js';

export async function onRequestGet({ request, env }) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse({ error: 'Authentication required.', code: 'auth_required' }, 401);
    }

    const premium = await isUserPremiumForBackups(env.DB, user);
    if (!premium) {
      return jsonResponse({
        isPremiumEligible: false,
        r2Configured: Boolean(env?.BACKUPS),
        retentionDays: BACKUP_RETENTION_DAYS,
        backups: [],
      });
    }

    const backups = await listUserBackups(env.DB, env?.BACKUPS || null, user.id);
    return jsonResponse({
      isPremiumEligible: true,
      r2Configured: Boolean(env?.BACKUPS),
      retentionDays: BACKUP_RETENTION_DAYS,
      backups,
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Unable to load cloud backups.' }, 500);
  }
}

