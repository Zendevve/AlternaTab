import { configStore } from "../state/configStore";
import { sessionStore } from "../state/sessionStore";
import { tabStore } from "../state/tabStore";
import { registerBackgroundEvents } from "./events";
import { registerBackgroundMessaging } from "./messaging";

export async function initBackground(): Promise<void> {
  await configStore.init();
  await sessionStore.init();
  await tabStore.init();

  registerBackgroundEvents();
  registerBackgroundMessaging();
}

// Auto-initialize when running as service worker
if (typeof chrome !== "undefined" && chrome.runtime) {
  initBackground();
}
