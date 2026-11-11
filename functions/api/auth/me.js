import { getRequestCountry, jsonResponse } from '../../_shared/security.js';
import { buildQuotaSnapshot, isIndiaFirstPurchaseEligible } from '../../_shared/db.js';
import { PUBLIC_CREDIT_PACKS, getDodoConfig } from '../../_shared/dodo.js';
import { resolveRequestIdentity } from '../../_shared/context.js';

export async function onRequestGet({ request, env }) {
  try {
    const { user, guestSubjectKey } = await resolveRequestIdentity(request, env);
    const country = getRequestCountry(request);
    const isIndia = country === 'IN';
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
        isIndia,
        currency: isIndia ? 'INR' : 'USD',
        indiaFirstPurchaseEligible,
      },
      payments: {
        provider: 'dodo',
        envMode: dodo.envMode,
        configured: dodo.configured,
        activeMarket: isIndia ? 'INR' : 'USD',
        packsConfigured: {
          credits_200: Boolean(dodo.apiKey && dodo.usdProducts.credits_200),
          credits_500: Boolean(dodo.apiKey && dodo.usdProducts.credits_500),
          credits_1000: Boolean(dodo.apiKey && dodo.usdProducts.credits_1000),
          in_10: Boolean(dodo.apiKey && (dodo.inrProducts.in_10 || dodo.indiaFirstProducts.in_10)),
          in_30: Boolean(dodo.apiKey && (dodo.inrProducts.in_30 || dodo.indiaFirstProducts.in_30)),
          in_100: Boolean(dodo.apiKey && (dodo.inrProducts.in_100 || dodo.indiaFirstProducts.in_100)),
          credits_10: Boolean(dodo.apiKey && dodo.usdProducts.credits_200),
          credits_30: Boolean(dodo.apiKey && dodo.usdProducts.credits_500),
          credits_100: Boolean(dodo.apiKey && dodo.usdProducts.credits_1000),
        },
        packs: PUBLIC_CREDIT_PACKS,
      },
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Server error' }, 500);
  }
}
