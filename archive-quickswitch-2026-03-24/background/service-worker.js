// ============================================================
// QuickSwitch — Background Service Worker
// Responsibilities:
//   1. Track MRU tab order
//   2. Capture tab thumbnails
//   3. Track recently closed tabs
//   4. Respond to messages from switcher UI
//   5. Handle command (Alt+Q)
// ============================================================

const state = {
  mruOrder: [],           // Array of tabId in MRU order
  thumbnails: new Map(),  // tabId -> dataURL
  recentlyClosed: [],     // { tab, closedAt } max 20
  frecency: {},           // tabId -> { frequency, lastAccess }
};

const MAX_RECENTLY_CLOSED = 20;
const THUMBNAIL_QUALITY = 50; // JPEG quality (0-100)
const THUMBNAIL_DEBOUNCE = 500; // ms after activation before capture

// ── MRU Tracking ──────────────────────────────────────────────

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  updateMRU(tabId);
  updateFrecency(tabId);
  debouncedCapture(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  state.mruOrder = state.mruOrder.filter(id => id !== tabId);
  state.thumbnails.delete(tabId);
  delete state.frecency[tabId];
});

chrome.tabs.onCreated.addListener((tab) => {
  // New tabs go to front of MRU
  state.mruOrder.unshift(tab.id);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, windowId });
    if (activeTab) {
      updateMRU(activeTab.id);
      debouncedCapture(activeTab.id);
    }
  } catch (e) { /* window may have closed */ }
});

function updateMRU(tabId) {
  state.mruOrder = state.mruOrder.filter(id => id !== tabId);
  state.mruOrder.unshift(tabId);
}

function updateFrecency(tabId) {
  const now = Date.now();
  if (!state.frecency[tabId]) {
    state.frecency[tabId] = { frequency: 0, lastAccess: now };
  }
  state.frecency[tabId].frequency++;
  state.frecency[tabId].lastAccess = now;
}

// ── Thumbnail Capture ─────────────────────────────────────────

let captureTimeout = null;

function debouncedCapture(tabId) {
  clearTimeout(captureTimeout);
  captureTimeout = setTimeout(() => captureTab(tabId), THUMBNAIL_DEBOUNCE);
}

async function captureTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: THUMBNAIL_QUALITY,
    });
    state.thumbnails.set(tabId, dataUrl);
  } catch (e) {
    // Tab may not be visible or capturable — that's fine
  }
}

// ── Recently Closed Tracking ──────────────────────────────────

// Use sessions API for recently closed (more reliable)
async function getRecentlyClosed() {
  try {
    const sessions = await chrome.sessions.getRecentlyClosed({ maxResults: MAX_RECENTLY_CLOSED });
    return sessions
      .filter(s => s.tab)
      .map(s => ({
        sessionId: s.tab.sessionId,
        title: s.tab.title,
        url: s.tab.url,
        favIconUrl: s.tab.favIconUrl,
        closedAt: s.lastModified * 1000,
      }));
  } catch {
    return [];
  }
}

// ── Command Handler (Alt+Q) ──────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-switcher') {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab) {
      chrome.tabs.sendMessage(activeTab.id, { type: 'TOGGLE_SWITCHER' }).catch(() => {
        // Content script not loaded (chrome:// pages etc.)
        // Could open a popup instead as fallback
      });
    }
  }
});

// ── Message Handler ───────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse);
  return true; // async response
});

async function handleMessage(msg, sender) {
  switch (msg.type) {
    case 'GET_TABS': {
      const allTabs = await chrome.tabs.query({});
      const groups = await getTabGroups();
      const recentlyClosed = await getRecentlyClosed();

      // Sort by MRU
      const tabsById = new Map(allTabs.map(t => [t.id, t]));
      const sorted = [];

      // First: tabs in MRU order
      for (const id of state.mruOrder) {
        if (tabsById.has(id)) {
          sorted.push(tabsById.get(id));
          tabsById.delete(id);
        }
      }
      // Then: any tabs not yet tracked
      for (const tab of tabsById.values()) {
        sorted.push(tab);
      }

      // Attach metadata
      const enriched = sorted.map(tab => ({
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title || 'New Tab',
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        pinned: tab.pinned,
        audible: tab.audible,
        mutedInfo: tab.mutedInfo,
        active: tab.active,
        groupId: tab.groupId,
        groupInfo: groups.get(tab.groupId) || null,
        thumbnail: state.thumbnails.get(tab.id) || null,
        frecency: state.frecency[tab.id] || { frequency: 0, lastAccess: 0 },
      }));

      return {
        tabs: enriched,
        recentlyClosed,
        currentWindowId: sender.tab?.windowId,
      };
    }

    case 'SWITCH_TO_TAB': {
      const { tabId, windowId } = msg;
      await chrome.windows.update(windowId, { focused: true });
      await chrome.tabs.update(tabId, { active: true });
      return { success: true };
    }

    case 'CLOSE_TAB': {
      await chrome.tabs.remove(msg.tabId);
      return { success: true };
    }

    case 'CLOSE_TABS': {
      await chrome.tabs.remove(msg.tabIds);
      return { success: true };
    }

    case 'RESTORE_SESSION': {
      await chrome.sessions.restore(msg.sessionId);
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

async function getTabGroups() {
  const groups = new Map();
  try {
    const allGroups = await chrome.tabGroups.query({});
    for (const g of allGroups) {
      groups.set(g.id, { title: g.title, color: g.color, collapsed: g.collapsed });
    }
  } catch {
    // tabGroups API may not be available
  }
  return groups;
}

// ── Initialize MRU on install/startup ─────────────────────────

chrome.runtime.onStartup.addListener(initMRU);
chrome.runtime.onInstalled.addListener(initMRU);

async function initMRU() {
  const tabs = await chrome.tabs.query({});
  // Sort: active tabs first, then by lastAccessed if available
  tabs.sort((a, b) => {
    if (a.active && !b.active) return -1;
    if (!a.active && b.active) return 1;
    return (b.lastAccessed || 0) - (a.lastAccessed || 0);
  });
  state.mruOrder = tabs.map(t => t.id);
}
