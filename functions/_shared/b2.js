// Backblaze B2 Native REST API v3 helper for Cloudflare Pages Functions.
// Requires zero npm packages and zero credit card on Backblaze B2 (10 GB free private bucket).

const B2_AUTH_URL = 'https://api.backblazeb2.com/b2api/v3/b2_authorize_account';
const AUTH_CACHE_TTL_MS = 15 * 60 * 1000;

let _cachedAuth = null;

export function hasB2Config(env) {
  return Boolean(String(env?.B2_KEY_ID || '').trim() && String(env?.B2_APPLICATION_KEY || '').trim());
}

function encodeB2Path(objectPath) {
  return String(objectPath || '')
    .replace(/^\/+/, '')
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

async function sha1Hex(bufferLike) {
  const bytes = bufferLike instanceof Uint8Array ? bufferLike : new Uint8Array(bufferLike);
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function authorizeB2(env, { forceRefresh = false } = {}) {
  const keyId = String(env?.B2_KEY_ID || '').trim();
  const appKey = String(env?.B2_APPLICATION_KEY || '').trim();
  if (!keyId || !appKey) {
    throw new Error('Backblaze B2 credentials are not configured.');
  }

  const now = Date.now();
  if (!forceRefresh && _cachedAuth && _cachedAuth.keyId === keyId && now < _cachedAuth.expiresAt) {
    return _cachedAuth.value;
  }

  const basic = btoa(`${keyId}:${appKey}`);
  const resp = await fetch(B2_AUTH_URL, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });
  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data?.authorizationToken || !data?.apiInfo?.storageApi) {
    throw new Error(data?.message || data?.code || `B2 authorize failed (${resp.status}).`);
  }

  const storageApi = data.apiInfo.storageApi;
  const bucketId = String(env?.B2_BUCKET_ID || storageApi.bucketId || '').trim();
  const bucketName = String(env?.B2_BUCKET_NAME || storageApi.bucketName || '').trim();
  if (!bucketId || !bucketName) {
    throw new Error('Backblaze B2 bucketId/bucketName could not be resolved.');
  }

  const value = {
    authorizationToken: data.authorizationToken,
    apiUrl: storageApi.apiUrl,
    downloadUrl: storageApi.downloadUrl,
    bucketId,
    bucketName,
  };
  _cachedAuth = { keyId, value, expiresAt: now + AUTH_CACHE_TTL_MS };
  return value;
}

async function b2ApiPost(env, endpointPath, payload, { retryAuth = true } = {}) {
  const auth = await authorizeB2(env);
  const resp = await fetch(`${auth.apiUrl}/b2api/v3/${endpointPath}`, {
    method: 'POST',
    headers: {
      Authorization: auth.authorizationToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (resp.status === 401 && retryAuth) {
    await authorizeB2(env, { forceRefresh: true });
    return b2ApiPost(env, endpointPath, payload, { retryAuth: false });
  }
  const data = await resp.json().catch(() => null);
  if (!resp.ok) {
    const err = new Error(data?.message || data?.code || `B2 ${endpointPath} failed (${resp.status}).`);
    err.status = resp.status;
    err.code = data?.code;
    throw err;
  }
  return { auth, data };
}

export async function b2PutObject(env, objectPath, arrayBuf, contentType = 'application/octet-stream') {
  const bytes = arrayBuf instanceof Uint8Array ? arrayBuf : new Uint8Array(arrayBuf);
  const fileSha1 = await sha1Hex(bytes);
  const encodedPath = encodeB2Path(objectPath);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const auth = await authorizeB2(env, { forceRefresh: attempt > 0 });
    const { data: uploadInfo } = await b2ApiPost(env, 'b2_get_upload_url', { bucketId: auth.bucketId });
    const uploadResp = await fetch(uploadInfo.uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: uploadInfo.authorizationToken,
        'X-Bz-File-Name': encodedPath,
        'Content-Type': contentType || 'b2/x-auto',
        'Content-Length': String(bytes.byteLength),
        'X-Bz-Content-Sha1': fileSha1,
      },
      body: bytes,
    });
    if ((uploadResp.status === 401 || uploadResp.status === 503) && attempt === 0) {
      continue;
    }
    const result = await uploadResp.json().catch(() => null);
    if (!uploadResp.ok) {
      throw new Error(result?.message || result?.code || `B2 upload failed (${uploadResp.status}).`);
    }
    return `b2:${objectPath}`;
  }
  throw new Error('B2 upload failed after retry.');
}

export async function b2GetObject(env, storedKey) {
  const objectPath = String(storedKey || '').replace(/^b2:/, '');
  if (!objectPath) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const auth = await authorizeB2(env, { forceRefresh: attempt > 0 });
    const url = `${auth.downloadUrl}/file/${encodeURIComponent(auth.bucketName)}/${encodeB2Path(objectPath)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: auth.authorizationToken,
      },
    });
    if (resp.status === 401 && attempt === 0) {
      continue;
    }
    if (resp.status === 404) {
      return null;
    }
    if (!resp.ok) {
      const errData = await resp.json().catch(() => null);
      throw new Error(errData?.message || errData?.code || `B2 download failed (${resp.status}).`);
    }
    return resp;
  }
  return null;
}

export async function b2DeleteObject(env, storedKey) {
  const objectPath = String(storedKey || '').replace(/^b2:/, '');
  if (!objectPath || !hasB2Config(env)) return false;

  const auth = await authorizeB2(env);
  const { data } = await b2ApiPost(env, 'b2_list_file_versions', {
    bucketId: auth.bucketId,
    startFileName: objectPath,
    prefix: objectPath,
    maxFileCount: 100,
  });
  const matching = (data?.files || []).filter((f) => f.fileName === objectPath);
  if (matching.length === 0) return false;

  await Promise.allSettled(
    matching.map((f) =>
      b2ApiPost(env, 'b2_delete_file_version', {
        fileName: f.fileName,
        fileId: f.fileId,
      })
    )
  );
  return true;
}

export function createBackupStorageAdapter(env) {
  const hasB2 = hasB2Config(env);
  const hasR2 = Boolean(env?.BACKUPS);
  return {
    mode: hasB2 ? 'b2' : hasR2 ? 'r2' : 'd1',
    hasObjectStorage: hasB2 || hasR2,
    async deleteKey(storedKey) {
      if (!storedKey || storedKey.startsWith('d1')) return;
      if (storedKey.startsWith('b2:')) {
        if (hasB2) await b2DeleteObject(env, storedKey);
        return;
      }
      if (hasR2) {
        await env.BACKUPS.delete(storedKey);
      }
    },
  };
}

