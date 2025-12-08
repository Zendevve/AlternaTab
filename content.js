// content.js — AlternaTab v2.0
// Overlay UI: minimal, instant, keyboard-first

(function () {
  'use strict';

  const MESSAGE_TYPES = {
    GET_TABS: 'GET_TABS',
    ACTIVATE_TAB: 'ACTIVATE_TAB',
    CLOSE_TAB: 'CLOSE_TAB',
    CLOSE_DUPLICATES: 'CLOSE_DUPLICATES',
    SAVE_LAST_POSITION: 'SAVE_LAST_POSITION',
    GET_LAST_POSITION: 'GET_LAST_POSITION',
    TOGGLE_FAVORITE: 'TOGGLE_FAVORITE'
  };

  let overlay = null;
  let visible = false;
  let tabs = [];
  let filtered = [];
  let selected = 0;
  let filter = '';
  let config = {};
  let shiftHeld = false;  // Track Shift key for URL preview

  // Create overlay DOM
  function createOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'alternatab-overlay';
    overlay.innerHTML = `
      <div class="alternatab-shell">
        <input type="text" class="alternatab-search" placeholder="Search tabs..." />
        <div class="alternatab-list"></div>
        <div class="alternatab-empty">No matches</div>
      </div>
    `;
    document.documentElement.appendChild(overlay);

    // Search input - only handle input changes
    const search = overlay.querySelector('.alternatab-search');
    search.addEventListener('input', (e) => {
      filter = e.target.value.toLowerCase();
      applyFilter();
    });

    // Click outside to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hide();
    });
  }

  // Show overlay with tabs
  async function show(tabList, cfg) {
    if (!overlay) createOverlay();

    tabs = tabList;
    config = cfg;
    filter = '';
    selected = 0;

    // Restore last position if enabled
    if (config.rememberLastPosition) {
      try {
        const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_LAST_POSITION });
        if (response?.position !== undefined && response.position < tabList.length) {
          selected = response.position;
        }
      } catch (err) {
        // Ignore errors, default to 0
      }
    }

    const search = overlay.querySelector('.alternatab-search');
    search.value = '';

    applyFilter();
    overlay.classList.add('visible');
    visible = true;

    // Focus search
    setTimeout(() => search.focus(), 10);

    document.addEventListener('keydown', handleKey);
    document.addEventListener('keydown', handleShiftDown);
    document.addEventListener('keyup', handleShiftUp);
  }

  // Handle Shift key for URL preview
  function handleShiftDown(e) {
    if (e.key === 'Shift' && !shiftHeld) {
      shiftHeld = true;
      overlay?.classList.add('shift-preview');
    }
  }

  function handleShiftUp(e) {
    if (e.key === 'Shift') {
      shiftHeld = false;
      overlay?.classList.remove('shift-preview');
    }
  }

  // Hide overlay
  function hide(instant = false) {
    if (!overlay || !visible) return;

    // Instant close or normal fade
    if (instant) {
      overlay.classList.add('instant-close');
    }
    overlay.classList.remove('visible', 'shift-preview');

    // Reset after transition
    setTimeout(() => overlay?.classList.remove('instant-close'), 150);

    visible = false;
    shiftHeld = false;
    document.removeEventListener('keydown', handleKey);
    document.removeEventListener('keydown', handleShiftDown);
    document.removeEventListener('keyup', handleShiftUp);
  }

  // Fuzzy match: 'gml' matches 'Gmail'
  function fuzzyMatch(text, query) {
    const lower = text.toLowerCase();
    let qi = 0;
    for (let i = 0; i < lower.length && qi < query.length; i++) {
      if (lower[i] === query[qi]) qi++;
    }
    return qi === query.length;
  }

  // Apply filter and render
  function applyFilter() {
    if (filter) {
      filtered = tabs.filter(t =>
        fuzzyMatch(t.title, filter) ||
        fuzzyMatch(t.url, filter)
      );
    } else {
      filtered = tabs;
    }

    selected = Math.min(selected, Math.max(0, filtered.length - 1));
    render();
  }

  // Render tab list
  function render() {
    const list = overlay.querySelector('.alternatab-list');
    const empty = overlay.querySelector('.alternatab-empty');

    if (filtered.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';

    list.innerHTML = filtered.map((t, i) => `
      <div class="alternatab-item ${i === selected ? 'selected' : ''} ${t.active ? 'active' : ''} ${t.isFavorite ? 'favorite' : ''}"
           data-index="${i}" data-id="${t.id}" data-url="${escapeHtml(t.url)}">
        <span class="alternatab-color" style="background: ${t.domainColor}"></span>
        <span class="alternatab-num">${i < 9 ? i + 1 : ''}</span>
        <img class="alternatab-favicon" src="${t.favIconUrl || ''}"
             onerror="this.style.display='none'" />
        <div class="alternatab-meta">
          <span class="alternatab-title">${highlightMatch(escapeHtml(t.title))}</span>
          <span class="alternatab-url">${highlightMatch(escapeHtml(shiftHeld ? t.url : getDomain(t.url)))}</span>
        </div>
        <span class="alternatab-icons">
          <span class="alternatab-star" title="Toggle Favorite">${t.isFavorite ? '★' : '☆'}</span>
          ${t.pinned ? '<span title="Pinned">📌</span>' : ''}
          ${t.audible && !t.muted ? '<span title="Playing">🔊</span>' : ''}
          ${t.muted ? '<span title="Muted">🔇</span>' : ''}
        </span>
      </div>
    `).join('');

    // Click handlers
    list.querySelectorAll('.alternatab-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Don't activate if clicking the star
        if (e.target.classList.contains('alternatab-star')) return;
        activateTab(parseInt(el.dataset.index));
      });
      el.addEventListener('auxclick', (e) => {
        if (e.button === 1) closeTab(parseInt(el.dataset.index));
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, parseInt(el.dataset.index));
      });
    });

    // Star click handlers for favorites
    list.querySelectorAll('.alternatab-star').forEach(star => {
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = star.closest('.alternatab-item');
        toggleFavorite(parseInt(item.dataset.index));
      });
    });

    // Scroll selected into view
    const selectedEl = list.querySelector('.selected');
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }

  // Keyboard handler
  function handleKey(e) {
    if (!visible) return;

    // Number keys 1-9 for quick switch
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < filtered.length) {
        e.preventDefault();
        activateTab(index);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selected = Math.min(selected + 1, filtered.length - 1);
        render();
        break;

      case 'ArrowUp':
        e.preventDefault();
        selected = Math.max(selected - 1, 0);
        render();
        break;

      case 'Enter':
        e.preventDefault();
        activateTab(selected);
        break;

      case 'Escape':
        e.preventDefault();
        hide();
        break;

      case 'Delete':
        e.preventDefault();
        closeTab(selected);
        break;

      case 'w':
        if (e.ctrlKey) {
          e.preventDefault();
          closeTab(selected);
        }
        break;

      case 'f':
        // Toggle favorite on selected tab
        if (!e.ctrlKey && !e.altKey) {
          e.preventDefault();
          toggleFavorite(selected);
        }
        break;

      case 'd':
        // Close all duplicate tabs
        if (e.ctrlKey) {
          e.preventDefault();
          closeDuplicates();
        }
        break;
    }
  }

  // Activate tab
  async function activateTab(index) {
    const tab = filtered[index];
    if (!tab) return;

    try {
      // Save last position if enabled
      if (config.rememberLastPosition) {
        chrome.runtime.sendMessage({
          type: MESSAGE_TYPES.SAVE_LAST_POSITION,
          position: index
        });
      }

      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.ACTIVATE_TAB,
        tabId: tab.id,
        windowId: tab.windowId
      });

      // Use instant close if enabled
      hide(config.autoCloseOnSwitch);
    } catch (err) {
      console.error('Failed to activate tab:', err);
    }
  }

  // Close tab
  async function closeTab(index) {
    const tab = filtered[index];
    if (!tab) return;

    try {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.CLOSE_TAB,
        tabId: tab.id
      });

      // Remove from lists
      tabs = tabs.filter(t => t.id !== tab.id);
      applyFilter();

      if (filtered.length === 0) hide();
    } catch (err) {
      console.error('Failed to close tab:', err);
    }
  }

  // Toggle favorite on tab
  async function toggleFavorite(index) {
    const tab = filtered[index];
    if (!tab) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TOGGLE_FAVORITE,
        url: tab.url
      });

      // Update local state
      tab.isFavorite = response.isFavorite;

      // Re-sort and render
      if (response.isFavorite) {
        // Move to top of favorites
        tabs = tabs.filter(t => t.id !== tab.id);
        tabs.unshift(tab);
      }
      applyFilter();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  }

  // Close all duplicate tabs
  async function closeDuplicates() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.CLOSE_DUPLICATES
      });

      if (response.closed > 0) {
        // Refresh tab list
        hide();
      }
    } catch (err) {
      console.error('Failed to close duplicates:', err);
    }
  }

  // Context menu
  let contextMenu = null;

  function showContextMenu(e, index) {
    hideContextMenu();
    const tab = filtered[index];
    if (!tab) return;

    contextMenu = document.createElement('div');
    contextMenu.className = 'alternatab-context';
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.innerHTML = `
      <button data-action="switch">Switch to tab</button>
      <button data-action="close">Close tab</button>
      <button data-action="copy">Copy URL</button>
    `;

    contextMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        hideContextMenu();

        if (action === 'switch') activateTab(index);
        else if (action === 'close') closeTab(index);
        else if (action === 'copy') {
          await navigator.clipboard.writeText(tab.url);
        }
      });
    });

    overlay.appendChild(contextMenu);
    document.addEventListener('click', hideContextMenu, { once: true });
  }

  function hideContextMenu() {
    if (contextMenu) {
      contextMenu.remove();
      contextMenu = null;
    }
  }

  // Escape HTML
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Extract domain from URL
  function getDomain(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  // Highlight matching characters in search
  function highlightMatch(text) {
    if (!filter) return text;

    let result = '';
    let qi = 0;
    const query = filter.toLowerCase();
    const lower = text.toLowerCase();

    for (let i = 0; i < text.length; i++) {
      if (qi < query.length && lower[i] === query[qi]) {
        result += `<mark>${text[i]}</mark>`;
        qi++;
      } else {
        result += text[i];
      }
    }
    return result;
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === MESSAGE_TYPES.GET_TABS) {
      if (visible) {
        hide();
      } else {
        show(msg.tabs, msg.config);
      }
    }
  });
})();
