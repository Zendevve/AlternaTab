import path from "node:path";
import { type BrowserContext, chromium } from "@playwright/test";

export const EXTENSION_PATH = path.resolve(process.cwd(), ".output/chrome-mv3");

export async function createExtensionContext(): Promise<{
  context: BrowserContext;
  extensionId: string;
}> {
  const context = await chromium.launchPersistentContext("", {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      "--no-sandbox",
      "--disable-gpu",
    ],
  });

  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent("serviceworker", { timeout: 10000 });
  }

  const extensionId = background.url().split("/")[2] ?? "";

  return { context, extensionId };
}
