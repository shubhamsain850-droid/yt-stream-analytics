import { jsonResponse } from '../../_shared/security.js';
import { resolveRequestIdentity } from '../../_shared/context.js';
import { createBackupStorageAdapter } from '../../_shared/b2.js';
import { deleteUserBackupRow } from '../../_shared/db.js';

export async function onRequestPost({ request, env }) {
  return handleDelete(request, env);
}

export async function onRequestDelete({ request, env }) {
  return handleDelete(request, env);
}

async function handleDelete(request, env) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse({ error: 'Authentication required.', code: 'auth_required' }, 401);
    }

    const url = new URL(request.url);
    let id = String(url.searchParams.get('id') || '').trim();
    if (!id && request.method !== 'GET') {
      const body = await request.json().catch(() => null);
      if (body?.id) id = String(body.id).trim();
    }

    if (!id) {
      return jsonResponse({ error: 'Missing backup id.' }, 400);
    }

    const deleted = await deleteUserBackupRow(env.DB, createBackupStorageAdapter(env), user.id, id);
    if (!deleted) {
      return jsonResponse({ error: 'Backup not found.' }, 404);
    }

    return jsonResponse({ ok: true, id });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Unable to delete backup.' }, 500);
  }
}

