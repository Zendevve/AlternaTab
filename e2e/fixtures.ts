import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.resolve(__dirname, "../dist");
    
    // Ensure dist directory exists
    if (!fs.existsSync(pathToExtension)) {
      throw new Error(`Extension build folder not found at ${pathToExtension}. Please run npm run build first.`);
    }

    // Use a unique, temporary userDataDir for each test run to avoid profile lock issues
    const userDataDir = path.resolve(__dirname, `../.playwright-userData-${Math.random().toString(36).substring(7)}`);
    
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        "--no-sandbox",
        "--disable-gpu",
      ],
    });

    await use(context);
    await context.close();
    
    // Cleanup temporary userDataDir
    try {
      if (fs.existsSync(userDataDir)) {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  },
  extensionId: async ({ context }, use) => {
    // Retrieve the background service worker to extract the extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }

    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
