// background.js — AlternaTab v2.0
// Service worker: handles commands, tab queries, messaging

const MESSAGE_TYPES = {
  GET_TABS: 'GET_TABS',
  ACTIVATE_TAB: 'ACTIVATE_TAB',
  CLOSE_TAB: 'CLOSE_TAB',
  GET_CONFIG: 'GET_CONFIG',
  SET_CONFIG: 'SET_CONFIG',
  SAVE_LAST_POSITION: 'SAVE_LAST_POSITION',
  GET_LAST_POSITION: 'GET_LAST_POSITION'
};

const DEFAULT_CONFIG = {
  crossWindow: true,
  autoCloseOnSwitch: false,    // Close overlay instantly on tab switch
  rememberLastPosition: true   // Remember last selected tab position
};

// Session storage for last position (resets on browser restart)
let lastPosition = 0;

// Get stored config
async function getConfig() {
  const result = await chrome.storage.local.get('config');
  return { ...DEFAULT_CONFIG, ...result.config };
}

// Save config
async function setConfig(config) {
  await chrome.storage.local.set({ config: { ...DEFAULT_CONFIG, ...config } });
}

// Query tabs sorted by last accessed (MRU)
async function getTabs(crossWindow = true) {
  const query = crossWindow ? {} : { currentWindow: true };
  const tabs = await chrome.tabs.query(query);

  // Filter out chrome:// and extension pages
  const filtered = tabs.filter(t =>
    t.url &&
    !t.url.startsWith('chrome://') &&
    !t.url.startsWith('chrome-extension://')
  );

  // Sort by lastAccessed (most recent first)
  filtered.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

  return filtered.map(t => ({
    id: t.id,
    windowId: t.windowId,
    title: t.title || 'Untitled',
    url: t.url,
    favIconUrl: t.favIconUrl,
    active: t.active,
    pinned: t.pinned,
    audible: t.audible,
    muted: t.mutedInfo?.muted || false
  }));
}

// Handle command
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-overlay') return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || tab.url?.startsWith('chrome://')) return;

  const config = await getConfig();
  const tabs = await getTabs(config.crossWindow);

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.GET_TABS,
      tabs,
      config
    });
  } catch {
    // Content script not loaded, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ['overlay.css']
    });
    // Retry
    await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.GET_TABS,
      tabs,
      config
    });
  }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case MESSAGE_TYPES.ACTIVATE_TAB: {
        const { tabId, windowId } = msg;
        if (windowId) await chrome.windows.update(windowId, { focused: true });
        await chrome.tabs.update(tabId, { active: true });
        sendResponse({ ok: true });
        break;
      }

      case MESSAGE_TYPES.CLOSE_TAB: {
        await chrome.tabs.remove(msg.tabId);
        sendResponse({ ok: true });
        break;
      }

      case MESSAGE_TYPES.GET_CONFIG: {
        const config = await getConfig();
        sendResponse({ config });
        break;
      }

      case MESSAGE_TYPES.SET_CONFIG: {
        await setConfig(msg.config);
        sendResponse({ ok: true });
        break;
      }

      case MESSAGE_TYPES.SAVE_LAST_POSITION: {
        lastPosition = msg.position || 0;
        sendResponse({ ok: true });
        break;
      }

      case MESSAGE_TYPES.GET_LAST_POSITION: {
        sendResponse({ position: lastPosition });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // Keep channel open for async response
});
