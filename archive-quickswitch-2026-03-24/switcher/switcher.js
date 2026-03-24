// ============================================================
// QuickSwitch — Switcher UI Logic
// Handles: rendering, search, keyboard navigation, actions
// ============================================================

(() => {
  // ── State ─────────────────────────────────────────────────

  let allTabs = [];
  let recentlyClosed = [];
  let currentWindowId = null;
  let filteredResults = [];
  let selectedIndex = 0;
  let query = '';

  // ── DOM References ────────────────────────────────────────

  const searchInput = document.querySelector('.search-input');
  const tabList = document.querySelector('.tab-list');
  const footerCount = document.querySelector('.footer-count');

  // ── Initialize ────────────────────────────────────────────

  async function init() {
    const response = await sendMessage({ type: 'GET_TABS' });
    allTabs = response.tabs;
    recentlyClosed = response.recentlyClosed;
    currentWindowId = response.currentWindowId;

    // Skip current active tab (you're already on it)
    // Actually, keep it but put it at the bottom — user might want to see it

    render();
    resizeFrame();
    searchInput.focus();
  }

  // ── Search & Filter ───────────────────────────────────────

  searchInput.addEventListener('input', (e) => {
    query = e.target.value;
    selectedIndex = 0;
    render();
    resizeFrame();
  });

  function getDisplayUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return url || '';
    }
  }

  function getFilteredTabs() {
    // Prepare items with displayUrl for search
    const items = allTabs.map(tab => ({
      ...tab,
      displayUrl: getDisplayUrl(tab.url),
      type: 'tab',
    }));

    // Add recently closed
    const closedItems = recentlyClosed.map(item => ({
      ...item,
      displayUrl: getDisplayUrl(item.url),
      type: 'closed',
    }));

    if (!query.trim()) {
      // No search: show MRU order, grouped by window
      const currentWindowTabs = items.filter(t => t.windowId === currentWindowId);
      const otherWindowTabs = items.filter(t => t.windowId !== currentWindowId);

      const results = [];

      if (currentWindowTabs.length > 0) {
        results.push({ type: 'section', label: 'Current Window', className: 'current-window' });
        currentWindowTabs.forEach(item => results.push({ type: 'item', item, score: 1, titleIndices: [], urlIndices: [] }));
      }

      // Group other windows
      const windowGroups = new Map();
      otherWindowTabs.forEach(tab => {
        if (!windowGroups.has(tab.windowId)) windowGroups.set(tab.windowId, []);
        windowGroups.get(tab.windowId).push(tab);
      });

      windowGroups.forEach((tabs, windowId) => {
        results.push({ type: 'section', label: `Window (${tabs.length} tabs)`, className: 'other-window' });
        tabs.forEach(item => results.push({ type: 'item', item, score: 1, titleIndices: [], urlIndices: [] }));
      });

      if (closedItems.length > 0) {
        results.push({ type: 'section', label: 'Recently Closed', className: 'recently-closed' });
        closedItems.slice(0, 5).forEach(item => results.push({ type: 'item', item, score: 1, titleIndices: [], urlIndices: [] }));
      }

      return results;
    }

    // With search: fuzzy match all items, sorted by score
    const allItems = [...items, ...closedItems];
    const searchResults = fuzzySearch(query, allItems);

    const results = [];
    const tabResults = searchResults.filter(r => r.item.type === 'tab');
    const closedResults = searchResults.filter(r => r.item.type === 'closed');

    if (tabResults.length > 0) {
      tabResults.forEach(r => results.push({ type: 'item', ...r }));
    }

    if (closedResults.length > 0) {
      results.push({ type: 'section', label: 'Recently Closed', className: 'recently-closed' });
      closedResults.forEach(r => results.push({ type: 'item', ...r }));
    }

    return results;
  }

  // ── Render ────────────────────────────────────────────────

  function render() {
    filteredResults = getFilteredTabs();

    const selectableItems = filteredResults.filter(r => r.type === 'item');

    if (selectedIndex >= selectableItems.length) {
      selectedIndex = Math.max(0, selectableItems.length - 1);
    }

    let selectableIdx = 0;
    let html = '';

    if (selectableItems.length === 0) {
      html = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <div class="empty-state-text">No tabs found for "${escapeHtml(query)}"</div>
        </div>
      `;
    } else {
      for (const entry of filteredResults) {
        if (entry.type === 'section') {
          html += renderSection(entry);
        } else {
          const isSelected = selectableIdx === selectedIndex;
          html += renderTabItem(entry, isSelected, selectableIdx);
          selectableIdx++;
        }
      }
    }

    tabList.innerHTML = html;

    // Update footer count
    const tabCount = allTabs.length;
    footerCount.textContent = query
      ? `${selectableItems.length} / ${tabCount} tabs`
      : `${tabCount} tabs`;

    // Scroll selected into view
    const selectedEl = tabList.querySelector('.tab-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function renderSection(entry) {
    return `
      <div class="section-header ${entry.className}">
        <span class="section-dot"></span>
        ${escapeHtml(entry.label)}
      </div>
    `;
  }

  function renderTabItem(entry, isSelected, index) {
    const { item, titleIndices = [], urlIndices = [] } = entry;

    const faviconHtml = item.favIconUrl
      ? `<img class="tab-favicon" src="${escapeHtml(item.favIconUrl)}" alt="" loading="lazy" onerror="this.outerHTML='<div class=\\'tab-favicon-placeholder\\'>${escapeHtml((item.title || '?')[0].toUpperCase())}</div>'">`
      : `<div class="tab-favicon-placeholder">${escapeHtml((item.title || '?')[0].toUpperCase())}</div>`;

    const thumbnailHtml = item.thumbnail
      ? `<img class="tab-thumbnail" src="${item.thumbnail}" alt="">`
      : '';

    const titleHtml = highlightMatches(item.title || 'Untitled', titleIndices);
    const urlHtml = highlightMatches(item.displayUrl || '', urlIndices);

    // Badges
    let badgesHtml = '';
    if (item.active && item.type !== 'closed') badgesHtml += '<span class="badge badge-active" title="Active"></span>';
    if (item.pinned) badgesHtml += '<span class="badge badge-pinned" title="Pinned"></span>';
    if (item.audible && !item.mutedInfo?.muted) badgesHtml += '<span class="badge badge-audible" title="Playing audio"></span>';
    if (item.mutedInfo?.muted) badgesHtml += '<span class="badge badge-muted" title="Muted"></span>';

    // Group chip
    let groupHtml = '';
    if (item.groupInfo) {
      groupHtml = `<span class="tab-group-chip color-${item.groupInfo.color}">${escapeHtml(item.groupInfo.title || '●')}</span>`;
    }

    // Closed indicator
    if (item.type === 'closed') {
      badgesHtml += '<span class="badge" style="font-size:10px;opacity:0.5">↩</span>';
    }

    const dataAttrs = item.type === 'closed'
      ? `data-session-id="${escapeHtml(item.sessionId)}" data-type="closed"`
      : `data-tab-id="${item.id}" data-window-id="${item.windowId}" data-type="tab"`;

    return `
      <div class="tab-item ${isSelected ? 'selected' : ''}"
           ${dataAttrs}
           data-index="${index}"
           role="option"
           aria-selected="${isSelected}">
        ${faviconHtml}
        <div class="tab-info">
          <div class="tab-title">${titleHtml}</div>
          <div class="tab-url">${urlHtml}</div>
        </div>
        <div class="tab-badges">
          ${groupHtml}
          ${badgesHtml}
        </div>
        ${thumbnailHtml}
        ${item.type !== 'closed' ? `<button class="tab-close" data-close-tab="${item.id}" title="Close tab" aria-label="Close tab">×</button>` : ''}
      </div>
    `;
  }

  // ── Keyboard Navigation ───────────────────────────────────

  document.addEventListener('keydown', (e) => {
    const selectableItems = filteredResults.filter(r => r.type === 'item');
    const maxIndex = selectableItems.length - 1;

    switch (e.key) {
      case 'ArrowDown':
      case 'j': {
        if (e.key === 'j' && !e.ctrlKey && document.activeElement === searchInput) break;
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, maxIndex);
        render();
        break;
      }

      case 'ArrowUp':
      case 'k': {
        if (e.key === 'k' && !e.ctrlKey && document.activeElement === searchInput) break;
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        render();
        break;
      }

      case 'Enter': {
        e.preventDefault();
        const item = selectableItems[selectedIndex];
        if (item) activateItem(item);
        break;
      }

      case 'Escape': {
        e.preventDefault();
        if (query) {
          // First Escape clears search
          searchInput.value = '';
          query = '';
          selectedIndex = 0;
          render();
          resizeFrame();
        } else {
          closeOverlay();
        }
        break;
      }

      case 'Backspace':
      case 'Delete': {
        if (e.key === 'Backspace' && document.activeElement === searchInput && query) break;
        if (e.key === 'Delete' || (e.key === 'Backspace' && !query)) {
          e.preventDefault();
          const item = selectableItems[selectedIndex];
          if (item && item.item.type === 'tab') {
            closeTab(item.item.id, selectedIndex);
          }
        }
        break;
      }

      case 'Tab': {
        e.preventDefault();
        // Toggle scope: could cycle through windows or toggle recently closed
        break;
      }

      // Ctrl+W to close selected tab
      case 'w': {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const item = selectableItems[selectedIndex];
          if (item && item.item.type === 'tab') {
            closeTab(item.item.id, selectedIndex);
          }
        }
        break;
      }

      // Home / End
      case 'Home': {
        e.preventDefault();
        selectedIndex = 0;
        render();
        break;
      }
      case 'End': {
        e.preventDefault();
        selectedIndex = maxIndex;
        render();
        break;
      }

      // Page Up / Page Down
      case 'PageUp': {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 5, 0);
        render();
        break;
      }
      case 'PageDown': {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 5, maxIndex);
        render();
        break;
      }

      default: {
        // Redirect all other keypresses to search input
        if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
          searchInput.focus();
        }
      }
    }
  });

  // ── Mouse Interaction ─────────────────────────────────────

  tabList.addEventListener('click', (e) => {
    // Close button
    const closeBtn = e.target.closest('[data-close-tab]');
    if (closeBtn) {
      e.stopPropagation();
      const tabId = parseInt(closeBtn.dataset.closeTab);
      const idx = parseInt(closeBtn.closest('.tab-item').dataset.index);
      closeTab(tabId, idx);
      return;
    }

    // Tab item click
    const tabItem = e.target.closest('.tab-item');
    if (tabItem) {
      const idx = parseInt(tabItem.dataset.index);
      selectedIndex = idx;
      const selectableItems = filteredResults.filter(r => r.type === 'item');
      const item = selectableItems[idx];
      if (item) activateItem(item);
    }
  });

  tabList.addEventListener('mousemove', (e) => {
    const tabItem = e.target.closest('.tab-item');
    if (tabItem) {
      const idx = parseInt(tabItem.dataset.index);
      if (idx !== selectedIndex) {
        selectedIndex = idx;
        // Lightweight update: just move selected class
        tabList.querySelectorAll('.tab-item.selected').forEach(el => el.classList.remove('selected'));
        tabItem.classList.add('selected');
      }
    }
  });

  // ── Actions ───────────────────────────────────────────────

  async function activateItem(entry) {
    const { item } = entry;

    if (item.type === 'closed') {
      await sendMessage({ type: 'RESTORE_SESSION', sessionId: item.sessionId });
    } else {
      await sendMessage({ type: 'SWITCH_TO_TAB', tabId: item.id, windowId: item.windowId });
    }

    closeOverlay();
  }

  async function closeTab(tabId, index) {
    // Animate out
    const items = tabList.querySelectorAll('.tab-item');
    const targetItem = [...items].find(el => el.dataset.index === String(index));

    if (targetItem) {
      targetItem.classList.add('closing');
      await new Promise(r => setTimeout(r, 150));
    }

    await sendMessage({ type: 'CLOSE_TAB', tabId });

    // Remove from local state
    allTabs = allTabs.filter(t => t.id !== tabId);

    // Adjust selection
    const selectableItems = filteredResults.filter(r => r.type === 'item');
    if (selectedIndex >= selectableItems.length - 1) {
      selectedIndex = Math.max(0, selectedIndex - 1);
    }

    render();
    resizeFrame();
  }

  // ── Communication ─────────────────────────────────────────

  function sendMessage(msg) {
    return chrome.runtime.sendMessage(msg);
  }

  function closeOverlay() {
    window.parent.postMessage({ type: 'QUICKSWITCH_CLOSE' }, '*');
  }

  function resizeFrame() {
    // Tell parent to resize iframe to fit content
    requestAnimationFrame(() => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({
        type: 'QUICKSWITCH_RESIZE',
        data: { height: Math.min(height, window.innerHeight * 0.72) }
      }, '*');
    });
  }

  // ── Boot ────────────────────────────────────────────────

  init();
})();
