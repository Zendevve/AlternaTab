import { openLauncherWindow } from './window';
import { mruTracker } from './mru';
import { setupMessageListeners } from './tabs';

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-launcher') {
    openLauncherWindow();
  }
});

// Initialize the MRU tracker when the background script starts up
mruTracker.initialize();

// Setup message listeners for the React UI
setupMessageListeners();
