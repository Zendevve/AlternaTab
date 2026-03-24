let launcherWindowId: number | null = null;

export async function openLauncherWindow() {
  if (launcherWindowId !== null) {
    try {
      await chrome.windows.update(launcherWindowId, { focused: true });
      return;
    } catch (e) {
      // Window might have been closed manually
      launcherWindowId = null;
    }
  }

  // Get current window to center the popup
  const currentWindow = await chrome.windows.getCurrent();
  const width = 720;
  const height = 540;

  let left = Math.round((currentWindow.width || 1920) / 2 - width / 2 + (currentWindow.left || 0));
  let top = Math.round((currentWindow.height || 1080) / 2 - height / 2 + (currentWindow.top || 0));

  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('launcher.html'),
    type: 'popup',
    width,
    height,
    left,
    top,
    focused: true
  });

  if (win?.id !== undefined) {
    launcherWindowId = win.id;
  }
}

// Ensure we clean up tracking if window is closed
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === launcherWindowId) {
    launcherWindowId = null;
  }
});
