import {
  buildClearSessionCookie,
  getClientIp,
  getRequestCountry,
  hashGuestSubject,
  jsonResponse,
} from '../../_shared/security.js';
import { buildQuotaSnapshot } from '../../_shared/db.js';
import { assertServerConfigured } from '../../_shared/context.js';

export async function onRequestPost({ request, env }) {
  try {
    assertServerConfigured(env);
    const country = getRequestCountry(request);
    const guestSubjectKey = await hashGuestSubject(getClientIp(request), env.SESSION_SECRET);
    const quota = await buildQuotaSnapshot(env.DB, null, guestSubjectKey);

    return jsonResponse(
      {
        ok: true,
        authenticated: false,
        user: null,
        quota,
        region: {
          country,
          isIndia: country === 'IN',
          indiaFirstPurchaseEligible: country === 'IN',
        },
      },
      200,
      { 'Set-Cookie': buildClearSessionCookie(request.url) }
    );
  } catch (err) {
    return jsonResponse({ error: err.message || 'Sign-out failed.' }, 500);
  }
}
