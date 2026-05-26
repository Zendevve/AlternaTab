import { test, expect } from "./fixtures";

test.describe("Switcher Overlay E2E & Performance Tests", () => {
  test("successfully injects switcher overlay and measures render latency", async ({ page, extensionId, context }) => {
    // Enable page console and error logging
    page.on("console", msg => console.log(`[PAGE CONSOLE] ${msg.text()}`));
    page.on("pageerror", err => console.log(`[PAGE ERROR] ${err.message}`));

    // 1. Load a standard web page where content scripts are injected
    await page.goto("https://example.com");
    
    // Assert page loaded
    await expect(page.locator("h1")).toContainText("Example Domain");

    // Wait a brief moment for content script initialization
    await page.waitForTimeout(1000);

    // 2. Retrieve background service worker context
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }

    // 3. Trigger switcher overlay from the background service worker and benchmark latency
    const startTime = Date.now();

    await background.evaluate(async () => {
      // Query all open tabs globally to locate the example.com page
      const tabs = await chrome.tabs.query({});
      const targetTab = tabs.find(t => t.url && t.url.includes("example.com"));
      
      if (!targetTab || !targetTab.id) {
        throw new Error("No target tab with example.com found for message routing");
      }
      
      await chrome.tabs.sendMessage(targetTab.id, {
        action: "toggle-switcher",
        tabs: [
          { id: 101, windowId: 1, title: "Tab A", url: "a.com", incognito: false },
          { id: 102, windowId: 1, title: "Tab B", url: "b.com", incognito: false },
          { id: 103, windowId: 1, title: "Tab C", url: "c.com", incognito: false }
        ],
        settings: {
          activationMode: "hold",
          theme: "dark",
          cardLayout: "list",
          showFavicons: true,
          wrapNavigation: true
        }
      });
    });

    // 4. Assert that overlay host is successfully injected and attached to DOM
    const host = page.locator("#alternatab-overlay-host");
    await expect(host).toBeAttached({ timeout: 4000 });

    const duration = Date.now() - startTime;
    console.log(`[PERFORMANCE] Switcher Overlay Injection & Render Latency: ${duration}ms`);
    
    // Assert performance is top-tier (render latency under 100ms)
    expect(duration).toBeLessThan(100);
  });
});
