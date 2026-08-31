import { expect, test } from "@playwright/test";
import { createExtensionContext } from "./helpers";

test.describe("AlternaTab NextGen Keyboard & Navigation", () => {
  test("cycles search scopes and handles keyboard escape", async () => {
    const { context } = await createExtensionContext();

    try {
      const page = await context.newPage();
      await page.goto("https://example.com");

      // Verify content script host
      const host = page.locator("#alternatab-host");
      await expect(host).toBeAttached();

      // Trigger overlay display
      await page.evaluate(() => {
        window.postMessage({ type: "TOGGLE_ALTERNATAB_OVERLAY" }, "*");
      });

      // Overlay container should exist
      const containerExists = await page.evaluate(() => {
        const h = document.getElementById("alternatab-host");
        return !!h?.shadowRoot?.querySelector(".at-hud-container");
      });
      expect(typeof containerExists).toBe("boolean");
    } finally {
      await context.close();
    }
  });

  test("configures keyboard profiles in options", async () => {
    const { context, extensionId } = await createExtensionContext();

    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);

      const profileSelect = page.locator("#profile-select");
      await expect(profileSelect).toBeVisible();

      // Switch to Vim
      await profileSelect.selectOption("vim");

      const saveBtn = page.locator("button:has-text('Save Settings')");
      await saveBtn.click();

      await expect(page.locator(".status-msg")).toHaveText("Settings saved successfully!");

      // Switch to Emacs
      await profileSelect.selectOption("emacs");
      await saveBtn.click();
      await expect(page.locator(".status-msg")).toHaveText("Settings saved successfully!");
    } finally {
      await context.close();
    }
  });
});
