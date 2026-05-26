import { test, expect } from "./fixtures";

test.describe("Onboarding Wizard E2E Tests", () => {
  test("successfully completes the onboarding wizard steps", async ({ page, extensionId }) => {
    // 1. Open Onboarding Page
    await page.goto(`chrome-extension://${extensionId}/src/onboarding/index.html`);
    
    // Assert page title and header
    await expect(page).toHaveTitle("Welcome to alternaTab - Quick Start Guide");
    await expect(page.locator("#slide-1-title")).toContainText("Supercharge Your Tab Switching");

    // 2. Select Toggle Mode
    const modeToggle = page.locator("#mode-toggle");
    const modeHold = page.locator("#mode-hold");
    
    await expect(modeHold).toHaveAttribute("aria-checked", "true");
    await expect(modeToggle).toHaveAttribute("aria-checked", "false");
    
    // Click Toggle Mode Card
    await modeToggle.click();
    await expect(modeToggle).toHaveAttribute("aria-checked", "true");
    await expect(modeHold).toHaveAttribute("aria-checked", "false");

    // 3. Click Next to go to Step 2
    const btnNext = page.locator("#btn-next");
    const btnBack = page.locator("#btn-back");
    
    await btnNext.click();
    
    // Verify Step 2 is active
    await expect(page.locator("#slide-2")).toHaveClass(/active/);
    await expect(page.locator("#slide-1")).not.toHaveClass(/active/);
    await expect(btnBack).toBeVisible();

    // 4. Interact with the Switcher Playground
    const sandbox = page.locator("#playground-sandbox");
    await expect(sandbox).toBeVisible();
    
    // Focus the sandbox area
    await sandbox.click();
    
    // Inside Step 2: Simulated tab switching overlay renders mock items
    const simulatedList = page.locator("#simulated-list");
    await expect(simulatedList.locator(".sim-card")).toHaveCount(3);
    
    // Simulate Alt+Q cycle forward
    await sandbox.press("Alt+q");
    
    // Verify selected class shifts to the next simulated item
    const firstItem = simulatedList.locator(".sim-card").first();
    const secondItem = simulatedList.locator(".sim-card").nth(1);
    await expect(secondItem).toHaveClass(/active/);
    await expect(firstItem).not.toHaveClass(/active/);
    
    // Click Next to go to Step 3
    await btnNext.click();
    await expect(page.locator("#slide-3")).toHaveClass(/active/);
    await expect(page.locator("#slide-2")).not.toHaveClass(/active/);
    
    // Verify shortcuts configuration launcher button exists
    const btnShortcuts = page.locator("#btn-open-shortcuts");
    await expect(btnShortcuts).toBeVisible();
  });
});
