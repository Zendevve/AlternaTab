const MESSAGE_TYPES = {
  REQUEST_CONFIG: 'REQUEST_CONFIG',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  RESET_CONFIG: 'RESET_CONFIG',
};

const form = document.querySelector('#settings-form');
const statusDurationInput = document.querySelector('#status-duration');
const errorDurationInput = document.querySelector('#error-duration');
const addDomainBtn = document.querySelector('#add-domain');
const resetBtn = document.querySelector('#reset');
const domainBody = document.querySelector('#domain-body');
const domainWrapper = document.querySelector('#domain-table-wrapper');
const toastEl = document.querySelector('#toast');
const emptyStateEl = document.querySelector('#domain-empty');
const saveStateEl = document.querySelector('#save-state');
const versionChip = document.querySelector('#extension-version');

let currentConfig = null;

init();

async function init() {
  renderDomainRows({});
  setSaveState('Loading…');
  await loadConfig();
  addDomainBtn.addEventListener('click', handleAddDomain);
  domainBody.addEventListener('click', handleDomainClick);
  form.addEventListener('submit', handleSave);
  resetBtn.addEventListener('click', handleReset);
  domainBody.addEventListener('input', handleDomainInputChange);
  if (domainWrapper) {
    domainWrapper.addEventListener('pointerenter', handleWrapperInteraction);
    domainWrapper.addEventListener('pointerleave', handleWrapperLeave);
    domainWrapper.addEventListener('focusin', handleWrapperInteraction);
    domainWrapper.addEventListener('focusout', handleWrapperFocusOut);
  }
}

function normalizeDomain(input) {
  if (!input) return '';
  let value = input.trim().toLowerCase();
  if (!value) return '';
  if (!value.includes('://')) {
    value = `https://${value}`;
  }
  try {
    const { hostname } = new URL(value);
    if (!hostname) return '';
    return hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

function mergeConfigObjects(base, overrides) {
  const merged = { ...base };
  if (!overrides || typeof overrides !== 'object') return merged;
  if (typeof overrides.statusDisplayMs === 'number') merged.statusDisplayMs = overrides.statusDisplayMs;
  if (typeof overrides.errorDisplayMs === 'number') merged.errorDisplayMs = overrides.errorDisplayMs;
  if (overrides.domainColors && typeof overrides.domainColors === 'object') {
    merged.domainColors = { ...merged.domainColors, ...overrides.domainColors };
  }
  return merged;
}

async function loadConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.REQUEST_CONFIG });
    if (!response || typeof response !== 'object') throw new Error('No config returned');
    if (response.ok === false) throw new Error(response.error || 'Failed to load configuration.');
    const config = response.config && typeof response.config === 'object' ? response.config : response;
    currentConfig = config;
    populateForm(config);
  } catch (err) {
    console.error('[AlternaTab Options] Failed to load config', err);
    showToast('Unable to load current settings.', true);
    setSaveState('Unable to load');
  }
}

function populateForm(config) {
  statusDurationInput.value = config.statusDisplayMs ?? 4500;
  errorDurationInput.value = config.errorDisplayMs ?? 6500;
  renderDomainRows(config.domainColors || {});
  reflectVersion();
  setSaveState('All changes saved');
}

function renderDomainRows(colors) {
  domainBody.innerHTML = '';
  const entries = Object.entries(colors);
  if (entries.length === 0) {
    addDomainRow('', '#4d6bff');
    updateDomainEmptyState();
    return;
  }
  for (const [domain, color] of entries) {
    addDomainRow(domain, color);
  }
  updateDomainEmptyState();
}

