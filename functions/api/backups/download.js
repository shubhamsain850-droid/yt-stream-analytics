import { jsonResponse } from '../../_shared/security.js';
import { resolveRequestIdentity } from '../../_shared/context.js';
import { getUserBackupById, isUserPremiumForBackups } from '../../_shared/db.js';

export async function onRequestGet({ request, env }) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse({ error: 'Authentication required.', code: 'auth_required' }, 401);
    }

    const premium = await isUserPremiumForBackups(env.DB, user);
    if (!premium) {
      return jsonResponse(
        { error: 'Cloud Backups require a purchased Credit Pack.', code: 'premium_required' },
        403
      );
    }

    if (!env?.BACKUPS) {
      return jsonResponse({ error: 'R2 backup storage is not configured.', code: 'r2_not_configured' }, 503);
    }

    const url = new URL(request.url);
    const id = String(url.searchParams.get('id') || '').trim();
    const kind = url.searchParams.get('kind') === 'resume' ? 'resume' : 'zip';
    if (!id) {
      return jsonResponse({ error: 'Missing backup id.' }, 400);
    }

    const row = await getUserBackupById(env.DB, user.id, id);
    if (!row) {
      return jsonResponse({ error: 'Backup not found or expired.' }, 404);
    }

    const objectKey = kind === 'resume' ? row.resume_key : row.zip_key;
    if (!objectKey) {
      return jsonResponse({ error: `Requested ${kind} file does not exist for this backup.` }, 404);
    }

    const obj = await env.BACKUPS.get(objectKey);
    if (!obj) {
      return jsonResponse({ error: 'Stored backup object missing in R2.' }, 404);
    }

    if (kind === 'resume') {
      return new Response(obj.body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });
    }

    const safeTitle = String(row.title || 'Backup')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'Backup';
    const filename = `TubeMetrix_${row.backup_date}_${row.tool_kind}_${safeTitle}.zip`;

    return new Response(obj.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Unable to download cloud backup.' }, 500);
  }
}

