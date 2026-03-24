// QuickSwitch Options Page Logic
document.addEventListener('DOMContentLoaded', () => {
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const statusEl = document.getElementById('status');

  // Form elements
  const enableNotifications = document.getElementById('enableNotifications');
  const showRecentlyClosed = document.getElementById('showRecentlyClosed');
  const showTabGroups = document.getElementById('showTabGroups');
  const captureThumbnails = document.getElementById('captureThumbnails');
  const themeSelect = document.getElementById('theme');
  const opacityInput = document.getElementById('opacity');
  const analyticsCheckbox = document.getElementById('analytics');
  const clearDataCheckbox = document.getElementById('clearData');
  const resetShortcutBtn = document.getElementById('resetShortcut');

  // Load saved settings
  loadSettings();

  // Save settings
  saveBtn.addEventListener('click', saveSettings);

  // Reset to defaults
  resetBtn.addEventListener('click', resetSettings);

  // Export settings
  exportBtn.addEventListener('click', exportSettings);

  // Import settings
  importBtn.addEventListener('click', importSettings);

  // Reset shortcut
  resetShortcutBtn.addEventListener('click', resetShortcut);

  function loadSettings() {
    chrome.storage.sync.get({
      enableNotifications: true,
      showRecentlyClosed: true,
      showTabGroups: true,
      captureThumbnails: true,
      theme: 'auto',
      opacity: 0.6,
      analytics: false,
      clearData: false
    }, (items) => {
      enableNotifications.checked = items.enableNotifications;
      showRecentlyClosed.checked = items.showRecentlyClosed;
      showTabGroups.checked = items.showTabGroups;
      captureThumbnails.checked = items.captureThumbnails;
      themeSelect.value = items.theme;
      opacityInput.value = items.opacity;
      analyticsCheckbox.checked = items.analytics;
      clearDataCheckbox.checked = items.clearData;
    });
  }

  function saveSettings() {
    const settings = {
      enableNotifications: enableNotifications.checked,
      showRecentlyClosed: showRecentlyClosed.checked,
      showTabGroups: showTabGroups.checked,
      captureThumbnails: captureThumbnails.checked,
      theme: themeSelect.value,
      opacity: parseFloat(opacityInput.value),
      analytics: analyticsCheckbox.checked,
      clearData: clearDataCheckbox.checked
    };

    chrome.storage.sync.set(settings, () => {
      showStatus('Settings saved successfully!', 'success');

      // Notify background/service worker of changes
      chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings: settings
      });
    });
  }

  function resetSettings() {
    if (confirm('Reset all settings to default values?')) {
      chrome.storage.sync.clear(() => {
        loadSettings();
        showStatus('Settings reset to defaults!', 'success');

        // Notify background/service worker
        chrome.runtime.sendMessage({
          type: 'SETTINGS_RESET'
        });
      });
    }
  }

  function exportSettings() {
    chrome.storage.sync.get(null, (items) => {
      const dataStr = JSON.stringify(items, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'quickswitch-settings.json';
      a.click();

      URL.revokeObjectURL(url);
      showStatus('Settings exported!', 'success');
    });
  }

  function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const items = JSON.parse(event.target.result);
          chrome.storage.sync.set(items, () => {
            loadSettings();
            showStatus('Settings imported successfully!', 'success');
          });
        } catch (err) {
          showStatus('Invalid JSON file!', 'error');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }

  function resetShortcut() {
    if (confirm('Reset keyboard shortcut to Alt+Q?')) {
      // Note: Actually changing the shortcut requires updating manifest.json
      // This is just a placeholder for UI feedback
      showStatus('Shortcut reset to Alt+Q (update manifest.json)', 'success');
    }
  }

  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';

    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
});
