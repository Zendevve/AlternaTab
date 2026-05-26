import { test, expect } from "./fixtures";

test.describe("Popup Page E2E Tests", () => {
  test("successfully loads popup and renders options links", async ({ page, extensionId, context }) => {
    // 1. Open Popup page
    await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    
    // Assert header logo title is correct
    await expect(page.locator(".popup-title-wrap h2")).toContainText("alternaTab");

    // 2. Locate action buttons
    const btnOptions = page.locator("#openOptionsBtn");
    const btnShortcuts = page.locator("#openShortcutsBtn");
    const statusText = page.locator(".popup-status");

    await expect(btnOptions).toBeVisible();
    await expect(btnShortcuts).toBeVisible();
    await expect(statusText).toContainText("Active Background Mode");

    // 3. Click Options button and verify it opens options tab
    const [optionsPage] = await Promise.all([
      context.waitForEvent("page"),
      btnOptions.click(),
    ]);
    
    await expect(optionsPage).toHaveURL(new RegExp(`chrome-extension://${extensionId}/src/options/index.html`));
    await expect(optionsPage.locator(".title-group h1")).toContainText("alternaTab");
  });
});
