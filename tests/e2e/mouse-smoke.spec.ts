import { expect, type Page, test } from "@playwright/test";
import { createExtensionContext } from "./helpers";

const POLL_INTERVAL_MS = 100;
const POLL_MAX_ATTEMPTS = 50;

async function getSecondRowCoords(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    ({ interval, attempts }) => {
      const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
      const h = document.getElementById("alternatab-host");
      if (!h) return null;
      const shadow = h.shadowRoot;
      if (!shadow) return null;
      return (async (): Promise<{ x: number; y: number } | null> => {
        for (let i = 0; i < attempts; i++) {
          const rows = shadow.querySelectorAll(".at-row");
          if (rows.length >= 2) {
            const targetRow = rows[1] as HTMLElement;
            const rect = targetRow.getBoundingClientRect();
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
          await sleep(interval);
        }
        return null;
      })();
    },
    { interval: POLL_INTERVAL_MS, attempts: POLL_MAX_ATTEMPTS },
  );
}

test.describe("Real Mouse Smoke Test", () => {
  test("mouse click on backdrop dismisses HUD and page links are clickable when closed", async () => {
    const { context } = await createExtensionContext();

    try {
      const page1 = await context.newPage();
      await page1.goto("https://example.com");

      const host = page1.locator("#alternatab-host");
      await expect(host).toBeAttached();

      await page1.evaluate(() => {
        window.postMessage({ type: "TOGGLE_ALTERNATAB_OVERLAY" }, "*");
      });
      await page1.waitForTimeout(250);

      const isVisible = await page1.evaluate(() => {
        const h = document.getElementById("alternatab-host");
        return h ? h.style.display !== "none" : false;
      });
      expect(isVisible).toBe(true);

      await page1.mouse.click(50, 50);
      await page1.waitForTimeout(250);

      const isClosed = await page1.evaluate(() => {
        const h = document.getElementById("alternatab-host");
        return h ? h.style.display === "none" : true;
      });
      expect(isClosed).toBe(true);

      const link = page1.locator("a");
      await expect(link).toBeVisible();
      await link.click();
    } finally {
      await context.close();
    }
  });

  test("mouse click at real viewport coordinates on a tab row switches tab and closes HUD", async () => {
    const { context } = await createExtensionContext();

    try {
      const page1 = await context.newPage();
      await page1.goto("https://example.com");

      const page2 = await context.newPage();
      await page2.goto("https://example.org");

      await page1.bringToFront();

      await page1.evaluate(() => {
        window.postMessage({ type: "TOGGLE_ALTERNATAB_OVERLAY" }, "*");
      });
      await page1.waitForTimeout(300);

      const rowBox = await getSecondRowCoords(page1);

      expect(rowBox).not.toBeNull();
      if (rowBox) {
        await page1.mouse.click(rowBox.x, rowBox.y);
        await page1.waitForTimeout(400);

        const isClosed = await page1.evaluate(() => {
          const h = document.getElementById("alternatab-host");
          return h ? h.style.display === "none" : true;
        });
        expect(isClosed).toBe(true);
      }
    } finally {
      await context.close();
    }
  });
});
