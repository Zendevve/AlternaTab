// background.js — AlternaTab v2.0
// Service worker: handles commands, tab queries, messaging

const MESSAGE_TYPES = {
  GET_TABS: 'GET_TABS',
  ACTIVATE_TAB: 'ACTIVATE_TAB',
  CLOSE_TAB: 'CLOSE_TAB',
  CLOSE_DUPLICATES: 'CLOSE_DUPLICATES',
  GET_CONFIG: 'GET_CONFIG',
  SET_CONFIG: 'SET_CONFIG',
  SAVE_LAST_POSITION: 'SAVE_LAST_POSITION',
  GET_LAST_POSITION: 'GET_LAST_POSITION',
  TOGGLE_FAVORITE: 'TOGGLE_FAVORITE',
  GET_FAVORITES: 'GET_FAVORITES'
};

// Domain colors for visual grouping
const DOMAIN_COLORS = {
  'github.com': '#1f6feb',
  'youtube.com': '#ff4e45',
  'mail.google.com': '#4285f4',
  'docs.google.com': '#188038',
  'drive.google.com': '#0f9d58',
  'calendar.google.com': '#1a73e8',
  'stackoverflow.com': '#f48024',
  'notion.so': '#2f2f2f',
  'twitter.com': '#1da1f2',
  'x.com': '#000000',
  'chat.openai.com': '#10a37f',
  'openai.com': '#10a37f',
  'figma.com': '#f24e1e',
  'slack.com': '#611f69',
  'reddit.com': '#ff4500',
  'linkedin.com': '#0a66c2',
  'discord.com': '#5865f2',
  'twitch.tv': '#9146ff'
};

const DEFAULT_CONFIG = {
  crossWindow: true,
  autoCloseOnSwitch: false,
  rememberLastPosition: true,
  showDomainColors: true,
  showFavorites: true
};

// Session storage
let lastPosition = 0;
let favorites = new Set();

// Load favorites from storage
async function loadFavorites() {
  const result = await chrome.storage.local.get('favorites');
  favorites = new Set(result.favorites || []);
}
loadFavorites();

// Save favorites
async function saveFavorites() {
  await chrome.storage.local.set({ favorites: [...favorites] });
}

// Generate color from string (for unknown domains)
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 65%, 55%)`;
}

// Get domain color
function getDomainColor(url) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    return DOMAIN_COLORS[domain] || stringToColor(domain);
  } catch {
    return '#666';
  }
}

// Get stored config
async function getConfig() {
  const result = await chrome.storage.local.get('config');
  return { ...DEFAULT_CONFIG, ...result.config };
}

// Save config
async function setConfig(config) {
  await chrome.storage.local.set({ config: { ...DEFAULT_CONFIG, ...config } });
}

// Query tabs sorted by last accessed (MRU), favorites on top
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

  const mapped = filtered.map(t => ({
    id: t.id,
    windowId: t.windowId,
    title: t.title || 'Untitled',
    url: t.url,
    favIconUrl: t.favIconUrl,
    active: t.active,
    pinned: t.pinned,
    audible: t.audible,
    muted: t.mutedInfo?.muted || false,
    domainColor: getDomainColor(t.url),
    isFavorite: favorites.has(t.url)
  }));

  // Sort favorites to top
  mapped.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  return mapped;
}

// Find and close duplicate tabs
async function closeDuplicates() {
  const tabs = await chrome.tabs.query({});
  const seen = new Map();
  const toClose = [];

  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue;

    if (seen.has(tab.url)) {
      toClose.push(tab.id);
    } else {
      seen.set(tab.url, tab.id);
    }
  }

  if (toClose.length > 0) {
    await chrome.tabs.remove(toClose);
  }

  return toClose.length;
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

      case MESSAGE_TYPES.TOGGLE_FAVORITE: {
        const url = msg.url;
        if (favorites.has(url)) {
          favorites.delete(url);
        } else {
          favorites.add(url);
        }
        await saveFavorites();
        sendResponse({ isFavorite: favorites.has(url) });
        break;
      }

      case MESSAGE_TYPES.GET_FAVORITES: {
        sendResponse({ favorites: [...favorites] });
        break;
      }

      case MESSAGE_TYPES.CLOSE_DUPLICATES: {
        const count = await closeDuplicates();
        sendResponse({ closed: count });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();
  return true; // Keep channel open for async response
});
