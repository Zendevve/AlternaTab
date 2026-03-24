import { logger } from '../../shared/logger';

class LauncherWindowService {
  private launcherWindowId: number | null = null;

  constructor() {
    chrome.windows.onRemoved.addListener((windowId) => {
      if (windowId === this.launcherWindowId) {
        this.clearLauncherReference();
      }
    });
  }

  public clearLauncherReference() {
    this.launcherWindowId = null;
    logger.debug('Launcher window reference cleared');
  }

  public isLauncherOpen(): boolean {
    return this.launcherWindowId !== null;
  }

  public async openOrFocusLauncher(): Promise<void> {
    if (this.launcherWindowId !== null) {
      try {
        await chrome.windows.update(this.launcherWindowId, { focused: true });
        logger.debug('Focused existing launcher window');
        return;
      } catch (e) {
        // Window might have been closed without triggering the event quickly enough
        logger.warn('Failed to focus existing launcher, recreating...');
        this.launcherWindowId = null;
      }
    }

    try {
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
        this.launcherWindowId = win.id;
        logger.debug('Created new launcher window with ID:', win.id);
      }
    } catch (e) {
      logger.error('Failed to create launcher window', e);
    }
  }
}

export const launcherWindowService = new LauncherWindowService();
