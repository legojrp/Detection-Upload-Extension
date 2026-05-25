const api = globalThis.browser ?? globalThis.chrome;
const CAPTURE_LIMIT_MS = 30_000;
const DEFAULT_API_ENDPOINT = 'https://example.invalid/api/media-ingest';

async function getJwtTokenAsync() {
  const storedToken = await readStorageValue('jwtToken');
  if (storedToken) {
    return storedToken;
  }

  const cookieToken = await readCookieToken();
  if (cookieToken) {
    return cookieToken;
  }

  try {
    const identityResult = await api.identity?.getAuthToken?.({ interactive: false });
    if (typeof identityResult === 'string') {
      return identityResult;
    }
    return identityResult?.token ?? null;
  } catch {
    return null;
  }
}

async function readStorageValue(key) {
  return new Promise((resolve) => {
    api.storage.local.get([key], (items) => {
      resolve(items?.[key] ?? null);
    });
  });
}

async function readCookieToken() {
  const [cookie] = await api.cookies.getAll({ name: 'jwt', url: 'https://example.invalid' });
  return cookie?.value ?? null;
}

async function captureMediaForSeconds(tabId, durationMs = CAPTURE_LIMIT_MS) {
  const response = await api.runtime.sendMessage({
    type: 'offscreen:capture',
    tabId,
    durationMs
  });

  if (!response?.ok) {
    return null;
  }

  const bytes = response.bytes ? new Uint8Array(response.bytes) : new Uint8Array();
  return new Blob([bytes], { type: response.mimeType || 'video/webm' });
}

async function deliverMediaBlob(blob, metadata, endpoint = DEFAULT_API_ENDPOINT) {
  const token = await getJwtTokenAsync();
  const formData = new FormData();
  formData.append('media', blob, 'capture.webm');
  formData.append('metadata', JSON.stringify(metadata));

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

async function ensureOffscreenDocument() {
  if (api.offscreen?.hasDocument) {
    const exists = await api.offscreen.hasDocument();
    if (exists) {
      return;
    }
  }

  if (api.offscreen?.createDocument) {
    await api.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Isolated recording pipeline for discovery-time media capture.'
    });
  }
}

api.runtime.onInstalled.addListener(() => {
  console.log('Detection Upload Extension installed');
});

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'auth:get-token') {
    getJwtTokenAsync()
      .then((token) => sendResponse({ present: Boolean(token) }))
      .catch(() => sendResponse({ present: false }));
    return true;
  }

  if (message?.type === 'capture:start') {
    (async () => {
      await ensureOffscreenDocument();
      const tabId = sender?.tab?.id ?? null;
      const blob = await captureMediaForSeconds(tabId, CAPTURE_LIMIT_MS);
      if (!blob) {
        sendResponse({ ok: false });
        return;
      }

      const metadata = {
        url: sender?.tab?.url ?? null,
        title: sender?.tab?.title ?? null,
        timestamp: new Date().toISOString()
      };

      const receipt = await deliverMediaBlob(blob, metadata);
      sendResponse({ ok: true, receipt });
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message ?? 'Capture failed' });
    });
    return true;
  }

  return undefined;
});
