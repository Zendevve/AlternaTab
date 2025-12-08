// options.js — AlternaTab v2.0

const MESSAGE_TYPES = {
  GET_CONFIG: 'GET_CONFIG',
  SET_CONFIG: 'SET_CONFIG'
};

async function load() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_CONFIG });
    document.getElementById('crossWindow').checked = response.config?.crossWindow ?? true;
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

async function save() {
  const config = {
    crossWindow: document.getElementById('crossWindow').checked
  };

  try {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SET_CONFIG, config });
    const btn = document.getElementById('save');
    btn.textContent = 'Saved!';
    setTimeout(() => btn.textContent = 'Save', 1500);
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

document.getElementById('save').addEventListener('click', save);
document.addEventListener('DOMContentLoaded', load);
