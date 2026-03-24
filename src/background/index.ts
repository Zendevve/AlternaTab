import { launcherWindowService } from './services/launcherWindowService';
import { mruService } from './services/mruService';
import { setupMessageRouter } from './router';
import { logger } from '../shared/logger';

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-launcher') {
    launcherWindowService.openOrFocusLauncher();
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  mruService.touch(activeInfo.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  mruService.remove(tabId);
});

async function initialize() {
  try {
    await mruService.hydrate();
    const tabs = await chrome.tabs.query({});
    const validIds = tabs.map(t => t.id).filter((id): id is number => id !== undefined);
    await mruService.pruneAgainstOpenTabs(validIds);
    setupMessageRouter();
    logger.info('Background services initialized');
  } catch (e) {
    logger.error('Failed to initialize background services', e);
  }
}

initialize();
