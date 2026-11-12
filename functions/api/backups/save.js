import { jsonResponse } from '../../_shared/security.js';
import { resolveRequestIdentity } from '../../_shared/context.js';
import { b2PutObject, createBackupStorageAdapter, hasB2Config } from '../../_shared/b2.js';
import {
  BACKUP_RETENTION_MS,
  deleteBackupBlobFromD1,
  getBackupOwner,
  getUserBackupById,
  isUserPremiumForBackups,
  purgeExpiredBackupsForUser,
  saveBackupBlobToD1,
  serializeBackupRow,
  upsertUserBackup,
} from '../../_shared/db.js';

const VALID_TOOLS = new Set(['earnings', 'chats', 'comments']);
const VALID_MODES = new Set(['single', 'channel', 'batch', 'comments']);
const VALID_STATUSES = new Set(['in_progress', 'paused', 'completed']);
const MAX_UPLOAD_BYTES = 80 * 1024 * 1024; // 80 MB combined multipart safety cap

export async function onRequestPost({ request, env }) {
  try {
    const { user } = await resolveRequestIdentity(request, env);
    if (!user) {
      return jsonResponse({ error: 'Authentication required.', code: 'auth_required' }, 401);
    }

    const premium = await isUserPremiumForBackups(env.DB, user);
    if (!premium) {
      return jsonResponse(
        {
          error: 'Cloud Backups & ZIP Archives are unlocked for users who have purchased any Credit Pack.',
          code: 'premium_required',
        },
        403
      );
    }

    const storageAdapter = createBackupStorageAdapter(env);
    if (!env?.DB && !storageAdapter.hasObjectStorage) {
      return jsonResponse(
        {
          error: 'Cloud backup storage (Backblaze B2 / D1 / R2) is not configured yet.',
          code: 'storage_not_configured',
        },
        503
      );
    }

    const form = await request.formData();
    const metaRaw = form.get('meta');
    if (!metaRaw || typeof metaRaw !== 'string') {
      return jsonResponse({ error: 'Missing backup metadata.' }, 400);
    }

    let meta;
    try {
      meta = JSON.parse(metaRaw);
    } catch {
      return jsonResponse({ error: 'Invalid backup metadata JSON.' }, 400);
    }

    const id = String(meta.id || '').trim();
    if (!/^[a-zA-Z0-9_-]{4,80}$/.test(id)) {
      return jsonResponse({ error: 'Invalid backup id format.' }, 400);
    }

    const toolKind = VALID_TOOLS.has(meta.toolKind) ? meta.toolKind : 'earnings';
    const mode = VALID_MODES.has(meta.mode) ? meta.mode : 'batch';
    const status = VALID_STATUSES.has(meta.status) ? meta.status : 'in_progress';
    const title = String(meta.title || 'TubeMetrix Extraction').trim().slice(0, 140) || 'TubeMetrix Extraction';
    const backupDate = /^\d{4}-\d{2}-\d{2}$/.test(String(meta.backupDate || ''))
      ? String(meta.backupDate)
      : new Date().toISOString().slice(0, 10);

    const completedCount = Math.max(0, Math.floor(Number(meta.completedCount || 0)));
    const totalCount = Math.max(completedCount, Math.floor(Number(meta.totalCount || 0)));
    const itemsCount = Math.max(0, Math.floor(Number(meta.itemsCount || 0)));
    const streamKeys = Array.isArray(meta.streamKeys)
      ? Array.from(new Set(meta.streamKeys.map((k) => String(k || '').trim()).filter(Boolean))).slice(0, 500)
      : [];

    const existingOwner = await getBackupOwner(env.DB, id);
    if (existingOwner && existingOwner.user_id !== user.id) {
      return jsonResponse({ error: 'Forbidden backup identifier.' }, 403);
    }

    const resumePart = form.get('resume');
    const zipPart = form.get('zip');

    let totalBytes = 0;
    const resumeBuf =
      resumePart && typeof resumePart.arrayBuffer === 'function' ? await resumePart.arrayBuffer() : null;
    if (resumeBuf) totalBytes += resumeBuf.byteLength;

    const zipBuf = zipPart && typeof zipPart.arrayBuffer === 'function' ? await zipPart.arrayBuffer() : null;
    if (zipBuf) totalBytes += zipBuf.byteLength;

    if (totalBytes > MAX_UPLOAD_BYTES) {
      return jsonResponse({ error: 'Backup payload exceeds 80 MB single-upload safety limit.' }, 413);
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresAt = new Date(nowMs + BACKUP_RETENTION_MS).toISOString();
    await purgeExpiredBackupsForUser(env.DB, storageAdapter, user.id, nowIso);

    const useB2 = hasB2Config(env);
    const hasR2 = !useB2 && Boolean(env?.BACKUPS);
    let resumeKey = existingOwner?.resume_key || null;
    let zipKey = existingOwner?.zip_key || null;
    let zipSizeBytes = Number(existingOwner?.zip_size_bytes || 0);

    if (!useB2 && !hasR2) {
      const totalD1Bytes = (resumeBuf?.byteLength || 0) + (zipBuf?.byteLength || 0);
      if (totalD1Bytes > 25 * 1024 * 1024) {
        return jsonResponse(
          { error: 'Backup payload exceeds 25 MB cloud storage limit.', code: 'payload_too_large' },
          413
        );
      }
    }

    const uploadTasks = [];

    if (resumeBuf && resumeBuf.byteLength > 0) {
      const objectPath = `users/${user.id}/${id}/resume.json`;
      uploadTasks.push(
        (async () => {
          if (useB2) {
            resumeKey = await b2PutObject(env, objectPath, resumeBuf, 'application/json; charset=utf-8');
          } else if (hasR2) {
            resumeKey = objectPath;
            await env.BACKUPS.put(resumeKey, resumeBuf, {
              httpMetadata: { contentType: 'application/json; charset=utf-8' },
            });
          } else {
            resumeKey = await saveBackupBlobToD1(env.DB, id, 'resume', resumeBuf, { compress: true });
          }
        })()
      );
    } else if (status === 'completed' && resumeKey) {
      const prevResumeKey = resumeKey;
      resumeKey = null;
      uploadTasks.push(
        (async () => {
          if (prevResumeKey.startsWith('d1')) {
            await deleteBackupBlobFromD1(env.DB, id, 'resume').catch(() => {});
          } else {
            await storageAdapter.deleteKey(prevResumeKey).catch(() => {});
          }
        })()
      );
    }

    if (zipBuf && zipBuf.byteLength > 0) {
      zipSizeBytes = zipBuf.byteLength;
      const objectPath = `users/${user.id}/${id}/bundle.zip`;
      uploadTasks.push(
        (async () => {
          if (useB2) {
            zipKey = await b2PutObject(env, objectPath, zipBuf, 'application/zip');
          } else if (hasR2) {
            zipKey = objectPath;
            await env.BACKUPS.put(zipKey, zipBuf, {
              httpMetadata: { contentType: 'application/zip' },
            });
          } else {
            zipKey = await saveBackupBlobToD1(env.DB, id, 'zip', zipBuf, { compress: false });
          }
        })()
      );
    }

    if (uploadTasks.length > 0) {
      await Promise.all(uploadTasks);
    }

    await upsertUserBackup(env.DB, {
      id,
      userId: user.id,
      toolKind,
      mode,
      title,
      backupDate,
      status,
      completedCount,
      totalCount,
      itemsCount,
      streamKeysJson: JSON.stringify(streamKeys),
      resumeKey,
      zipKey,
      zipSizeBytes,
      expiresAt,
      createdAt: existingOwner?.created_at || nowIso,
      updatedAt: nowIso,
    });

    const savedRow = await getUserBackupById(env.DB, user.id, id, { includeExpired: true });
    return jsonResponse({
      ok: true,
      backup: serializeBackupRow(savedRow),
    });
  } catch (err) {
    return jsonResponse({ error: err.message || 'Unable to save cloud backup.' }, 500);
  }
}

