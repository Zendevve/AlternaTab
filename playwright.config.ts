import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run sequentially to avoid conflicts with persistent context profile locks
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    headless: false, // Chrome extensions are only supported in headed mode or with specific headless arguments
  },
});
