/**
 * Request Identity & Environment Guard Helper
 */

import {
  SESSION_COOKIE_NAME,
  getClientIp,
  getCookieValue,
  hashGuestSubject,
  verifySessionToken,
} from './security.js';
import { resolveActiveUser } from './db.js';

export function assertServerConfigured(env) {
  if (!env?.DB) {
    throw new Error('Cloudflare D1 database binding (DB) is missing.');
  }
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment secret is not configured.');
  }
}

export async function resolveRequestIdentity(request, env) {
  assertServerConfigured(env);

  const ip = getClientIp(request);
  const guestSubjectKey = await hashGuestSubject(ip, env.SESSION_SECRET);

  const token = getCookieValue(request, SESSION_COOKIE_NAME);
  if (!token) {
    return { user: null, guestSubjectKey };
  }

  const session = await verifySessionToken(token, env.SESSION_SECRET);
  if (!session?.uid) {
    return { user: null, guestSubjectKey };
  }

  const user = await resolveActiveUser(env.DB, session.uid);
  return { user, guestSubjectKey };
}

