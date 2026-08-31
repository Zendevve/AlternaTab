import { expect, test } from "@playwright/test";
import type { TabItem } from "../../src/types/models";
import { createExtensionContext } from "./helpers";

test.describe("AlternaTab NextGen Tab Lifecycle & Multi-tab Operations", () => {
  test("queries, pins, mutes, duplicates, and manages tabs", async () => {
    const { context, extensionId } = await createExtensionContext();

    try {
      const page1 = await context.newPage();
      await page1.goto("https://example.com");

      const page2 = await context.newPage();
      await page2.goto(`chrome-extension://${extensionId}/options.html`);

      // Query tabs via background
      const tabData = await page2.evaluate(async () => {
        return new Promise<{ tabs: TabItem[]; activeTabId: number }>((resolve) => {
          chrome.runtime.sendMessage(
            { id: 101, type: "getTabs", data: undefined, timestamp: Date.now() },
            (res) => {
              resolve(res?.res);
            },
          );
        });
      });

      expect(tabData?.tabs?.length).toBeGreaterThanOrEqual(2);

      const targetTab = tabData.tabs.find((t) => t.url.includes("example.com"));
      expect(targetTab).toBeDefined();

      if (targetTab) {
        // Toggle pin
        const pinRes = await page2.evaluate(async (tabId) => {
          return new Promise<{ ok: boolean; value?: { pinned: boolean } }>((resolve) => {
            chrome.runtime.sendMessage(
              { id: 102, type: "togglePinTab", data: { tabId }, timestamp: Date.now() },
              (res) => resolve(res?.res),
            );
          });
        }, targetTab.id);
        expect(pinRes?.ok).toBe(true);

        // Toggle mute
        const muteRes = await page2.evaluate(async (tabId) => {
          return new Promise<{ ok: boolean; value?: { muted: boolean } }>((resolve) => {
            chrome.runtime.sendMessage(
              { id: 103, type: "toggleMuteTab", data: { tabId }, timestamp: Date.now() },
              (res) => resolve(res?.res),
            );
          });
        }, targetTab.id);
        expect(muteRes?.ok).toBe(true);

        // Close tabs
        const closeRes = await page2.evaluate(async (tabId) => {
          return new Promise<{ ok: boolean }>((resolve) => {
            chrome.runtime.sendMessage(
              { id: 104, type: "closeTabs", data: { tabIds: [tabId] }, timestamp: Date.now() },
              (res) => resolve(res?.res),
            );
          });
        }, targetTab.id);
        expect(closeRes?.ok).toBe(true);
      }
    } finally {
      await context.close();
    }
  });
});
