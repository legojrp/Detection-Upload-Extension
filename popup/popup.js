const api = globalThis.browser ?? globalThis.chrome;
const log = [];

const elements = {
  connectionStatus: document.getElementById('connectionStatus'),
  pageUrl: document.getElementById('pageUrl'),
  pageTitle: document.getElementById('pageTitle'),
  pageTimestamp: document.getElementById('pageTimestamp'),
  tokenState: document.getElementById('tokenState'),
  eventLog: document.getElementById('eventLog'),
  startCapture: document.getElementById('startCapture'),
  refreshContext: document.getElementById('refreshContext')
};

function sendMessage(message) {
  return api.runtime.sendMessage(message).catch(() => null);
}

function appendLog(message, level = 'info') {
  log.unshift({ message, level, time: new Date().toLocaleTimeString() });
  elements.eventLog.innerHTML = log
    .slice(0, 6)
    .map(
      (entry) => `<li><strong>${entry.time}</strong> ${entry.message}</li>`
    )
    .join('');
}

async function refreshContext() {
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  const payload = {
    url: tab?.url ?? 'Unavailable',
    title: tab?.title ?? 'Unavailable',
    timestamp: new Date().toISOString()
  };

  elements.pageUrl.textContent = payload.url;
  elements.pageTitle.textContent = payload.title;
  elements.pageTimestamp.textContent = payload.timestamp;
  appendLog(`Context refreshed for ${payload.title}`);
  return payload;
}

async function loadTokenState() {
  const response = await sendMessage({ type: 'auth:get-token' });
  elements.tokenState.textContent = response?.present ? 'Loaded' : 'Not found';
  return response;
}

async function startCapture() {
  elements.connectionStatus.textContent = 'Requesting capture';
  appendLog('Sending capture request to background');
  const response = await sendMessage({ type: 'capture:start' });
  elements.connectionStatus.textContent = response?.ok ? 'Capture armed' : 'Capture unavailable';
  appendLog(response?.ok ? 'Capture flow initialized' : 'Capture flow failed', response?.ok ? 'info' : 'error');
}

document.addEventListener('DOMContentLoaded', async () => {
  elements.startCapture.addEventListener('click', startCapture);
  elements.refreshContext.addEventListener('click', async () => {
    await refreshContext();
    await loadTokenState();
  });

  appendLog('Popup initialized');
  await refreshContext();
  await loadTokenState();
});
