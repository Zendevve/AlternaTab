// background.js (MV3 service worker)
import { MESSAGE_TYPES, CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from './src/shared/constants.js';
import {
  cloneDefaultConfig,
  mergeConfig,
  sanitizeDomainMap,
  sanitizeConfigForEmit,
  normalizeDomainKey,
  scoreForTab
} from './src/shared/utils.js';

let runtimeConfig = cloneDefaultConfig();
let configReady = loadPersistedConfig().then((cfg) => {
  runtimeConfig = cfg;
  return runtimeConfig;
}).catch((err) => {
  console.warn('[AlternaTab] Failed to hydrate configuration, using defaults', err);
  runtimeConfig = cloneDefaultConfig();
  return runtimeConfig;
});

const reportErrorToTab = async (tabId, message, { persistent = false } = {}) => {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: MESSAGE_TYPES.SHOW_ERROR, message, persistent });
  } catch (err) {
    console.warn('[AlternaTab] Failed to report error to tab', err, tabId);
  }
};

const buildTabSnapshot = (tabs, currentWindowId = null) => {
  const filtered = tabs.filter(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));
  const sorted = filtered.slice().sort((a, b) => {
    // If cross-window, group by window first (current window at top)
    if (currentWindowId !== null && a.windowId !== b.windowId) {
      if (a.windowId === currentWindowId) return -1;
      if (b.windowId === currentWindowId) return 1;
      return a.windowId - b.windowId;
    }
    const scoreDiff = scoreForTab(b) - scoreForTab(a);
    if (scoreDiff !== 0) return scoreDiff;
    const lastDiff = (b.lastAccessed || 0) - (a.lastAccessed || 0);
    if (lastDiff !== 0) return lastDiff;
    return a.index - b.index;
  });
  return sorted.map(t => ({
    id: t.id,
    index: t.index,
    windowId: t.windowId, // NEW: Include window ID for cross-window support
    title: t.title || t.url,
    url: t.url,
    favIcon: t.favIconUrl || null,
    lastAccessed: t.lastAccessed || 0,
    active: !!t.active,
    pinned: !!t.pinned,
    audible: !!t.audible,
    muted: !!(t.mutedInfo && t.mutedInfo.muted),
    discarded: !!t.discarded
  }));
};

const sendTabsToActive = async () => {
  let activeTab = null;
  try {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTabs || activeTabs.length === 0) return;
    activeTab = activeTabs[0];
  } catch (err) {
    console.error('[AlternaTab] Failed to locate active tab', err);
    return;
  }

  let reduced;
  try {
    await configReady;
    // NEW: Cross-window support based on config
    const tabs = runtimeConfig.crossWindowEnabled
      ? await chrome.tabs.query({})
      : await chrome.tabs.query({ currentWindow: true });
    reduced = buildTabSnapshot(tabs, activeTab.windowId);
  } catch (err) {
    console.error('[AlternaTab] Failed to query tabs', err);
    await reportErrorToTab(activeTab.id, 'Failed to load tabs. Please try again.');
    return;
  }

  try {
    await chrome.tabs.sendMessage(activeTab.id, {
      type: MESSAGE_TYPES.SHOW_OVERLAY,
      tabs: reduced,
      crossWindowEnabled: runtimeConfig.crossWindowEnabled // Pass flag to content script
    });
  } catch (err) {
    const message = err && err.message ? err.message : '';
    const needsInjection = message.includes('Could not establish connection') || message.includes('Receiving end does not exist');
    if (!needsInjection) {
      console.error('[AlternaTab] Unable to display overlay', err);
      await reportErrorToTab(activeTab.id, 'Unable to display AlternaTab overlay.');
      return;
    }
    try {
      await chrome.scripting.insertCSS({ target: { tabId: activeTab.id }, files: ['overlay.css'] });
    } catch (cssErr) {
      console.warn('[AlternaTab] Failed to inject CSS', cssErr);
    }
    try {
      await chrome.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content.js'] });
    } catch (scriptErr) {
      console.warn('[AlternaTab] Failed to inject content script', scriptErr);
    }
    try {
      await chrome.tabs.sendMessage(activeTab.id, {
        type: MESSAGE_TYPES.SHOW_OVERLAY,
        tabs: reduced,
        crossWindowEnabled: runtimeConfig.crossWindowEnabled
      });
    } catch (finalErr) {
      console.error('[AlternaTab] Overlay injection retry failed', finalErr);
      await reportErrorToTab(activeTab.id, 'Unable to display AlternaTab overlay.');
    }
  }
};

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-overlay') {
    await sendTabsToActive();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (!msg || !msg.type) return;
  const handler = inboundHandlers[msg.type];
  if (!handler) return;
  const run = async () => handler(msg, sender);
  run()
    .then((value) => {
      if (typeof respond === 'function') respond(normalizeResponse(value));
    })
    .catch((err) => {
      console.error('[AlternaTab] Message dispatch failure', err, msg.type);
      if (typeof respond === 'function') {
        respond({ ok: false, error: err?.message || 'Unexpected error.' });
      }
    });
  return true;
});

