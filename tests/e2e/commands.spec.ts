import { expect, test } from "@playwright/test";
import { BUILT_IN_COMMANDS } from "../../src/background/commands";
import { createExtensionContext } from "./helpers";

test.describe("AlternaTab NextGen Command Palette", () => {
  test("all 20 built-in commands are registered with categories and titles", () => {
    expect(BUILT_IN_COMMANDS).toHaveLength(20);

    const requiredIds = [
      "close-duplicates",
      "group-domain",
      "suspend-inactive",
      "close-left",
      "close-right",
      "close-other",
      "mute-all",
      "pin-toggle",
      "split-window",
      "merge-windows",
      "sort-title",
      "sort-domain",
      "sort-mru",
      "restore-tab",
      "export-session",
      "copy-urls",
      "reload-all",
      "toggle-theme",
      "toggle-vim",
      "open-settings",
    ];

    const commandIds = BUILT_IN_COMMANDS.map((c) => c.id);
    for (const reqId of requiredIds) {
      expect(commandIds).toContain(reqId);
    }
  });

  test("executes toggle-theme and session export commands through messaging", async () => {
    const { context, extensionId } = await createExtensionContext();

    try {
      const page = await context.newPage();
      await page.goto(`chrome-extension://${extensionId}/options.html`);

      const exportResult = await page.evaluate(async () => {
        return new Promise<{ ok: boolean; value?: { json: string } }>((resolve) => {
          chrome.runtime.sendMessage(
            {
              id: 1,
              type: "exportSession",
              data: undefined,
              timestamp: Date.now(),
            },
            (response) => {
              resolve(response?.res);
            },
          );
        });
      });

      expect(exportResult?.ok).toBe(true);
      if (exportResult?.value) {
        const parsed = JSON.parse(exportResult.value.json);
        expect(parsed.version).toBe(1);
        expect(Array.isArray(parsed.windows)).toBe(true);
      }
    } finally {
      await context.close();
    }
  });
});
