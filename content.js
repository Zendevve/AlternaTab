// content.js
(function() {
  if (window.__alternaTabInjected) return;
  window.__alternaTabInjected = true;

  const MESSAGE_TYPES = Object.freeze({
    SHOW_OVERLAY: 'SHOW_OVERLAY',
    ACTIVATE_TAB: 'ACTIVATE_TAB',
    CLOSE_TAB: 'CLOSE_TAB',
    REQUEST_CONFIG: 'REQUEST_CONFIG',
    SHOW_ERROR: 'SHOW_ERROR'
  });

  const DEFAULT_CONFIG = Object.freeze({
    compactStorageKey: 'alternaTab.compact',
    statusDisplayMs: 4500,
    errorDisplayMs: 6500,
    domainColors: {
      'github.com': '#1f6feb',
      'youtube.com': '#ff4e45',
      'mail.google.com': '#4285f4',
      'docs.google.com': '#188038',
      'drive.google.com': '#0f9d58',
      'calendar.google.com': '#1a73e8',
      'stackoverflow.com': '#f48024',
      'superuser.com': '#38a1db',
      'serverfault.com': '#ef3b2d',
      'notion.so': '#2f2f2f',
      'twitter.com': '#1da1f2',
      'x.com': '#d7d7d7',
      'chat.openai.com': '#6a4cff',
      'openai.com': '#14a37f',
      'figma.com': '#f24e1e',
      'slack.com': '#611f69',
      'microsoft.com': '#0078d4'
    }
  });

  let runtimeConfig = cloneDefaultConfig();

  const EXT_VERSION = (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || '';
  let overlayRoot = null;
  let tabItems = [];
  let allTabs = [];
  let selectedIndex = 0;
  let visible = false;
  let loading = false;
  let loadToken = 0;
  let compactMode = loadCompactPreference();
  let statusTimer = null;
  let pendingStatus = null;
  let hideTimer = null;
  let toastStack = null;
  let filterInput = null;
  let clearSearchButton = null;
  let searchWrapper = null;
  let searchVisible = false;
  let searchDebounce = null;
  let filterRaw = '';
  let filterText = '';
  let totalTabCount = 0;
  let lastRenderedTabIds = [];
  const pendingToasts = [];

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    void hydrateConfig();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      void hydrateConfig();
    }, { once: true });
  }

  const createOverlay = () => {
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'alterna-overlay';
    overlayRoot.innerHTML = `
      <div id="alterna-shell" role="listbox" tabindex="0" aria-label="AlternaTab">
        <div id="alterna-header">
          <div id="alterna-title">
            <span class="brand">AlternaTab</span>
            <span id="alterna-version" class="version-chip" aria-label="Extension version"></span>
          </div>
          <div id="alterna-count"></div>
        </div>
        <div id="alterna-status" role="status" aria-live="polite"></div>
        <div id="alterna-list"></div>
        <div id="alterna-toast-stack" role="status" aria-live="polite" aria-atomic="true"></div>
      </div>
    `;
    document.documentElement.appendChild(overlayRoot);
    toastStack = overlayRoot.querySelector('#alterna-toast-stack');
    const versionEl = overlayRoot.querySelector('#alterna-version');
    if (versionEl) {
      versionEl.textContent = '';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'chip-label';
      labelSpan.textContent = 'Dev build';
      versionEl.appendChild(labelSpan);
      if (EXT_VERSION) {
        const versionSpan = document.createElement('span');
        versionSpan.className = 'chip-version';
        versionSpan.textContent = `v${EXT_VERSION}`;
        versionEl.appendChild(versionSpan);
        versionEl.setAttribute('title', `AlternaTab version ${EXT_VERSION}`);
      } else {
        versionEl.setAttribute('title', 'AlternaTab development build');
      }
    }
    applyCompactMode();
    if (pendingStatus) {
      const { message, options } = pendingStatus;
      pendingStatus = null;
      showStatus(message, options);
    }
    flushPendingToasts();
    overlayRoot.addEventListener('click', (e) => {
      if (e.target === overlayRoot) hideOverlay();
    });
    document.addEventListener('keydown', globalKeyHandler, true);
  };

  const buildBadges = (tab) => {
    const badges = [];
    if (tab.active) badges.push('<span class="alterna-badge active">Active</span>');
    if (tab.pinned) badges.push('<span class="alterna-badge pinned">Pinned</span>');
    if (tab.audible && !tab.muted) badges.push('<span class="alterna-badge audible">Playing</span>');
    if (tab.muted) badges.push('<span class="alterna-badge muted">Muted</span>');
    if (tab.discarded) badges.push('<span class="alterna-badge sleeping">Sleeping</span>');
    if (!badges.length) return '';
    return ` <span class="alterna-badges">${badges.join(' ')}</span>`;
  };

  const buildList = (tabs) => {
    const sortedTabs = tabs.slice().sort((a, b) => {
      const weight = (tab) => {
        let score = 0;
        if (tab.active) score += 1_000_000;
        if (tab.pinned) score += 20_000;
        if (tab.audible) score += 50_000;
        if (tab.muted) score += 5_000;
        if (tab.discarded) score -= 10_000;
        return score;
      };
      const scoreDiff = weight(b) - weight(a);
      if (scoreDiff !== 0) return scoreDiff;
      const lastDiff = (b.lastAccessed || 0) - (a.lastAccessed || 0);
      if (lastDiff !== 0) return lastDiff;
      return (a.index || 0) - (b.index || 0);
    });

    const previousIds = lastRenderedTabIds;
    tabItems = sortedTabs;
    lastRenderedTabIds = sortedTabs.map((tab) => tab.id);
    const list = overlayRoot.querySelector('#alterna-list');
    list.innerHTML = '';
    updateCountLabel(sortedTabs.length);
    if (sortedTabs.length === 0) {
      const emptyMessage = filterText ? 'No tabs match your search.' : 'No tabs available in this window.';
      showStatus(emptyMessage, { persistent: true });
      selectedIndex = 0;
      lastRenderedTabIds = [];
      return;
    }
    clearStatus();
    sortedTabs.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = 'alterna-item';
      item.dataset.index = i;
      item.dataset.tabId = t.id;
      const domain = extractDomain(t.url);
      if (domain) {
        item.dataset.domain = domain;
      } else if (item.dataset.domain) {
        delete item.dataset.domain;
      }

      const fav = createFaviconElement(t);
      const meta = document.createElement('div');
      meta.className = 'alterna-meta';
      const title = document.createElement('div');
      title.className = 'alterna-title';
      title.innerHTML = `${escapeHtml(t.title)}${buildBadges(t)}`;
      const url = document.createElement('div');
      url.className = 'alterna-url';
      url.textContent = shorten(t.url, 80);
      meta.appendChild(title);
      meta.appendChild(url);

      item.appendChild(fav);
      item.appendChild(meta);
      applyAccentToItem(item, t);
      const staggerIndex = Math.min(i, 6);
      item.style.setProperty('--item-index', String(staggerIndex));
      item.addEventListener('click', () => { void activateIndex(i); });
      const shouldAnimate = previousIds[i] !== t.id || previousIds.length !== sortedTabs.length;
      if (!shouldAnimate) {
        item.classList.add('entered');
      }
      list.appendChild(item);
      if (shouldAnimate) {
        requestAnimationFrame(() => {
          item.classList.add('entered');
        });
      }
    });
    selectedIndex = 0;
    highlight(selectedIndex);
  };

  const showOverlay = (tabs) => {
    if (!overlayRoot) createOverlay();
    allTabs = Array.isArray(tabs) ? tabs.slice() : [];
    totalTabCount = allTabs.length;
    resetSearchState({ hideWrapper: true, resetFilter: true });
    overlayRoot.classList.remove('fading');
    applyFilter();
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    overlayRoot.style.display = 'flex';
    overlayRoot.classList.add('is-visible');
    visible = true;
    loading = false;
    overlayRoot.classList.remove('loading');
    flushPendingToasts();
    if (tabItems.length > 0) clearStatus();
    focusOverlay();
  };

  function resetSearchState({ hideWrapper = false, resetFilter = false } = {}) {
    if (resetFilter) {
      filterRaw = '';
      filterText = '';
    }
    if (filterInput) {
      filterInput.value = filterRaw;
      filterInput.blur();
    }
    if (clearSearchButton) {
      clearSearchButton.disabled = !filterText;
    }
    searchVisible = false;
    if (searchWrapper) {
      searchWrapper.classList.remove('is-visible', 'has-value');
      if (hideWrapper) {
        searchWrapper.classList.add('is-hidden');
      }
    }
  }

  function ensureSearchControls() {
    if (!overlayRoot) return false;
    if (searchWrapper && searchWrapper.isConnected && filterInput && clearSearchButton) {
      return true;
    }

    const shell = overlayRoot.querySelector('#alterna-shell');
    if (!shell) return false;
    const header = shell.querySelector('#alterna-header');

    searchWrapper = document.createElement('div');
    searchWrapper.id = 'alterna-search-wrapper';
    searchWrapper.classList.add('is-hidden');

    const icon = document.createElement('span');
    icon.className = 'search-icon';
    icon.setAttribute('aria-hidden', 'true');

    filterInput = document.createElement('input');
    filterInput.id = 'alterna-search';
    filterInput.type = 'search';
    filterInput.placeholder = 'Search tabs';
    filterInput.autocomplete = 'off';
    filterInput.spellcheck = false;
    filterInput.inputMode = 'search';
    filterInput.addEventListener('input', handleSearchInput, { passive: true });
    filterInput.addEventListener('keydown', onSearchKeyDown);

    clearSearchButton = document.createElement('button');
    clearSearchButton.id = 'alterna-search-clear';
    clearSearchButton.type = 'button';
    clearSearchButton.setAttribute('aria-label', 'Clear search');
    clearSearchButton.disabled = true;
    clearSearchButton.addEventListener('click', () => hideSearchUI({ focusList: true }));

    searchWrapper.appendChild(icon);
    searchWrapper.appendChild(filterInput);
    searchWrapper.appendChild(clearSearchButton);

    if (header && header.parentNode === shell) {
      header.insertAdjacentElement('afterend', searchWrapper);
    } else {
      shell.appendChild(searchWrapper);
    }

    updateSearchUiState();
    return true;
  }

  function showSearchUI(prefill) {
    if (!ensureSearchControls()) return;
    searchVisible = true;
    searchWrapper.classList.remove('is-hidden');
    searchWrapper.classList.add('is-visible');
    if (typeof prefill === 'string') {
      filterInput.value = prefill;
      setFilterText(prefill);
    } else {
      filterInput.value = filterRaw;
      updateSearchUiState();
    }
    requestAnimationFrame(() => {
      if (!filterInput) return;
      const length = filterInput.value.length;
      filterInput.focus();
      filterInput.setSelectionRange(length, length);
    });
  }

  function hideSearchUI({ resetFilter = true, focusList = false } = {}) {
    if (resetFilter) {
      setFilterText('');
    }
    searchVisible = false;
    if (searchWrapper) {
      searchWrapper.classList.remove('is-visible', 'has-value');
      searchWrapper.classList.add('is-hidden');
    }
    if (filterInput) {
      filterInput.value = filterRaw;
      filterInput.blur();
    }
    if (clearSearchButton) {
      clearSearchButton.disabled = true;
    }
    if (focusList) {
      focusOverlay();
    }
    updateSearchUiState();
  }

  function applyFilter() {
    const filter = filterText;
    const source = Array.isArray(allTabs) ? allTabs : [];
    const filteredTabs = filter
      ? source.filter((tab) => tabMatchesFilter(tab, filter))
      : source.slice();
    buildList(filteredTabs);
    updateSearchUiState();
  }

  function setFilterText(value, { skipApply = false } = {}) {
    const raw = typeof value === 'string' ? value : '';
    const normalized = raw.trim().toLowerCase();
    if (filterRaw === raw && filterText === normalized) {
      if (filterInput && filterInput.value !== raw) {
        filterInput.value = raw;
      }
      updateSearchUiState();
      return;
    }
    filterRaw = raw;
    filterText = normalized;
    if (filterInput && filterInput.value !== raw) {
      filterInput.value = raw;
    }
    if (skipApply) {
      updateSearchUiState();
      return;
    }
    applyFilter();
  }

  function handleSearchInput(event) {
    const { value } = event.target;
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    searchDebounce = setTimeout(() => {
      searchDebounce = null;
      setFilterText(value);
    }, 140);
  }

  function onSearchKeyDown(event) {
    const code = event.key;
    if (code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      hideSearchUI({ resetFilter: true, focusList: true });
      return;
    }
    if ((code === 'ArrowDown' || code === 'ArrowUp') && tabItems.length > 0) {
      event.preventDefault();
      focusOverlay();
      return;
    }
  }

  function tabMatchesFilter(tab, filter) {
    if (!filter) return true;
    const lowerFilter = filter.toLowerCase();
    const title = (tab.title || '').toLowerCase();
    const url = (tab.url || '').toLowerCase();
    const domain = (tab.url ? extractDomain(tab.url) : '').toLowerCase();
    return title.includes(lowerFilter) || url.includes(lowerFilter) || domain.includes(lowerFilter);
  }

  function updateSearchUiState() {
    const hasValue = !!filterText;
    if (searchWrapper) {
      searchWrapper.classList.toggle('has-value', hasValue);
    }
    if (clearSearchButton) {
      clearSearchButton.disabled = !hasValue;
    }
  }

  function focusSearchInput() {
    if (!ensureSearchControls()) return false;
    showSearchUI();
    return true;
  }

  function maybeHandleTypeaheadSearch(event) {
    if (!visible || !searchVisible) return false;
    const { key } = event;
    if (!key || key.length !== 1) return false;
    if (event.metaKey || event.altKey) return false;
    if (/^[\r\n\t]$/.test(key)) return false;
    const isDigit = /^[0-9]$/.test(key);
    if (!event.shiftKey && !event.ctrlKey && isDigit && key !== '0') return false;
    event.preventDefault();
    const nextValue = searchVisible ? filterRaw + key : key;
    showSearchUI();
    if (filterInput) {
      filterInput.value = nextValue;
    }
    setFilterText(nextValue);
    return true;
  }

  const hideOverlay = (immediate = false) => {
    if (!overlayRoot) return;
    overlayRoot.classList.remove('is-visible');
    if (!immediate) {
      overlayRoot.classList.add('fading');
    } else {
      overlayRoot.classList.remove('fading');
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    const finalizeHide = () => {
      if (!overlayRoot) return;
      overlayRoot.style.display = 'none';
      overlayRoot.classList.remove('fading');
      overlayRoot.removeEventListener('transitionend', finalizeHide);
      hideTimer = null;
    };
    if (immediate) {
      finalizeHide();
    } else {
      overlayRoot.addEventListener('transitionend', finalizeHide);
      hideTimer = setTimeout(finalizeHide, 220); // fallback in case transition doesn't fire
    }
    visible = false;
    loading = false;
    overlayRoot.classList.remove('loading');
    loadToken++;
    if (toastStack) {
      toastStack.innerHTML = '';
    }
  };

  const focusOverlay = () => {
    const shell = overlayRoot.querySelector('#alterna-shell');
    if (shell) shell.focus();
  };

  const showLoading = () => {
    if (!overlayRoot) createOverlay();
    tabItems = [];
    selectedIndex = 0;
    const list = overlayRoot.querySelector('#alterna-list');
    if (list) {
      list.innerHTML = '<div class="alterna-loading" role="status">Loading tabs…</div>';
    }
    const countEl = overlayRoot.querySelector('#alterna-count');
    if (countEl) {
      countEl.textContent = 'Loading…';
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    overlayRoot.style.display = 'flex';
    overlayRoot.classList.remove('fading');
    requestAnimationFrame(() => {
      overlayRoot.classList.add('is-visible');
    });
    overlayRoot.classList.add('loading');
    visible = true;
    loading = true;
    showStatus('Loading tabs…', {persistent: true});
  };

  const highlight = (index) => {
    const items = overlayRoot.querySelectorAll('.alterna-item');
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === index);
    });
    // Ensure selected item visible
    const sel = overlayRoot.querySelector('.alterna-item.selected');
    if (sel) sel.scrollIntoView({block:'center', behavior:'smooth'});
  };

  function getItemElement(index) {
    if (!overlayRoot) return null;
    return overlayRoot.querySelector(`.alterna-item[data-index="${index}"]`);
  }

  function createFaviconElement(tab) {
    const wrapper = document.createElement('div');
    wrapper.className = 'alterna-fav';
    const src = tab.favIcon;
    if (src && typeof src === 'string' && src.trim()) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        wrapper.classList.add('placeholder');
        wrapper.textContent = deriveInitials(tab);
        img.remove();
      }, { once: true });
      wrapper.appendChild(img);
    } else {
      wrapper.classList.add('placeholder');
      wrapper.textContent = deriveInitials(tab);
    }
    return wrapper;
  }

  function deriveInitials(tab) {
    const domain = tab && tab.url ? extractDomain(tab.url) : '';
    if (domain) {
      const parts = domain.replace(/\..*/, '').split('-').filter(Boolean);
      if (parts.length) {
        return parts[0].slice(0, 2).toUpperCase();
      }
      return domain.slice(0, 2).toUpperCase();
    }
    const title = tab && tab.title ? tab.title.trim() : '';
    if (title) {
      const words = title.split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return words[0].slice(0, 2).toUpperCase();
    }
    return '??';
  }

  const activateIndex = async (index) => {
    const item = tabItems[index];
    if (!item) return;
    const friendlyTitle = shorten(item.title || item.url || 'tab', 64);
    const element = getItemElement(index);
    if (element) element.classList.add('activating');
    showStatus(`Switching to "${friendlyTitle}"…`, { persistent: true });
    const response = await safeSendMessage({ type: MESSAGE_TYPES.ACTIVATE_TAB, tabId: item.id }, {
      errorMessage: 'Unable to activate the selected tab.'
    });
    if (element) element.classList.remove('activating');
    if (response.ok) {
      flashShell('success');
      clearStatus();
      pushToast(`Switched to ${friendlyTitle}.`, { tone: 'success', duration: 2400 });
      requestAnimationFrame(() => hideOverlay(true));
    } else {
      flashShell('error');
      pushToast('Unable to activate the selected tab.', { tone: 'error', duration: runtimeConfig.errorDisplayMs });
    }
  };

  const closeIndex = async (index) => {
    const item = tabItems[index];
    if (!item) return;
    const friendlyTitle = shorten(item.title || item.url || 'tab', 64);
    const element = getItemElement(index);
    if (element) element.classList.add('closing');
    showStatus(`Closing "${friendlyTitle}"…`, { persistent: true });
    const response = await safeSendMessage({ type: MESSAGE_TYPES.CLOSE_TAB, tabId: item.id }, {
      errorMessage: 'Unable to close the selected tab.'
    });
    if (!response.ok) {
      if (element) element.classList.remove('closing');
      flashShell('error');
      pushToast('Unable to close the selected tab.', { tone: 'error', duration: runtimeConfig.errorDisplayMs });
      return;
    }
    flashShell('success');
    pushToast(`Closed ${friendlyTitle}.`, { tone: 'success', duration: 2600 });
    // remove from local list and UI immediately
    tabItems.splice(index, 1);
    const nextId = tabItems[Math.min(index, tabItems.length - 1)]?.id || null;
    buildList(tabItems);
    if (tabItems.length === 0) {
      hideOverlay();
      return;
    }
    if (nextId) {
      const nextIndex = tabItems.findIndex(t => t.id === nextId);
      selectedIndex = nextIndex >= 0 ? nextIndex : 0;
    } else {
      selectedIndex = Math.min(index, tabItems.length - 1);
    }
    highlight(selectedIndex);
    const nextElement = getItemElement(selectedIndex);
    if (nextElement) {
      nextElement.classList.add('success-flash');
      setTimeout(() => nextElement.classList.remove('success-flash'), 420);
    }
    showStatus('Tab closed.', { duration: 2200 });
  };

  const globalKeyHandler = (e) => {
    if (!visible) return;
    const code = e.key;
    if (e.ctrlKey && !e.shiftKey && !e.altKey && code && code.toLowerCase() === 'm') {
      e.preventDefault();
      toggleCompactMode();
      return;
    }
    const lowerKey = (code || '').toLowerCase();
    if (!e.altKey && !e.metaKey) {
      if (!e.ctrlKey && lowerKey === '/') {
        e.preventDefault();
        if (searchVisible) {
          hideSearchUI({ resetFilter: true, focusList: true });
        } else if (!focusSearchInput()) {
          focusOverlay();
        }
        return;
      }
      if (e.ctrlKey && lowerKey === 'f') {
        e.preventDefault();
        if (!searchVisible) {
          if (!focusSearchInput()) {
            focusOverlay();
          }
        } else {
          hideSearchUI({ resetFilter: false, focusList: true });
        }
        return;
      }
    }
    const typeaheadHandled = maybeHandleTypeaheadSearch(e);
    if (typeaheadHandled) return;
    if (code === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, tabItems.length - 1);
      highlight(selectedIndex);
    } else if (code === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      highlight(selectedIndex);
    } else if (/^[1-9]$/.test(code)) {
      const targetIndex = parseInt(code, 10) - 1;
      if (targetIndex < tabItems.length) {
        e.preventDefault();
        selectedIndex = targetIndex;
        highlight(selectedIndex);
        void activateIndex(selectedIndex);
      }
    } else if (code === 'Enter') {
      e.preventDefault();
      void activateIndex(selectedIndex);
    } else if (code === 'Delete') {
      e.preventDefault();
      void closeIndex(selectedIndex);
    } else if (code === 'Escape') {
      e.preventDefault();
      hideOverlay();
    }
  };

  // Receive message from background to show overlay with tabs
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.type) return;
    const handler = inboundHandlers[msg.type];
    if (handler) handler(msg);
  });

  const inboundHandlers = {
    [MESSAGE_TYPES.SHOW_OVERLAY]: (msg) => {
      if (!overlayRoot) createOverlay();
      if (visible) {
        hideOverlay(true);
      } else {
        const token = ++loadToken;
        showLoading();
        const tabs = Array.isArray(msg.tabs) ? msg.tabs : [];
        setTimeout(() => {
          if (loadToken !== token || !visible) return;
          showOverlay(tabs);
        }, 0);
      }
    },
    [MESSAGE_TYPES.SHOW_ERROR]: (msg) => {
      const text = typeof msg.message === 'string' && msg.message.trim() ? msg.message.trim() : 'Something went wrong.';
      showStatus(text, { error: true, persistent: !!msg.persistent, duration: runtimeConfig.errorDisplayMs });
    },
    [MESSAGE_TYPES.CONFIG_UPDATED]: (msg) => {
      if (msg.config && typeof msg.config === 'object') {
        runtimeConfig = mergeConfig(runtimeConfig, msg.config);
        compactMode = loadCompactPreference();
        applyCompactMode();
        if (visible) {
          updateCountLabel(tabItems.length);
          updateListAccents();
        }
      }
    }
  };

  // Utility helpers
  function toggleCompactMode() {
    compactMode = !compactMode;
    persistCompactPreference();
    applyCompactMode();
    if (visible) {
      updateCountLabel(tabItems.length);
    }
    showStatus(compactMode ? 'Compact mode enabled.' : 'Compact mode disabled.', { duration: 2500 });
  }

  function applyCompactMode() {
    if (!overlayRoot) return;
    overlayRoot.classList.toggle('compact', compactMode);
  }

  function persistCompactPreference() {
    try {
      localStorage.setItem(runtimeConfig.compactStorageKey, compactMode ? '1' : '0');
    } catch (_) {}
  }

  function loadCompactPreference() {
    try {
      return localStorage.getItem(runtimeConfig.compactStorageKey) === '1';
    } catch (_) {
      return false;
    }
  }

  function updateCountLabel(count) {
    if (!overlayRoot) return;
    const countEl = overlayRoot.querySelector('#alterna-count');
    if (!countEl) return;
    const total = totalTabCount;
    let label;
    if (filterText && total > 0) {
      label = `${count}/${total} tab${total === 1 ? '' : 's'}`;
    } else {
      label = `${count} tab${count === 1 ? '' : 's'}`;
    }
    countEl.textContent = compactMode ? `${label} • Compact` : label;
  }

  async function safeSendMessage(payload, { errorMessage = 'Operation failed.' } = {}) {
    try {
      const response = await chrome.runtime.sendMessage(payload);
      if (response && typeof response === 'object') {
        if (!response.ok) {
          const detail = response.error ? ` ${response.error}` : '';
          showStatus(`${errorMessage}${detail ? ` (${detail})` : ''}`, { error: true, duration: runtimeConfig.errorDisplayMs });
        }
        return response;
      }
      return { ok: true };
    } catch (err) {
      console.error('[AlternaTab] Message dispatch failed', err, payload);
      showStatus(errorMessage, { error: true, duration: runtimeConfig.errorDisplayMs });
      return { ok: false, error: err?.message || 'Message failed.' };
    }
  }

  function escapeHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
  }
  function shorten(s, n) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n-1) + '…' : s;
  }

  function extractDomain(url) {
    if (!url) return '';
    try {
      const { hostname } = new URL(url);
      return hostname.replace(/^www\./, '');
    } catch (_) {
      return '';
    }
  }

  function getDomainAccent(domain) {
    if (!domain) return '';
    const lower = domain.toLowerCase();
    const custom = runtimeConfig.domainColors[lower];
    if (custom) return custom;
    for (const key in runtimeConfig.domainColors) {
      if (lower.endsWith(`.${key}`) || lower.includes(key)) {
        return runtimeConfig.domainColors[key];
      }
    }
    return generateAccentFromDomain(lower);
  }

  function generateAccentFromDomain(domain) {
    if (!domain) return '';
    let hash = 0;
    for (let i = 0; i < domain.length; i += 1) {
      hash = (hash * 31 + domain.charCodeAt(i)) | 0;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 62%)`;
  }

  function applyAccentToItem(item, tab) {
    const domain = tab && tab.url ? extractDomain(tab.url) : '';
    const accent = getDomainAccent(domain);
    if (accent) {
      item.style.setProperty('--accent-color', accent);
      item.classList.add('has-accent');
    } else {
      item.style.removeProperty('--accent-color');
      item.classList.remove('has-accent');
    }
  }

  function updateListAccents() {
    if (!overlayRoot) return;
    const items = overlayRoot.querySelectorAll('.alterna-item');
    items.forEach((item) => {
      const index = Number(item.dataset.index || -1);
      const tab = tabItems[index];
      if (tab) applyAccentToItem(item, tab);
    });
  }

  function showStatus(message, options = {}) {
    const { error = false, persistent = false, duration = runtimeConfig.statusDisplayMs } = options;
    if (!overlayRoot) {
      pendingStatus = { message, options };
      return;
    }
    const el = overlayRoot.querySelector('#alterna-status');
    if (!el) return;
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    el.textContent = message;
    el.classList.toggle('error', error);
    el.classList.add('visible');
    if (!persistent) {
      statusTimer = setTimeout(() => {
        clearStatus();
      }, duration);
    }
  }

  function clearStatus() {
    const el = overlayRoot ? overlayRoot.querySelector('#alterna-status') : null;
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    if (el) {
      el.textContent = '';
      el.classList.remove('error');
      el.classList.remove('visible');
    }
    pendingStatus = null;
  }

  function pushToast(message, options = {}) {
    const { tone = 'info', duration = 3200 } = options;
    if (!message) return;
    const stack = ensureToastStack();
    if (!stack) {
      pendingToasts.push({ message, options: { tone, duration } });
      return;
    }
    const toast = document.createElement('div');
    toast.className = 'alterna-toast';
    toast.dataset.tone = tone;
    toast.textContent = message;
    stack.appendChild(toast);
    const dismiss = () => {
      toast.style.animation = 'toast-out 160ms ease forwards';
      toast.addEventListener('animationend', () => {
        toast.remove();
      }, { once: true });
    };
    toast.addEventListener('click', () => {
      dismiss();
    }, { once: true });
    if (duration > 0) {
      setTimeout(() => {
        if (document.body.contains(toast)) dismiss();
      }, duration);
    }
  }

  function ensureToastStack() {
    if (!overlayRoot) return null;
    if (!toastStack) {
      toastStack = overlayRoot.querySelector('#alterna-toast-stack');
    }
    return toastStack;
  }

  function flushPendingToasts() {
    if (!pendingToasts.length) return;
    const stack = ensureToastStack();
    if (!stack) return;
    const items = pendingToasts.splice(0, pendingToasts.length);
    for (const { message, options } of items) {
      pushToast(message, options);
    }
  }

  function flashShell(tone) {
    if (!overlayRoot) return;
    const shell = overlayRoot.querySelector('#alterna-shell');
    if (!shell) return;
    const successClass = 'action-success';
    const errorClass = 'action-error';
    shell.classList.remove(successClass, errorClass);
    // Force reflow to restart animation
    void shell.offsetWidth;
    if (tone === 'success') {
      shell.classList.add(successClass);
      setTimeout(() => shell.classList.remove(successClass), 520);
    } else if (tone === 'error') {
      shell.classList.add(errorClass);
      setTimeout(() => shell.classList.remove(errorClass), 480);
    }
  }

  async function hydrateConfig() {
    try {
      const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.REQUEST_CONFIG });
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid config response');
      }
      if (response.ok === false) {
        throw new Error(response.error || 'Config request failed');
      }
      const payload = response.config && typeof response.config === 'object'
        ? response.config
        : response;
      runtimeConfig = mergeConfig(runtimeConfig, payload);
      compactMode = loadCompactPreference();
      applyCompactMode();
      if (visible) {
        updateCountLabel(tabItems.length);
      }
    } catch (err) {
      console.warn('[AlternaTab] Falling back to default config', err);
      runtimeConfig = cloneDefaultConfig();
    }
  }

  function cloneDefaultConfig() {
    return {
      compactStorageKey: DEFAULT_CONFIG.compactStorageKey,
      statusDisplayMs: DEFAULT_CONFIG.statusDisplayMs,
      errorDisplayMs: DEFAULT_CONFIG.errorDisplayMs,
      domainColors: { ...DEFAULT_CONFIG.domainColors }
    };
  }

  function mergeConfig(current, overrides) {
    const base = current && typeof current === 'object'
      ? {
          compactStorageKey: current.compactStorageKey || DEFAULT_CONFIG.compactStorageKey,
          statusDisplayMs: current.statusDisplayMs || DEFAULT_CONFIG.statusDisplayMs,
          errorDisplayMs: current.errorDisplayMs || DEFAULT_CONFIG.errorDisplayMs,
          domainColors: { ...DEFAULT_CONFIG.domainColors, ...(current.domainColors || {}) }
        }
      : cloneDefaultConfig();
    if (!overrides || typeof overrides !== 'object') return base;
    if (typeof overrides.compactStorageKey === 'string' && overrides.compactStorageKey.trim()) {
      base.compactStorageKey = overrides.compactStorageKey.trim();
    }
    if (typeof overrides.statusDisplayMs === 'number' && overrides.statusDisplayMs > 0) {
      base.statusDisplayMs = overrides.statusDisplayMs;
    }
    if (typeof overrides.errorDisplayMs === 'number' && overrides.errorDisplayMs > 0) {
      base.errorDisplayMs = overrides.errorDisplayMs;
    }
    if (overrides.domainColors && typeof overrides.domainColors === 'object') {
      base.domainColors = { ...base.domainColors, ...sanitizeDomainMap(overrides.domainColors) };
    }
    return base;
  }

  function sanitizeDomainMap(map) {
    const result = {};
    if (!map || typeof map !== 'object') return result;
    for (const [key, value] of Object.entries(map)) {
      const normalized = normalizeDomainKey(key);
      if (!normalized) continue;
      result[normalized] = value;
    }
    return result;
  }

  function normalizeDomainKey(value) {
    if (!value || typeof value !== 'string') return '';
    let input = value.trim().toLowerCase();
    if (!input) return '';
    if (!input.includes('://')) input = `https://${input}`;
    try {
      const { hostname } = new URL(input);
      return hostname.replace(/^www\./, '');
    } catch (_) {
      return value.trim().toLowerCase();
    }
  }

})();