const inboundHandlers = {
  [MESSAGE_TYPES.ACTIVATE_TAB]: async (msg, sender) => {
    const senderTabId = sender && sender.tab ? sender.tab.id : null;
    try {
      await chrome.tabs.update(msg.tabId, { active: true });
      // NEW: Focus the window if activating a tab in a different window
      if (msg.windowId) {
        await chrome.windows.update(msg.windowId, { focused: true });
      }
      return { ok: true };
    } catch (err) {
      console.error('[AlternaTab] Failed to activate tab', err, msg.tabId);
      await reportErrorToTab(senderTabId || msg.tabId, 'Unable to activate the selected tab.');
      return { ok: false, error: err?.message || 'Unable to activate tab.' };
    }
  },
  [MESSAGE_TYPES.CLOSE_TAB]: async (msg, sender) => {
    const senderTabId = sender && sender.tab ? sender.tab.id : null;
    try {
      await chrome.tabs.remove(msg.tabId);
      return { ok: true };
    } catch (err) {
      console.error('[AlternaTab] Failed to close tab', err, msg.tabId);
      await reportErrorToTab(senderTabId, 'Unable to close the selected tab.');
      return { ok: false, error: err?.message || 'Unable to close tab.' };
    }
  },
  [MESSAGE_TYPES.REQUEST_CONFIG]: async () => {
    await configReady;
    return { ok: true, config: runtimeConfig };
  },
  [MESSAGE_TYPES.UPDATE_CONFIG]: async (msg) => {
    try {
      await configReady;
      runtimeConfig = mergeConfig(runtimeConfig, msg.config || {});
      await persistConfig(runtimeConfig);
      await broadcastConfig();
      return { ok: true };
    } catch (err) {
      console.error('[AlternaTab] Failed to update configuration', err);
      return { ok: false, error: err?.message || 'Update failed.' };
    }
  },
  [MESSAGE_TYPES.RESET_CONFIG]: async () => {
    try {
      await configReady;
      runtimeConfig = cloneDefaultConfig();
      await persistConfig(runtimeConfig);
      await broadcastConfig();
      return { ok: true, config: runtimeConfig };
    } catch (err) {
      console.error('[AlternaTab] Failed to reset configuration', err);
      return { ok: false, error: err?.message || 'Reset failed.' };
    }
  }
};

function normalizeResponse(value) {
  if (value && typeof value === 'object' && 'ok' in value) {
    return value;
  }
  if (value === undefined) {
    return { ok: true };
  }
  return { ok: true, result: value };
}

async function loadPersistedConfig() {
  const base = cloneDefaultConfig();
  try {
    const stored = await chrome.storage.local.get(CONFIG_STORAGE_KEY);
    const snapshot = stored ? stored[CONFIG_STORAGE_KEY] : undefined;
    if (snapshot && typeof snapshot === 'object') {
      return mergeConfig(base, snapshot);
    }
  } catch (err) {
    console.warn('[AlternaTab] Using default configuration due to storage error', err);
  }
  return base;
}

async function persistConfig(config) {
  try {
    await chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: config });
  } catch (err) {
    console.warn('[AlternaTab] Failed to persist configuration', err);
  }
}

async function broadcastConfig() {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map((tab) => chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.CONFIG_UPDATED,
      config: sanitizeConfigForEmit(runtimeConfig)
    }).catch(() => { })));
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CONFIG_UPDATED, config: sanitizeConfigForEmit(runtimeConfig) }).catch(() => { });
  } catch (err) {
    console.warn('[AlternaTab] Failed to broadcast configuration', err);
  }
}
