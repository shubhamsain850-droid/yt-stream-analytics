import { getRequestCountry, jsonResponse } from '../../_shared/security.js';
import { buildQuotaSnapshot, isIndiaFirstPurchaseEligible } from '../../_shared/db.js';
import { CREDIT_PACKS, getDodoConfig } from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

export async function onRequestGet({ request, env }) {
  try {
    const { user, guestSubjectKey } = await resolveRequestIdentity(request, env);
    const country = getRequestCountry(request);
    const [quota, indiaFirstPurchaseEligible] = await Promise.all([
      buildQuotaSnapshot(env.DB, user, guestSubjectKey),
      isIndiaFirstPurchaseEligible(env.DB, user, country),
    ]);
    const dodo = getDodoConfig(env);

    return jsonResponse({
      authenticated: Boolean(user),
      user,
      quota,
      region: {
        country,
        isIndia: country === 'IN',
        indiaFirstPurchaseEligible,
      },
      payments: {
        provider: 'dodo',
        envMode: dodo.envMode,
        configured: dodo.configured,
        packsConfigured: {
          credits_10: Boolean(dodo.apiKey && dodo.products.credits_10),
          credits_30: Boolean(dodo.apiKey && dodo.products.credits_30),
          credits_100: Boolean(dodo.apiKey && dodo.products.credits_100),
        },
        packs: CREDIT_PACKS,
      },
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Server error' }, 500);
  }
}
