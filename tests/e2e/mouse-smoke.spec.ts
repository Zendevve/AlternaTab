import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createExtensionContext } from "./helpers";

const POLL_INTERVAL_MS = 100;
const POLL_MAX_ATTEMPTS = 80;

async function getRowCoordsByTabId(
  page: Page,
  tabId: number,
): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    ({ interval, attempts, id }) => {
      const sleep = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));
      const h = document.getElementById("alternatab-host");
      if (!h) return null;
      const shadow = h.shadowRoot;
      if (!shadow) return null;
      return (async (): Promise<{ x: number; y: number } | null> => {
        for (let i = 0; i < attempts; i++) {
          const row = shadow.querySelector(`[data-tab-id="${id}"]`) as HTMLElement | null;
          if (row) {
            const rect = row.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            }
          }
          await sleep(interval);
        }
        return null;
      })();
    },
    { interval: POLL_INTERVAL_MS, attempts: POLL_MAX_ATTEMPTS, id: tabId },
  );
}

interface TabInfo {
  url: string;
  active: boolean;
  windowId: number;
  id: number;
  title: string;
}

async function getAllTabs(context: BrowserContext): Promise<TabInfo[]> {
  const workers = context.serviceWorkers();
  if (workers.length === 0) return [];
  const bg = workers[0];
  if (!bg) return [];
  return bg.evaluate(
    () =>
      new Promise<TabInfo[]>((resolve) => {
        chrome.tabs.query({}, (tabs) => {
          resolve(
            tabs.map((t) => ({
              url: t.url ?? "",
              active: !!t.active,
              windowId: t.windowId,
              id: t.id ?? 0,
              title: t.title ?? "",
            })),
          );
        });
      }),
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

      const targetBefore = await page1.evaluate(() => {
        const el = document.elementFromPoint(50, 50);
        return `${el?.tagName} class=${(el as HTMLElement | null)?.className ?? "n/a"}`;
      });
      console.log("DEBUG target at (50, 50):", targetBefore);

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

  test("mouse click at real viewport coordinates on a tab row activates the corresponding tab", async () => {
    const { context } = await createExtensionContext();

    try {
      const page1 = await context.newPage();
      await page1.goto("https://example.com");

      const page2 = await context.newPage();
      await page2.goto("https://example.org/");

      await page1.bringToFront();

      // Poll until both example.com and example.org tabs are registered.
      let tabsBefore: TabInfo[] = [];
      let exampleOrgBefore: TabInfo | undefined;
      let exampleComBefore: TabInfo | undefined;
      for (let i = 0; i < 40; i++) {
        tabsBefore = await getAllTabs(context);
        exampleOrgBefore = tabsBefore.find((t) => t.url.includes("example.org"));
        exampleComBefore = tabsBefore.find((t) => t.url.includes("example.com"));
        if (exampleOrgBefore && exampleComBefore) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      expect(exampleOrgBefore).toBeDefined();
      expect(exampleComBefore).toBeDefined();
      expect(exampleComBefore?.active).toBe(true);
      const orgId = exampleOrgBefore?.id;
      expect(typeof orgId).toBe("number");

      await page1.evaluate(() => {
        window.postMessage({ type: "TOGGLE_ALTERNATAB_OVERLAY" }, "*");
      });
      await page1.waitForTimeout(300);

      // Find the row for the specific example.org tab by its tabId, not by
      // index — sorting/frecency may place it at any position.
      const rowBox = orgId !== undefined ? await getRowCoordsByTabId(page1, orgId) : null;
      expect(rowBox).not.toBeNull();

      if (rowBox) {
        // Real viewport mouse click on the matching tab row.
        await page1.mouse.click(rowBox.x, rowBox.y);
        await page1.waitForTimeout(1200);

        const isClosed = await page1.evaluate(() => {
          const h = document.getElementById("alternatab-host");
          return h ? h.style.display === "none" : true;
        });
        expect(isClosed).toBe(true);

        const tabsAfter = await getAllTabs(context);
        const exampleOrgAfter = tabsAfter.find((t) => t.id === orgId);
        expect(exampleOrgAfter).toBeDefined();
        expect(exampleOrgAfter?.active).toBe(true);
        expect(exampleOrgAfter?.url).toContain("example.org");
      }
    } finally {
      await context.close();
    }
  });
});
