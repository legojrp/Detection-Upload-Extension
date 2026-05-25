const api = globalThis.browser ?? globalThis.chrome;

async function recordDisplayMedia(durationMs = 30_000) {
  const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
  const recorder = new MediaRecorder(stream);
  const chunks = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = (event) => reject(event.error ?? new Error('Offscreen recorder error'));
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || 'video/webm' }));
    };

    recorder.start();
    globalThis.setTimeout(() => recorder.state !== 'inactive' && recorder.stop(), durationMs);
  });
}

async function blobToSerializableBytes(blob) {
  const buffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'offscreen:capture') {
    return undefined;
  }

  recordDisplayMedia(message.durationMs)
    .then(async (blob) => {
      const bytes = await blobToSerializableBytes(blob);
      sendResponse({
        ok: true,
        bytes,
        mimeType: blob.type || 'video/webm',
        tabId: message.tabId ?? sender?.tab?.id ?? null
      });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error?.message ?? 'Offscreen capture failed' });
    });

  return true;
});
