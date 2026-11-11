import {
  buildSessionCookie,
  getClientIp,
  hashGuestSubject,
  jsonResponse,
  signSessionToken,
  verifyGoogleIdToken,
} from '../../_shared/security.js';
import { buildQuotaSnapshot, upsertGoogleUser } from '../../_shared/db.js';
import { assertServerConfigured } from '../../_shared/context.js';

export async function onRequestPost({ request, env }) {
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
    const sessionToken = await signSessionToken(
      { uid: user.id, email: user.email },
      env.SESSION_SECRET
    );

    const guestSubjectKey = await hashGuestSubject(getClientIp(request), env.SESSION_SECRET);
    const quota = await buildQuotaSnapshot(env.DB, user, guestSubjectKey);

    return jsonResponse(
      { ok: true, user, quota },
      200,
      { 'Set-Cookie': buildSessionCookie(sessionToken, request.url) }
    );
  } catch (err) {
    return jsonResponse({ error: err.message || 'Google Sign-In verification failed.' }, 401);
  }
}

