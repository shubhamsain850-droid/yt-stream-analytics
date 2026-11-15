import {
  buildSessionCookie,
  getClientIp,
  getRequestCountry,
  hashGuestSubject,
  jsonResponse,
  signSessionToken,
  verifyGoogleIdToken,
} from '../../_shared/security.js';
import {
  buildQuotaSnapshot,
  isIndiaFirstPurchaseEligible,
  upsertGoogleUser,
} from '../../_shared/db.js';
import { sendWelcomeEmailIfNew } from '../../_shared/email.js';
import { assertServerConfigured } from '../../_shared/context.js';

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  try {
    assertServerConfigured(env);

    let body = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON body.' }, 400);
    }

    const credential = body?.credential;
    if (!credential) {
      return jsonResponse({ error: 'Missing Google credential token.' }, 400);
    }

    const expectedClientId =
      env.GOOGLE_CLIENT_ID ||
      '83599777834-drdbj74ur8o1q5isch9avpltjs6a7qj2.apps.googleusercontent.com';

    const claims = await verifyGoogleIdToken(credential, expectedClientId);
    const user = await upsertGoogleUser(env.DB, claims);

    // If new user signup, dispatch automated welcome onboarding email asynchronously
    if (user?.isNewUser) {
      const emailTask = sendWelcomeEmailIfNew(env.DB, env, user).catch((err) => {
        console.warn('[Welcome Email Async Error]:', err?.message);
      });
      if (typeof waitUntil === 'function') {
        waitUntil(emailTask);
      }
    }

    const sessionToken = await signSessionToken(
      { uid: user.id, email: user.email },
      env.SESSION_SECRET
    );

    const country = getRequestCountry(request);
    const guestSubjectKey = await hashGuestSubject(getClientIp(request), env.SESSION_SECRET);
    const [quota, indiaFirstPurchaseEligible] = await Promise.all([
      buildQuotaSnapshot(env.DB, user, guestSubjectKey),
      isIndiaFirstPurchaseEligible(env.DB, user, country),
    ]);

    return jsonResponse(
      {
        ok: true,
        user,
        quota,
        region: {
          country,
          isIndia: country === 'IN',
          indiaFirstPurchaseEligible,
        },
      },
      200,
      { 'Set-Cookie': buildSessionCookie(sessionToken, request.url) }
    );
  } catch (err) {
    return jsonResponse({ error: err.message || 'Google Sign-In verification failed.' }, 401);
  }
}
