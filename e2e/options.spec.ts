import { test, expect } from "./fixtures";

test.describe("Options Page E2E Tests", () => {
  test("successfully loads options page, toggles settings, and persists them", async ({ page, extensionId }) => {
    // 1. Open Options page
    await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);
    
    // Assert page title and header
    await expect(page).toHaveTitle("alternaTab Options");
    await expect(page.locator(".title-group h1")).toContainText("alternaTab");

    // 2. Locate form elements
    const selectTheme = page.locator("#theme");
    const labelGrid = page.locator("label[for='cardLayoutGrid']");
    const labelList = page.locator("label[for='cardLayoutList']");
    const labelWindowBadge = page.locator("label[for='showWindowBadge']");

    const radioGrid = page.locator("#cardLayoutGrid");
    const radioList = page.locator("#cardLayoutList");
    const checkboxWindowBadge = page.locator("#showWindowBadge");

    // Assert initial default values
    await expect(selectTheme).toHaveValue("auto");
    await expect(radioGrid).toBeChecked(); // default checked
    await expect(checkboxWindowBadge).toBeChecked();

    // 3. Update Settings values by clicking their visible labels
    await selectTheme.selectOption("dark");
    await labelList.click();
    await labelWindowBadge.click();

    // Toast notification saving alert check
    const toast = page.locator("#toast");
    await expect(toast).toContainText("Settings saved successfully!");

    // 4. Reload page to verify persistence in Extension Storage
    await page.reload();
    
    // Re-assert modified settings persist after page reload
    await expect(selectTheme).toHaveValue("dark");
    await expect(radioList).toBeChecked();
    await expect(checkboxWindowBadge).not.toBeChecked();
  });
});
