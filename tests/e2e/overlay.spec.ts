import { expect, test } from "@playwright/test";
import { createExtensionContext } from "./helpers";

test.describe("AlternaTab NextGen Overlay & Options", () => {
  test("loads extension service worker and renders options page", async () => {
    const { context, extensionId } = await createExtensionContext();

    try {
      expect(extensionId).toBeTruthy();

      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);

      const heading = page.locator("h1");
      await expect(heading).toHaveText("AlternaTab NextGen");

      const themeSelect = page.locator("#theme-select");
      await expect(themeSelect).toBeVisible();

      // Change theme to OLED
      await themeSelect.selectOption("oled");

      // Save settings
      const saveBtn = page.locator("button:has-text('Save Settings')");
      await saveBtn.click();

      const status = page.locator(".status-msg");
      await expect(status).toHaveText("Settings saved successfully!");
    } finally {
      await context.close();
    }
  });

  test("injects content script on webpage without blocking page clicks when closed", async () => {
    const { context } = await createExtensionContext();

    try {
      const page = await context.newPage();
      await page.goto("https://example.com");

      // Host container should be attached to DOM
      const host = page.locator("#alternatab-host");
      await expect(host).toBeAttached();

      // Verify host does NOT capture pointer events when closed
      const hostStyles = await page.evaluate(() => {
        const h = document.getElementById("alternatab-host");
        if (!h) return null;
        return {
          display: window.getComputedStyle(h).display,
          pointerEvents: window.getComputedStyle(h).pointerEvents,
        };
      });

      expect(hostStyles?.pointerEvents).toBe("none");
      expect(hostStyles?.display).toBe("none");

      // Page link should be clickable
      const link = page.locator("a");
      await expect(link).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