function addDomainRow(domain = '', color = '#4d6bff') {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>
      <div class="domain-cell">
        <div class="domain-color-indicator" style="background: ${sanitizeColor(color)};"></div>
        <input type="text" class="domain-input" placeholder="example.com" value="${escapeHtml(domain)}" />
      </div>
    </td>
    <td>
      <input type="color" class="color-input" value="${sanitizeColor(color)}" />
    </td>
    <td class="actions-cell">
      <button type="button" class="delete-domain" aria-label="Remove domain">Remove</button>
    </td>
  `;
  domainBody.appendChild(row);
  
  // Sync color indicator with color picker
  const colorInput = row.querySelector('.color-input');
  const indicator = row.querySelector('.domain-color-indicator');
  if (colorInput && indicator) {
    colorInput.addEventListener('input', (e) => {
      indicator.style.background = e.target.value;
    });
  }
  
  updateDomainEmptyState();
}

function handleAddDomain() {
  addDomainRow('', '#4d6bff');
  domainBody.lastElementChild?.querySelector('.domain-input')?.focus();
  setSaveState('Unsaved changes');
}

function handleDomainClick(event) {
  if (event.target.classList.contains('delete-domain')) {
    const rows = [...domainBody.querySelectorAll('tr')];
    if (rows.length <= 1) {
      rows[0].querySelector('.domain-input').value = '';
      updateDomainEmptyState();
      setSaveState('Unsaved changes');
      return;
    }
    event.target.closest('tr').remove();
    updateDomainEmptyState();
    setSaveState('Unsaved changes');
  }
}

function handleDomainInputChange(event) {
  if (event.target.matches('.domain-input, .color-input')) {
    setSaveState('Unsaved changes');
    updateDomainEmptyState();
  }
}

function handleWrapperInteraction() {
  domainWrapper?.classList.add('hovering');
}

function handleWrapperLeave() {
  domainWrapper?.classList.remove('hovering');
}

function handleWrapperFocusOut() {
  if (!domainWrapper) return;
  const active = document.activeElement;
  if (!domainWrapper.contains(active)) {
    domainWrapper.classList.remove('hovering');
  }
}

async function handleSave(event) {
  event.preventDefault();
  const payload = buildPayload();
  if (!payload) return;
  setSaveState('Saving…');
  try {
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.UPDATE_CONFIG,
      config: payload
    });
    if (!response || response.ok === false) {
      const message = response?.error || 'Failed to save settings.';
      throw new Error(message);
    }
    currentConfig = mergeConfigObjects(currentConfig, payload);
    showToast('Settings saved successfully.');
    setSaveState('All changes saved');
  } catch (err) {
    console.error('[AlternaTab Options] Failed to save config', err);
    showToast(err.message || 'Failed to save settings.', true);
    setSaveState('Unable to save');
  }
}

async function handleReset() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.RESET_CONFIG });
    if (!response || response.ok === false) {
      throw new Error(response?.error || 'Reset failed.');
    }
    currentConfig = response.config && typeof response.config === 'object' ? response.config : currentConfig;
    populateForm(currentConfig);
    showToast('Settings reset to defaults.');
    setSaveState('All changes saved');
  } catch (err) {
    console.error('[AlternaTab Options] Failed to reset config', err);
    showToast(err.message || 'Reset failed.', true);
    setSaveState('Unable to reset');
  }
}

function buildPayload() {
  const statusMs = parseInt(statusDurationInput.value, 10);
  const errorMs = parseInt(errorDurationInput.value, 10);
  if (Number.isNaN(statusMs) || statusMs <= 0) {
    showToast('Status duration must be a positive number.', true);
    statusDurationInput.focus();
    return null;
  }
  if (Number.isNaN(errorMs) || errorMs <= 0) {
    showToast('Error duration must be a positive number.', true);
    errorDurationInput.focus();
    return null;
  }

  const domainColors = {};
  const rows = domainBody.querySelectorAll('tr');
  for (const row of rows) {
    const rawDomain = row.querySelector('.domain-input').value;
    const domain = normalizeDomain(rawDomain);
    const color = row.querySelector('.color-input').value;
    if (!domain) continue;
    domainColors[domain] = sanitizeColor(color);
  }

  return {
    statusDisplayMs: statusMs,
    errorDisplayMs: errorMs,
    domainColors
  };
}

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.classList.toggle('error', isError);
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, isError ? 3500 : 2500);
}

function updateDomainEmptyState() {
  if (!emptyStateEl) return;
  const hasRows = domainBody.querySelectorAll('tr').length > 0;
  const hasContent = [...domainBody.querySelectorAll('.domain-input')].some(input => input.value.trim().length > 0);
  emptyStateEl.hidden = hasRows && hasContent;
}

function setSaveState(state) {
  if (!saveStateEl) return;
  saveStateEl.textContent = state;
  const normalized = state.toLowerCase();
  let stateKey = 'default';
  if (normalized.includes('unable')) {
    stateKey = 'error';
  } else if (normalized.includes('unsaved')) {
    stateKey = 'unsaved';
  } else if (normalized.includes('saving')) {
    stateKey = 'saving';
  } else if (normalized.includes('loading')) {
    stateKey = 'loading';
  } else if (normalized.includes('all changes saved') || (normalized.includes('saved') && !normalized.includes('unsaved'))) {
    stateKey = 'saved';
  }
  saveStateEl.dataset.state = stateKey;
  saveStateEl.classList.toggle('error', stateKey === 'error');
}

function reflectVersion() {
  if (!versionChip) return;
  try {
    const version = chrome.runtime.getManifest().version;
    versionChip.textContent = `v${version}`;
  } catch (_) {
    versionChip.hidden = true;
  }
}

function sanitizeColor(color) {
  const hex = /^#([0-9a-f]{6})$/i;
  if (hex.test(color)) return color;
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = color;
    const normalized = ctx.fillStyle;
    if (hex.test(normalized)) return normalized;
  } catch (_) {
    // ignore
  }
  return '#4d6bff';
}

function escapeHtml(str = '') {
  return str.replace(/[&<>"]+/g, (match) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  })[match] || match);
}
