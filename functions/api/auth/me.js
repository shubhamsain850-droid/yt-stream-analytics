import { jsonResponse } from '../../_shared/security.js';
import { buildQuotaSnapshot } from '../../_shared/db.js';
import { getDodoConfig } from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

export async function onRequestGet({ request, env }) {
  try {
    const { user, guestSubjectKey } = await resolveRequestIdentity(request, env);
    const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);
    const dodo = getDodoConfig(env);

    return jsonResponse({
      authenticated: Boolean(user),
      user,
      quota,
      payments: {
        provider: 'dodo',
        envMode: dodo.envMode,
        configured: dodo.configured,
        monthlyProConfigured: Boolean(dodo.apiKey && dodo.products.monthly_pro),
      },
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Server error' }, 500);
  }
}

